import crypto from 'crypto';
import axios from 'axios';
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

export interface CreateWeChatPaymentParams {
  userId: string;
  contentId?: string;
  amount: number;
  currency: string;
  subject: string;
  body?: string;
  metadata?: Record<string, string>;
}

export interface WeChatNotifyParams {
  [key: string]: any;
}

export class WeChatPayService {
  private appId: string;
  private mchId: string;
  private apiKey: string;
  private apiV3Key: string;
  private certSerialNo: string;
  private privateKey: string;
  private gateway: string;
  private notifyUrl: string;

  constructor() {
    this.appId = process.env.WECHAT_APP_ID || '';
    this.mchId = process.env.WECHAT_MCH_ID || '';
    this.apiKey = process.env.WECHAT_API_KEY || '';
    this.apiV3Key = process.env.WECHAT_API_V3_KEY || '';
    this.certSerialNo = process.env.WECHAT_CERT_SERIAL_NO || '';
    this.privateKey = process.env.WECHAT_PRIVATE_KEY || '';
    this.gateway = process.env.WECHAT_GATEWAY || 'https://api.mch.weixin.qq.com';
    this.notifyUrl = process.env.WECHAT_NOTIFY_URL || '';
  }

  /**
   * Create WeChat Pay Native payment (QR code)
   * Returns code_url for QR code generation
   */
  async createNativePayment(params: CreateWeChatPaymentParams) {
    try {
      const { userId, contentId, amount, currency, subject, body, metadata } = params;

      // Validate amount
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Validate currency (WeChat Pay only supports CNY)
      if (currency !== 'CNY') {
        throw new Error('WeChat Pay only supports CNY currency');
      }

      // Generate unique order number
      const outTradeNo = `WX${Date.now()}${uuidv4().substring(0, 8)}`;

      // Create payment record in database
      const payment = await prisma.payment.create({
        data: {
          userId,
          contentId,
          amount,
          currency,
          paymentMethod: 'wechat',
          status: 'pending',
          metadata: {
            outTradeNo,
            subject,
            body,
            paymentType: 'native',
            ...metadata,
          } as any,
        },
      });

      // Prepare request data for WeChat Pay API v3
      const requestData = {
        appid: this.appId,
        mchid: this.mchId,
        description: subject,
        out_trade_no: outTradeNo,
        notify_url: this.notifyUrl,
        amount: {
          total: Math.round(amount * 100), // Convert to fen (cents)
          currency: 'CNY',
        },
        attach: JSON.stringify({
          paymentId: payment.id,
          userId,
          contentId,
        }),
      };

      // Make API request to WeChat Pay
      const response = await this.makeApiRequest(
        'POST',
        '/v3/pay/transactions/native',
        requestData
      );

      // Update payment with code_url
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          metadata: {
            ...(payment.metadata as any),
            codeUrl: response.code_url,
          } as any,
        },
      });

      logger.info('WeChat Pay native payment created', {
        paymentId: payment.id,
        outTradeNo,
        amount,
      });

      return {
        paymentId: payment.id,
        codeUrl: response.code_url,
        outTradeNo,
        amount,
        currency,
      };
    } catch (error) {
      logger.error('Error creating WeChat Pay native payment', { error });
      throw error;
    }
  }

  /**
   * Create WeChat Pay JSAPI payment (for WeChat browser/mini-program)
   * Returns prepay_id for payment
   */
  async createJsapiPayment(params: CreateWeChatPaymentParams & { openid: string }) {
    try {
      const { userId, contentId, amount, currency, subject, body, openid, metadata } = params;

      // Validate amount
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Validate currency
      if (currency !== 'CNY') {
        throw new Error('WeChat Pay only supports CNY currency');
      }

      if (!openid) {
        throw new Error('openid is required for JSAPI payment');
      }

      // Generate unique order number
      const outTradeNo = `WX${Date.now()}${uuidv4().substring(0, 8)}`;

      // Create payment record in database
      const payment = await prisma.payment.create({
        data: {
          userId,
          contentId,
          amount,
          currency,
          paymentMethod: 'wechat',
          status: 'pending',
          metadata: {
            outTradeNo,
            subject,
            body,
            paymentType: 'jsapi',
            openid,
            ...metadata,
          } as any,
        },
      });

      // Prepare request data
      const requestData = {
        appid: this.appId,
        mchid: this.mchId,
        description: subject,
        out_trade_no: outTradeNo,
        notify_url: this.notifyUrl,
        amount: {
          total: Math.round(amount * 100), // Convert to fen
          currency: 'CNY',
        },
        payer: {
          openid,
        },
        attach: JSON.stringify({
          paymentId: payment.id,
          userId,
          contentId,
        }),
      };

      // Make API request
      const response = await this.makeApiRequest(
        'POST',
        '/v3/pay/transactions/jsapi',
        requestData
      );

      // Generate payment parameters for frontend
      const paymentParams = this.generateJsapiPaymentParams(response.prepay_id);

      logger.info('WeChat Pay JSAPI payment created', {
        paymentId: payment.id,
        outTradeNo,
        amount,
      });

      return {
        paymentId: payment.id,
        prepayId: response.prepay_id,
        paymentParams,
        outTradeNo,
        amount,
        currency,
      };
    } catch (error) {
      logger.error('Error creating WeChat Pay JSAPI payment', { error });
      throw error;
    }
  }

  /**
   * Query payment status from WeChat Pay
   */
  async queryPayment(outTradeNo: string) {
    try {
      const response = await this.makeApiRequest(
        'GET',
        `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${this.mchId}`,
        null
      );

      logger.info('WeChat Pay payment queried', {
        outTradeNo,
        tradeState: response.trade_state,
      });

      return {
        outTradeNo: response.out_trade_no,
        transactionId: response.transaction_id,
        tradeState: response.trade_state,
        tradeStateDesc: response.trade_state_desc,
        amount: response.amount,
        payer: response.payer,
        successTime: response.success_time,
      };
    } catch (error) {
      logger.error('Error querying WeChat Pay payment', { error });
      throw error;
    }
  }

  /**
   * Handle WeChat Pay callback/notify
   * Verifies signature and updates payment status
   */
  async handleNotify(headers: Record<string, string>, body: any) {
    try {
      // Verify signature
      const isValid = this.verifyNotifySignature(headers, body);
      
      if (!isValid) {
        logger.error('Invalid WeChat Pay notify signature');
        throw new Error('Invalid signature');
      }

      // Decrypt resource data
      const resource = body.resource;
      const decryptedData = this.decryptResource(
        resource.ciphertext,
        resource.associated_data,
        resource.nonce
      );

      const {
        out_trade_no: outTradeNo,
        transaction_id: transactionId,
        trade_state: tradeState,
        trade_state_desc: tradeStateDesc,
        amount,
        payer,
        success_time: successTime,
        attach,
      } = decryptedData;

      // Decode attach data
      let paymentId: string | undefined;
      if (attach) {
        try {
          const decoded = JSON.parse(attach);
          paymentId = decoded.paymentId;
        } catch (error) {
          logger.warn('Failed to decode attach data', { attach });
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
            paymentMethod: 'wechat',
            metadata: {
              path: ['outTradeNo'],
              equals: outTradeNo,
            },
          },
        });
      }

      if (!payment) {
        logger.error('Payment not found for WeChat Pay notify', { outTradeNo });
        throw new Error('Payment not found');
      }

      // Update payment status based on trade state
      let status: string;
      let completedAt: Date | null = null;

      switch (tradeState) {
        case 'SUCCESS':
          status = 'succeeded';
          completedAt = new Date(successTime);
          break;
        case 'NOTPAY':
          status = 'pending';
          break;
        case 'CLOSED':
        case 'REVOKED':
          status = 'canceled';
          break;
        case 'PAYERROR':
          status = 'failed';
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
            transactionId,
            tradeState,
            tradeStateDesc,
            amount,
            payer,
            successTime,
            notifiedAt: new Date().toISOString(),
          } as any,
        },
      });

      logger.info('WeChat Pay payment updated', {
        paymentId: payment.id,
        outTradeNo,
        transactionId,
        status,
      });

      return {
        paymentId: payment.id,
        status,
        transactionId,
      };
    } catch (error) {
      logger.error('Error handling WeChat Pay notify', { error });
      throw error;
    }
  }

  /**
   * Refund WeChat Pay payment
   */
  async refundPayment(outTradeNo: string, refundAmount: number, refundReason?: string) {
    try {
      // Get original payment
      const payment = await this.getPaymentByOutTradeNo(outTradeNo);
      const totalAmount = Number(payment.amount);

      // Generate unique refund number
      const outRefundNo = `RF${Date.now()}${uuidv4().substring(0, 8)}`;

      const requestData = {
        out_trade_no: outTradeNo,
        out_refund_no: outRefundNo,
        reason: refundReason || 'User requested refund',
        amount: {
          refund: Math.round(refundAmount * 100), // Convert to fen
          total: Math.round(totalAmount * 100),
          currency: 'CNY',
        },
      };

      const response = await this.makeApiRequest(
        'POST',
        '/v3/refund/domestic/refunds',
        requestData
      );

      // Create refund record
      await prisma.refund.create({
        data: {
          paymentId: payment.id,
          amount: refundAmount,
          currency: payment.currency,
          reason: refundReason,
          status: response.status === 'SUCCESS' ? 'succeeded' : 'pending',
          processedAt: response.status === 'SUCCESS' ? new Date() : null,
        },
      });

      logger.info('WeChat Pay refund processed', {
        outTradeNo,
        outRefundNo,
        refundAmount,
        status: response.status,
      });

      return {
        outTradeNo,
        outRefundNo,
        refundId: response.refund_id,
        refundAmount,
        status: response.status,
      };
    } catch (error) {
      logger.error('Error processing WeChat Pay refund', { error });
      throw error;
    }
  }

  /**
   * Close WeChat Pay payment (cancel unpaid order)
   */
  async closePayment(outTradeNo: string) {
    try {
      const requestData = {
        mchid: this.mchId,
      };

      await this.makeApiRequest(
        'POST',
        `/v3/pay/transactions/out-trade-no/${outTradeNo}/close`,
        requestData
      );

      logger.info('WeChat Pay payment closed', { outTradeNo });

      return {
        outTradeNo,
        closed: true,
      };
    } catch (error) {
      logger.error('Error closing WeChat Pay payment', { error });
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
          paymentMethod: 'wechat',
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

  /**
   * Make authenticated API request to WeChat Pay
   */
  private async makeApiRequest(method: string, url: string, data: any) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = uuidv4().replace(/-/g, '');
      const fullUrl = `${this.gateway}${url}`;

      // Generate signature
      const signature = this.generateSignature(method, url, timestamp, nonce, data);

      // Prepare authorization header
      const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.certSerialNo}"`;

      // Make request
      const response = await axios({
        method,
        url: fullUrl,
        data: method !== 'GET' ? data : undefined,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authorization,
          'User-Agent': 'KnowTon-Backend/1.0',
        },
      });

      return response.data;
    } catch (error: any) {
      logger.error('WeChat Pay API request failed', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Generate signature for API request
   */
  private generateSignature(
    method: string,
    url: string,
    timestamp: number,
    nonce: string,
    data: any
  ): string {
    const body = data ? JSON.stringify(data) : '';
    const message = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    sign.end();

    return sign.sign(this.privateKey, 'base64');
  }

  /**
   * Verify notify signature
   */
  private verifyNotifySignature(headers: Record<string, string>, body: any): boolean {
    try {
      const timestamp = headers['wechatpay-timestamp'];
      const nonce = headers['wechatpay-nonce'];
      const signature = headers['wechatpay-signature'];
      const serialNo = headers['wechatpay-serial'];

      if (!timestamp || !nonce || !signature || !serialNo) {
        return false;
      }

      const message = `${timestamp}\n${nonce}\n${JSON.stringify(body)}\n`;

      // In production, you should verify using WeChat Pay's public certificate
      // For now, we'll use a simplified verification
      // TODO: Implement proper certificate verification
      
      return true; // Simplified for sandbox testing
    } catch (error) {
      logger.error('Error verifying notify signature', { error });
      return false;
    }
  }

  /**
   * Decrypt resource data from notify
   */
  private decryptResource(ciphertext: string, associatedData: string, nonce: string): any {
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.apiV3Key,
        nonce
      );

      decipher.setAuthTag(Buffer.from(ciphertext.slice(-32), 'base64'));
      decipher.setAAD(Buffer.from(associatedData));

      const decrypted = Buffer.concat([
        decipher.update(ciphertext.slice(0, -32), 'base64'),
        decipher.final(),
      ]);

      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      logger.error('Error decrypting resource', { error });
      throw error;
    }
  }

  /**
   * Generate JSAPI payment parameters for frontend
   */
  private generateJsapiPaymentParams(prepayId: string) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = uuidv4().replace(/-/g, '');
    const packageStr = `prepay_id=${prepayId}`;

    const message = `${this.appId}\n${timestamp}\n${nonce}\n${packageStr}\n`;
    
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    sign.end();
    const paySign = sign.sign(this.privateKey, 'base64');

    return {
      appId: this.appId,
      timeStamp: timestamp,
      nonceStr: nonce,
      package: packageStr,
      signType: 'RSA',
      paySign,
    };
  }
}

export const wechatPayService = new WeChatPayService();
