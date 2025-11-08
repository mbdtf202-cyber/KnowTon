import { cryptoPaymentService } from '../../services/crypto-payment.service';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    payment: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

// Mock ethers
jest.mock('ethers', () => ({
  JsonRpcProvider: jest.fn().mockImplementation(() => ({
    getTransactionReceipt: jest.fn(),
    getBlockNumber: jest.fn(),
    getBlock: jest.fn(),
    getTransaction: jest.fn(),
    getBalance: jest.fn(),
    estimateGas: jest.fn(),
    getFeeData: jest.fn().mockResolvedValue({ gasPrice: 50000000000n }),
  })),
  Contract: jest.fn().mockImplementation(() => ({
    latestRoundData: jest.fn(),
    decimals: jest.fn(),
    balanceOf: jest.fn(),
    transfer: {
      estimateGas: jest.fn(),
    },
    interface: {
      parseLog: jest.fn(),
    },
  })),
  formatUnits: jest.fn((value: any, decimals: number) => {
    const divisor = BigInt(10) ** BigInt(decimals);
    return (BigInt(value) / divisor).toString() + '.' + (BigInt(value) % divisor).toString().padStart(decimals, '0');
  }),
  parseUnits: jest.fn((value: string, decimals: number) => {
    const [whole, fraction = ''] = value.split('.');
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(whole + paddedFraction);
  }),
  isAddress: jest.fn((address: string) => /^0x[0-9a-fA-F]{40}$/.test(address)),
}));

describe('CryptoPaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPaymentQuote', () => {
    it('should reject invalid slippage tolerance', async () => {
      await expect(
        cryptoPaymentService.getPaymentQuote({
          amountUSD: 100,
          token: 'USDC',
          slippageTolerance: 5, // > 3%
        })
      ).rejects.toThrow('Slippage tolerance must be between 1% and 3%');

      await expect(
        cryptoPaymentService.getPaymentQuote({
          amountUSD: 100,
          token: 'USDC',
          slippageTolerance: 0.5, // < 1%
        })
      ).rejects.toThrow('Slippage tolerance must be between 1% and 3%');
    });
  });

  describe('createCryptoPayment', () => {
    it('should reject invalid buyer address', async () => {
      await expect(
        cryptoPaymentService.createCryptoPayment({
          userId: 'user-123',
          amountUSD: 100,
          token: 'USDC',
          buyerAddress: 'invalid-address',
          recipientAddress: '0x0987654321098765432109876543210987654321',
        })
      ).rejects.toThrow('Invalid buyer address');
    });

    it('should reject invalid recipient address', async () => {
      await expect(
        cryptoPaymentService.createCryptoPayment({
          userId: 'user-123',
          amountUSD: 100,
          token: 'USDC',
          buyerAddress: '0x1234567890123456789012345678901234567890',
          recipientAddress: 'invalid-address',
        })
      ).rejects.toThrow('Invalid recipient address');
    });
  });

  describe('monitorTransaction', () => {
    it('should reject invalid transaction hash', async () => {
      await expect(
        cryptoPaymentService.monitorTransaction('payment-123', 'invalid-hash')
      ).rejects.toThrow('Invalid transaction hash');
    });
  });

  describe('getSupportedTokens', () => {
    it('should return list of supported tokens', () => {
      const tokens = cryptoPaymentService.getSupportedTokens();

      expect(tokens).toHaveLength(3);
      expect(tokens).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ symbol: 'USDC' }),
          expect.objectContaining({ symbol: 'USDT' }),
          expect.objectContaining({ symbol: 'ETH' }),
        ])
      );
    });
  });

  describe('getTokenBalance', () => {
    it('should reject invalid address', async () => {
      await expect(
        cryptoPaymentService.getTokenBalance('invalid-address', 'ETH')
      ).rejects.toThrow('Invalid address');
    });
  });
});
