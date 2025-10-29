import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Tranche {
  name: string;
  priority: number;
  allocation: string;
  apy: number;
  riskLevel: string;
}

interface IssueBondInput {
  ipnftId: string;
  totalValue: string;
  maturityDate: number;
  tranches: Tranche[];
}

interface InvestInput {
  bondId: number;
  trancheId: number;
  amount: string;
  investor: string;
}

export class BondingService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private bondContract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, this.provider);
    
    const bondAbi = [
      'function issueBond(address nftContract, uint256 tokenId, uint256 totalValue, uint256 maturityDate) external returns (uint256)',
      'function invest(uint256 bondId, uint8 trancheId) external payable',
      'function distributeRevenue(uint256 bondId) external payable',
      'function redeem(uint256 bondId, uint8 trancheId) external',
      'function getBondInfo(uint256 bondId) external view returns (tuple(address nftContract, uint256 tokenId, uint256 totalValue, uint256 maturityDate, uint8 status))',
      'function getTrancheInfo(uint256 bondId, uint8 trancheId) external view returns (tuple(uint256 allocation, uint256 invested, uint256 apy, uint8 priority))',
    ];
    
    this.bondContract = new ethers.Contract(
      process.env.IPBOND_CONTRACT_ADDRESS!,
      bondAbi,
      this.wallet
    );
  }

  async issueBond(input: IssueBondInput) {
    try {
      const tx = await this.bondContract.issueBond(
        process.env.COPYRIGHT_REGISTRY_ADDRESS!,
        input.ipnftId,
        ethers.parseEther(input.totalValue),
        input.maturityDate
      );

      const receipt = await tx.wait();
      const bondId = receipt.logs[0].args[0];

      await prisma.bond.create({
        data: {
          bondId: bondId.toString(),
          ipnftId: input.ipnftId,
          totalValue: input.totalValue,
          maturityDate: new Date(input.maturityDate * 1000),
          status: 'ACTIVE',
          tranches: {
            create: input.tranches.map((tranche, index) => ({
              trancheId: index,
              name: tranche.name,
              priority: tranche.priority,
              allocation: tranche.allocation,
              apy: tranche.apy,
              riskLevel: tranche.riskLevel,
              invested: '0',
            })),
          },
        },
      });

      return {
        bondId: bondId.toString(),
        txHash: receipt.hash,
        status: 'success',
      };
    } catch (error: any) {
      console.error('Error issuing bond:', error);
      throw new Error(`Failed to issue bond: ${error.message}`);
    }
  }

  async invest(input: InvestInput) {
    try {
      const tx = await this.bondContract.invest(
        input.bondId,
        input.trancheId,
        { value: ethers.parseEther(input.amount) }
      );

      const receipt = await tx.wait();

      await prisma.investment.create({
        data: {
          bondId: input.bondId.toString(),
          trancheId: input.trancheId,
          investor: input.investor,
          amount: input.amount,
          txHash: receipt.hash,
          timestamp: new Date(),
        },
      });

      await prisma.tranche.update({
        where: {
          bondId_trancheId: {
            bondId: input.bondId.toString(),
            trancheId: input.trancheId,
          },
        },
        data: {
          invested: {
            increment: input.amount,
          },
        },
      });

      return {
        txHash: receipt.hash,
        status: 'success',
      };
    } catch (error: any) {
      console.error('Error investing in bond:', error);
      throw new Error(`Failed to invest: ${error.message}`);
    }
  }

  async distributeRevenue(bondId: number, amount: string) {
    try {
      const tx = await this.bondContract.distributeRevenue(bondId, {
        value: ethers.parseEther(amount),
      });

      const receipt = await tx.wait();

      await prisma.revenueDistribution.create({
        data: {
          bondId: bondId.toString(),
          amount,
          txHash: receipt.hash,
          timestamp: new Date(),
        },
      });

      return {
        txHash: receipt.hash,
        status: 'success',
      };
    } catch (error: any) {
      console.error('Error distributing revenue:', error);
      throw new Error(`Failed to distribute revenue: ${error.message}`);
    }
  }

  async redeem(bondId: number, trancheId: number, investor: string) {
    try {
      const tx = await this.bondContract.redeem(bondId, trancheId);
      const receipt = await tx.wait();

      await prisma.redemption.create({
        data: {
          bondId: bondId.toString(),
          trancheId,
          investor,
          txHash: receipt.hash,
          timestamp: new Date(),
        },
      });

      return {
        txHash: receipt.hash,
        status: 'success',
      };
    } catch (error: any) {
      console.error('Error redeeming bond:', error);
      throw new Error(`Failed to redeem: ${error.message}`);
    }
  }

  async getBondInfo(bondId: number) {
    try {
      const bondInfo = await this.bondContract.getBondInfo(bondId);
      const dbBond = await prisma.bond.findUnique({
        where: { bondId: bondId.toString() },
        include: { tranches: true },
      });

      return {
        bondId,
        nftContract: bondInfo.nftContract,
        tokenId: bondInfo.tokenId.toString(),
        totalValue: ethers.formatEther(bondInfo.totalValue),
        maturityDate: Number(bondInfo.maturityDate),
        status: bondInfo.status,
        tranches: dbBond?.tranches || [],
      };
    } catch (error: any) {
      console.error('Error getting bond info:', error);
      throw new Error(`Failed to get bond info: ${error.message}`);
    }
  }

  async getInvestorBonds(investor: string) {
    try {
      const investments = await prisma.investment.findMany({
        where: { investor },
        include: {
          bond: {
            include: { tranches: true },
          },
        },
      });

      return investments;
    } catch (error: any) {
      console.error('Error getting investor bonds:', error);
      throw new Error(`Failed to get investor bonds: ${error.message}`);
    }
  }
}
