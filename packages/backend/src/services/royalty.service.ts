import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import Bull, { Queue, Job } from 'bull';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface RoyaltyDistributionJob {
  tokenId: string;
  salePrice: string;
  seller: string;
  buyer: string;
  txHash: string;
}

interface RoyaltyConfig {
  beneficiaries: Array<{
    address: string;
    percentage: number;
  }>;
}

interface Distribution {
  address: string;
  amount: string;
  percentage: number;
}

export class RoyaltyService {
  private queue: Queue<RoyaltyDistributionJob>;
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private royaltyContract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'
    );

    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', this.provider);

    const contractAddress = process.env.ROYALTY_DISTRIBUTOR_ADDRESS || '';
    const abi = [
      'event NFTSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price)',
      'function distributeRoyalty(uint256 tokenId, address[] recipients, uint256[] amounts) external payable',
      'function getRoyaltyInfo(uint256 tokenId) external view returns (address[] memory recipients, uint256[] memory percentages)',
    ];

    this.royaltyContract = new ethers.Contract(contractAddress, abi, this.wallet);

    // Initialize Bull queue
    this.queue = new Bull('royalty-distribution', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    this.queue.process(this.processDistribution.bind(this));

    this.queue.on('completed', (job) => {
      logger.info(`Royalty distribution completed for job ${job.id}`);
    });

    this.queue.on('failed', (job, err) => {
      logger.error(`Royalty distribution failed for job ${job?.id}:`, err);
    });
  }

  async startEventListener() {
    logger.info('Starting royalty event listener...');

    // Listen to NFTSold events
    this.royaltyContract.on(
      'NFTSold',
      async (tokenId: bigint, seller: string, buyer: string, price: bigint, event: any) => {
        logger.info(`NFTSold event detected: tokenId=${tokenId}, price=${price}`);

        await this.queue.add('distribute', {
          tokenId: tokenId.toString(),
          salePrice: price.toString(),
          seller,
          buyer,
          txHash: event.log.transactionHash,
        });
      }
    );

    // Handle reconnection
    this.provider.on('error', (error) => {
      logger.error('Provider error:', error);
      setTimeout(() => this.startEventListener(), 5000);
    });
  }

  async processDistribution(job: Job<RoyaltyDistributionJob>) {
    const { tokenId, salePrice, seller, buyer, txHash } = job.data;

    logger.info(`Processing royalty distribution for tokenId=${tokenId}`);

    try {
      // 1. Get royalty configuration
      const royaltyConfig = await this.getRoyaltyConfig(tokenId);

      if (!royaltyConfig || royaltyConfig.beneficiaries.length === 0) {
        logger.warn(`No royalty config found for tokenId=${tokenId}`);
        return;
      }

      // 2. Calculate distribution
      const distributions = this.calculateDistributions(salePrice, royaltyConfig);

      // 3. Execute on-chain distribution
      const distributionTx = await this.executeDistribution(tokenId, distributions);

      // 4. Record distribution in database
      await this.recordDistribution({
        tokenId,
        salePrice,
        seller,
        buyer,
        distributions,
        txHash: distributionTx.hash,
        originalTxHash: txHash,
        status: 'completed',
      });

      // 5. Notify beneficiaries (optional)
      await this.notifyBeneficiaries(distributions, tokenId);

      logger.info(`Royalty distribution completed for tokenId=${tokenId}, tx=${distributionTx.hash}`);
    } catch (error) {
      logger.error(`Error processing distribution for tokenId=${tokenId}:`, error);
      throw error;
    }
  }

  async getRoyaltyConfig(tokenId: string): Promise<RoyaltyConfig | null> {
    try {
      // Get from smart contract
      const [recipients, percentages] = await this.royaltyContract.getRoyaltyInfo(tokenId);

      if (!recipients || recipients.length === 0) {
        return null;
      }

      const beneficiaries = recipients.map((address: string, index: number) => ({
        address,
        percentage: Number(percentages[index]),
      }));

      return { beneficiaries };
    } catch (error) {
      logger.error(`Error getting royalty config for tokenId=${tokenId}:`, error);

      // Fallback to database
      const nft = await prisma.nFT.findUnique({
        where: { tokenId },
      });

      if (!nft || !nft.royaltyPercent) {
        return null;
      }

      return {
        beneficiaries: [
          {
            address: nft.creatorAddress,
            percentage: nft.royaltyPercent,
          },
        ],
      };
    }
  }

  calculateDistributions(salePrice: string, config: RoyaltyConfig): Distribution[] {
    const distributions: Distribution[] = [];
    const salePriceBigInt = BigInt(salePrice);

    for (const beneficiary of config.beneficiaries) {
      const amount = (salePriceBigInt * BigInt(beneficiary.percentage)) / 10000n;
      distributions.push({
        address: beneficiary.address,
        amount: amount.toString(),
        percentage: beneficiary.percentage,
      });
    }

    return distributions;
  }

  async executeDistribution(tokenId: string, distributions: Distribution[]) {
    const recipients = distributions.map((d) => d.address);
    const amounts = distributions.map((d) => BigInt(d.amount));

    const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0n);

    const tx = await this.royaltyContract.distributeRoyalty(tokenId, recipients, amounts, {
      value: totalAmount,
      gasLimit: 500000,
    });

    await tx.wait();

    return tx;
  }

  async recordDistribution(data: {
    tokenId: string;
    salePrice: string;
    seller: string;
    buyer: string;
    distributions: Distribution[];
    txHash: string;
    originalTxHash: string;
    status: string;
  }) {
    await prisma.royaltyDistribution.create({
      data: {
        tokenId: data.tokenId,
        salePrice: data.salePrice,
        seller: data.seller,
        buyer: data.buyer,
        distributions: data.distributions,
        txHash: data.txHash,
        originalTxHash: data.originalTxHash,
        status: data.status,
        createdAt: new Date(),
      },
    });
  }

  async notifyBeneficiaries(distributions: Distribution[], tokenId: string) {
    // Send notifications via email, push, etc.
    for (const distribution of distributions) {
      logger.info(
        `Notifying ${distribution.address} of royalty payment: ${distribution.amount} for tokenId=${tokenId}`
      );
      // TODO: Implement actual notification logic
    }
  }

  async getDistributionHistory(tokenId: string) {
    return await prisma.royaltyDistribution.findMany({
      where: { tokenId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserEarnings(address: string) {
    const distributions = await prisma.royaltyDistribution.findMany({
      where: {
        distributions: {
          path: '$[*].address',
          array_contains: address,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalEarnings = 0n;

    for (const dist of distributions) {
      const userDist = (dist.distributions as any[]).find((d) => d.address === address);
      if (userDist) {
        totalEarnings += BigInt(userDist.amount);
      }
    }

    return {
      totalEarnings: totalEarnings.toString(),
      distributions,
    };
  }

  async stopEventListener() {
    this.royaltyContract.removeAllListeners();
    await this.queue.close();
    logger.info('Royalty event listener stopped');
  }
}
