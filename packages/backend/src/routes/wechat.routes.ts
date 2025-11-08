import { Router, Request, Response } from 'express';
import { wechatPayService } from '../services/wechat.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Create WeChat Pay Native payment (QR code)
 * POST /api/v1/payments/wechat/native
 */
router.post('/native', async (req: Request, res: Response) => {
  try {
    const { userId, contentId, amount, subject, body, metadata } = req.body;

    // Validate required fields
    if (!userId || !amount || !subject) {
      return res.status(400).json({
        error: 'Missing required fields: userId, amount, subject',
      });
    }

    const result = await wechatPayService.createNativePayment({
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
    logger.error('Error creating WeChat Pay native payment', { error });
    res.status(500).json({
      error: error.message || 'Failed to create WeChat Pay payment',
    });
  }
});

/**
 * Create WeChat Pay JSAPI payment (for WeChat browser/mini-program)
 * POST /api/v1/payments/wechat/jsapi
 */
router.post('/jsapi', async (req: Request, res: Response) => {
  try {
    const { userId, contentId, amount, subject, body, openid, metadata } = req.body;

    // Validate required fields
    if (!userId || !amount || !subject || !openid) {
      return res.status(400).json({
        error: 'Missing required fields: userId, amount, subject, openid',
      });
    }

    const result = await wechatPayService.createJsapiPayment({
      userId,
      contentId,
      amount: parseFloat(amount),
      currency: 'CNY',
      subject,
      body,
      openid,
      metadata,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error creating WeChat Pay JSAPI payment', { error });
    res.status(500).json({
      error: error.message || 'Failed to create WeChat Pay JSAPI payment',
    });
  }
});

/**
 * Query WeChat Pay payment status
 * GET /api/v1/payments/wechat/query/:outTradeNo
 */
router.get('/query/:outTradeNo', async (req: Request, res: Response) => {
  try {
    const { outTradeNo } = req.params;

    const result = await wechatPayService.queryPayment(outTradeNo);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error querying WeChat Pay payment', { error });
    res.status(500).json({
      error: error.message || 'Failed to query WeChat Pay payment',
    });
  }
});

/**
 * WeChat Pay notify callback
 * POST /api/v1/payments/wechat/notify
 * 
 * This endpoint receives asynchronous notifications from WeChat Pay
 * Must be publicly accessible and configured in WeChat Pay merchant platform
 */
router.post('/notify', async (req: Request, res: Response) => {
  try {
    const headers = req.headers as Record<string, string>;
    const body = req.body;

    logger.info('WeChat Pay notify received', { 
      headers: {
        timestamp: headers['wechatpay-timestamp'],
        nonce: headers['wechatpay-nonce'],
        serial: headers['wechatpay-serial'],
      }
    });

    await wechatPayService.handleNotify(headers, body);

    // WeChat Pay requires specific response format
    res.json({
      code: 'SUCCESS',
      message: 'Success',
    });
  } catch (error: any) {
    logger.error('Error handling WeChat Pay notify', { error });
    
    // Return error response to WeChat Pay
    res.status(500).json({
      code: 'FAIL',
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * Refund WeChat Pay payment
 * POST /api/v1/payments/wechat/refund
 */
router.post('/refund', async (req: Request, res: Response) => {
  try {
    const { outTradeNo, refundAmount, refundReason } = req.body;

    if (!outTradeNo || !refundAmount) {
      return res.status(400).json({
        error: 'Missing required fields: outTradeNo, refundAmount',
      });
    }

    const result = await wechatPayService.refundPayment(
      outTradeNo,
      parseFloat(refundAmount),
      refundReason
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error processing WeChat Pay refund', { error });
    res.status(500).json({
      error: error.message || 'Failed to process WeChat Pay refund',
    });
  }
});

/**
 * Close WeChat Pay payment
 * POST /api/v1/payments/wechat/close
 */
router.post('/close', async (req: Request, res: Response) => {
  try {
    const { outTradeNo } = req.body;

    if (!outTradeNo) {
      return res.status(400).json({
        error: 'Missing required field: outTradeNo',
      });
    }

    const result = await wechatPayService.closePayment(outTradeNo);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error closing WeChat Pay payment', { error });
    res.status(500).json({
      error: error.message || 'Failed to close WeChat Pay payment',
    });
  }
});

/**
 * Get payment by outTradeNo
 * GET /api/v1/payments/wechat/payment/:outTradeNo
 */
router.get('/payment/:outTradeNo', async (req: Request, res: Response) => {
  try {
    const { outTradeNo } = req.params;

    const payment = await wechatPayService.getPaymentByOutTradeNo(outTradeNo);

    res.json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    logger.error('Error getting WeChat Pay payment', { error });
    res.status(404).json({
      error: error.message || 'Payment not found',
    });
  }
});

export default router;
