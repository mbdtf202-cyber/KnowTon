import { Router, Request, Response } from 'express';
import { alipayService } from '../services/alipay.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Create Alipay web payment
 * POST /api/v1/payments/alipay/web
 */
router.post('/web', async (req: Request, res: Response) => {
  try {
    const { userId, contentId, amount, subject, body, metadata } = req.body;

    // Validate required fields
    if (!userId || !amount || !subject) {
      return res.status(400).json({
        error: 'Missing required fields: userId, amount, subject',
      });
    }

    const result = await alipayService.createWebPayment({
      userId,
      contentId,
      amount: parseFloat(amount),
      currency: 'CNY',
      subject,
      body,
      metadata,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error creating Alipay web payment', { error });
    res.status(500).json({
      error: error.message || 'Failed to create Alipay payment',
    });
  }
});

/**
 * Create Alipay WAP/mobile payment
 * POST /api/v1/payments/alipay/wap
 */
router.post('/wap', async (req: Request, res: Response) => {
  try {
    const { userId, contentId, amount, subject, body, metadata } = req.body;

    // Validate required fields
    if (!userId || !amount || !subject) {
      return res.status(400).json({
        error: 'Missing required fields: userId, amount, subject',
      });
    }

    const result = await alipayService.createWapPayment({
      userId,
      contentId,
      amount: parseFloat(amount),
      currency: 'CNY',
      subject,
      body,
      metadata,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error creating Alipay WAP payment', { error });
    res.status(500).json({
      error: error.message || 'Failed to create Alipay WAP payment',
    });
  }
});

/**
 * Query Alipay payment status
 * GET /api/v1/payments/alipay/query/:outTradeNo
 */
router.get('/query/:outTradeNo', async (req: Request, res: Response) => {
  try {
    const { outTradeNo } = req.params;

    const result = await alipayService.queryPayment(outTradeNo);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error querying Alipay payment', { error });
    res.status(500).json({
      error: error.message || 'Failed to query Alipay payment',
    });
  }
});

/**
 * Alipay notify callback
 * POST /api/v1/payments/alipay/notify
 * 
 * This endpoint receives asynchronous notifications from Alipay
 * Must be publicly accessible and configured in Alipay dashboard
 */
router.post('/notify', async (req: Request, res: Response) => {
  try {
    // Alipay sends data as form-urlencoded
    const params = req.body;

    logger.info('Alipay notify received', { params });

    await alipayService.handleNotify(params);

    // Alipay requires "success" response
    res.send('success');
  } catch (error: any) {
    logger.error('Error handling Alipay notify', { error });
    // Still return success to prevent Alipay from retrying
    res.send('success');
  }
});

/**
 * Alipay return callback
 * GET /api/v1/payments/alipay/return
 * 
 * This endpoint handles the redirect after payment
 * User is redirected here from Alipay payment page
 */
router.get('/return', async (req: Request, res: Response) => {
  try {
    const params = req.query as any;

    logger.info('Alipay return received', { params });

    const result = await alipayService.handleReturn(params);

    // Redirect to frontend with payment result
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/payment/complete?outTradeNo=${result.outTradeNo}&status=${result.tradeStatus}`;
    
    res.redirect(redirectUrl);
  } catch (error: any) {
    logger.error('Error handling Alipay return', { error });
    
    // Redirect to frontend error page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/payment/error?message=${encodeURIComponent(error.message)}`;
    
    res.redirect(redirectUrl);
  }
});

/**
 * Refund Alipay payment
 * POST /api/v1/payments/alipay/refund
 */
router.post('/refund', async (req: Request, res: Response) => {
  try {
    const { outTradeNo, refundAmount, refundReason } = req.body;

    if (!outTradeNo || !refundAmount) {
      return res.status(400).json({
        error: 'Missing required fields: outTradeNo, refundAmount',
      });
    }

    const result = await alipayService.refundPayment(
      outTradeNo,
      parseFloat(refundAmount),
      refundReason
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error processing Alipay refund', { error });
    res.status(500).json({
      error: error.message || 'Failed to process Alipay refund',
    });
  }
});

/**
 * Close Alipay payment
 * POST /api/v1/payments/alipay/close
 */
router.post('/close', async (req: Request, res: Response) => {
  try {
    const { outTradeNo } = req.body;

    if (!outTradeNo) {
      return res.status(400).json({
        error: 'Missing required field: outTradeNo',
      });
    }

    const result = await alipayService.closePayment(outTradeNo);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error closing Alipay payment', { error });
    res.status(500).json({
      error: error.message || 'Failed to close Alipay payment',
    });
  }
});

/**
 * Get payment by outTradeNo
 * GET /api/v1/payments/alipay/payment/:outTradeNo
 */
router.get('/payment/:outTradeNo', async (req: Request, res: Response) => {
  try {
    const { outTradeNo } = req.params;

    const payment = await alipayService.getPaymentByOutTradeNo(outTradeNo);

    res.json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    logger.error('Error getting Alipay payment', { error });
    res.status(404).json({
      error: error.message || 'Payment not found',
    });
  }
});

export default router;
