import { Router, Request, Response } from 'express';
import { cryptoPaymentService } from '../services/crypto-payment.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Get payment quote for crypto payment
 * POST /api/v1/payments/crypto/quote
 */
router.post('/quote', async (req: Request, res: Response) => {
  try {
    const { amountUSD, token, slippageTolerance } = req.body;

    // Validate required fields
    if (!amountUSD || !token) {
      return res.status(400).json({
        error: 'Missing required fields: amountUSD, token',
      });
    }

    // Validate token
    const supportedTokens = ['USDC', 'USDT', 'ETH'];
    if (!supportedTokens.includes(token.toUpperCase())) {
      return res.status(400).json({
        error: `Unsupported token. Supported: ${supportedTokens.join(', ')}`,
      });
    }

    // Validate amount
    if (parseFloat(amountUSD) <= 0) {
      return res.status(400).json({
        error: 'Amount must be greater than 0',
      });
    }

    const quote = await cryptoPaymentService.getPaymentQuote({
      amountUSD: parseFloat(amountUSD),
      token: token.toUpperCase(),
      slippageTolerance: slippageTolerance ? parseFloat(slippageTolerance) : undefined,
    });

    res.json({
      success: true,
      data: quote,
    });
  } catch (error: any) {
    logger.error('Error getting payment quote', { error });
    res.status(500).json({
      error: error.message || 'Failed to get payment quote',
    });
  }
});

/**
 * Create crypto payment
 * POST /api/v1/payments/crypto/create
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      contentId,
      amountUSD,
      token,
      buyerAddress,
      recipientAddress,
      slippageTolerance,
      metadata,
    } = req.body;

    // Validate required fields
    if (!userId || !amountUSD || !token || !buyerAddress || !recipientAddress) {
      return res.status(400).json({
        error: 'Missing required fields: userId, amountUSD, token, buyerAddress, recipientAddress',
      });
    }

    const result = await cryptoPaymentService.createCryptoPayment({
      userId,
      contentId,
      amountUSD: parseFloat(amountUSD),
      token: token.toUpperCase(),
      buyerAddress,
      recipientAddress,
      slippageTolerance: slippageTolerance ? parseFloat(slippageTolerance) : undefined,
      metadata,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error creating crypto payment', { error });
    res.status(500).json({
      error: error.message || 'Failed to create crypto payment',
    });
  }
});

/**
 * Monitor transaction status
 * POST /api/v1/payments/crypto/monitor
 */
router.post('/monitor', async (req: Request, res: Response) => {
  try {
    const { paymentId, txHash } = req.body;

    if (!paymentId || !txHash) {
      return res.status(400).json({
        error: 'Missing required fields: paymentId, txHash',
      });
    }

    const status = await cryptoPaymentService.monitorTransaction(paymentId, txHash);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error('Error monitoring transaction', { error });
    res.status(500).json({
      error: error.message || 'Failed to monitor transaction',
    });
  }
});

/**
 * Verify token transfer
 * POST /api/v1/payments/crypto/verify
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { txHash, token, expectedAmount, recipientAddress } = req.body;

    if (!txHash || !token || !expectedAmount || !recipientAddress) {
      return res.status(400).json({
        error: 'Missing required fields: txHash, token, expectedAmount, recipientAddress',
      });
    }

    const isValid = await cryptoPaymentService.verifyTokenTransfer({
      txHash,
      token: token.toUpperCase(),
      expectedAmount,
      recipientAddress,
    });

    res.json({
      success: true,
      data: {
        isValid,
        txHash,
      },
    });
  } catch (error: any) {
    logger.error('Error verifying token transfer', { error });
    res.status(500).json({
      error: error.message || 'Failed to verify token transfer',
    });
  }
});

/**
 * Get supported tokens
 * GET /api/v1/payments/crypto/tokens
 */
router.get('/tokens', async (req: Request, res: Response) => {
  try {
    const tokens = cryptoPaymentService.getSupportedTokens();

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error: any) {
    logger.error('Error getting supported tokens', { error });
    res.status(500).json({
      error: error.message || 'Failed to get supported tokens',
    });
  }
});

/**
 * Get token balance
 * GET /api/v1/payments/crypto/balance/:address/:token
 */
router.get('/balance/:address/:token', async (req: Request, res: Response) => {
  try {
    const { address, token } = req.params;

    const balance = await cryptoPaymentService.getTokenBalance(
      address,
      token.toUpperCase() as 'USDC' | 'USDT' | 'ETH'
    );

    res.json({
      success: true,
      data: {
        address,
        token: token.toUpperCase(),
        balance,
      },
    });
  } catch (error: any) {
    logger.error('Error getting token balance', { error });
    res.status(500).json({
      error: error.message || 'Failed to get token balance',
    });
  }
});

/**
 * Estimate gas for transfer
 * POST /api/v1/payments/crypto/estimate-gas
 */
router.post('/estimate-gas', async (req: Request, res: Response) => {
  try {
    const { token, from, to, amount } = req.body;

    if (!token || !from || !to || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: token, from, to, amount',
      });
    }

    const gasEstimate = await cryptoPaymentService.estimateGas({
      token: token.toUpperCase(),
      from,
      to,
      amount,
    });

    res.json({
      success: true,
      data: gasEstimate,
    });
  } catch (error: any) {
    logger.error('Error estimating gas', { error });
    res.status(500).json({
      error: error.message || 'Failed to estimate gas',
    });
  }
});

export default router;
