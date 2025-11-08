import { JsonRpcProvider, Contract, formatUnits, parseUnits, isAddress } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// ERC20 ABI for USDC/USDT
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

// Chainlink Price Feed ABI
const CHAINLINK_PRICE_FEED_ABI = [
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() view returns (uint8)',
];

// Supported stablecoins configuration
export const STABLECOINS = {
  USDC: {
    address: process.env.USDC_CONTRACT_ADDRESS || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum mainnet
    decimals: 6,
    name: 'USD Coin',
    symbol: 'USDC',
  },
  USDT: {
    address: process.env.USDT_CONTRACT_ADDRESS || '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum mainnet
    decimals: 6,
    name: 'Tether USD',
    symbol: 'USDT',
  },
};

// Chainlink price feed addresses (Ethereum mainnet)
export const PRICE_FEEDS = {
  ETH_USD: process.env.CHAINLINK_ETH_USD_FEED || '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  USDC_USD: process.env.CHAINLINK_USDC_USD_FEED || '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
  USDT_USD: process.env.CHAINLINK_USDT_USD_FEED || '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
};

export interface CreateCryptoPaymentParams {
  userId: string;
  contentId?: string;
  amountUSD: number;
  token: 'USDC' | 'USDT' | 'ETH';
  buyerAddress: string;
  recipientAddress: string;
  slippageTolerance?: number; // 1-3%
  metadata?: Record<string, string>;
}

export interface CryptoPaymentQuote {
  amountUSD: number;
  tokenAmount: string;
  tokenSymbol: string;
  tokenDecimals: number;
  exchangeRate: string;
  slippageTolerance: number;
  minTokenAmount: string;
  maxTokenAmount: string;
  priceImpact: number;
  expiresAt: Date;
}

export interface TransactionStatus {
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  blockNumber?: number;
  gasUsed?: string;
  timestamp?: Date;
}

export class CryptoPaymentService {
  private provider: JsonRpcProvider;

  constructor() {
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key';
    this.provider = new JsonRpcProvider(rpcUrl);
  }

  /**
   * Get price quote for crypto payment
   * Uses Chainlink price oracle for accurate pricing
   */
  async getPaymentQuote(params: {
    amountUSD: number;
    token: 'USDC' | 'USDT' | 'ETH';
    slippageTolerance?: number;
  }): Promise<CryptoPaymentQuote> {
    try {
      const { amountUSD, token, slippageTolerance = 1 } = params;

      // Validate slippage tolerance (1-3%)
      if (slippageTolerance < 1 || slippageTolerance > 3) {
        throw new Error('Slippage tolerance must be between 1% and 3%');
      }

      // Get exchange rate from Chainlink
      const exchangeRate = await this.getExchangeRate(token);

      // Calculate token amount
      let tokenAmount: string;
      let tokenDecimals: number;

      if (token === 'ETH') {
        // For ETH, divide USD amount by ETH price
        tokenAmount = (amountUSD / exchangeRate).toFixed(18);
        tokenDecimals = 18;
      } else {
        // For stablecoins (USDC/USDT), amount is approximately 1:1 with USD
        // But we still use oracle price for accuracy
        const stablecoin = STABLECOINS[token];
        tokenAmount = (amountUSD / exchangeRate).toFixed(stablecoin.decimals);
        tokenDecimals = stablecoin.decimals;
      }

      // Calculate slippage bounds
      const slippageMultiplier = slippageTolerance / 100;
      const minTokenAmount = (parseFloat(tokenAmount) * (1 - slippageMultiplier)).toFixed(tokenDecimals);
      const maxTokenAmount = (parseFloat(tokenAmount) * (1 + slippageMultiplier)).toFixed(tokenDecimals);

      // Calculate price impact (for display purposes)
      const priceImpact = 0.1; // Minimal for stablecoins, would be higher for AMM swaps

      // Quote expires in 5 minutes
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      logger.info('Crypto payment quote generated', {
        amountUSD,
        token,
        tokenAmount,
        exchangeRate,
        slippageTolerance,
      });

      return {
        amountUSD,
        tokenAmount,
        tokenSymbol: token,
        tokenDecimals,
        exchangeRate: exchangeRate.toString(),
        slippageTolerance,
        minTokenAmount,
        maxTokenAmount,
        priceImpact,
        expiresAt,
      };
    } catch (error) {
      logger.error('Error generating payment quote', { error });
      throw error;
    }
  }

  /**
   * Get exchange rate from Chainlink price oracle
   */
  private async getExchangeRate(token: 'USDC' | 'USDT' | 'ETH'): Promise<number> {
    try {
      let priceFeedAddress: string;

      switch (token) {
        case 'ETH':
          priceFeedAddress = PRICE_FEEDS.ETH_USD;
          break;
        case 'USDC':
          priceFeedAddress = PRICE_FEEDS.USDC_USD;
          break;
        case 'USDT':
          priceFeedAddress = PRICE_FEEDS.USDT_USD;
          break;
        default:
          throw new Error(`Unsupported token: ${token}`);
      }

      const priceFeed = new Contract(
        priceFeedAddress,
        CHAINLINK_PRICE_FEED_ABI,
        this.provider
      );

      const [roundData, decimals] = await Promise.all([
        priceFeed.latestRoundData(),
        priceFeed.decimals(),
      ]);

      const price = roundData.answer;
      const priceDecimals = decimals;

      // Convert to human-readable price
      const exchangeRate = parseFloat(formatUnits(price, priceDecimals));

      logger.info('Exchange rate fetched from Chainlink', {
        token,
        exchangeRate,
        priceFeedAddress,
      });

      return exchangeRate;
    } catch (error) {
      logger.error('Error fetching exchange rate from Chainlink', { error, token });
      throw new Error(`Failed to fetch exchange rate for ${token}`);
    }
  }

  /**
   * Create crypto payment record
   */
  async createCryptoPayment(params: CreateCryptoPaymentParams) {
    try {
      const {
        userId,
        contentId,
        amountUSD,
        token,
        buyerAddress,
        recipientAddress,
        slippageTolerance = 1,
        metadata,
      } = params;

      // Validate addresses
      if (!isAddress(buyerAddress)) {
        throw new Error('Invalid buyer address');
      }
      if (!isAddress(recipientAddress)) {
        throw new Error('Invalid recipient address');
      }

      // Get payment quote
      const quote = await this.getPaymentQuote({
        amountUSD,
        token,
        slippageTolerance,
      });

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          userId,
          contentId,
          amount: amountUSD,
          currency: 'USD',
          paymentMethod: 'crypto',
          status: 'pending',
          metadata: {
            ...metadata,
            cryptoToken: token,
            tokenAmount: quote.tokenAmount,
            exchangeRate: quote.exchangeRate,
            slippageTolerance: quote.slippageTolerance,
            minTokenAmount: quote.minTokenAmount,
            maxTokenAmount: quote.maxTokenAmount,
            buyerAddress,
            recipientAddress,
            quoteExpiresAt: quote.expiresAt.toISOString(),
          },
        },
      });

      logger.info('Crypto payment created', {
        paymentId: payment.id,
        token,
        amountUSD,
        tokenAmount: quote.tokenAmount,
      });

      return {
        paymentId: payment.id,
        quote,
        buyerAddress,
        recipientAddress,
      };
    } catch (error) {
      logger.error('Error creating crypto payment', { error });
      throw error;
    }
  }

  /**
   * Monitor transaction status
   * Tracks confirmations and updates payment status
   */
  async monitorTransaction(paymentId: string, txHash: string): Promise<TransactionStatus> {
    try {
      // Validate transaction hash
      if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
        throw new Error('Invalid transaction hash');
      }

      // Get transaction receipt
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (!receipt) {
        // Transaction is pending
        return {
          txHash,
          status: 'pending',
          confirmations: 0,
        };
      }

      // Get current block number
      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber + 1;

      // Determine status based on confirmations
      let status: 'pending' | 'confirmed' | 'failed';
      if (receipt.status === 0) {
        status = 'failed';
      } else if (confirmations >= 12) {
        // Consider confirmed after 12 blocks (~3 minutes)
        status = 'confirmed';
      } else {
        status = 'pending';
      }

      // Get block timestamp
      const block = await this.provider.getBlock(receipt.blockNumber);
      if (!block) {
        throw new Error('Block not found');
      }

      // Update payment record
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: status === 'confirmed' ? 'succeeded' : status === 'failed' ? 'failed' : 'processing',
          metadata: {
            txHash,
            blockNumber: receipt.blockNumber,
            confirmations,
            gasUsed: receipt.gasUsed.toString(),
            timestamp: new Date(block.timestamp * 1000).toISOString(),
          },
          completedAt: status === 'confirmed' ? new Date() : null,
          errorMessage: status === 'failed' ? 'Transaction failed on blockchain' : null,
        },
      });

      logger.info('Transaction status updated', {
        paymentId,
        txHash,
        status,
        confirmations,
      });

      return {
        txHash,
        status,
        confirmations,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        timestamp: new Date(block.timestamp * 1000),
      };
    } catch (error) {
      logger.error('Error monitoring transaction', { error, paymentId, txHash });
      throw error;
    }
  }

  /**
   * Verify token transfer on-chain
   * Checks if the correct amount was transferred to the recipient
   */
  async verifyTokenTransfer(params: {
    txHash: string;
    token: 'USDC' | 'USDT' | 'ETH';
    expectedAmount: string;
    recipientAddress: string;
  }): Promise<boolean> {
    try {
      const { txHash, token, expectedAmount, recipientAddress } = params;

      // Get transaction receipt
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (!receipt || receipt.status === 0) {
        return false;
      }

      if (token === 'ETH') {
        // For ETH transfers, check transaction value
        const tx = await this.provider.getTransaction(txHash);
        if (!tx) return false;
        const transferredAmount = formatUnits(tx.value, 18);
        const expected = parseFloat(expectedAmount);
        const actual = parseFloat(transferredAmount);

        // Allow 0.1% tolerance for gas fluctuations
        const tolerance = expected * 0.001;
        return Math.abs(actual - expected) <= tolerance && tx.to?.toLowerCase() === recipientAddress.toLowerCase();
      } else {
        // For ERC20 tokens, parse Transfer event logs
        const stablecoin = STABLECOINS[token];
        const tokenContract = new Contract(stablecoin.address, ERC20_ABI, this.provider);

        // Find Transfer event
        const transferEvent = receipt.logs.find((log) => {
          try {
            const parsed = tokenContract.interface.parseLog({
              topics: [...log.topics],
              data: log.data
            });
            return (
              parsed && parsed.name === 'Transfer' &&
              parsed.args.to.toLowerCase() === recipientAddress.toLowerCase()
            );
          } catch {
            return false;
          }
        });

        if (!transferEvent) {
          return false;
        }

        const parsed = tokenContract.interface.parseLog({
          topics: [...transferEvent.topics],
          data: transferEvent.data
        });
        if (!parsed) return false;
        const transferredAmount = formatUnits(parsed.args.amount, stablecoin.decimals);
        const expected = parseFloat(expectedAmount);
        const actual = parseFloat(transferredAmount);

        // Allow 0.1% tolerance
        const tolerance = expected * 0.001;
        return Math.abs(actual - expected) <= tolerance;
      }
    } catch (error) {
      logger.error('Error verifying token transfer', { error });
      return false;
    }
  }

  /**
   * Get supported stablecoins
   */
  getSupportedTokens() {
    return [
      {
        symbol: 'USDC',
        name: 'USD Coin',
        address: STABLECOINS.USDC.address,
        decimals: STABLECOINS.USDC.decimals,
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        address: STABLECOINS.USDT.address,
        decimals: STABLECOINS.USDT.decimals,
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
      },
    ];
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(address: string, token: 'USDC' | 'USDT' | 'ETH'): Promise<string> {
    try {
      if (!isAddress(address)) {
        throw new Error('Invalid address');
      }

      if (token === 'ETH') {
        const balance = await this.provider.getBalance(address);
        return formatUnits(balance, 18);
      } else {
        const stablecoin = STABLECOINS[token];
        const tokenContract = new Contract(stablecoin.address, ERC20_ABI, this.provider);
        const balance = await tokenContract.balanceOf(address);
        return formatUnits(balance, stablecoin.decimals);
      }
    } catch (error) {
      logger.error('Error getting token balance', { error, address, token });
      throw error;
    }
  }

  /**
   * Estimate gas for token transfer
   */
  async estimateGas(params: {
    token: 'USDC' | 'USDT' | 'ETH';
    from: string;
    to: string;
    amount: string;
  }): Promise<{ gasLimit: string; gasPrice: string; estimatedCost: string }> {
    try {
      const { token, from, to, amount } = params;

      // Get current gas price
      const gasPrice = await this.provider.getFeeData().then(f => f.gasPrice || 0n);

      let gasLimit: bigint;

      if (token === 'ETH') {
        // Estimate gas for ETH transfer
        gasLimit = await this.provider.estimateGas({
          from,
          to,
          value: parseUnits(amount, 18),
        });
      } else {
        // Estimate gas for ERC20 transfer
        const stablecoin = STABLECOINS[token];
        const tokenContract = new Contract(stablecoin.address, ERC20_ABI, this.provider);
        const amountWei = parseUnits(amount, stablecoin.decimals);
        gasLimit = await tokenContract.transfer.estimateGas(to, amountWei, { from });
      }

      // Calculate estimated cost in ETH
      const estimatedCost = gasLimit * gasPrice;

      return {
        gasLimit: gasLimit.toString(),
        gasPrice: formatUnits(gasPrice, 'gwei'),
        estimatedCost: formatUnits(estimatedCost, 18),
      };
    } catch (error) {
      logger.error('Error estimating gas', { error });
      throw error;
    }
  }
}

export const cryptoPaymentService = new CryptoPaymentService();
