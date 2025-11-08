import { JsonRpcProvider, Wallet, parseUnits, formatUnits, isAddress } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { kycService } from './kyc.service';
import { cryptoPaymentService } from './crypto-payment.service';

const prisma = new PrismaClient();

// Withdrawal configuration
const MIN_WITHDRAWAL_USD = 50;
const KYC_THRESHOLD_USD = 1000;
const WITHDRAWAL_FEE_PERCENT = 0.01; // 1% fee for crypto withdrawals
const REQUIRED_CONFIRMATIONS = 12; // ~3 minutes on Ethereum

export interface CreateCryptoWithdrawalParams {
  userId: string;
  walletAddress: string;
  amountUSD: number;
  token: 'ETH' | 'USDC' | 'USDT';
  metadata?: Record<string, string>;
}

export interface WithdrawalQuote {
  amountUSD: number;
  tokenAmount: string;
  token: string;
  exchangeRate: string;
  gasFee: string;
  gasFeeUSD: string;
  withdrawalFee: string;
  withdrawalFeeUSD: string;
  netAmount: string;
  netAmountUSD: string;
  estimatedTime: string;
}

export interface WithdrawalStatus {
  withdrawalId: string;
  status: 'pending' | 'processing' | 'confirmed' | 'failed';
  txHash?: string;
  confirmations: number;
  requiredConfirmations: number;
  blockNumber?: number;
  estimatedCompletion?: Date;
}

export class CryptoWithdrawalService {
  private provider: JsonRpcProvider;
  private wallet: Wallet | null = null;

  constructor() {
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key';
    this.provider = new JsonRpcProvider(rpcUrl);

    // Initialize wallet for withdrawals (hot wallet)
    const privateKey = process.env.WITHDRAWAL_WALLET_PRIVATE_KEY;
    if (privateKey) {
      this.wallet = new Wallet(privateKey, this.provider);
      logger.info('Crypto withdrawal wallet initialized', {
        address: this.wallet.address,
      });
    } else {
      logger.warn('Withdrawal wallet private key not configured');
    }
  }

  /**
   * Get withdrawal quote with gas estimation
   */
  async getWithdrawalQuote(params: {
    amountUSD: number;
    token: 'ETH' | 'USDC' | 'USDT';
    walletAddress: string;
  }): Promise<WithdrawalQuote> {
    try {
      const { amountUSD, token, walletAddress } = params;

      // Validate minimum withdrawal
      if (amountUSD < MIN_WITHDRAWAL_USD) {
        throw new Error(`Minimum withdrawal amount is $${MIN_WITHDRAWAL_USD}`);
      }

      // Validate wallet address
      if (!isAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }

      // Get exchange rate from Chainlink
      const quote = await cryptoPaymentService.getPaymentQuote({
        amountUSD,
        token,
        slippageTolerance: 1,
      });

      // Estimate gas fees
      if (!this.wallet) {
        throw new Error('Withdrawal wallet not configured');
      }

      const gasEstimate = await cryptoPaymentService.estimateGas({
        token,
        from: this.wallet.address,
        to: walletAddress,
        amount: quote.tokenAmount,
      });

      // Get ETH price for gas fee calculation in USD
      const ethQuote = await cryptoPaymentService.getPaymentQuote({
        amountUSD: 1,
        token: 'ETH',
        slippageTolerance: 1,
      });
      const ethPrice = 1 / parseFloat(ethQuote.tokenAmount);

      const gasFeeETH = parseFloat(gasEstimate.estimatedCost);
      const gasFeeUSD = gasFeeETH * ethPrice;

      // Calculate withdrawal fee (1%)
      const withdrawalFeeUSD = amountUSD * WITHDRAWAL_FEE_PERCENT;
      const withdrawalFeeToken = parseFloat(quote.tokenAmount) * WITHDRAWAL_FEE_PERCENT;

      // Calculate net amounts
      const netAmountUSD = amountUSD - withdrawalFeeUSD - gasFeeUSD;
      const netAmountToken = parseFloat(quote.tokenAmount) - withdrawalFeeToken;

      logger.info('Withdrawal quote generated', {
        amountUSD,
        token,
        tokenAmount: quote.tokenAmount,
        gasFeeUSD,
        withdrawalFeeUSD,
        netAmountUSD,
      });

      return {
        amountUSD,
        tokenAmount: quote.tokenAmount,
        token,
        exchangeRate: quote.exchangeRate,
        gasFee: gasEstimate.estimatedCost,
        gasFeeUSD: gasFeeUSD.toFixed(2),
        withdrawalFee: withdrawalFeeToken.toFixed(token === 'ETH' ? 18 : 6),
        withdrawalFeeUSD: withdrawalFeeUSD.toFixed(2),
        netAmount: netAmountToken.toFixed(token === 'ETH' ? 18 : 6),
        netAmountUSD: netAmountUSD.toFixed(2),
        estimatedTime: 'Instant (confirmed in ~3 minutes)',
      };
    } catch (error) {
      logger.error('Error generating withdrawal quote', { error });
      throw error;
    }
  }

  /**
   * Create crypto withdrawal request
   */
  async createWithdrawal(params: CreateCryptoWithdrawalParams) {
    try {
      const { userId, walletAddress, amountUSD, token, metadata } = params;

      // Validate minimum withdrawal
      if (amountUSD < MIN_WITHDRAWAL_USD) {
        throw new Error(`Minimum withdrawal amount is $${MIN_WITHDRAWAL_USD}`);
      }

      // Validate wallet address
      if (!isAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }

      // Check KYC requirement for large withdrawals
      if (amountUSD > KYC_THRESHOLD_USD) {
        const kycStatus = await kycService.getUserKYCStatus(userId);
        if (kycStatus.status !== 'approved' || kycStatus.level < 1) {
          throw new Error(
            `KYC verification required for withdrawals over $${KYC_THRESHOLD_USD}. Please complete KYC verification.`
          );
        }
      }

      // Check available balance
      const balance = await this.getAvailableBalance(userId);
      if (balance < amountUSD) {
        throw new Error(`Insufficient balance. Available: $${balance.toFixed(2)}`);
      }

      // Get withdrawal quote
      const quote = await this.getWithdrawalQuote({
        amountUSD,
        token,
        walletAddress,
      });

      // Get user KYC status
      const kycStatus = await kycService.getUserKYCStatus(userId);

      // Create withdrawal record
      const withdrawal = await prisma.cryptoWithdrawal.create({
        data: {
          userId,
          walletAddress,
          amount: parseFloat(quote.netAmount),
          amountUSD,
          token,
          tokenAmount: quote.tokenAmount,
          exchangeRate: parseFloat(quote.exchangeRate),
          gasEstimate: quote.gasFee,
          gasFee: parseFloat(quote.gasFeeUSD),
          status: 'pending',
          kycVerified: kycStatus.status === 'approved',
          kycLevel: kycStatus.level,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        },
      });

      logger.info('Crypto withdrawal created', {
        withdrawalId: withdrawal.id,
        userId,
        amountUSD,
        token,
        walletAddress,
      });

      // Process withdrawal asynchronously
      this.processWithdrawal(withdrawal.id).catch((error) => {
        logger.error('Error processing withdrawal', {
          withdrawalId: withdrawal.id,
          error,
        });
      });

      return {
        withdrawalId: withdrawal.id,
        status: 'pending',
        quote,
        estimatedCompletion: new Date(Date.now() + 3 * 60 * 1000), // ~3 minutes
      };
    } catch (error) {
      logger.error('Error creating withdrawal', { error });
      throw error;
    }
  }

  /**
   * Process withdrawal - send transaction on-chain
   */
  private async processWithdrawal(withdrawalId: string) {
    try {
      if (!this.wallet) {
        throw new Error('Withdrawal wallet not configured');
      }

      // Get withdrawal details
      const withdrawal = await prisma.cryptoWithdrawal.findUnique({
        where: { id: withdrawalId },
      });

      if (!withdrawal) {
        throw new Error('Withdrawal not found');
      }

      if (withdrawal.status !== 'pending') {
        logger.warn('Withdrawal already processed', {
          withdrawalId,
          status: withdrawal.status,
        });
        return;
      }

      // Update status to processing
      await prisma.cryptoWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'processing',
          updatedAt: new Date(),
        },
      });

      // Send transaction
      let txHash: string;

      if (withdrawal.token === 'ETH') {
        // Send ETH
        const tx = await this.wallet.sendTransaction({
          to: withdrawal.walletAddress,
          value: parseUnits(withdrawal.amount.toString(), 18),
        });
        txHash = tx.hash;
        await tx.wait(1); // Wait for 1 confirmation
      } else {
        // Send ERC20 token (USDC/USDT)
        const { STABLECOINS } = await import('./crypto-payment.service');
        const stablecoin = STABLECOINS[withdrawal.token as 'USDC' | 'USDT'];
        
        const tokenContract = new (await import('ethers')).Contract(
          stablecoin.address,
          [
            'function transfer(address to, uint256 amount) returns (bool)',
          ],
          this.wallet
        );

        const amountWei = parseUnits(
          withdrawal.amount.toString(),
          stablecoin.decimals
        );

        const tx = await tokenContract.transfer(
          withdrawal.walletAddress,
          amountWei
        );
        txHash = tx.hash;
        await tx.wait(1); // Wait for 1 confirmation
      }

      // Update withdrawal with transaction hash
      await prisma.cryptoWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          txHash,
          confirmations: 1,
          updatedAt: new Date(),
        },
      });

      logger.info('Withdrawal transaction sent', {
        withdrawalId,
        txHash,
        token: withdrawal.token,
        amount: withdrawal.amount.toString(),
      });

      // Start monitoring transaction
      this.monitorWithdrawal(withdrawalId, txHash).catch((error) => {
        logger.error('Error monitoring withdrawal', {
          withdrawalId,
          error,
        });
      });
    } catch (error: any) {
      logger.error('Error processing withdrawal', {
        withdrawalId,
        error: error.message,
      });

      // Update withdrawal status to failed
      await prisma.cryptoWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'failed',
          failureReason: error.message || 'Transaction failed',
          updatedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Monitor withdrawal transaction confirmations
   */
  private async monitorWithdrawal(withdrawalId: string, txHash: string) {
    try {
      let confirmations = 0;

      while (confirmations < REQUIRED_CONFIRMATIONS) {
        // Wait 15 seconds between checks
        await new Promise((resolve) => setTimeout(resolve, 15000));

        // Get transaction receipt
        const receipt = await this.provider.getTransactionReceipt(txHash);

        if (!receipt) {
          logger.warn('Transaction receipt not found yet', {
            withdrawalId,
            txHash,
          });
          continue;
        }

        // Check if transaction failed
        if (receipt.status === 0) {
          await prisma.cryptoWithdrawal.update({
            where: { id: withdrawalId },
            data: {
              status: 'failed',
              failureReason: 'Transaction reverted on blockchain',
              blockNumber: receipt.blockNumber,
              updatedAt: new Date(),
            },
          });

          logger.error('Withdrawal transaction failed', {
            withdrawalId,
            txHash,
            blockNumber: receipt.blockNumber,
          });
          return;
        }

        // Calculate confirmations
        const currentBlock = await this.provider.getBlockNumber();
        confirmations = currentBlock - receipt.blockNumber + 1;

        // Update withdrawal with confirmations
        await prisma.cryptoWithdrawal.update({
          where: { id: withdrawalId },
          data: {
            confirmations,
            blockNumber: receipt.blockNumber,
            updatedAt: new Date(),
          },
        });

        logger.info('Withdrawal confirmations updated', {
          withdrawalId,
          confirmations,
          required: REQUIRED_CONFIRMATIONS,
        });
      }

      // Mark as confirmed
      await prisma.cryptoWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'confirmed',
          confirmations,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info('Withdrawal confirmed', {
        withdrawalId,
        txHash,
        confirmations,
      });
    } catch (error) {
      logger.error('Error monitoring withdrawal', {
        withdrawalId,
        txHash,
        error,
      });
      throw error;
    }
  }

  /**
   * Get withdrawal status
   */
  async getWithdrawalStatus(withdrawalId: string): Promise<WithdrawalStatus> {
    try {
      const withdrawal = await prisma.cryptoWithdrawal.findUnique({
        where: { id: withdrawalId },
      });

      if (!withdrawal) {
        throw new Error('Withdrawal not found');
      }

      let estimatedCompletion: Date | undefined;
      if (withdrawal.status === 'processing' && withdrawal.confirmations < REQUIRED_CONFIRMATIONS) {
        // Estimate ~15 seconds per block
        const blocksRemaining = REQUIRED_CONFIRMATIONS - withdrawal.confirmations;
        const secondsRemaining = blocksRemaining * 15;
        estimatedCompletion = new Date(Date.now() + secondsRemaining * 1000);
      }

      return {
        withdrawalId: withdrawal.id,
        status: withdrawal.status as any,
        txHash: withdrawal.txHash || undefined,
        confirmations: withdrawal.confirmations,
        requiredConfirmations: REQUIRED_CONFIRMATIONS,
        blockNumber: withdrawal.blockNumber || undefined,
        estimatedCompletion,
      };
    } catch (error) {
      logger.error('Error getting withdrawal status', { error });
      throw error;
    }
  }

  /**
   * Get withdrawal history for a user
   */
  async getWithdrawalHistory(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
    }
  ) {
    try {
      const { limit = 20, offset = 0, status } = options || {};

      const where: any = { userId };
      if (status) {
        where.status = status;
      }

      const [withdrawals, total] = await Promise.all([
        prisma.cryptoWithdrawal.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.cryptoWithdrawal.count({ where }),
      ]);

      // Calculate totals
      const totalWithdrawn = await prisma.cryptoWithdrawal.aggregate({
        where: {
          userId,
          status: 'confirmed',
        },
        _sum: {
          amountUSD: true,
        },
      });

      return {
        withdrawals,
        total,
        limit,
        offset,
        totalWithdrawn: Number(totalWithdrawn._sum.amountUSD || 0),
      };
    } catch (error) {
      logger.error('Error getting withdrawal history', { error });
      throw error;
    }
  }

  /**
   * Get available balance for withdrawals
   */
  private async getAvailableBalance(userId: string): Promise<number> {
    // Calculate available balance from completed payments minus withdrawals
    const [totalRevenue, totalWithdrawals] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          userId,
          status: 'succeeded',
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.cryptoWithdrawal.aggregate({
        where: {
          userId,
          status: { in: ['pending', 'processing', 'confirmed'] },
        },
        _sum: {
          amountUSD: true,
        },
      }),
    ]);

    const revenue = Number(totalRevenue._sum.amount || 0);
    const withdrawals = Number(totalWithdrawals._sum.amountUSD || 0);

    return revenue - withdrawals;
  }

  /**
   * Cancel pending withdrawal
   */
  async cancelWithdrawal(withdrawalId: string, userId: string) {
    try {
      const withdrawal = await prisma.cryptoWithdrawal.findUnique({
        where: { id: withdrawalId },
      });

      if (!withdrawal) {
        throw new Error('Withdrawal not found');
      }

      if (withdrawal.userId !== userId) {
        throw new Error('Unauthorized');
      }

      if (withdrawal.status !== 'pending') {
        throw new Error('Can only cancel pending withdrawals');
      }

      await prisma.cryptoWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'failed',
          failureReason: 'Cancelled by user',
          updatedAt: new Date(),
        },
      });

      logger.info('Withdrawal cancelled', {
        withdrawalId,
        userId,
      });

      return {
        success: true,
        message: 'Withdrawal cancelled successfully',
      };
    } catch (error) {
      logger.error('Error cancelling withdrawal', { error });
      throw error;
    }
  }

  /**
   * Get withdrawal limits for user
   */
  async getWithdrawalLimits(userId: string) {
    try {
      const kycStatus = await kycService.getUserKYCStatus(userId);
      const balance = await this.getAvailableBalance(userId);

      return {
        minWithdrawal: MIN_WITHDRAWAL_USD,
        maxWithdrawal: kycStatus.status === 'approved' ? balance : Math.min(balance, KYC_THRESHOLD_USD),
        kycRequired: KYC_THRESHOLD_USD,
        kycStatus: kycStatus.status,
        kycLevel: kycStatus.level,
        availableBalance: balance,
        withdrawalFeePercent: WITHDRAWAL_FEE_PERCENT * 100,
      };
    } catch (error) {
      logger.error('Error getting withdrawal limits', { error });
      throw error;
    }
  }
}

export const cryptoWithdrawalService = new CryptoWithdrawalService();
