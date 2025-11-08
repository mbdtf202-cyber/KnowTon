import AlipaySdk from 'alipay-sdk';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Use singleton pattern for Prisma client
let prismaInstance: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

const prisma = getPrisma();

// Initialize Alipay SDK
const alipay = new AlipaySdk({
  appId: process.env.ALIPAY_APP_ID || '',
  privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
  gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipaydev.com/gateway.do',
  timeout: 30000,
  camelcase: true,
});

export interface CreateAlipayPaymentParams {
  userId: string;
  contentId?: string;
  amount: number;
  currency: string;
  subject: string;
  body?: string;
  metadata?: Record<string, string>;
}

export interface AlipayNotifyParams {
  [key: string]: string;
}

export class AlipayService {
  /**
   * Create Alipay payment (Web)
   * Returns payment URL for redirect
   */
  async createWebPayment(params: CreateAlipayPaymentParams) {
    try {
      const { userId, contentId, amount, currency, subject, body, metadata } = params;

      // Validate amount
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Validate currency (Alipay only supports CNY)
      if (currency !== 'CNY') {
        throw new Error('Alipay only supports CNY currency');
      }

      // Generate unique order number
      const outTradeNo = `AP${Date.now()}${uuidv4().substring(0, 8)}`;

      // Create payment record in database
      const payment = await prisma.payment.create({
        data: {
          userId,
          contentId,
          amount,
          currency,
          paymentMethod: 'alipay',
          status: 'pending',
          metadata: {
            outTradeNo,
            subject,
            body,
            ...metadata,
          } as any,
        },
      });

      // Generate payment URL
      const paymentUrl = await alipay.pageExec(
        'alipay.trade.page.pay',
        {
          notifyUrl: process.env.ALIPAY_NOTIFY_URL,
          returnUrl: process.env.ALIPAY_RETURN_URL,
          bizContent: {
            outTradeNo,
            productCode: 'FAST_INSTANT_TRADE_PAY',
            totalAmount: amount.toFixed(2),
            subject,
            body: body || subject,
            passbackParams: encodeURIComponent(JSON.stringify({
              paymentId: payment.id,
              userId,
              contentId,
            })),
          },
        }
      );

      logger.info('Alipay web payment created', {
        paymentId: payment.id,
        outTradeNo,
        amount,
      });

      return {
        paymentId: payment.id,
        paymentUrl,
        outTradeNo,
        amount,
        currency,
      };
    } catch (error) {
      logger.error('Error creating Alipay web payment', { error });
      throw error;
    }
  }

  /**
   * Create Alipay payment (WAP/Mobile)
   * Returns payment URL for mobile redirect
   */
  async createWapPayment(params: CreateAlipayPaymentParams) {
    try {
      const { userId, contentId, amount, currency, subject, body, metadata } = params;

      // Validate amount
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Validate currency
      if (currency !== 'CNY') {
        throw new Error('Alipay only supports CNY currency');
      }

      // Generate unique order number
      const outTradeNo = `AP${Date.now()}${uuidv4().substring(0, 8)}`;

      // Create payment record in database
      const payment = await prisma.payment.create({
        data: {
          userId,
          contentId,
          amount,
          currency,
          paymentMethod: 'alipay',
          status: 'pending',
          metadata: {
            outTradeNo,
            subject,
            body,
            paymentType: 'wap',
            ...metadata,
          } as any,
        },
      });

      // Generate payment URL
      const paymentUrl = await alipay.pageExec(
        'alipay.trade.wap.pay',
        {
          notifyUrl: process.env.ALIPAY_NOTIFY_URL,
          returnUrl: process.env.ALIPAY_RETURN_URL,
          bizContent: {
            outTradeNo,
            productCode: 'QUICK_WAP_WAY',
            totalAmount: amount.toFixed(2),
            subject,
            body: body || subject,
            quitUrl: process.env.ALIPAY_RETURN_URL,
            passbackParams: encodeURIComponent(JSON.stringify({
              paymentId: payment.id,
              userId,
              contentId,
            })),
          },
        }
      );

      logger.info('Alipay WAP payment created', {
        paymentId: payment.id,
        outTradeNo,
        amount,
      });

      return {
        paymentId: payment.id,
        paymentUrl,
        outTradeNo,
        amount,
        currency,
      };
    } catch (error) {
      logger.error('Error creating Alipay WAP payment', { error });
      throw error;
    }
  }

  /**
   * Query payment status from Alipay
   */
  async queryPayment(outTradeNo: string) {
    try {
      const result = await alipay.exec('alipay.trade.query', {
        bizContent: {
          outTradeNo,
        },
      });

      logger.info('Alipay payment queried', {
        outTradeNo,
        tradeStatus: result.tradeStatus,
      });

      return {
        outTradeNo: result.outTradeNo,
        tradeNo: result.tradeNo,
        tradeStatus: result.tradeStatus,
        totalAmount: result.totalAmount,
        buyerLogonId: result.buyerLogonId,
        buyerUserId: result.buyerUserId,
      };
    } catch (error) {
      logger.error('Error querying Alipay payment', { error });
      throw error;
    }
  }

  /**
   * Handle Alipay callback/notify
   * Verifies signature and updates payment status
   */
  async handleNotify(params: AlipayNotifyParams) {
    try {
      // Verify signature
      const isValid = alipay.checkNotifySign(params);
      
      if (!isValid) {
        logger.error('Invalid Alipay notify signature', { params });
        throw new Error('Invalid signature');
      }

      const {
        out_trade_no: outTradeNo,
        trade_no: tradeNo,
        trade_status: tradeStatus,
        buyer_logon_id: buyerLogonId,
        buyer_user_id: buyerUserId,
        passback_params: passbackParams,
      } = params;

      // Decode passback params
      let paymentId: string | undefined;
      if (passbackParams) {
        try {
          const decoded = JSON.parse(decodeURIComponent(passbackParams));
          paymentId = decoded.paymentId;
        } catch (error) {
          logger.warn('Failed to decode passback params', { passbackParams });
        }
      }

      // Find payment record
      let payment;
      if (paymentId) {
        payment = await prisma.payment.findUnique({
          where: { id: paymentId },
        });
      }

      if (!payment) {
        // Try to find by outTradeNo in metadata
        payment = await prisma.payment.findFirst({
          where: {
            paymentMethod: 'alipay',
            metadata: {
              path: ['outTradeNo'],
              equals: outTradeNo,
            },
          },
        });
      }

      if (!payment) {
        logger.error('Payment not found for Alipay notify', { outTradeNo });
        throw new Error('Payment not found');
      }

      // Update payment status based on trade status
      let status: string;
      let completedAt: Date | null = null;

      switch (tradeStatus) {
        case 'TRADE_SUCCESS':
        case 'TRADE_FINISHED':
          status = 'succeeded';
          completedAt = new Date();
          break;
        case 'WAIT_BUYER_PAY':
          status = 'pending';
          break;
        case 'TRADE_CLOSED':
          status = 'canceled';
          break;
        default:
          status = 'processing';
      }

      // Update payment record
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status,
          completedAt,
          metadata: {
            ...(payment.metadata as any),
            tradeNo,
            tradeStatus,
            buyerLogonId,
            buyerUserId,
            notifiedAt: new Date().toISOString(),
          } as any,
        },
      });

      logger.info('Alipay payment updated', {
        paymentId: payment.id,
        outTradeNo,
        tradeNo,
        status,
      });

      return {
        paymentId: payment.id,
        status,
        tradeNo,
      };
    } catch (error) {
      logger.error('Error handling Alipay notify', { error });
      throw error;
    }
  }

  /**
   * Handle Alipay return (redirect after payment)
   */
  async handleReturn(params: AlipayNotifyParams) {
    try {
      // Verify signature
      const isValid = alipay.checkNotifySign(params);
      
      if (!isValid) {
        logger.error('Invalid Alipay return signature', { params });
        throw new Error('Invalid signature');
      }

      const {
        out_trade_no: outTradeNo,
        trade_no: tradeNo,
      } = params;

      // Query payment status from Alipay
      const paymentStatus = await this.queryPayment(outTradeNo);

      logger.info('Alipay return handled', {
        outTradeNo,
        tradeNo,
        tradeStatus: paymentStatus.tradeStatus,
      });

      return {
        outTradeNo,
        tradeNo,
        tradeStatus: paymentStatus.tradeStatus,
      };
    } catch (error) {
      logger.error('Error handling Alipay return', { error });
      throw error;
    }
  }

  /**
   * Refund Alipay payment
   */
  async refundPayment(outTradeNo: string, refundAmount: number, refundReason?: string) {
    try {
      // Generate unique refund number
      const outRequestNo = `RF${Date.now()}${uuidv4().substring(0, 8)}`;

      const result = await alipay.exec('alipay.trade.refund', {
        bizContent: {
          outTradeNo,
          refundAmount: refundAmount.toFixed(2),
          refundReason: refundReason || 'User requested refund',
          outRequestNo,
        },
      });

      logger.info('Alipay refund processed', {
        outTradeNo,
        outRequestNo,
        refundAmount,
        fundChange: result.fundChange,
      });

      return {
        outTradeNo,
        outRequestNo,
        refundAmount,
        fundChange: result.fundChange,
        gmtRefundPay: result.gmtRefundPay,
      };
    } catch (error) {
      logger.error('Error processing Alipay refund', { error });
      throw error;
    }
  }

  /**
   * Close Alipay payment (cancel unpaid order)
   */
  async closePayment(outTradeNo: string) {
    try {
      const result = await alipay.exec('alipay.trade.close', {
        bizContent: {
          outTradeNo,
        },
      });

      logger.info('Alipay payment closed', {
        outTradeNo,
      });

      return {
        outTradeNo: result.outTradeNo,
        tradeNo: result.tradeNo,
      };
    } catch (error) {
      logger.error('Error closing Alipay payment', { error });
      throw error;
    }
  }

  /**
   * Get payment by outTradeNo
   */
  async getPaymentByOutTradeNo(outTradeNo: string) {
    try {
      const payment = await prisma.payment.findFirst({
        where: {
          paymentMethod: 'alipay',
          metadata: {
            path: ['outTradeNo'],
            equals: outTradeNo,
          },
        },
        include: {
          refunds: true,
        },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      return payment;
    } catch (error) {
      logger.error('Error getting payment by outTradeNo', { error });
      throw error;
    }
  }
}

export const alipayService = new AlipayService();
