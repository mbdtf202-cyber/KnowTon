import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple logger
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
};

interface Beneficiary {
  recipient: string;
  percentage: number; // basis points (10000 = 100%)
}

interface DistributionCalculation {
  tokenId: string;
  totalAmount: string;
  beneficiaries: Array<{
    recipient: string;
    percentage: number;
    amount: string;
  }>;
  gasEstimate: string;
  timestamp: Date;
}

interface BatchDistribution {
  distributions: DistributionCalculation[];
  totalGasEstimate: string;
  estimatedCost: string;
}

interface RetryConfig {
  maxRetries: number;
  retryDelay: number; // milliseconds
  backoffMultiplier: number;
}

export class RoyaltyDistributionService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private royaltyContract: ethers.Contract;
  private readonly BASIS_POINTS = 10000;
  private readonly MAX_BATCH_SIZE = 10;
  private readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    retryDelay: 2000,
    backoffMultiplier: 2,
  };

  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      process.env.ARBITRUM_RPC_URL || 'http://localhost:8545'
    );
    
    // Use a valid test private key if none provided
    const privateKey = process.env.PRIVATE_KEY || 
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Hardhat test key
    
    this.wallet = new ethers.Wallet(privateKey, this.provider);

    const royaltyAbi = [
      'function configureRoyalty(uint256 tokenId, tuple(address recipient, uint96 percentage)[] beneficiaries) external',
      'function distributeRoyalty(uint256 tokenId) external payable',
      'function distributeTokenRoyalty(uint256 tokenId, address token, uint256 amount) external',
      'function getRoyaltyConfig(uint256 tokenId) external view returns (tuple(address recipient, uint96 percentage)[] beneficiaries, uint256 totalDistributed, bool isActive)',
      'function getPendingWithdrawal(uint256 tokenId, address beneficiary) external view returns (uint256)',
    ];

    this.royaltyContract = new ethers.Contract(
      process.env.ROYALTY_DISTRIBUTOR_ADDRESS || ethers.ZeroAddress,
      royaltyAbi,
      this.wallet
    );
  }

  /**
   * Calculate revenue splits off-chain
   * This avoids expensive on-chain calculations
   */
  async calculateDistribution(
    tokenId: string,
    totalAmount: string,
    beneficiaries: Beneficiary[]
  ): Promise<DistributionCalculation> {
    try {
      // Validate inputs
      if (!tokenId || !totalAmount || !beneficiaries || beneficiaries.length === 0) {
        throw new Error('Invalid distribution parameters');
      }

      // Validate total percentage equals 100%
      const totalPercentage = beneficiaries.reduce((sum, b) => sum + b.percentage, 0);
      if (totalPercentage !== this.BASIS_POINTS) {
        throw new Error(
          `Total percentage must equal 100% (10000 basis points), got ${totalPercentage}`
        );
      }

      // Calculate individual amounts off-chain
      const amountWei = ethers.parseEther(totalAmount);
      const calculatedBeneficiaries = beneficiaries.map((beneficiary) => {
        const share = (amountWei * BigInt(beneficiary.percentage)) / BigInt(this.BASIS_POINTS);
        return {
          recipient: beneficiary.recipient,
          percentage: beneficiary.percentage,
          amount: ethers.formatEther(share),
        };
      });

      // Estimate gas for this distribution
      const gasEstimate = await this.estimateDistributionGas(tokenId, totalAmount);

      const calculation: DistributionCalculation = {
        tokenId,
        totalAmount,
        beneficiaries: calculatedBeneficiaries,
        gasEstimate: ethers.formatEther(gasEstimate),
        timestamp: new Date(),
      };

      logger.info('Distribution calculated off-chain', {
        token_id: tokenId,
        total_amount: totalAmount,
        beneficiary_count: beneficiaries.length,
        gas_estimate: calculation.gasEstimate,
      });

      return calculation;
    } catch (error: any) {
      logger.error('Error calculating distribution', {
        token_id: tokenId,
        error: error.message,
      });
      throw new Error(`Failed to calculate distribution: ${error.message}`);
    }
  }

  /**
   * Batch multiple distributions for gas optimization
   * Combines multiple distributions into a single transaction when possible
   */
  async batchDistributions(
    distributions: Array<{
      tokenId: string;
      amount: string;
    }>
  ): Promise<BatchDistribution> {
    try {
      if (distributions.length === 0) {
        throw new Error('No distributions to batch');
      }

      if (distributions.length > this.MAX_BATCH_SIZE) {
        throw new Error(`Batch size exceeds maximum of ${this.MAX_BATCH_SIZE}`);
      }

      // Calculate each distribution off-chain
      const calculations: DistributionCalculation[] = [];
      let totalGasEstimate = BigInt(0);

      for (const dist of distributions) {
        // Get beneficiaries from contract or database
        const beneficiaries = await this.getBeneficiaries(dist.tokenId);
        
        const calculation = await this.calculateDistribution(
          dist.tokenId,
          dist.amount,
          beneficiaries
        );
        
        calculations.push(calculation);
        totalGasEstimate += ethers.parseEther(calculation.gasEstimate);
      }

      // Get current gas price
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(0);
      const estimatedCost = totalGasEstimate * gasPrice;

      const batch: BatchDistribution = {
        distributions: calculations,
        totalGasEstimate: ethers.formatEther(totalGasEstimate),
        estimatedCost: ethers.formatEther(estimatedCost),
      };

      logger.info('Batch distributions calculated', {
        count: distributions.length,
        total_gas_estimate: batch.totalGasEstimate,
        estimated_cost: batch.estimatedCost,
      });

      return batch;
    } catch (error: any) {
      logger.error('Error batching distributions', { error: error.message });
      throw new Error(`Failed to batch distributions: ${error.message}`);
    }
  }

  /**
   * Execute distribution with retry logic for failed transactions
   */
  async executeDistribution(
    tokenId: string,
    amount: string,
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<{ txHash: string; status: string; gasUsed: string }> {
    const config = { ...this.DEFAULT_RETRY_CONFIG, ...retryConfig };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = config.retryDelay * Math.pow(config.backoffMultiplier, attempt - 1);
          logger.info(`Retrying distribution (attempt ${attempt}/${config.maxRetries})`, {
            token_id: tokenId,
            delay_ms: delay,
          });
          await this.sleep(delay);
        }

        // Execute the distribution transaction
        const tx = await this.royaltyContract.distributeRoyalty(tokenId, {
          value: ethers.parseEther(amount),
          gasLimit: 500000, // Set reasonable gas limit
        });

        logger.info('Distribution transaction sent', {
          token_id: tokenId,
          tx_hash: tx.hash,
          attempt: attempt + 1,
        });

        // Wait for confirmation
        const receipt = await tx.wait();

        // Save to database
        await this.saveDistribution(tokenId, amount, receipt.hash, 'completed');

        logger.info('Distribution executed successfully', {
          token_id: tokenId,
          tx_hash: receipt.hash,
          gas_used: receipt.gasUsed.toString(),
          attempt: attempt + 1,
        });

        return {
          txHash: receipt.hash,
          status: 'completed',
          gasUsed: ethers.formatUnits(receipt.gasUsed, 'gwei'),
        };
      } catch (error: any) {
        lastError = error;
        logger.warn('Distribution attempt failed', {
          token_id: tokenId,
          attempt: attempt + 1,
          error: error.message,
        });

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          logger.error('Non-retryable error encountered', {
            token_id: tokenId,
            error: error.message,
          });
          break;
        }
      }
    }

    // All retries exhausted
    logger.error('Distribution failed after all retries', {
      token_id: tokenId,
      attempts: config.maxRetries + 1,
      error: lastError?.message,
    });

    // Save failed distribution to database
    await this.saveDistribution(tokenId, amount, '', 'failed');

    throw new Error(
      `Distribution failed after ${config.maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  /**
   * Execute batch distributions with retry logic
   */
  async executeBatchDistributions(
    distributions: Array<{ tokenId: string; amount: string }>,
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<Array<{ tokenId: string; txHash: string; status: string }>> {
    const results: Array<{ tokenId: string; txHash: string; status: string }> = [];

    logger.info('Executing batch distributions', { count: distributions.length });

    for (const dist of distributions) {
      try {
        const result = await this.executeDistribution(
          dist.tokenId,
          dist.amount,
          retryConfig
        );
        results.push({
          tokenId: dist.tokenId,
          txHash: result.txHash,
          status: result.status,
        });
      } catch (error: any) {
        logger.error('Batch distribution item failed', {
          token_id: dist.tokenId,
          error: error.message,
        });
        results.push({
          tokenId: dist.tokenId,
          txHash: '',
          status: 'failed',
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'completed').length;
    logger.info('Batch distributions completed', {
      total: distributions.length,
      successful: successCount,
      failed: distributions.length - successCount,
    });

    return results;
  }

  /**
   * Estimate gas price before execution
   * Helps users understand transaction costs upfront
   */
  async estimateDistributionGas(
    tokenId: string,
    amount: string
  ): Promise<bigint> {
    try {
      const gasEstimate = await this.royaltyContract.distributeRoyalty.estimateGas(
        tokenId,
        {
          value: ethers.parseEther(amount),
        }
      );

      return gasEstimate;
    } catch (error: any) {
      logger.warn('Gas estimation failed, using default', {
        token_id: tokenId,
        error: error.message,
      });
      // Return default gas estimate if estimation fails
      return BigInt(300000);
    }
  }

  /**
   * Get current gas price and estimate cost
   */
  async getGasPriceEstimate(): Promise<{
    gasPrice: string;
    gasPriceGwei: string;
    estimatedCostForDistribution: string;
  }> {
    try {
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(0);
      const gasPriceGwei = ethers.formatUnits(gasPrice, 'gwei');

      // Estimate cost for a typical distribution (300k gas)
      const typicalGas = BigInt(300000);
      const estimatedCost = gasPrice * typicalGas;

      return {
        gasPrice: gasPrice.toString(),
        gasPriceGwei,
        estimatedCostForDistribution: ethers.formatEther(estimatedCost),
      };
    } catch (error: any) {
      logger.error('Error getting gas price', { error: error.message });
      throw new Error(`Failed to get gas price: ${error.message}`);
    }
  }

  /**
   * Get beneficiaries for a token from contract or database
   */
  private async getBeneficiaries(tokenId: string): Promise<Beneficiary[]> {
    try {
      // Try to get from contract first
      const config = await this.royaltyContract.getRoyaltyConfig(tokenId);
      
      if (config.beneficiaries && config.beneficiaries.length > 0) {
        return config.beneficiaries.map((b: any) => ({
          recipient: b.recipient,
          percentage: Number(b.percentage),
        }));
      }

      // Fallback to database or default
      logger.warn('No beneficiaries found in contract', { token_id: tokenId });
      return [];
    } catch (error: any) {
      logger.error('Error getting beneficiaries', {
        token_id: tokenId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Save distribution record to database
   */
  private async saveDistribution(
    tokenId: string,
    amount: string,
    txHash: string,
    status: string
  ): Promise<void> {
    try {
      await prisma.royaltyDistribution.create({
        data: {
          tokenId,
          salePrice: amount,
          seller: '', // Will be populated from transaction
          buyer: '', // Will be populated from transaction
          distributions: {}, // Will be populated with beneficiary data
          txHash: txHash || `pending-${Date.now()}`,
          originalTxHash: txHash || '',
          status,
        },
      });
    } catch (error: any) {
      logger.error('Error saving distribution to database', {
        token_id: tokenId,
        error: error.message,
      });
      // Don't throw - database save failure shouldn't fail the distribution
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'NETWORK_ERROR',
      'TIMEOUT',
      'SERVER_ERROR',
      'NONCE_EXPIRED',
      'REPLACEMENT_UNDERPRICED',
      'INSUFFICIENT_FUNDS', // Might be temporary
    ];

    const errorMessage = error.message?.toUpperCase() || '';
    return retryableErrors.some((retryable) => errorMessage.includes(retryable));
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get pending distributions that need to be executed
   */
  async getPendingDistributions(): Promise<
    Array<{ tokenId: string; amount: string; createdAt: Date }>
  > {
    try {
      const pending = await prisma.royaltyDistribution.findMany({
        where: {
          status: 'pending',
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: this.MAX_BATCH_SIZE,
      });

      return pending.map((p) => ({
        tokenId: p.tokenId,
        amount: p.salePrice,
        createdAt: p.createdAt,
      }));
    } catch (error: any) {
      logger.error('Error getting pending distributions', { error: error.message });
      return [];
    }
  }

  /**
   * Process pending distributions in batch
   */
  async processPendingDistributions(): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    try {
      const pending = await this.getPendingDistributions();

      if (pending.length === 0) {
        logger.info('No pending distributions to process');
        return { processed: 0, successful: 0, failed: 0 };
      }

      logger.info('Processing pending distributions', { count: pending.length });

      const results = await this.executeBatchDistributions(
        pending.map((p) => ({ tokenId: p.tokenId, amount: p.amount }))
      );

      const successful = results.filter((r) => r.status === 'completed').length;
      const failed = results.length - successful;

      return {
        processed: results.length,
        successful,
        failed,
      };
    } catch (error: any) {
      logger.error('Error processing pending distributions', { error: error.message });
      throw error;
    }
  }

  /**
   * Get distribution history for a creator
   */
  async getDistributionHistory(
    creatorAddress: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    distributions: Array<{
      id: string;
      tokenId: string;
      salePrice: string;
      distributions: any;
      txHash: string;
      status: string;
      createdAt: Date;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      // Get distributions where the creator is a seller or recipient
      const [distributions, total] = await Promise.all([
        prisma.royaltyDistribution.findMany({
          where: {
            OR: [
              { seller: creatorAddress },
              {
                distributions: {
                  path: '$[*].recipient',
                  array_contains: creatorAddress,
                },
              },
            ],
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        prisma.royaltyDistribution.count({
          where: {
            OR: [
              { seller: creatorAddress },
              {
                distributions: {
                  path: '$[*].recipient',
                  array_contains: creatorAddress,
                },
              },
            ],
          },
        }),
      ]);

      return {
        distributions: distributions.map((d) => ({
          id: d.id,
          tokenId: d.tokenId,
          salePrice: d.salePrice,
          distributions: d.distributions,
          txHash: d.txHash,
          status: d.status,
          createdAt: d.createdAt,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      logger.error('Error getting distribution history', {
        creator: creatorAddress,
        error: error.message,
      });
      throw new Error(`Failed to get distribution history: ${error.message}`);
    }
  }

  /**
   * Get distribution statistics for a creator
   */
  async getDistributionStats(creatorAddress: string): Promise<{
    totalDistributions: number;
    totalRevenue: string;
    pendingDistributions: number;
    pendingRevenue: string;
    successRate: number;
    averageDistribution: string;
  }> {
    try {
      // Get all distributions for this creator
      const distributions = await prisma.royaltyDistribution.findMany({
        where: {
          OR: [
            { seller: creatorAddress },
            {
              distributions: {
                path: '$[*].recipient',
                array_contains: creatorAddress,
              },
            },
          ],
        },
      });

      // Calculate statistics
      const completed = distributions.filter((d) => d.status === 'completed');
      const pending = distributions.filter((d) => d.status === 'pending');

      const totalRevenue = completed.reduce((sum, d) => {
        const dist = d.distributions as any;
        if (Array.isArray(dist)) {
          const creatorShare = dist.find((b: any) => b.recipient === creatorAddress);
          if (creatorShare) {
            return sum + parseFloat(creatorShare.amount || '0');
          }
        }
        return sum;
      }, 0);

      const pendingRevenue = pending.reduce((sum, d) => {
        const dist = d.distributions as any;
        if (Array.isArray(dist)) {
          const creatorShare = dist.find((b: any) => b.recipient === creatorAddress);
          if (creatorShare) {
            return sum + parseFloat(creatorShare.amount || '0');
          }
        }
        return sum;
      }, 0);

      const successRate =
        distributions.length > 0
          ? (completed.length / distributions.length) * 100
          : 0;

      const averageDistribution =
        completed.length > 0 ? totalRevenue / completed.length : 0;

      return {
        totalDistributions: distributions.length,
        totalRevenue: totalRevenue.toFixed(4),
        pendingDistributions: pending.length,
        pendingRevenue: pendingRevenue.toFixed(4),
        successRate: parseFloat(successRate.toFixed(2)),
        averageDistribution: averageDistribution.toFixed(4),
      };
    } catch (error: any) {
      logger.error('Error getting distribution stats', {
        creator: creatorAddress,
        error: error.message,
      });
      throw new Error(`Failed to get distribution stats: ${error.message}`);
    }
  }
}
