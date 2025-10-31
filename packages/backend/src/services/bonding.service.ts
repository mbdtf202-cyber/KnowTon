import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { valuationClient } from '../utils/valuation-client';

const prisma = new PrismaClient();

// Simple logger
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
};

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
      // Get NFT valuation and risk assessment before issuing bond
      const nft = await prisma.nFT.findUnique({
        where: { tokenId: input.ipnftId },
      });

      if (!nft) {
        throw new Error('NFT not found');
      }

      // Get valuation with risk assessment
      const valuationResponse = await valuationClient.getValuationWithRetry({
        token_id: parseInt(input.ipnftId),
        metadata: {
          title: 'IP-NFT',
          description: 'Intellectual Property NFT',
          category: 'unknown',
          creator: nft.creatorAddress,
          quality_score: 0.7,
          rarity: 0.5,
          has_license: true,
          is_verified: true,
        },
        historical_data: [],
      });

      // Extract risk parameters
      const riskParams = valuationClient.extractRiskParameters(valuationResponse);

      // Validate bond value against valuation
      const requestedValue = parseFloat(input.totalValue);
      const maxBondValue = valuationResponse.estimated_value * 0.8; // Max 80% of valuation

      if (requestedValue > maxBondValue) {
        throw new Error(
          `Bond value ${requestedValue} exceeds maximum allowed ${maxBondValue} (80% of valuation ${valuationResponse.estimated_value})`
        );
      }

      // Adjust tranche APYs based on risk
      const adjustedTranches = this.adjustTranchesForRisk(input.tranches, riskParams);

      logger.info('Issuing bond with valuation', {
        ipnft_id: input.ipnftId,
        valuation: valuationResponse.estimated_value,
        risk_adjusted_value: riskParams.risk_adjusted_value,
        bond_value: requestedValue,
        overall_risk_score: riskParams.overall_risk_score,
      });

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
            create: adjustedTranches.map((tranche, index) => ({
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
        valuation: valuationResponse.estimated_value,
        riskScore: riskParams.overall_risk_score,
        adjustedTranches,
      };
    } catch (error: any) {
      logger.error('Error issuing bond', { error: error.message });
      throw new Error(`Failed to issue bond: ${error.message}`);
    }
  }

  private adjustTranchesForRisk(
    tranches: Tranche[],
    riskParams: any
  ): Tranche[] {
    const riskScore = riskParams.overall_risk_score;
    
    // Adjust APY based on risk (higher risk = higher APY)
    const riskMultiplier = 1 + (riskScore * 0.5); // Up to 50% increase for high risk

    return tranches.map(tranche => ({
      ...tranche,
      apy: Math.round(tranche.apy * riskMultiplier * 100) / 100,
    }));
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

      // Update tranche invested amount
      const tranche = await prisma.tranche.findUnique({
        where: {
          bondId_trancheId: {
            bondId: input.bondId.toString(),
            trancheId: input.trancheId,
          },
        },
      });
      
      if (tranche) {
        const newInvested = (parseFloat(tranche.invested) + parseFloat(input.amount)).toString();
        await prisma.tranche.update({
          where: {
            bondId_trancheId: {
              bondId: input.bondId.toString(),
              trancheId: input.trancheId,
            },
          },
          data: {
            invested: newInvested,
          },
        });
      }

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
      logger.error('Error getting investor bonds', { error: error.message });
      throw new Error(`Failed to get investor bonds: ${error.message}`);
    }
  }

  async getBondValuationAndRisk(bondId: number): Promise<{
    bondId: number;
    currentValuation: number;
    originalValuation: number;
    valuationChange: number;
    riskScore: number;
    riskLevel: string;
    healthScore: number;
    recommendation: string;
  }> {
    try {
      // Get bond details
      const bond = await prisma.bond.findUnique({
        where: { bondId: bondId.toString() },
        include: { tranches: true },
      });

      if (!bond) {
        throw new Error('Bond not found');
      }

      // Get NFT details
      const nft = await prisma.nFT.findUnique({
        where: { tokenId: bond.ipnftId },
      });

      if (!nft) {
        throw new Error('NFT not found');
      }

      // Get current valuation
      const valuationResponse = await valuationClient.getValuationWithRetry({
        token_id: parseInt(bond.ipnftId),
        metadata: {
          title: 'IP-NFT',
          description: 'Intellectual Property NFT',
          category: 'unknown',
          creator: nft.creatorAddress,
          quality_score: 0.7,
          rarity: 0.5,
          has_license: true,
          is_verified: true,
        },
        historical_data: [],
      });

      // Extract risk parameters
      const riskParams = valuationClient.extractRiskParameters(valuationResponse);

      const currentValuation = valuationResponse.estimated_value;
      const originalValuation = parseFloat(bond.totalValue);
      const valuationChange = ((currentValuation - originalValuation) / originalValuation) * 100;

      // Calculate health score (how well collateralized the bond is)
      const totalInvested = bond.tranches.reduce(
        (sum, t) => sum + parseFloat(t.invested),
        0
      );
      const healthScore = totalInvested > 0
        ? (currentValuation / totalInvested) * 100
        : 100;

      // Determine risk level
      let riskLevel = 'medium';
      if (riskParams.overall_risk_score < 0.3 && healthScore > 150) {
        riskLevel = 'low';
      } else if (riskParams.overall_risk_score > 0.6 || healthScore < 120) {
        riskLevel = 'high';
      }

      // Generate recommendation
      let recommendation = 'Monitor position';
      if (healthScore < 110) {
        recommendation = 'High risk - consider reducing exposure';
      } else if (healthScore > 150 && riskParams.overall_risk_score < 0.4) {
        recommendation = 'Good investment opportunity';
      } else if (valuationChange < -20) {
        recommendation = 'Valuation declining - review position';
      }

      logger.info('Bond valuation and risk calculated', {
        bond_id: bondId,
        current_valuation: currentValuation,
        valuation_change: valuationChange,
        risk_score: riskParams.overall_risk_score,
        health_score: healthScore,
      });

      return {
        bondId,
        currentValuation: Math.round(currentValuation * 100) / 100,
        originalValuation: Math.round(originalValuation * 100) / 100,
        valuationChange: Math.round(valuationChange * 100) / 100,
        riskScore: riskParams.overall_risk_score,
        riskLevel,
        healthScore: Math.round(healthScore * 100) / 100,
        recommendation,
      };
    } catch (error: any) {
      logger.error('Error getting bond valuation and risk', {
        bond_id: bondId,
        error: error.message,
      });
      throw new Error(`Failed to get bond valuation and risk: ${error.message}`);
    }
  }

  async refreshBondValuations(): Promise<void> {
    try {
      // Get all active bonds
      const activeBonds = await prisma.bond.findMany({
        where: { status: 'ACTIVE' },
      });

      logger.info('Refreshing bond valuations', { count: activeBonds.length });

      // Refresh valuations in batches
      for (const bond of activeBonds) {
        try {
          const valuation = await this.getBondValuationAndRisk(parseInt(bond.bondId));
          
          // Log valuation update (schema doesn't have these fields yet)
          logger.info('Bond valuation updated', {
            bond_id: bond.bondId,
            valuation: valuation.currentValuation,
            risk_score: valuation.riskScore,
          });

          // Invalidate cache for next request
          await valuationClient.invalidateCache(parseInt(bond.ipnftId));
        } catch (error: any) {
          logger.error('Failed to refresh bond valuation', {
            bond_id: bond.bondId,
            error: error.message,
          });
        }
      }

      logger.info('Bond valuations refreshed successfully');
    } catch (error: any) {
      logger.error('Error refreshing bond valuations', { error: error.message });
      throw error;
    }
  }
}
