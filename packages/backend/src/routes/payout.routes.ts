import { Router, Request, Response } from 'express';
import { payoutService } from '../services/payout.service';
import { paypalService } from '../services/paypal.service';
import { cryptoWithdrawalService } from '../services/crypto-withdrawal.service';
import { logger } from '../utils/logger';
import Stripe from 'stripe';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

/**
 * POST /api/v1/payouts/connect/create
 * Create Stripe Connect account for creator
 */
router.post('/connect/create', async (req: Request, res: Response) => {
  try {
    const { userId, email, country, businessType, metadata } = req.body;

    if (!userId || !email || !country) {
      return res.status(400).json({
        error: 'Missing required fields: userId, email, country',
      });
    }

    const result = await payoutService.createConnectAccount({
      userId,
      email,
      country,
      businessType,
      metadata,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error creating Connect account', { error });
    res.status(500).json({
      error: error.message || 'Failed to create Connect account',
    });
  }
});

/**
 * GET /api/v1/payouts/connect/:userId
 * Get Connect account details
 */
router.get('/connect/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const account = await payoutService.getConnectAccount(userId);

    if (!account) {
      return res.status(404).json({
        error: 'Connect account not found',
      });
    }

    res.json({
      success: true,
      data: account,
    });
  } catch (error: any) {
    logger.error('Error getting Connect account', { error });
    res.status(500).json({
      error: error.message || 'Failed to get Connect account',
    });
  }
});

/**
 * POST /api/v1/payouts/connect/bank-account
 * Add bank account to Connect account
 */
router.post('/connect/bank-account', async (req: Request, res: Response) => {
  try {
    const { userId, bankAccountToken } = req.body;

    if (!userId || !bankAccountToken) {
      return res.status(400).json({
        error: 'Missing required fields: userId, bankAccountToken',
      });
    }

    const result = await payoutService.addBankAccount(userId, bankAccountToken);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error adding bank account', { error });
    res.status(500).json({
      error: error.message || 'Failed to add bank account',
    });
  }
});

/**
 * POST /api/v1/payouts/connect/verify-bank
 * Verify bank account (micro-deposit verification)
 */
router.post('/connect/verify-bank', async (req: Request, res: Response) => {
  try {
    const { userId, accountId, amounts } = req.body;

    if (!userId || !accountId) {
      return res.status(400).json({
        error: 'Missing required fields: userId, accountId',
      });
    }

    const result = await payoutService.verifyBankAccount({
      userId,
      accountId,
      amounts,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error verifying bank account', { error });
    res.status(500).json({
      error: error.message || 'Failed to verify bank account',
    });
  }
});

/**
 * POST /api/v1/payouts/create
 * Create payout to creator's bank account
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { userId, amount, currency, description, metadata } = req.body;

    if (!userId || !amount || !currency) {
      return res.status(400).json({
        error: 'Missing required fields: userId, amount, currency',
      });
    }

    // Validate amount
    if (amount < 50) {
      return res.status(400).json({
        error: 'Minimum payout amount is $50',
      });
    }

    const result = await payoutService.createPayout({
      userId,
      amount,
      currency,
      description,
      metadata,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error creating payout', { error });
    res.status(500).json({
      error: error.message || 'Failed to create payout',
    });
  }
});

/**
 * GET /api/v1/payouts/:payoutId
 * Get payout details
 */
router.get('/:payoutId', async (req: Request, res: Response) => {
  try {
    const { payoutId } = req.params;

    const payout = await payoutService.getPayout(payoutId);

    res.json({
      success: true,
      data: payout,
    });
  } catch (error: any) {
    logger.error('Error getting payout', { error });
    res.status(500).json({
      error: error.message || 'Failed to get payout',
    });
  }
});

/**
 * GET /api/v1/payouts/history/:userId
 * Get payout history for a user
 */
router.get('/history/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit, offset, status, startDate, endDate } = req.query;

    const options = {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      status: status as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const result = await payoutService.getPayoutHistory(userId, options);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error getting payout history', { error });
    res.status(500).json({
      error: error.message || 'Failed to get payout history',
    });
  }
});

/**
 * GET /api/v1/payouts/:payoutId/receipt
 * Generate and download payout receipt
 */
router.get('/:payoutId/receipt', async (req: Request, res: Response) => {
  try {
    const { payoutId } = req.params;

    const receiptBuffer = await payoutService.generateReceipt(payoutId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payout-receipt-${payoutId}.pdf`);
    res.send(receiptBuffer);
  } catch (error: any) {
    logger.error('Error generating receipt', { error });
    res.status(500).json({
      error: error.message || 'Failed to generate receipt',
    });
  }
});

/**
 * POST /api/v1/payouts/webhook/connect
 * Handle Stripe Connect webhook events
 */
router.post('/webhook/connect', async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error('Stripe Connect webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      logger.error('Webhook signature verification failed', { error: err.message });
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle the event
    await payoutService.handleConnectWebhook(event);

    res.json({ received: true });
  } catch (error: any) {
    logger.error('Error handling Connect webhook', { error });
    res.status(500).json({
      error: error.message || 'Failed to handle webhook',
    });
  }
});

/**
 * POST /api/v1/payouts/paypal/link
 * Link PayPal account to user
 */
router.post('/paypal/link', async (req: Request, res: Response) => {
  try {
    const { userId, paypalEmail, metadata } = req.body;

    if (!userId || !paypalEmail) {
      return res.status(400).json({
        error: 'Missing required fields: userId, paypalEmail',
      });
    }

    const result = await paypalService.linkPayPalAccount({
      userId,
      paypalEmail,
      metadata,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error linking PayPal account', { error });
    res.status(500).json({
      error: error.message || 'Failed to link PayPal account',
    });
  }
});

/**
 * GET /api/v1/payouts/paypal/:userId
 * Get PayPal account details
 */
router.get('/paypal/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const account = await paypalService.getPayPalAccount(userId);

    if (!account) {
      return res.status(404).json({
        error: 'PayPal account not found',
      });
    }

    res.json({
      success: true,
      data: account,
    });
  } catch (error: any) {
    logger.error('Error getting PayPal account', { error });
    res.status(500).json({
      error: error.message || 'Failed to get PayPal account',
    });
  }
});

/**
 * POST /api/v1/payouts/paypal/create
 * Create PayPal payout
 */
router.post('/paypal/create', async (req: Request, res: Response) => {
  try {
    const { userId, amount, currency, description, metadata } = req.body;

    if (!userId || !amount || !currency) {
      return res.status(400).json({
        error: 'Missing required fields: userId, amount, currency',
      });
    }

    // Validate amount
    if (amount < 50) {
      return res.status(400).json({
        error: 'Minimum payout amount is $50',
      });
    }

    const result = await paypalService.createPayPalPayout({
      userId,
      amount,
      currency,
      description,
      metadata,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error creating PayPal payout', { error });
    res.status(500).json({
      error: error.message || 'Failed to create PayPal payout',
    });
  }
});

/**
 * GET /api/v1/payouts/paypal/status/:payoutId
 * Get PayPal payout status
 */
router.get('/paypal/status/:payoutId', async (req: Request, res: Response) => {
  try {
    const { payoutId } = req.params;

    const status = await paypalService.getPayPalPayoutStatus(payoutId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error('Error getting PayPal payout status', { error });
    res.status(500).json({
      error: error.message || 'Failed to get payout status',
    });
  }
});

/**
 * POST /api/v1/payouts/paypal/retry/:payoutId
 * Retry failed PayPal payout
 */
router.post('/paypal/retry/:payoutId', async (req: Request, res: Response) => {
  try {
    const { payoutId } = req.params;

    const result = await paypalService.retryPayPalPayout(payoutId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error retrying PayPal payout', { error });
    res.status(500).json({
      error: error.message || 'Failed to retry payout',
    });
  }
});

/**
 * POST /api/v1/payouts/webhook/paypal
 * Handle PayPal webhook events
 */
router.post('/webhook/paypal', async (req: Request, res: Response) => {
  try {
    // PayPal webhook verification would go here
    // For now, we'll process the event directly
    
    await paypalService.handlePayPalWebhook(req.body);

    res.json({ received: true });
  } catch (error: any) {
    logger.error('Error handling PayPal webhook', { error });
    res.status(500).json({
      error: error.message || 'Failed to handle webhook',
    });
  }
});

/**
 * GET /api/v1/payouts/crypto/quote
 * Get crypto withdrawal quote
 */
router.get('/crypto/quote', async (req: Request, res: Response) => {
  try {
    const { amountUSD, token, walletAddress } = req.query;

    if (!amountUSD || !token || !walletAddress) {
      return res.status(400).json({
        error: 'Missing required fields: amountUSD, token, walletAddress',
      });
    }

    const amount = parseFloat(amountUSD as string);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
      });
    }

    if (!['ETH', 'USDC', 'USDT'].includes(token as string)) {
      return res.status(400).json({
        error: 'Invalid token. Supported: ETH, USDC, USDT',
      });
    }

    const quote = await cryptoWithdrawalService.getWithdrawalQuote({
      amountUSD: amount,
      token: token as 'ETH' | 'USDC' | 'USDT',
      walletAddress: walletAddress as string,
    });

    res.json({
      success: true,
      data: quote,
    });
  } catch (error: any) {
    logger.error('Error getting crypto withdrawal quote', { error });
    res.status(500).json({
      error: error.message || 'Failed to get withdrawal quote',
    });
  }
});

/**
 * POST /api/v1/payouts/crypto/create
 * Create crypto withdrawal
 */
router.post('/crypto/create', async (req: Request, res: Response) => {
  try {
    const { userId, walletAddress, amountUSD, token, metadata } = req.body;

    if (!userId || !walletAddress || !amountUSD || !token) {
      return res.status(400).json({
        error: 'Missing required fields: userId, walletAddress, amountUSD, token',
      });
    }

    // Validate minimum withdrawal
    if (amountUSD < 50) {
      return res.status(400).json({
        error: 'Minimum withdrawal amount is $50',
      });
    }

    if (!['ETH', 'USDC', 'USDT'].includes(token)) {
      return res.status(400).json({
        error: 'Invalid token. Supported: ETH, USDC, USDT',
      });
    }

    const result = await cryptoWithdrawalService.createWithdrawal({
      userId,
      walletAddress,
      amountUSD,
      token,
      metadata,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error creating crypto withdrawal', { error });
    res.status(500).json({
      error: error.message || 'Failed to create withdrawal',
    });
  }
});

/**
 * GET /api/v1/payouts/crypto/:withdrawalId/status
 * Get crypto withdrawal status
 */
router.get('/crypto/:withdrawalId/status', async (req: Request, res: Response) => {
  try {
    const { withdrawalId } = req.params;

    const status = await cryptoWithdrawalService.getWithdrawalStatus(withdrawalId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error('Error getting crypto withdrawal status', { error });
    res.status(500).json({
      error: error.message || 'Failed to get withdrawal status',
    });
  }
});

/**
 * GET /api/v1/payouts/crypto/history/:userId
 * Get crypto withdrawal history
 */
router.get('/crypto/history/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit, offset, status } = req.query;

    const options = {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      status: status as string,
    };

    const result = await cryptoWithdrawalService.getWithdrawalHistory(userId, options);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error getting crypto withdrawal history', { error });
    res.status(500).json({
      error: error.message || 'Failed to get withdrawal history',
    });
  }
});

/**
 * POST /api/v1/payouts/crypto/:withdrawalId/cancel
 * Cancel pending crypto withdrawal
 */
router.post('/crypto/:withdrawalId/cancel', async (req: Request, res: Response) => {
  try {
    const { withdrawalId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing required field: userId',
      });
    }

    const result = await cryptoWithdrawalService.cancelWithdrawal(withdrawalId, userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error cancelling crypto withdrawal', { error });
    res.status(500).json({
      error: error.message || 'Failed to cancel withdrawal',
    });
  }
});

/**
 * GET /api/v1/payouts/crypto/limits/:userId
 * Get crypto withdrawal limits
 */
router.get('/crypto/limits/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const limits = await cryptoWithdrawalService.getWithdrawalLimits(userId);

    res.json({
      success: true,
      data: limits,
    });
  } catch (error: any) {
    logger.error('Error getting crypto withdrawal limits', { error });
    res.status(500).json({
      error: error.message || 'Failed to get withdrawal limits',
    });
  }
});

export default router;
