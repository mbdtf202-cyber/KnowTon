import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Initialize Stripe with API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

export interface CreatePaymentIntentParams {
  userId: string;
  contentId?: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'CNY' | 'JPY';
  paymentMethod?: string;
  installments?: {
    enabled: boolean;
    months?: number;
  };
  metadata?: Record<string, string>;
}

export interface ConfirmPaymentParams {
  paymentIntentId: string;
  paymentMethodId: string;
}

export class PaymentService {
  /**
   * Create a payment intent with Stripe
   * Supports multiple currencies and installment payments
   */
  async createPaymentIntent(params: CreatePaymentIntentParams) {
    try {
      const { userId, contentId, amount, currency, installments, metadata } = params;

      // Validate amount
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Get or create Stripe customer
      const customer = await this.getOrCreateCustomer(userId);

      // Calculate installment details if enabled
      let paymentMethodOptions: Stripe.PaymentIntentCreateParams.PaymentMethodOptions | undefined;
      let installmentPlan: any = null;

      if (installments?.enabled && installments.months) {
        // Stripe installments configuration
        paymentMethodOptions = {
          card: {
            installments: {
              enabled: true,
              plan: {
                count: installments.months,
                interval: 'month' as const,
                type: 'fixed_count' as const,
              },
            },
          },
        };

        installmentPlan = {
          months: installments.months,
          amountPerMonth: (amount / installments.months).toFixed(2),
        };
      }

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        customer: customer.id,
        payment_method_options: paymentMethodOptions,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          userId,
          contentId: contentId || '',
          ...metadata,
        },
      });

      // Save payment record to database
      const payment = await prisma.payment.create({
        data: {
          userId,
          contentId,
          amount,
          currency,
          paymentMethod: 'stripe',
          stripePaymentIntentId: paymentIntent.id,
          stripeCustomerId: customer.id,
          status: 'pending',
          installmentPlan: installmentPlan ? JSON.parse(JSON.stringify(installmentPlan)) : null,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        },
      });

      logger.info('Payment intent created', {
        paymentId: payment.id,
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
      });

      return {
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
        installmentPlan,
      };
    } catch (error) {
      logger.error('Error creating payment intent', { error });
      throw error;
    }
  }

  /**
   * Confirm a payment with 3D Secure authentication
   */
  async confirmPayment(params: ConfirmPaymentParams) {
    try {
      const { paymentIntentId, paymentMethodId } = params;

      // Find payment record
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Confirm payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
        return_url: `${process.env.FRONTEND_URL}/payment/complete`,
      });

      // Update payment status
      const threeDSecureStatus = await this.get3DSecureStatus(paymentIntent);
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'processing',
          threeDSecureStatus,
          updatedAt: new Date(),
        },
      });

      logger.info('Payment confirmed', {
        paymentId: payment.id,
        paymentIntentId,
        status: paymentIntent.status,
      });

      return {
        paymentId: payment.id,
        status: paymentIntent.status,
        requiresAction: paymentIntent.status === 'requires_action',
        nextActionUrl: paymentIntent.next_action?.redirect_to_url?.url,
      };
    } catch (error) {
      logger.error('Error confirming payment', { error });
      throw error;
    }
  }

  /**
   * Get payment details
   */
  async getPayment(paymentId: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          refunds: true,
        },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      return payment;
    } catch (error) {
      logger.error('Error getting payment', { error });
      throw error;
    }
  }

  /**
   * List payments for a user
   */
  async listPayments(userId: string, options?: { limit?: number; offset?: number }) {
    try {
      const { limit = 20, offset = 0 } = options || {};

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where: { userId },
          include: {
            refunds: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.payment.count({ where: { userId } }),
      ]);

      return {
        payments,
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Error listing payments', { error });
      throw error;
    }
  }

  /**
   * Process refund
   */
  async refundPayment(paymentId: string, amount?: number, reason?: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'succeeded') {
        throw new Error('Can only refund succeeded payments');
      }

      if (!payment.stripePaymentIntentId) {
        throw new Error('Stripe payment intent ID not found');
      }

      // Create refund with Stripe
      const refundAmount = amount || Number(payment.amount);
      const stripeRefund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: Math.round(refundAmount * 100), // Convert to cents
        reason: reason as Stripe.RefundCreateParams.Reason,
      });

      // Save refund record
      const refund = await prisma.refund.create({
        data: {
          paymentId,
          amount: refundAmount,
          currency: payment.currency,
          reason,
          status: stripeRefund.status === 'succeeded' ? 'succeeded' : 'pending',
          stripeRefundId: stripeRefund.id,
          processedAt: stripeRefund.status === 'succeeded' ? new Date() : null,
        },
      });

      // Update payment status if fully refunded
      if (refundAmount >= Number(payment.amount)) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'refunded' },
        });
      }

      logger.info('Refund processed', {
        paymentId,
        refundId: refund.id,
        amount: refundAmount,
      });

      return refund;
    } catch (error) {
      logger.error('Error processing refund', { error });
      throw error;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event) {
    try {
      // Save webhook event
      const webhookEvent = await prisma.webhookEvent.create({
        data: {
          eventType: event.type,
          stripeEventId: event.id,
          data: JSON.parse(JSON.stringify(event.data)),
          processed: false,
        },
      });

      logger.info('Webhook event received', {
        eventId: event.id,
        type: event.type,
      });

      // Process different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.canceled':
          await this.handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
          break;

        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object as Stripe.Charge);
          break;

        default:
          logger.info('Unhandled webhook event type', { type: event.type });
      }

      // Mark webhook as processed
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });

      return { received: true };
    } catch (error) {
      logger.error('Error handling webhook', { error });
      throw error;
    }
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies() {
    return [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    ];
  }

  /**
   * Get or create Stripe customer
   */
  private async getOrCreateCustomer(userId: string) {
    try {
      // Check if customer already exists in database
      const existingPayment = await prisma.payment.findFirst({
        where: {
          userId,
          stripeCustomerId: { not: null },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingPayment?.stripeCustomerId) {
        // Verify customer exists in Stripe
        try {
          const customer = await stripe.customers.retrieve(existingPayment.stripeCustomerId);
          if (!customer.deleted) {
            return customer as Stripe.Customer;
          }
        } catch (error) {
          logger.warn('Stripe customer not found, creating new one', { userId });
        }
      }

      // Create new Stripe customer
      const customer = await stripe.customers.create({
        metadata: { userId },
      });

      logger.info('Stripe customer created', {
        userId,
        customerId: customer.id,
      });

      return customer;
    } catch (error) {
      logger.error('Error getting or creating customer', { error });
      throw error;
    }
  }

  /**
   * Extract 3D Secure status from payment intent
   */
  private async get3DSecureStatus(paymentIntent: Stripe.PaymentIntent): Promise<string | null> {
    try {
      // Retrieve the payment intent with expanded charges
      const expandedIntent = await stripe.paymentIntents.retrieve(paymentIntent.id, {
        expand: ['latest_charge.payment_method_details'],
      });

      const latestCharge = expandedIntent.latest_charge;
      if (!latestCharge || typeof latestCharge === 'string') return null;

      const paymentMethodDetails = (latestCharge as any).payment_method_details;
      if (paymentMethodDetails?.card?.three_d_secure) {
        return paymentMethodDetails.card.three_d_secure.result || null;
      }

      return null;
    } catch (error) {
      logger.error('Error getting 3DS status', { error });
      return null;
    }
  }

  /**
   * Handle payment succeeded event
   */
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    try {
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: paymentIntent.id },
      });

      if (!payment) {
        logger.warn('Payment not found for succeeded event', {
          paymentIntentId: paymentIntent.id,
        });
        return;
      }

      const threeDSecureStatus = await this.get3DSecureStatus(paymentIntent);
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'succeeded',
          completedAt: new Date(),
          threeDSecureStatus,
        },
      });

      logger.info('Payment succeeded', {
        paymentId: payment.id,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error) {
      logger.error('Error handling payment succeeded', { error });
      throw error;
    }
  }

  /**
   * Handle payment failed event
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    try {
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: paymentIntent.id },
      });

      if (!payment) {
        logger.warn('Payment not found for failed event', {
          paymentIntentId: paymentIntent.id,
        });
        return;
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          errorMessage: paymentIntent.last_payment_error?.message || 'Payment failed',
        },
      });

      logger.info('Payment failed', {
        paymentId: payment.id,
        paymentIntentId: paymentIntent.id,
        error: paymentIntent.last_payment_error?.message,
      });
    } catch (error) {
      logger.error('Error handling payment failed', { error });
      throw error;
    }
  }

  /**
   * Handle payment canceled event
   */
  private async handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
    try {
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: paymentIntent.id },
      });

      if (!payment) {
        logger.warn('Payment not found for canceled event', {
          paymentIntentId: paymentIntent.id,
        });
        return;
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'canceled',
        },
      });

      logger.info('Payment canceled', {
        paymentId: payment.id,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error) {
      logger.error('Error handling payment canceled', { error });
      throw error;
    }
  }

  /**
   * Handle charge refunded event
   */
  private async handleChargeRefunded(charge: Stripe.Charge) {
    try {
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: charge.payment_intent as string },
      });

      if (!payment) {
        logger.warn('Payment not found for refund event', {
          chargeId: charge.id,
        });
        return;
      }

      // Update existing refund records
      const refunds = charge.refunds?.data || [];
      for (const stripeRefund of refunds) {
        const existingRefund = await prisma.refund.findFirst({
          where: { stripeRefundId: stripeRefund.id },
        });

        if (existingRefund) {
          await prisma.refund.update({
            where: { id: existingRefund.id },
            data: {
              status: stripeRefund.status === 'succeeded' ? 'succeeded' : 'pending',
              processedAt: stripeRefund.status === 'succeeded' ? new Date() : null,
            },
          });
        }
      }

      logger.info('Charge refunded', {
        paymentId: payment.id,
        chargeId: charge.id,
      });
    } catch (error) {
      logger.error('Error handling charge refunded', { error });
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
