import { WeChatPayService } from '../../services/wechat.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    payment: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    refund: {
      create: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

// Mock axios
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock crypto
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  createSign: jest.fn(() => ({
    update: jest.fn(),
    end: jest.fn(),
    sign: jest.fn(() => 'mock-signature'),
  })),
  createDecipheriv: jest.fn(() => ({
    setAuthTag: jest.fn(),
    setAAD: jest.fn(),
    update: jest.fn(() => Buffer.from('{"test": "data"}')),
    final: jest.fn(() => Buffer.from('')),
  })),
}));

describe('WeChatPayService', () => {
  let service: WeChatPayService;
  let prisma: any;

  beforeEach(() => {
    // Set up environment variables
    process.env.WECHAT_APP_ID = 'test-app-id';
    process.env.WECHAT_MCH_ID = 'test-mch-id';
    process.env.WECHAT_API_KEY = 'test-api-key';
    process.env.WECHAT_API_V3_KEY = 'test-api-v3-key-32-characters';
    process.env.WECHAT_CERT_SERIAL_NO = 'test-serial-no';
    process.env.WECHAT_PRIVATE_KEY = 'test-private-key';
    process.env.WECHAT_GATEWAY = 'https://api.mch.weixin.qq.com';
    process.env.WECHAT_NOTIFY_URL = 'https://test.com/notify';

    service = new WeChatPayService();
    prisma = new PrismaClient();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('createNativePayment', () => {
    it('should create a native payment successfully', async () => {
      const mockPayment = {
        id: 'payment-123',
        userId: 'user-123',
        amount: 99.99,
        currency: 'CNY',
        paymentMethod: 'wechat',
        status: 'pending',
        metadata: {
          outTradeNo: 'WX123456',
          subject: 'Test Payment',
        },
      };

      prisma.payment.create.mockResolvedValue(mockPayment);
      prisma.payment.update.mockResolvedValue({
        ...mockPayment,
        metadata: {
          ...mockPayment.metadata,
          codeUrl: 'weixin://wxpay/bizpayurl?pr=test123',
        },
      });

      mockedAxios.mockResolvedValue({
        data: {
          code_url: 'weixin://wxpay/bizpayurl?pr=test123',
        },
      });

      const result = await service.createNativePayment({
        userId: 'user-123',
        contentId: 'content-456',
        amount: 99.99,
        currency: 'CNY',
        subject: 'Test Payment',
        body: 'Test payment body',
      });

      expect(result).toHaveProperty('paymentId');
      expect(result).toHaveProperty('codeUrl');
      expect(result).toHaveProperty('outTradeNo');
      expect(result.amount).toBe(99.99);
      expect(result.currency).toBe('CNY');
      expect(prisma.payment.create).toHaveBeenCalled();
      expect(prisma.payment.update).toHaveBeenCalled();
    });

    it('should reject non-CNY currency', async () => {
      await expect(
        service.createNativePayment({
          userId: 'user-123',
          amount: 99.99,
          currency: 'USD',
          subject: 'Test Payment',
        })
      ).rejects.toThrow('WeChat Pay only supports CNY currency');
    });

    it('should reject invalid amount', async () => {
      await expect(
        service.createNativePayment({
          userId: 'user-123',
          amount: -10,
          currency: 'CNY',
          subject: 'Test Payment',
        })
      ).rejects.toThrow('Amount must be greater than 0');
    });
  });

  describe('createJsapiPayment', () => {
    it('should create a JSAPI payment successfully', async () => {
      const mockPayment = {
        id: 'payment-123',
        userId: 'user-123',
        amount: 88.88,
        currency: 'CNY',
        paymentMethod: 'wechat',
        status: 'pending',
        metadata: {
          outTradeNo: 'WX123456',
          subject: 'Test Payment',
          openid: 'test-openid',
        },
      };

      prisma.payment.create.mockResolvedValue(mockPayment);

      mockedAxios.mockResolvedValue({
        data: {
          prepay_id: 'prepay-123',
        },
      });

      const result = await service.createJsapiPayment({
        userId: 'user-123',
        contentId: 'content-456',
        amount: 88.88,
        currency: 'CNY',
        subject: 'Test Payment',
        openid: 'test-openid',
      });

      expect(result).toHaveProperty('paymentId');
      expect(result).toHaveProperty('prepayId');
      expect(result).toHaveProperty('paymentParams');
      expect(result.paymentParams).toHaveProperty('appId');
      expect(result.paymentParams).toHaveProperty('timeStamp');
      expect(result.paymentParams).toHaveProperty('nonceStr');
      expect(result.paymentParams).toHaveProperty('package');
      expect(result.paymentParams).toHaveProperty('paySign');
      expect(prisma.payment.create).toHaveBeenCalled();
    });

    it('should require openid for JSAPI payment', async () => {
      await expect(
        service.createJsapiPayment({
          userId: 'user-123',
          amount: 88.88,
          currency: 'CNY',
          subject: 'Test Payment',
          openid: '',
        })
      ).rejects.toThrow('openid is required for JSAPI payment');
    });
  });

  describe('queryPayment', () => {
    it('should query payment status successfully', async () => {
      mockedAxios.mockResolvedValue({
        data: {
          out_trade_no: 'WX123456',
          transaction_id: 'TX123456',
          trade_state: 'SUCCESS',
          trade_state_desc: 'Payment successful',
          amount: {
            total: 9999,
            currency: 'CNY',
          },
          payer: {
            openid: 'test-openid',
          },
          success_time: '2024-01-01T12:00:00+08:00',
        },
      });

      const result = await service.queryPayment('WX123456');

      expect(result).toHaveProperty('outTradeNo');
      expect(result).toHaveProperty('transactionId');
      expect(result).toHaveProperty('tradeState');
      expect(result.tradeState).toBe('SUCCESS');
    });
  });

  describe('handleNotify', () => {
    it('should handle payment notification successfully', async () => {
      const mockPayment = {
        id: 'payment-123',
        userId: 'user-123',
        amount: 99.99,
        currency: 'CNY',
        paymentMethod: 'wechat',
        status: 'pending',
        metadata: {
          outTradeNo: 'WX123456',
        },
      };

      prisma.payment.findUnique.mockResolvedValue(mockPayment);
      prisma.payment.update.mockResolvedValue({
        ...mockPayment,
        status: 'succeeded',
      });

      const headers = {
        'wechatpay-timestamp': '1234567890',
        'wechatpay-nonce': 'test-nonce',
        'wechatpay-signature': 'test-signature',
        'wechatpay-serial': 'test-serial',
      };

      const body = {
        resource: {
          ciphertext: 'encrypted-data',
          associated_data: 'associated-data',
          nonce: 'nonce',
        },
      };

      const result = await service.handleNotify(headers, body);

      expect(result).toHaveProperty('paymentId');
      expect(result).toHaveProperty('status');
      expect(prisma.payment.update).toHaveBeenCalled();
    });
  });

  describe('refundPayment', () => {
    it('should process refund successfully', async () => {
      const mockPayment = {
        id: 'payment-123',
        userId: 'user-123',
        amount: 99.99,
        currency: 'CNY',
        paymentMethod: 'wechat',
        status: 'succeeded',
        metadata: {
          outTradeNo: 'WX123456',
        },
      };

      prisma.payment.findFirst.mockResolvedValue(mockPayment);
      prisma.refund.create.mockResolvedValue({
        id: 'refund-123',
        paymentId: 'payment-123',
        amount: 50.00,
        status: 'succeeded',
      });

      mockedAxios.mockResolvedValue({
        data: {
          refund_id: 'RF123456',
          out_refund_no: 'RF123456',
          status: 'SUCCESS',
        },
      });

      const result = await service.refundPayment('WX123456', 50.00, 'Test refund');

      expect(result).toHaveProperty('outTradeNo');
      expect(result).toHaveProperty('outRefundNo');
      expect(result).toHaveProperty('refundId');
      expect(result.refundAmount).toBe(50.00);
      expect(prisma.refund.create).toHaveBeenCalled();
    });
  });

  describe('closePayment', () => {
    it('should close payment successfully', async () => {
      mockedAxios.mockResolvedValue({
        data: {},
      });

      const result = await service.closePayment('WX123456');

      expect(result).toHaveProperty('outTradeNo');
      expect(result).toHaveProperty('closed');
      expect(result.closed).toBe(true);
    });
  });

  describe('getPaymentByOutTradeNo', () => {
    it('should retrieve payment by outTradeNo', async () => {
      const mockPayment = {
        id: 'payment-123',
        userId: 'user-123',
        amount: 99.99,
        currency: 'CNY',
        paymentMethod: 'wechat',
        status: 'succeeded',
        metadata: {
          outTradeNo: 'WX123456',
        },
        refunds: [],
      };

      prisma.payment.findFirst.mockResolvedValue(mockPayment);

      const result = await service.getPaymentByOutTradeNo('WX123456');

      expect(result).toHaveProperty('id');
      expect(result.id).toBe('payment-123');
      expect(prisma.payment.findFirst).toHaveBeenCalled();
    });

    it('should throw error if payment not found', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        service.getPaymentByOutTradeNo('INVALID')
      ).rejects.toThrow('Payment not found');
    });
  });
});
