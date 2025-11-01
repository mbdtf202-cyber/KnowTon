import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { paymentService } from '../services/payment.service';
import { logger } from '../utils/logger';

const router = Router();

// Initialize Stripe for webhook signature verification
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

/**
 * Create payment intent
 * POST /api/v1/payments/create-intent
 */
router.post('/create-intent', async (req: Request, res: Response) => {
  try {
    const { userId, contentId, amount, currency, installments, metadata } = req.body;

    // Validate required fields
    if (!userId || !amount || !currency) {
      return res.status(400).json({
        error: 'Missing required fields: userId, amount, currency',
      });
    }

    // Validate currency
    const supportedCurrencies = ['USD', 'EUR', 'CNY', 'JPY'];
    if (!supportedCurrencies.includes(currency.toUpperCase())) {
      return res.status(400).json({
        error: `Unsupported currency. Supported: ${supportedCurrencies.join(', ')}`,
      });
    }

    const result = await paymentService.createPaymentIntent({
      userId,
      contentId,
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      installments,
      metadata,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error creating payment intent', { error });
    res.status(500).json({
      error: error.message || 'Failed to create payment intent',
    });
  }
});

/**
 * Confirm payment
 * POST /api/v1/payments/confirm
 */
router.post('/confirm', async (req: Request, res: Response) => {
  try {
    const { paymentIntentId, paymentMethodId } = req.body;

    if (!paymentIntentId || !paymentMethodId) {
      return res.status(400).json({
        error: 'Missing required fields: paymentIntentId, paymentMethodId',
      });
    }

    const result = await paymentService.confirmPayment({
      paymentIntentId,
      paymentMethodId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error confirming payment', { error });
    res.status(500).json({
      error: error.message || 'Failed to confirm payment',
    });
  }
});

/**
 * Get payment details
 * GET /api/v1/payments/:paymentId
 */
router.get('/:paymentId', async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;

    const payment = await paymentService.getPayment(paymentId);

    res.json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    logger.error('Error getting payment', { error });
    res.status(404).json({
      error: error.message || 'Payment not found',
    });
  }
});

/**
 * List user payments
 * GET /api/v1/payments/user/:userId
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit, offset } = req.query;

    const result = await paymentService.listPayments(userId, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error listing payments', { error });
    res.status(500).json({
      error: error.message || 'Failed to list payments',
    });
  }
});

/**
 * Refund payment
 * POST /api/v1/payments/:paymentId/refund
 */
router.post('/:paymentId/refund', async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    const refund = await paymentService.refundPayment(
      paymentId,
      amount ? parseFloat(amount) : undefined,
      reason
    );

    res.json({
      success: true,
      data: refund,
    });
  } catch (error: any) {
    logger.error('Error processing refund', { error });
    res.status(500).json({
      error: error.message || 'Failed to process refund',
    });
  }
});

/**
 * Get supported currencies
 * GET /api/v1/payments/currencies
 */
router.get('/currencies/list', async (req: Request, res: Response) => {
  try {
    const currencies = paymentService.getSupportedCurrencies();

    res.json({
      success: true,
      data: currencies,
    });
  } catch (error: any) {
    logger.error('Error getting currencies', { error });
    res.status(500).json({
      error: error.message || 'Failed to get currencies',
    });
  }
});

/**
 * Stripe webhook handler
 * POST /api/v1/payments/webhook
 * 
 * This endpoint receives events from Stripe webhooks
 * Must be configured in Stripe Dashboard
 */
router.post(
  '/webhook',
  // Use raw body for signature verification
  Router().use(require('express').raw({ type: 'application/json' })),
  async (req: Request, res: Response) => {
    try {
      const sig = req.headers['stripe-signature'];

      if (!sig) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
      }

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        logger.error('STRIPE_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook secret not configured' });
      }

      // Verify webhook signature
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          webhookSecret
        );
      } catch (err: any) {
        logger.error('Webhook signature verification failed', { error: err.message });
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }

      // Handle the event
      await paymentService.handleWebhook(event);

      res.json({ received: true });
    } catch (error: any) {
      logger.error('Error processing webhook', { error });
      res.status(500).json({
        error: error.message || 'Failed to process webhook',
      });
    }
  }
);

export default router;
