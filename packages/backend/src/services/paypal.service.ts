import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import axios, { AxiosInstance } from 'axios';

const prisma = new PrismaClient();

export interface LinkPayPalAccountParams {
  userId: string;
  paypalEmail: string;
  metadata?: Record<string, string>;
}

export interface CreatePayPalPayoutParams {
  userId: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'CNY' | 'JPY';
  description?: string;
  metadata?: Record<string, string>;
}

export interface PayPalAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface PayPalPayoutResponse {
  batch_header: {
    payout_batch_id: string;
    batch_status: string;
    sender_batch_header: {
      sender_batch_id: string;
    };
  };
}

export interface PayPalPayoutStatusResponse {
  batch_header: {
    payout_batch_id: string;
    batch_status: string;
    time_completed?: string;
  };
  items: Array<{
    payout_item_id: string;
    transaction_status: string;
    payout_item_fee?: {
      value: string;
      currency: string;
    };
    errors?: {
      name: string;
      message: string;
    };
  }>;
}

export class PayPalService {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    const baseURL = process.env.PAYPAL_API_BASE_URL || 'https://api-m.sandbox.paypal.com';
    
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get PayPal OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    try {
      // Return cached token if still valid
      if (this.accessToken && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      const clientId = process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error('PayPal credentials not configured');
      }

      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const response = await axios.post<PayPalAccessTokenResponse>(
        `${this.client.defaults.baseURL}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

      logger.info('PayPal access token obtained', {
        expiresIn: response.data.expires_in,
      });

      return this.accessToken;
    } catch (error: any) {
      logger.error('Error getting PayPal access token', { error: error.message });
      throw new Error('Failed to authenticate with PayPal');
    }
  }

  /**
   * Link PayPal account to user
   */
  async linkPayPalAccount(params: LinkPayPalAccountParams) {
    try {
      const { userId, paypalEmail, metadata } = params;

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(paypalEmail)) {
        throw new Error('Invalid PayPal email format');
      }

      // Check if user already has a PayPal account linked
      const existingAccount = await prisma.payPalAccount.findUnique({
        where: { userId },
      });

      if (existingAccount) {
        // Update existing account
        const updatedAccount = await prisma.payPalAccount.update({
          where: { userId },
          data: {
            paypalEmail,
            accountStatus: 'verified', // Keep verified status on update
            metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
            updatedAt: new Date(),
          },
        });

        logger.info('PayPal account updated', {
          userId,
          paypalEmail,
        });

        return {
          accountId: updatedAccount.id,
          paypalEmail: updatedAccount.paypalEmail,
          status: updatedAccount.accountStatus,
        };
      }

      // Create new PayPal account link
      const account = await prisma.payPalAccount.create({
        data: {
          userId,
          paypalEmail,
          accountStatus: 'verified', // Auto-verify for now, can add verification later
          verifiedAt: new Date(),
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        },
      });

      logger.info('PayPal account linked', {
        userId,
        paypalEmail,
        accountId: account.id,
      });

      return {
        accountId: account.id,
        paypalEmail: account.paypalEmail,
        status: account.accountStatus,
      };
    } catch (error: any) {
      logger.error('Error linking PayPal account', { error: error.message });
      throw error;
    }
  }

  /**
   * Get PayPal account details
   */
  async getPayPalAccount(userId: string) {
    try {
      const account = await prisma.payPalAccount.findUnique({
        where: { userId },
      });

      if (!account) {
        return null;
      }

      return {
        accountId: account.id,
        paypalEmail: account.paypalEmail,
        status: account.accountStatus,
        verifiedAt: account.verifiedAt,
        createdAt: account.createdAt,
      };
    } catch (error: any) {
      logger.error('Error getting PayPal account', { error: error.message });
      throw error;
    }
  }

  /**
   * Create PayPal payout
   * Minimum payout: $50
   * Fee: 1% (lower than bank transfer)
   */
  async createPayPalPayout(params: CreatePayPalPayoutParams) {
    try {
      const { userId, amount, currency, description, metadata } = params;

      // Validate minimum payout amount ($50)
      if (amount < 50) {
        throw new Error('Minimum payout amount is $50');
      }

      // Get PayPal account
      const account = await prisma.payPalAccount.findUnique({
        where: { userId },
      });

      if (!account) {
        throw new Error('PayPal account not linked. Please link your PayPal account first.');
      }

      if (account.accountStatus !== 'verified') {
        throw new Error('PayPal account not verified');
      }

      // Check available balance
      const balance = await this.getAvailableBalance(userId);
      if (balance < amount) {
        throw new Error(`Insufficient balance. Available: ${balance}`);
      }

      // Calculate fee (1% for PayPal)
      const fee = amount * 0.01;
      const netAmount = amount - fee;

      // Get access token
      const accessToken = await this.getAccessToken();

      // Create payout batch
      const senderBatchId = `payout_${userId}_${Date.now()}`;
      const payoutRequest = {
        sender_batch_header: {
          sender_batch_id: senderBatchId,
          email_subject: 'You have a payout from KnowTon!',
          email_message: description || 'You have received a payout from KnowTon Platform.',
        },
        items: [
          {
            recipient_type: 'EMAIL',
            amount: {
              value: netAmount.toFixed(2),
              currency,
            },
            receiver: account.paypalEmail,
            note: description || 'Creator payout',
            sender_item_id: `item_${Date.now()}`,
          },
        ],
      };

      logger.info('Creating PayPal payout', {
        userId,
        amount,
        netAmount,
        paypalEmail: account.paypalEmail,
      });

      const response = await this.client.post<PayPalPayoutResponse>(
        '/v1/payments/payouts',
        payoutRequest,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const payoutBatchId = response.data.batch_header.payout_batch_id;

      // Create payout record in database
      const payout = await prisma.payout.create({
        data: {
          userId,
          payoutMethod: 'paypal',
          paypalPayoutId: payoutBatchId,
          paypalEmail: account.paypalEmail,
          amount,
          currency,
          fee,
          netAmount,
          description,
          status: 'processing',
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        },
      });

      logger.info('PayPal payout created', {
        payoutId: payout.id,
        paypalPayoutId: payoutBatchId,
        userId,
        amount,
      });

      return {
        payoutId: payout.id,
        paypalPayoutId: payoutBatchId,
        amount,
        currency,
        fee,
        netAmount,
        status: 'processing',
        estimatedArrival: 'Instant (within minutes)',
      };
    } catch (error: any) {
      logger.error('Error creating PayPal payout', { 
        error: error.message,
        response: error.response?.data,
      });
      
      // Handle specific PayPal errors
      if (error.response?.data?.name === 'INSUFFICIENT_FUNDS') {
        throw new Error('PayPal account has insufficient funds');
      }
      
      throw error;
    }
  }

  /**
   * Get PayPal payout status
   */
  async getPayPalPayoutStatus(payoutId: string) {
    try {
      const payout = await prisma.payout.findUnique({
        where: { id: payoutId },
      });

      if (!payout || !payout.paypalPayoutId) {
        throw new Error('Payout not found');
      }

      // Get access token
      const accessToken = await this.getAccessToken();

      // Fetch payout status from PayPal
      const response = await this.client.get<PayPalPayoutStatusResponse>(
        `/v1/payments/payouts/${payout.paypalPayoutId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const batchStatus = response.data.batch_header.batch_status;
      const item = response.data.items[0];

      // Update payout status based on PayPal response
      let status = payout.status;
      let failureReason = payout.failureReason;
      let completedAt = payout.completedAt;

      if (batchStatus === 'SUCCESS' && item?.transaction_status === 'SUCCESS') {
        status = 'completed';
        completedAt = response.data.batch_header.time_completed 
          ? new Date(response.data.batch_header.time_completed)
          : new Date();
      } else if (item?.transaction_status === 'FAILED' || item?.errors) {
        status = 'failed';
        failureReason = item.errors?.message || 'PayPal payout failed';
      } else if (item?.transaction_status === 'PENDING') {
        status = 'processing';
      }

      // Update database if status changed
      if (status !== payout.status) {
        await prisma.payout.update({
          where: { id: payoutId },
          data: {
            status,
            failureReason,
            completedAt,
            updatedAt: new Date(),
          },
        });

        logger.info('PayPal payout status updated', {
          payoutId,
          oldStatus: payout.status,
          newStatus: status,
        });
      }

      return {
        payoutId: payout.id,
        paypalPayoutId: payout.paypalPayoutId,
        status,
        batchStatus,
        transactionStatus: item?.transaction_status,
        failureReason,
        completedAt,
      };
    } catch (error: any) {
      logger.error('Error getting PayPal payout status', { 
        error: error.message,
        payoutId,
      });
      throw error;
    }
  }

  /**
   * Retry failed PayPal payout
   * Implements exponential backoff retry logic
   */
  async retryPayPalPayout(payoutId: string) {
    try {
      const payout = await prisma.payout.findUnique({
        where: { id: payoutId },
      });

      if (!payout) {
        throw new Error('Payout not found');
      }

      if (payout.status !== 'failed') {
        throw new Error('Only failed payouts can be retried');
      }

      // Check retry limit (max 3 retries)
      if (payout.retryCount >= 3) {
        throw new Error('Maximum retry attempts reached');
      }

      // Calculate exponential backoff delay
      const retryDelay = Math.pow(2, payout.retryCount) * 60 * 1000; // 1min, 2min, 4min
      const timeSinceLastRetry = payout.lastRetryAt 
        ? Date.now() - payout.lastRetryAt.getTime()
        : retryDelay;

      if (timeSinceLastRetry < retryDelay) {
        const waitTime = Math.ceil((retryDelay - timeSinceLastRetry) / 1000);
        throw new Error(`Please wait ${waitTime} seconds before retrying`);
      }

      logger.info('Retrying PayPal payout', {
        payoutId,
        retryCount: payout.retryCount + 1,
      });

      // Create new payout with same details
      const newPayout = await this.createPayPalPayout({
        userId: payout.userId,
        amount: Number(payout.amount),
        currency: payout.currency as any,
        description: payout.description || undefined,
        metadata: payout.metadata as any,
      });

      // Update original payout retry count
      await prisma.payout.update({
        where: { id: payoutId },
        data: {
          retryCount: payout.retryCount + 1,
          lastRetryAt: new Date(),
        },
      });

      return newPayout;
    } catch (error: any) {
      logger.error('Error retrying PayPal payout', { 
        error: error.message,
        payoutId,
      });
      throw error;
    }
  }

  /**
   * Handle PayPal webhook events
   */
  async handlePayPalWebhook(event: any) {
    try {
      logger.info('PayPal webhook event received', {
        eventType: event.event_type,
        resourceType: event.resource_type,
      });

      switch (event.event_type) {
        case 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED':
          await this.handlePayoutSucceeded(event.resource);
          break;

        case 'PAYMENT.PAYOUTS-ITEM.FAILED':
          await this.handlePayoutFailed(event.resource);
          break;

        case 'PAYMENT.PAYOUTS-ITEM.BLOCKED':
          await this.handlePayoutBlocked(event.resource);
          break;

        case 'PAYMENT.PAYOUTS-ITEM.REFUNDED':
          await this.handlePayoutRefunded(event.resource);
          break;

        default:
          logger.info('Unhandled PayPal webhook event type', { 
            type: event.event_type 
          });
      }

      return { received: true };
    } catch (error: any) {
      logger.error('Error handling PayPal webhook', { error: error.message });
      throw error;
    }
  }

  /**
   * Get available balance for payouts
   */
  private async getAvailableBalance(userId: string): Promise<number> {
    // Calculate available balance from completed payments minus payouts
    const [totalRevenue, totalPayouts] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          userId,
          status: 'succeeded',
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.payout.aggregate({
        where: {
          userId,
          status: { in: ['pending', 'processing', 'completed'] },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const revenue = Number(totalRevenue._sum.amount || 0);
    const payouts = Number(totalPayouts._sum.amount || 0);

    return revenue - payouts;
  }

  /**
   * Handle payout succeeded webhook
   */
  private async handlePayoutSucceeded(resource: any) {
    try {
      const payoutBatchId = resource.payout_batch_id;

      const payout = await prisma.payout.findFirst({
        where: { paypalPayoutId: payoutBatchId },
      });

      if (payout && payout.status !== 'completed') {
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date(),
          },
        });

        logger.info('PayPal payout completed', {
          payoutId: payout.id,
          paypalPayoutId: payoutBatchId,
        });
      }
    } catch (error: any) {
      logger.error('Error handling payout succeeded', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle payout failed webhook
   */
  private async handlePayoutFailed(resource: any) {
    try {
      const payoutBatchId = resource.payout_batch_id;
      const errorMessage = resource.errors?.message || 'PayPal payout failed';

      const payout = await prisma.payout.findFirst({
        where: { paypalPayoutId: payoutBatchId },
      });

      if (payout && payout.status !== 'failed') {
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'failed',
            failureReason: errorMessage,
            updatedAt: new Date(),
          },
        });

        logger.info('PayPal payout failed', {
          payoutId: payout.id,
          paypalPayoutId: payoutBatchId,
          reason: errorMessage,
        });
      }
    } catch (error: any) {
      logger.error('Error handling payout failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle payout blocked webhook
   */
  private async handlePayoutBlocked(resource: any) {
    try {
      const payoutBatchId = resource.payout_batch_id;

      const payout = await prisma.payout.findFirst({
        where: { paypalPayoutId: payoutBatchId },
      });

      if (payout) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'failed',
            failureReason: 'Payout blocked by PayPal',
            updatedAt: new Date(),
          },
        });

        logger.info('PayPal payout blocked', {
          payoutId: payout.id,
          paypalPayoutId: payoutBatchId,
        });
      }
    } catch (error: any) {
      logger.error('Error handling payout blocked', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle payout refunded webhook
   */
  private async handlePayoutRefunded(resource: any) {
    try {
      const payoutBatchId = resource.payout_batch_id;

      const payout = await prisma.payout.findFirst({
        where: { paypalPayoutId: payoutBatchId },
      });

      if (payout) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'failed',
            failureReason: 'Payout refunded',
            updatedAt: new Date(),
          },
        });

        logger.info('PayPal payout refunded', {
          payoutId: payout.id,
          paypalPayoutId: payoutBatchId,
        });
      }
    } catch (error: any) {
      logger.error('Error handling payout refunded', { error: error.message });
      throw error;
    }
  }
}

export const paypalService = new PayPalService();
