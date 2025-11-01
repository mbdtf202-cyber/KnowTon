// Mock functions need to be declared before jest.mock calls
const mockStripeCreate = jest.fn();
const mockStripeConfirm = jest.fn();
const mockStripeRetrieve = jest.fn();
const mockCustomerCreate = jest.fn();
const mockCustomerRetrieve = jest.fn();
const mockRefundCreate = jest.fn();
const mockWebhookConstruct = jest.fn();

const mockPrismaPaymentCreate = jest.fn();
const mockPrismaPaymentFindFirst = jest.fn();
const mockPrismaPaymentFindUnique = jest.fn();
const mockPrismaPaymentFindMany = jest.fn();
const mockPrismaPaymentCount = jest.fn();
const mockPrismaPaymentUpdate = jest.fn();
const mockPrismaRefundCreate = jest.fn();
const mockPrismaRefundFindFirst = jest.fn();
const mockPrismaRefundUpdate = jest.fn();
const mockPrismaWebhookCreate = jest.fn();
const mockPrismaWebhookUpdate = jest.fn();

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: (...args: any[]) => mockStripeCreate(...args),
      confirm: (...args: any[]) => mockStripeConfirm(...args),
      retrieve: (...args: any[]) => mockStripeRetrieve(...args),
    },
    customers: {
      create: (...args: any[]) => mockCustomerCreate(...args),
      retrieve: (...args: any[]) => mockCustomerRetrieve(...args),
    },
    refunds: {
      create: (...args: any[]) => mockRefundCreate(...args),
    },
    webhooks: {
      constructEvent: (...args: any[]) => mockWebhookConstruct(...args),
    },
  }));
});

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    payment: {
      create: (...args: any[]) => mockPrismaPaymentCreate(...args),
      findFirst: (...args: any[]) => mockPrismaPaymentFindFirst(...args),
      findUnique: (...args: any[]) => mockPrismaPaymentFindUnique(...args),
      findMany: (...args: any[]) => mockPrismaPaymentFindMany(...args),
      count: (...args: any[]) => mockPrismaPaymentCount(...args),
      update: (...args: any[]) => mockPrismaPaymentUpdate(...args),
    },
    refund: {
      create: (...args: any[]) => mockPrismaRefundCreate(...args),
      findFirst: (...args: any[]) => mockPrismaRefundFindFirst(...args),
      update: (...args: any[]) => mockPrismaRefundUpdate(...args),
    },
    webhookEvent: {
      create: (...args: any[]) => mockPrismaWebhookCreate(...args),
      update: (...args: any[]) => mockPrismaWebhookUpdate(...args),
    },
  })),
}));

import { PaymentService } from '../../services/payment.service';

describe('PaymentService', () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create service instance
    paymentService = new PaymentService();
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent with USD currency', async () => {
      const mockCustomer = { id: 'cus_123' };
      const mockPaymentIntent = {
        id: 'pi_123',
        client_secret: 'pi_123_secret',
        amount: 10000,
        currency: 'usd',
      };
      const mockPayment = {
        id: 'payment_123',
        userId: 'user_123',
        amount: 100,
        currency: 'USD',
        stripePaymentIntentId: 'pi_123',
      };

      mockCustomerCreate.mockResolvedValue(mockCustomer as any);
      mockStripeCreate.mockResolvedValue(mockPaymentIntent as any);
      mockPrismaPaymentFindFirst.mockResolvedValue(null);
      mockPrismaPaymentCreate.mockResolvedValue(mockPayment);

      const result = await paymentService.createPaymentIntent({
        userId: 'user_123',
        amount: 100,
        currency: 'USD',
      });

      expect(result).toMatchObject({
        paymentId: 'payment_123',
        clientSecret: 'pi_123_secret',
        paymentIntentId: 'pi_123',
        amount: 100,
        currency: 'USD',
      });

      expect(mockStripeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000, // 100 * 100 cents
          currency: 'usd',
        })
      );
    });

    it('should create a payment intent with installments', async () => {
      const mockCustomer = { id: 'cus_123' };
      const mockPaymentIntent = {
        id: 'pi_123',
        client_secret: 'pi_123_secret',
        amount: 30000,
        currency: 'usd',
      };
      const mockPayment = {
        id: 'payment_123',
        userId: 'user_123',
        amount: 300,
        currency: 'USD',
        stripePaymentIntentId: 'pi_123',
        installmentPlan: { months: 3, amountPerMonth: '100.00' },
      };

      mockCustomerCreate.mockResolvedValue(mockCustomer as any);
      mockStripeCreate.mockResolvedValue(mockPaymentIntent as any);
      mockPrismaPaymentFindFirst.mockResolvedValue(null);
      mockPrismaPaymentCreate.mockResolvedValue(mockPayment);

      const result = await paymentService.createPaymentIntent({
        userId: 'user_123',
        amount: 300,
        currency: 'USD',
        installments: {
          enabled: true,
          months: 3,
        },
      });

      expect(result.installmentPlan).toEqual({
        months: 3,
        amountPerMonth: '100.00',
      });

      expect(mockStripeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_options: {
            card: {
              installments: {
                enabled: true,
                plan: {
                  count: 3,
                  interval: 'month',
                  type: 'fixed_count',
                },
              },
            },
          },
        })
      );
    });

    it('should support multiple currencies', async () => {
      const currencies = ['USD', 'EUR', 'CNY', 'JPY'];
      const mockCustomer = { id: 'cus_123' };

      mockCustomerCreate.mockResolvedValue(mockCustomer as any);
      mockPrismaPaymentFindFirst.mockResolvedValue(null);

      for (const currency of currencies) {
        const mockPaymentIntent = {
          id: `pi_${currency}`,
          client_secret: `pi_${currency}_secret`,
          amount: 10000,
          currency: currency.toLowerCase(),
        };
        const mockPayment = {
          id: `payment_${currency}`,
          userId: 'user_123',
          amount: 100,
          currency,
          stripePaymentIntentId: `pi_${currency}`,
        };

        mockStripeCreate.mockResolvedValue(mockPaymentIntent as any);
        mockPrismaPaymentCreate.mockResolvedValue(mockPayment);

        const result = await paymentService.createPaymentIntent({
          userId: 'user_123',
          amount: 100,
          currency: currency as any,
        });

        expect(result.currency).toBe(currency);
        expect(mockStripeCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            currency: currency.toLowerCase(),
          })
        );
      }
    });

    it('should throw error for invalid amount', async () => {
      await expect(
        paymentService.createPaymentIntent({
          userId: 'user_123',
          amount: 0,
          currency: 'USD',
        })
      ).rejects.toThrow('Amount must be greater than 0');

      await expect(
        paymentService.createPaymentIntent({
          userId: 'user_123',
          amount: -10,
          currency: 'USD',
        })
      ).rejects.toThrow('Amount must be greater than 0');
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment with 3D Secure', async () => {
      const mockPayment = {
        id: 'payment_123',
        stripePaymentIntentId: 'pi_123',
      };
      const mockPaymentIntent = {
        id: 'pi_123',
        status: 'succeeded',
        charges: {
          data: [
            {
              payment_method_details: {
                card: {
                  three_d_secure: {
                    result: 'authenticated',
                  },
                },
              },
            },
          ],
        },
      };

      mockPrismaPaymentFindFirst.mockResolvedValue(mockPayment);
      mockStripeConfirm.mockResolvedValue(mockPaymentIntent as any);
      mockPrismaPaymentUpdate.mockResolvedValue({
        ...mockPayment,
        status: 'succeeded',
        threeDSecureStatus: 'authenticated',
      });

      const result = await paymentService.confirmPayment({
        paymentIntentId: 'pi_123',
        paymentMethodId: 'pm_123',
      });

      expect(result.status).toBe('succeeded');
      expect(result.requiresAction).toBe(false);
      expect(mockPrismaPaymentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'succeeded',
            threeDSecureStatus: 'authenticated',
          }),
        })
      );
    });

    it('should handle payment requiring additional action', async () => {
      const mockPayment = {
        id: 'payment_123',
        stripePaymentIntentId: 'pi_123',
      };
      const mockPaymentIntent = {
        id: 'pi_123',
        status: 'requires_action',
        next_action: {
          redirect_to_url: {
            url: 'https://stripe.com/3ds',
          },
        },
      };

      mockPrismaPaymentFindFirst.mockResolvedValue(mockPayment);
      mockStripeConfirm.mockResolvedValue(mockPaymentIntent as any);
      mockPrismaPaymentUpdate.mockResolvedValue({
        ...mockPayment,
        status: 'processing',
      });

      const result = await paymentService.confirmPayment({
        paymentIntentId: 'pi_123',
        paymentMethodId: 'pm_123',
      });

      expect(result.status).toBe('requires_action');
      expect(result.requiresAction).toBe(true);
      expect(result.nextActionUrl).toBe('https://stripe.com/3ds');
    });
  });

  describe('refundPayment', () => {
    it('should process full refund', async () => {
      const mockPayment = {
        id: 'payment_123',
        stripePaymentIntentId: 'pi_123',
        amount: 100,
        currency: 'USD',
        status: 'succeeded',
      };
      const mockStripeRefund = {
        id: 're_123',
        status: 'succeeded',
        amount: 10000,
      };
      const mockRefund = {
        id: 'refund_123',
        paymentId: 'payment_123',
        amount: 100,
        status: 'succeeded',
      };

      mockPrismaPaymentFindUnique.mockResolvedValue(mockPayment);
      mockRefundCreate.mockResolvedValue(mockStripeRefund as any);
      mockPrismaRefundCreate.mockResolvedValue(mockRefund);
      mockPrismaPaymentUpdate.mockResolvedValue({
        ...mockPayment,
        status: 'refunded',
      });

      const result = await paymentService.refundPayment('payment_123');

      expect(result.amount).toBe(100);
      expect(result.status).toBe('succeeded');
      expect(mockPrismaPaymentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'refunded' },
        })
      );
    });

    it('should process partial refund', async () => {
      const mockPayment = {
        id: 'payment_123',
        stripePaymentIntentId: 'pi_123',
        amount: 100,
        currency: 'USD',
        status: 'succeeded',
      };
      const mockStripeRefund = {
        id: 're_123',
        status: 'succeeded',
        amount: 5000,
      };
      const mockRefund = {
        id: 'refund_123',
        paymentId: 'payment_123',
        amount: 50,
        status: 'succeeded',
      };

      mockPrismaPaymentFindUnique.mockResolvedValue(mockPayment);
      mockRefundCreate.mockResolvedValue(mockStripeRefund as any);
      mockPrismaRefundCreate.mockResolvedValue(mockRefund);

      const result = await paymentService.refundPayment('payment_123', 50);

      expect(result.amount).toBe(50);
      expect(mockPrismaPaymentUpdate).not.toHaveBeenCalled(); // Partial refund doesn't change payment status
    });

    it('should throw error for non-succeeded payment', async () => {
      const mockPayment = {
        id: 'payment_123',
        status: 'pending',
      };

      mockPrismaPaymentFindUnique.mockResolvedValue(mockPayment);

      await expect(
        paymentService.refundPayment('payment_123')
      ).rejects.toThrow('Can only refund succeeded payments');
    });
  });

  describe('handleWebhook', () => {
    it('should handle payment_intent.succeeded event', async () => {
      const mockEvent = {
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            status: 'succeeded',
            charges: {
              data: [
                {
                  payment_method_details: {
                    card: {
                      three_d_secure: {
                        result: 'authenticated',
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      };
      const mockWebhookEvent = {
        id: 'webhook_123',
        eventType: 'payment_intent.succeeded',
      };
      const mockPayment = {
        id: 'payment_123',
        stripePaymentIntentId: 'pi_123',
      };

      mockPrismaWebhookCreate.mockResolvedValue(mockWebhookEvent);
      mockPrismaPaymentFindFirst.mockResolvedValue(mockPayment);
      mockPrismaPaymentUpdate.mockResolvedValue({
        ...mockPayment,
        status: 'succeeded',
      });
      mockPrismaWebhookUpdate.mockResolvedValue({
        ...mockWebhookEvent,
        processed: true,
      });

      const result = await paymentService.handleWebhook(mockEvent as any);

      expect(result.received).toBe(true);
      expect(mockPrismaPaymentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'succeeded',
            threeDSecureStatus: 'authenticated',
          }),
        })
      );
    });

    it('should handle payment_intent.payment_failed event', async () => {
      const mockEvent = {
        id: 'evt_123',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_123',
            status: 'failed',
            last_payment_error: {
              message: 'Card declined',
            },
          },
        },
      };
      const mockWebhookEvent = {
        id: 'webhook_123',
        eventType: 'payment_intent.payment_failed',
      };
      const mockPayment = {
        id: 'payment_123',
        stripePaymentIntentId: 'pi_123',
      };

      mockPrismaWebhookCreate.mockResolvedValue(mockWebhookEvent);
      mockPrismaPaymentFindFirst.mockResolvedValue(mockPayment);
      mockPrismaPaymentUpdate.mockResolvedValue({
        ...mockPayment,
        status: 'failed',
        errorMessage: 'Card declined',
      });
      mockPrismaWebhookUpdate.mockResolvedValue({
        ...mockWebhookEvent,
        processed: true,
      });

      const result = await paymentService.handleWebhook(mockEvent as any);

      expect(result.received).toBe(true);
      expect(mockPrismaPaymentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
            errorMessage: 'Card declined',
          }),
        })
      );
    });
  });

  describe('getSupportedCurrencies', () => {
    it('should return list of supported currencies', () => {
      const currencies = paymentService.getSupportedCurrencies();

      expect(currencies).toHaveLength(4);
      expect(currencies).toEqual([
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      ]);
    });
  });
});
