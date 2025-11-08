import { Router, Request, Response } from 'express';
import { cryptoWithdrawalService } from '../services/crypto-withdrawal.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/crypto-withdrawals/quote
 * Get withdrawal quote with gas estimation
 */
router.get('/quote', async (req: Request, res: Response) => {
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
    logger.error('Error getting withdrawal quote', { error });
    res.status(500).json({
      error: error.message || 'Failed to get withdrawal quote',
    });
  }
});

/**
 * POST /api/v1/crypto-withdrawals/create
 * Create crypto withdrawal request
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { userId, walletAddress, amountUSD, token, metadata } = req.body;

    if (!userId || !walletAddress || !amountUSD || !token) {
      return res.status(400).json({
        error: 'Missing required fields: userId, walletAddress, amountUSD, token',
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
    logger.error('Error creating withdrawal', { error });
    res.status(500).json({
      error: error.message || 'Failed to create withdrawal',
    });
  }
});

/**
 * GET /api/v1/crypto-withdrawals/:withdrawalId/status
 * Get withdrawal status
 */
router.get('/:withdrawalId/status', async (req: Request, res: Response) => {
  try {
    const { withdrawalId } = req.params;

    const status = await cryptoWithdrawalService.getWithdrawalStatus(withdrawalId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error('Error getting withdrawal status', { error });
    res.status(500).json({
      error: error.message || 'Failed to get withdrawal status',
    });
  }
});

/**
 * GET /api/v1/crypto-withdrawals/history/:userId
 * Get withdrawal history for a user
 */
router.get('/history/:userId', async (req: Request, res: Response) => {
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
    logger.error('Error getting withdrawal history', { error });
    res.status(500).json({
      error: error.message || 'Failed to get withdrawal history',
    });
  }
});

/**
 * POST /api/v1/crypto-withdrawals/:withdrawalId/cancel
 * Cancel pending withdrawal
 */
router.post('/:withdrawalId/cancel', async (req: Request, res: Response) => {
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
    logger.error('Error cancelling withdrawal', { error });
    res.status(500).json({
      error: error.message || 'Failed to cancel withdrawal',
    });
  }
});

/**
 * GET /api/v1/crypto-withdrawals/limits/:userId
 * Get withdrawal limits for user
 */
router.get('/limits/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const limits = await cryptoWithdrawalService.getWithdrawalLimits(userId);

    res.json({
      success: true,
      data: limits,
    });
  } catch (error: any) {
    logger.error('Error getting withdrawal limits', { error });
    res.status(500).json({
      error: error.message || 'Failed to get withdrawal limits',
    });
  }
});

export default router;
