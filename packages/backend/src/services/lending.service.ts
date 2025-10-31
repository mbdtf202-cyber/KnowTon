import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { valuationClient } from '../utils/valuation-client';

const prisma = new PrismaClient();

// Simple logger
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
};

interface SupplyCollateralInput {
  tokenId: string;
  userAddress: string;
  amount?: string;
}

interface BorrowInput {
  userAddress: string;
  amount: string;
  asset: string;
  collateralTokenId: string;
}

interface RepayInput {
  userAddress: string;
  amount: string;
  asset: string;
}

interface WithdrawCollateralInput {
  tokenId: string;
  userAddress: string;
  amount?: string;
}

export class LendingService {
  private lendingAdapter: any;

  constructor() {
    // Initialize lending adapter (Aave/Compound integration)
    this.lendingAdapter = {
      supplyCollateral: async (tokenId: string, userAddress: string) => {
        // Mock implementation
        return { success: true, transactionHash: '0x123' };
      },
      borrow: async (userAddress: string, amount: string, asset: string) => {
        // Mock implementation
        return { success: true, transactionHash: '0x456' };
      },
      repay: async (userAddress: string, amount: string, asset: string) => {
        // Mock implementation
        return { success: true, transactionHash: '0x789' };
      },
      withdrawCollateral: async (tokenId: string, userAddress: string) => {
        // Mock implementation
        return { success: true, transactionHash: '0xabc' };
      },
      getUserCollateral: async (userAddress: string) => {
        // Mock implementation
        return [];
      },
      getUserDebt: async (userAddress: string) => {
        // Mock implementation
        return [];
      },
    };
  }

  async supplyCollateral(input: SupplyCollateralInput) {
    try {
      // Validate NFT ownership
      const nft = await prisma.nFT.findUnique({
        where: { tokenId: parseInt(input.tokenId) },
      });

      if (!nft) {
        throw new Error('NFT not found');
      }

      // Get NFT valuation from Oracle Adapter
      const valuation = await this.getNFTValuation(input.tokenId);

      // Supply collateral to lending protocol
      const result = await this.lendingAdapter.supplyCollateral(
        input.tokenId,
        input.userAddress
      );

      // Record collateral supply
      await prisma.collateral.create({
        data: {
          tokenId: parseInt(input.tokenId),
          userAddress: input.userAddress,
          valuation,
          suppliedAt: new Date(),
          transactionHash: result.transactionHash,
        },
      });

      return {
        success: true,
        transactionHash: result.transactionHash,
        valuation,
      };
    } catch (error) {
      console.error('Supply collateral error:', error);
      throw error;
    }
  }

  async borrow(input: BorrowInput) {
    try {
      // Check collateral and calculate max borrow amount
      const maxBorrow = await this.getMaxBorrowAmount(input.collateralTokenId);
      
      if (parseFloat(input.amount) > maxBorrow.maxBorrow) {
        throw new Error('Borrow amount exceeds maximum allowed');
      }

      // Execute borrow on lending protocol
      const result = await this.lendingAdapter.borrow(
        input.userAddress,
        input.amount,
        input.asset
      );

      // Record borrow transaction
      await prisma.loan.create({
        data: {
          userAddress: input.userAddress,
          amount: parseFloat(input.amount),
          asset: input.asset,
          collateralTokenId: parseInt(input.collateralTokenId),
          borrowedAt: new Date(),
          transactionHash: result.transactionHash,
        },
      });

      return {
        success: true,
        transactionHash: result.transactionHash,
        amount: input.amount,
        asset: input.asset,
      };
    } catch (error) {
      console.error('Borrow error:', error);
      throw error;
    }
  }

  async repay(input: RepayInput) {
    try {
      // Execute repay on lending protocol
      const result = await this.lendingAdapter.repay(
        input.userAddress,
        input.amount,
        input.asset
      );

      // Update loan record
      await prisma.loan.updateMany({
        where: {
          userAddress: input.userAddress,
          asset: input.asset,
        },
        data: {
          repaidAt: new Date(),
          repayTransactionHash: result.transactionHash,
        },
      });

      return {
        success: true,
        transactionHash: result.transactionHash,
        amount: input.amount,
        asset: input.asset,
      };
    } catch (error) {
      console.error('Repay error:', error);
      throw error;
    }
  }

  async withdrawCollateral(input: WithdrawCollateralInput) {
    try {
      // Check if collateral can be withdrawn (no outstanding loans)
      const loans = await prisma.loan.findMany({
        where: {
          userAddress: input.userAddress,
          collateralTokenId: parseInt(input.tokenId),
          repaidAt: null,
        },
      });

      if (loans.length > 0) {
        throw new Error('Cannot withdraw collateral with outstanding loans');
      }

      // Execute withdrawal on lending protocol
      const result = await this.lendingAdapter.withdrawCollateral(
        input.tokenId,
        input.userAddress
      );

      // Update collateral record
      await prisma.collateral.updateMany({
        where: {
          tokenId: parseInt(input.tokenId),
          userAddress: input.userAddress,
        },
        data: {
          withdrawnAt: new Date(),
          withdrawTransactionHash: result.transactionHash,
        },
      });

      return {
        success: true,
        transactionHash: result.transactionHash,
      };
    } catch (error) {
      console.error('Withdraw collateral error:', error);
      throw error;
    }
  }

  async getUserPositions(userAddress: string) {
    try {
      const collaterals = await prisma.collateral.findMany({
        where: {
          userAddress,
          withdrawnAt: null,
        },
        include: {
          nft: true,
        },
      });

      const loans = await prisma.loan.findMany({
        where: {
          userAddress,
          repaidAt: null,
        },
      });

      return {
        collaterals,
        loans,
        totalCollateralValue: collaterals.reduce((sum, c) => sum + c.valuation, 0),
        totalDebt: loans.reduce((sum, l) => sum + l.amount, 0),
      };
    } catch (error) {
      console.error('Get user positions error:', error);
      throw error;
    }
  }

  async getLendingStats() {
    try {
      const totalCollateral = await prisma.collateral.aggregate({
        _sum: { valuation: true },
        where: { withdrawnAt: null },
      });

      const totalLoans = await prisma.loan.aggregate({
        _sum: { amount: true },
        where: { repaidAt: null },
      });

      const activeUsers = await prisma.collateral.groupBy({
        by: ['userAddress'],
        where: { withdrawnAt: null },
      });

      return {
        totalCollateralValue: totalCollateral._sum.valuation || 0,
        totalLoansValue: totalLoans._sum.amount || 0,
        activeUsers: activeUsers.length,
        utilizationRate: totalLoans._sum.amount && totalCollateral._sum.valuation
          ? (totalLoans._sum.amount / totalCollateral._sum.valuation) * 100
          : 0,
      };
    } catch (error) {
      console.error('Get lending stats error:', error);
      throw error;
    }
  }

  async getNFTValuation(tokenId: string): Promise<number> {
    try {
      // Get NFT details
      const nft = await prisma.nFT.findUnique({
        where: { tokenId: parseInt(tokenId) },
      });

      if (!nft) {
        throw new Error('NFT not found');
      }

      // Get historical sales data for better valuation
      const historicalSales = await prisma.transaction.findMany({
        where: {
          tokenId: parseInt(tokenId),
          type: 'sale',
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
        select: {
          amount: true,
          timestamp: true,
        },
      });

      // Call Oracle Adapter for valuation using valuation client
      const valuationResponse = await valuationClient.getValuationWithRetry({
        token_id: parseInt(tokenId),
        metadata: {
          title: nft.title,
          description: nft.description,
          category: nft.category || 'unknown',
          creator: nft.creatorId,
          quality_score: 0.7, // TODO: Calculate from content analysis
          rarity: 0.5, // TODO: Calculate from collection stats
          views: 0, // TODO: Get from analytics
          likes: 0,
          shares: 0,
          has_license: true,
          is_verified: true,
        },
        historical_data: historicalSales.map(sale => ({
          price: parseFloat(sale.amount),
          timestamp: Math.floor(sale.timestamp.getTime() / 1000),
        })),
      });

      // Cache valuation result with full details
      await prisma.nFTValuation.create({
        data: {
          tokenId: parseInt(tokenId),
          estimatedValue: valuationResponse.estimated_value,
          confidenceInterval: valuationResponse.confidence_interval,
          valuationDate: new Date(),
          source: 'oracle_adapter',
          modelUncertainty: valuationResponse.model_uncertainty,
          factors: valuationResponse.factors as any,
        },
      });

      logger.info('NFT valuation retrieved', {
        token_id: tokenId,
        estimated_value: valuationResponse.estimated_value,
        confidence_interval: valuationResponse.confidence_interval,
      });

      return valuationResponse.estimated_value;
    } catch (error: any) {
      logger.error('Get NFT valuation error', { token_id: tokenId, error: error.message });
      
      // Try to get cached valuation as fallback
      const cachedValuation = await prisma.nFTValuation.findFirst({
        where: { tokenId: parseInt(tokenId) },
        orderBy: { valuationDate: 'desc' },
      });

      if (cachedValuation) {
        logger.warn('Using cached valuation as fallback', { token_id: tokenId });
        return cachedValuation.estimatedValue;
      }

      // Return conservative fallback valuation
      return 1000; // Default $1000 valuation
    }
  }

  calculateLTV(collateralValue: number, loanAmount: number): number {
    if (collateralValue === 0) return 0;
    return (loanAmount / collateralValue) * 100;
  }

  async getMaxBorrowAmount(tokenId: string): Promise<{
    maxBorrow: number;
    ltv: number;
    valuation: number;
    riskAdjustedValue: number;
    riskLevel: string;
    liquidationThreshold: number;
  }> {
    try {
      // Get NFT details for valuation
      const nft = await prisma.nFT.findUnique({
        where: { tokenId: parseInt(tokenId) },
      });

      if (!nft) {
        throw new Error('NFT not found');
      }

      // Get historical sales data
      const historicalSales = await prisma.transaction.findMany({
        where: {
          tokenId: parseInt(tokenId),
          type: 'sale',
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
        select: {
          amount: true,
          timestamp: true,
        },
      });

      // Get full valuation with risk assessment
      const valuationResponse = await valuationClient.getValuationWithRetry({
        token_id: parseInt(tokenId),
        metadata: {
          title: nft.title,
          description: nft.description,
          category: nft.category || 'unknown',
          creator: nft.creatorId,
          quality_score: 0.7,
          rarity: 0.5,
          has_license: true,
          is_verified: true,
        },
        historical_data: historicalSales.map(sale => ({
          price: parseFloat(sale.amount),
          timestamp: Math.floor(sale.timestamp.getTime() / 1000),
        })),
      });

      // Extract risk parameters
      const riskParams = valuationClient.extractRiskParameters(valuationResponse);

      // Calculate LTV with risk adjustment
      const ltvCalculation = valuationClient.calculateLTV(
        valuationResponse.estimated_value,
        0, // No loan yet, calculating max
        riskParams
      );

      const maxBorrow = ltvCalculation.max_loan_amount;

      logger.info('Max borrow amount calculated', {
        token_id: tokenId,
        valuation: valuationResponse.estimated_value,
        risk_adjusted_value: riskParams.risk_adjusted_value,
        max_borrow: maxBorrow,
        ltv: ltvCalculation.recommended_ltv,
        risk_level: ltvCalculation.risk_level,
      });

      return {
        maxBorrow,
        ltv: ltvCalculation.recommended_ltv,
        valuation: valuationResponse.estimated_value,
        riskAdjustedValue: riskParams.risk_adjusted_value,
        riskLevel: ltvCalculation.risk_level,
        liquidationThreshold: ltvCalculation.liquidation_threshold,
      };
    } catch (error: any) {
      logger.error('Get max borrow amount error', { token_id: tokenId, error: error.message });
      
      // Fallback to simple calculation
      const valuation = await this.getNFTValuation(tokenId);
      const ltv = 40; // Conservative 40% LTV on error
      const maxBorrow = valuation * (ltv / 100);

      return {
        maxBorrow,
        ltv,
        valuation,
        riskAdjustedValue: valuation * 0.8, // 20% haircut
        riskLevel: 'high', // Conservative assumption
        liquidationThreshold: 60,
      };
    }
  }

  async supplyCollateralWithValuation(input: SupplyCollateralInput) {
    try {
      // Get real-time valuation
      const valuation = await this.getNFTValuation(input.tokenId);
      
      // Supply with current valuation
      const result = await this.supplyCollateral({
        ...input,
        amount: valuation.toString(),
      });

      return {
        ...result,
        valuation,
      };
    } catch (error) {
      console.error('Supply collateral with valuation error:', error);
      throw error;
    }
  }

  async getHealthFactorWithValuation(userAddress: string): Promise<{
    healthFactor: number;
    collateralValue: number;
    borrowedValue: number;
    availableToBorrow: number;
    riskLevel: string;
    liquidationRisk: boolean;
    positions: Array<{
      tokenId: number;
      currentValuation: number;
      suppliedValuation: number;
      valuationChange: number;
      riskAdjustedValue: number;
      riskLevel: string;
      liquidationThreshold: number;
    }>;
  }> {
    try {
      // Get user collaterals and debts
      const collaterals = await this.lendingAdapter.getUserCollateral(userAddress);
      const debts = await this.lendingAdapter.getUserDebt(userAddress);

      let totalCollateralValue = 0;
      let totalRiskAdjustedValue = 0;
      const positions = [];

      // Prepare batch valuation requests
      const valuationRequests = await Promise.all(
        collaterals.map(async (collateral: any) => {
          const nft = await prisma.nFT.findUnique({
            where: { tokenId: parseInt(collateral.tokenId) },
          });

          const historicalSales = await prisma.transaction.findMany({
            where: {
              tokenId: parseInt(collateral.tokenId),
              type: 'sale',
            },
            orderBy: { timestamp: 'desc' },
            take: 10,
            select: {
              amount: true,
              timestamp: true,
            },
          });

          return {
            token_id: parseInt(collateral.tokenId),
            metadata: {
              title: nft?.title,
              description: nft?.description,
              category: nft?.category || 'unknown',
              creator: nft?.creatorId,
              quality_score: 0.7,
              rarity: 0.5,
              has_license: true,
              is_verified: true,
            },
            historical_data: historicalSales.map(sale => ({
              price: parseFloat(sale.amount),
              timestamp: Math.floor(sale.timestamp.getTime() / 1000),
            })),
          };
        })
      );

      // Get batch valuations
      const valuations = await valuationClient.getBatchValuations(valuationRequests);

      // Calculate current collateral value with real-time valuations and risk assessment
      for (const collateral of collaterals) {
        const tokenId = parseInt(collateral.tokenId);
        const valuation = valuations.get(tokenId);

        if (!valuation) {
          logger.warn('Valuation not available for collateral', { token_id: tokenId });
          continue;
        }

        const currentValuation = valuation.estimated_value;
        const suppliedValuation = collateral.valuation;
        const valuationChange = ((currentValuation - suppliedValuation) / suppliedValuation) * 100;

        // Extract risk parameters
        const riskParams = valuationClient.extractRiskParameters(valuation);

        // Calculate LTV for this position
        const ltvCalc = valuationClient.calculateLTV(
          currentValuation,
          0,
          riskParams
        );

        positions.push({
          tokenId,
          currentValuation,
          suppliedValuation,
          valuationChange: Math.round(valuationChange * 100) / 100,
          riskAdjustedValue: riskParams.risk_adjusted_value,
          riskLevel: ltvCalc.risk_level,
          liquidationThreshold: ltvCalc.liquidation_threshold,
        });

        totalCollateralValue += currentValuation;
        totalRiskAdjustedValue += riskParams.risk_adjusted_value;
      }

      // Calculate total debt
      let totalDebt = 0;
      for (const debt of debts) {
        totalDebt += debt.amount;
      }

      // Calculate weighted average liquidation threshold
      const avgLiquidationThreshold = positions.length > 0
        ? positions.reduce((sum, p) => sum + p.liquidationThreshold, 0) / positions.length
        : 65;

      // Calculate health factor using risk-adjusted values
      const healthFactor = valuationClient.calculateHealthFactor(
        totalRiskAdjustedValue,
        totalDebt,
        avgLiquidationThreshold
      );

      // Determine overall risk level
      let overallRiskLevel = 'low';
      if (healthFactor < 1.2) {
        overallRiskLevel = 'high';
      } else if (healthFactor < 1.5) {
        overallRiskLevel = 'medium';
      }

      // Check liquidation risk
      const liquidationRisk = healthFactor < 1.1;

      const availableToBorrow = Math.max(
        0,
        (totalRiskAdjustedValue * (avgLiquidationThreshold / 100)) - totalDebt
      );

      logger.info('Health factor calculated with valuation', {
        user_address: userAddress,
        health_factor: healthFactor,
        collateral_value: totalCollateralValue,
        risk_adjusted_value: totalRiskAdjustedValue,
        borrowed_value: totalDebt,
        risk_level: overallRiskLevel,
        liquidation_risk: liquidationRisk,
      });

      return {
        healthFactor,
        collateralValue: totalCollateralValue,
        borrowedValue: totalDebt,
        availableToBorrow: Math.round(availableToBorrow * 100) / 100,
        riskLevel: overallRiskLevel,
        liquidationRisk,
        positions,
      };
    } catch (error: any) {
      logger.error('Get health factor with valuation error', {
        user_address: userAddress,
        error: error.message,
      });
      throw error;
    }
  }
}