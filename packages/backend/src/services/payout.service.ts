import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

const prisma = new PrismaClient();

// Initialize Stripe with API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

export interface CreateConnectAccountParams {
  userId: string;
  email: string;
  country: string;
  businessType?: 'individual' | 'company';
  metadata?: Record<string, string>;
}

export interface VerifyBankAccountParams {
  userId: string;
  accountId: string;
  amounts?: [number, number]; // For micro-deposit verification
}

export interface CreatePayoutParams {
  userId: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'CNY' | 'JPY';
  description?: string;
  metadata?: Record<string, string>;
}

export interface PayoutHistoryOptions {
  limit?: number;
  offset?: number;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export class PayoutService {
  /**
   * Create Stripe Connect account for creator
   * This enables bank payouts via Stripe Connect
   */
  async createConnectAccount(params: CreateConnectAccountParams) {
    try {
      const { userId, email, country, businessType = 'individual', metadata } = params;

      // Check if user already has a Connect account
      const existingAccount = await prisma.stripeConnectAccount.findUnique({
        where: { userId },
      });

      if (existingAccount) {
        // Return existing account if already created
        return {
          accountId: existingAccount.stripeAccountId,
          status: existingAccount.status,
          onboardingUrl: null,
        };
      }

      // Create Stripe Connect account
      const account = await stripe.accounts.create({
        type: 'express', // Express account for simplified onboarding
        country,
        email,
        business_type: businessType,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          userId,
          ...metadata,
        },
      });

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.FRONTEND_URL}/creator/payout/refresh`,
        return_url: `${process.env.FRONTEND_URL}/creator/payout/complete`,
        type: 'account_onboarding',
      });

      // Save Connect account to database
      await prisma.stripeConnectAccount.create({
        data: {
          userId,
          stripeAccountId: account.id,
          email,
          country,
          businessType,
          status: 'pending',
          capabilities: JSON.parse(JSON.stringify(account.capabilities)),
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        },
      });

      logger.info('Stripe Connect account created', {
        userId,
        accountId: account.id,
      });

      return {
        accountId: account.id,
        status: 'pending',
        onboardingUrl: accountLink.url,
      };
    } catch (error) {
      logger.error('Error creating Connect account', { error });
      throw error;
    }
  }

  /**
   * Get Connect account details
   */
  async getConnectAccount(userId: string) {
    try {
      const account = await prisma.stripeConnectAccount.findUnique({
        where: { userId },
      });

      if (!account) {
        return null;
      }

      // Fetch latest account details from Stripe
      const stripeAccount = await stripe.accounts.retrieve(account.stripeAccountId);

      // Update account status in database
      const updatedAccount = await prisma.stripeConnectAccount.update({
        where: { userId },
        data: {
          status: stripeAccount.charges_enabled ? 'active' : 'pending',
          capabilities: JSON.parse(JSON.stringify(stripeAccount.capabilities)),
          payoutsEnabled: stripeAccount.payouts_enabled,
          updatedAt: new Date(),
        },
      });

      return {
        accountId: updatedAccount.stripeAccountId,
        email: updatedAccount.email,
        country: updatedAccount.country,
        status: updatedAccount.status,
        payoutsEnabled: updatedAccount.payoutsEnabled,
        capabilities: updatedAccount.capabilities,
        externalAccounts: stripeAccount.external_accounts?.data || [],
      };
    } catch (error) {
      logger.error('Error getting Connect account', { error });
      throw error;
    }
  }

  /**
   * Add bank account to Connect account
   */
  async addBankAccount(userId: string, bankAccountToken: string) {
    try {
      const account = await prisma.stripeConnectAccount.findUnique({
        where: { userId },
      });

      if (!account) {
        throw new Error('Connect account not found');
      }

      // Add bank account to Stripe Connect account
      const bankAccount = await stripe.accounts.createExternalAccount(
        account.stripeAccountId,
        {
          external_account: bankAccountToken,
        }
      );

      logger.info('Bank account added', {
        userId,
        accountId: account.stripeAccountId,
        bankAccountId: (bankAccount as any).id,
      });

      return {
        bankAccountId: (bankAccount as any).id,
        last4: (bankAccount as any).last4,
        bankName: (bankAccount as any).bank_name,
        status: (bankAccount as any).status,
      };
    } catch (error) {
      logger.error('Error adding bank account', { error });
      throw error;
    }
  }

  /**
   * Verify bank account (for micro-deposit verification if needed)
   */
  async verifyBankAccount(params: VerifyBankAccountParams) {
    try {
      const { userId, accountId, amounts } = params;

      const account = await prisma.stripeConnectAccount.findUnique({
        where: { userId },
      });

      if (!account) {
        throw new Error('Connect account not found');
      }

      // For micro-deposit verification (if applicable)
      if (amounts) {
        await stripe.accounts.verifyExternalAccount(
          account.stripeAccountId,
          accountId,
          {
            amounts,
          }
        );
      }

      logger.info('Bank account verified', {
        userId,
        accountId,
      });

      return {
        verified: true,
        accountId,
      };
    } catch (error) {
      logger.error('Error verifying bank account', { error });
      throw error;
    }
  }

  /**
   * Create payout to creator's bank account
   * Minimum payout: $50
   */
  async createPayout(params: CreatePayoutParams) {
    try {
      const { userId, amount, currency, description, metadata } = params;

      // Validate minimum payout amount ($50)
      if (amount < 50) {
        throw new Error('Minimum payout amount is $50');
      }

      // Get Connect account
      const account = await prisma.stripeConnectAccount.findUnique({
        where: { userId },
      });

      if (!account) {
        throw new Error('Connect account not found. Please complete onboarding first.');
      }

      if (!account.payoutsEnabled) {
        throw new Error('Payouts not enabled for this account');
      }

      // Check available balance
      const balance = await this.getAvailableBalance(userId);
      if (balance < amount) {
        throw new Error(`Insufficient balance. Available: $${balance}`);
      }

      // Create transfer to Connect account
      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        destination: account.stripeAccountId,
        description: description || 'Creator payout',
        metadata: {
          userId,
          ...metadata,
        },
      });

      // Create payout record in database
      const payout = await prisma.payout.create({
        data: {
          userId,
          stripeAccountId: account.stripeAccountId,
          stripeTransferId: transfer.id,
          amount,
          currency,
          description,
          status: 'pending',
          fee: amount * 0.025, // 2.5% fee for bank transfers
          netAmount: amount * 0.975,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        },
      });

      logger.info('Payout created', {
        payoutId: payout.id,
        userId,
        amount,
        transferId: transfer.id,
      });

      return {
        payoutId: payout.id,
        transferId: transfer.id,
        amount,
        currency,
        fee: payout.fee,
        netAmount: payout.netAmount,
        status: 'pending',
        estimatedArrival: this.calculateEstimatedArrival(currency),
      };
    } catch (error) {
      logger.error('Error creating payout', { error });
      throw error;
    }
  }

  /**
   * Get payout details
   */
  async getPayout(payoutId: string) {
    try {
      const payout = await prisma.payout.findUnique({
        where: { id: payoutId },
      });

      if (!payout) {
        throw new Error('Payout not found');
      }

      // Fetch latest status from Stripe if transfer ID exists
      if (payout.stripeTransferId) {
        try {
          const transfer = await stripe.transfers.retrieve(payout.stripeTransferId);
          
          // Update status if changed
          if (transfer.reversed) {
            await prisma.payout.update({
              where: { id: payoutId },
              data: {
                status: 'failed',
                failureReason: 'Transfer reversed',
              },
            });
            payout.status = 'failed';
          }
        } catch (error) {
          logger.warn('Could not fetch transfer status', { error });
        }
      }

      return payout;
    } catch (error) {
      logger.error('Error getting payout', { error });
      throw error;
    }
  }

  /**
   * Get payout history for a user
   */
  async getPayoutHistory(userId: string, options?: PayoutHistoryOptions) {
    try {
      const { limit = 20, offset = 0, status, startDate, endDate } = options || {};

      const where: any = { userId };

      if (status) {
        where.status = status;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [payouts, total] = await Promise.all([
        prisma.payout.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.payout.count({ where }),
      ]);

      // Calculate totals
      const totalPaid = await prisma.payout.aggregate({
        where: {
          userId,
          status: 'completed',
        },
        _sum: {
          netAmount: true,
        },
      });

      return {
        payouts,
        total,
        limit,
        offset,
        totalPaid: Number(totalPaid._sum.netAmount || 0),
      };
    } catch (error) {
      logger.error('Error getting payout history', { error });
      throw error;
    }
  }

  /**
   * Generate payout receipt PDF
   */
  async generateReceipt(payoutId: string): Promise<Buffer> {
    try {
      const payout = await this.getPayout(payoutId);

      if (!payout) {
        throw new Error('Payout not found');
      }

      // Get user details
      const account = await prisma.stripeConnectAccount.findUnique({
        where: { stripeAccountId: payout.stripeAccountId },
      });

      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('Payout Receipt', { align: 'center' });
        doc.moveDown();

        // Receipt details
        doc.fontSize(12);
        doc.text(`Receipt ID: ${payout.id}`);
        doc.text(`Date: ${payout.createdAt.toLocaleDateString()}`);
        doc.text(`Status: ${payout.status.toUpperCase()}`);
        doc.moveDown();

        // Account details
        doc.fontSize(14).text('Account Information', { underline: true });
        doc.fontSize(12);
        doc.text(`Email: ${account?.email || 'N/A'}`);
        doc.text(`Account ID: ${payout.stripeAccountId}`);
        doc.moveDown();

        // Payout details
        doc.fontSize(14).text('Payout Details', { underline: true });
        doc.fontSize(12);
        doc.text(`Amount: ${payout.currency} ${Number(payout.amount).toFixed(2)}`);
        doc.text(`Fee (2.5%): ${payout.currency} ${Number(payout.fee).toFixed(2)}`);
        doc.text(`Net Amount: ${payout.currency} ${Number(payout.netAmount).toFixed(2)}`);
        
        if (payout.description) {
          doc.text(`Description: ${payout.description}`);
        }
        
        doc.moveDown();

        // Transfer details
        if (payout.stripeTransferId) {
          doc.fontSize(14).text('Transfer Information', { underline: true });
          doc.fontSize(12);
          doc.text(`Transfer ID: ${payout.stripeTransferId}`);
        }

        // Footer
        doc.moveDown(2);
        doc.fontSize(10).text('KnowTon Platform', { align: 'center' });
        doc.text('https://knowton.io', { align: 'center' });

        doc.end();
      });
    } catch (error) {
      logger.error('Error generating receipt', { error });
      throw error;
    }
  }

  /**
   * Handle Stripe Connect webhook events
   */
  async handleConnectWebhook(event: Stripe.Event) {
    try {
      logger.info('Connect webhook event received', {
        eventId: event.id,
        type: event.type,
      });

      switch (event.type) {
        case 'account.updated':
          await this.handleAccountUpdated(event.data.object as Stripe.Account);
          break;

        case 'transfer.created':
          await this.handleTransferCreated(event.data.object as Stripe.Transfer);
          break;

        case 'transfer.updated':
          await this.handleTransferUpdated(event.data.object as Stripe.Transfer);
          break;

        case 'transfer.reversed':
          await this.handleTransferReversed(event.data.object as Stripe.Transfer);
          break;

        case 'payout.paid':
          await this.handlePayoutPaid(event.data.object as Stripe.Payout);
          break;

        case 'payout.failed':
          await this.handlePayoutFailed(event.data.object as Stripe.Payout);
          break;

        default:
          logger.info('Unhandled Connect webhook event type', { type: event.type });
      }

      return { received: true };
    } catch (error) {
      logger.error('Error handling Connect webhook', { error });
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
          status: { in: ['pending', 'completed'] },
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
   * Calculate estimated arrival time for payout
   */
  private calculateEstimatedArrival(currency: string): string {
    // Standard bank transfer times
    const businessDays = currency === 'USD' ? 3 : 5;
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + businessDays);
    
    return estimatedDate.toLocaleDateString();
  }

  /**
   * Handle account updated webhook
   */
  private async handleAccountUpdated(account: Stripe.Account) {
    try {
      const existingAccount = await prisma.stripeConnectAccount.findFirst({
        where: { stripeAccountId: account.id },
      });

      if (!existingAccount) {
        logger.warn('Account not found for update', { accountId: account.id });
        return;
      }

      await prisma.stripeConnectAccount.update({
        where: { id: existingAccount.id },
        data: {
          status: account.charges_enabled ? 'active' : 'pending',
          payoutsEnabled: account.payouts_enabled,
          capabilities: JSON.parse(JSON.stringify(account.capabilities)),
          updatedAt: new Date(),
        },
      });

      logger.info('Connect account updated', { accountId: account.id });
    } catch (error) {
      logger.error('Error handling account updated', { error });
      throw error;
    }
  }

  /**
   * Handle transfer created webhook
   */
  private async handleTransferCreated(transfer: Stripe.Transfer) {
    try {
      const payout = await prisma.payout.findFirst({
        where: { stripeTransferId: transfer.id },
      });

      if (payout) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'processing',
            updatedAt: new Date(),
          },
        });

        logger.info('Payout status updated to processing', {
          payoutId: payout.id,
          transferId: transfer.id,
        });
      }
    } catch (error) {
      logger.error('Error handling transfer created', { error });
      throw error;
    }
  }

  /**
   * Handle transfer updated webhook
   */
  private async handleTransferUpdated(transfer: Stripe.Transfer) {
    try {
      const payout = await prisma.payout.findFirst({
        where: { stripeTransferId: transfer.id },
      });

      if (payout && transfer.reversed) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'failed',
            failureReason: 'Transfer reversed',
            updatedAt: new Date(),
          },
        });

        logger.info('Payout failed due to transfer reversal', {
          payoutId: payout.id,
          transferId: transfer.id,
        });
      }
    } catch (error) {
      logger.error('Error handling transfer updated', { error });
      throw error;
    }
  }

  /**
   * Handle transfer reversed webhook
   */
  private async handleTransferReversed(transfer: Stripe.Transfer) {
    try {
      const payout = await prisma.payout.findFirst({
        where: { stripeTransferId: transfer.id },
      });

      if (payout) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'failed',
            failureReason: 'Transfer reversed',
            updatedAt: new Date(),
          },
        });

        logger.info('Payout failed - transfer reversed', {
          payoutId: payout.id,
          transferId: transfer.id,
        });
      }
    } catch (error) {
      logger.error('Error handling transfer reversed', { error });
      throw error;
    }
  }

  /**
   * Handle payout paid webhook
   */
  private async handlePayoutPaid(stripePayout: Stripe.Payout) {
    try {
      // Find payout by account ID and amount
      const payout = await prisma.payout.findFirst({
        where: {
          stripeAccountId: stripePayout.destination as string,
          status: { in: ['pending', 'processing'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (payout) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'completed',
            completedAt: new Date(stripePayout.arrival_date * 1000),
            updatedAt: new Date(),
          },
        });

        logger.info('Payout completed', {
          payoutId: payout.id,
          stripePayoutId: stripePayout.id,
        });
      }
    } catch (error) {
      logger.error('Error handling payout paid', { error });
      throw error;
    }
  }

  /**
   * Handle payout failed webhook
   */
  private async handlePayoutFailed(stripePayout: Stripe.Payout) {
    try {
      const payout = await prisma.payout.findFirst({
        where: {
          stripeAccountId: stripePayout.destination as string,
          status: { in: ['pending', 'processing'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (payout) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'failed',
            failureReason: stripePayout.failure_message || 'Payout failed',
            updatedAt: new Date(),
          },
        });

        logger.info('Payout failed', {
          payoutId: payout.id,
          stripePayoutId: stripePayout.id,
          reason: stripePayout.failure_message,
        });
      }
    } catch (error) {
      logger.error('Error handling payout failed', { error });
      throw error;
    }
  }
}

export const payoutService = new PayoutService();
