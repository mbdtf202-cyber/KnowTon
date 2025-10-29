import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SupplyCollateralInput {
  userAddress: string;
  tokenId: string;
  protocol: 'aave' | 'compound';
}

interface BorrowInput {
  userAddress: string;
  amount: string;
  asset: string;
}

interface RepayInput {
  userAddress: string;
  amount: string;
  asset: string;
}

export class LendingService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private lendingAdapter: ethers.Contract;
  private copyrightRegistry: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, this.provider);

    const lendingAdapterAbi = [
      'function supplyCollateral(address nftContract, uint256 tokenId) external',
      'function borrow(address asset, uint256 amount) external',
      'function repay(address asset, uint256 amount) external',
      'function withdraw(address nftContract, uint256 tokenId) external',
      'function getHealthFactor(address user) external view returns (uint256)',
      'function getUserCollateral(address user) external view returns (tuple(address nftContract, uint256 tokenId, uint256 valuation)[])',
      'function getUserDebt(address user) external view returns (tuple(address asset, uint256 amount)[])',
    ];

    const copyrightRegistryAbi = [
      'function approve(address to, uint256 tokenId) external',
      'function ownerOf(uint256 tokenId) external view returns (address)',
    ];

    this.lendingAdapter = new ethers.Contract(
      process.env.LENDING_ADAPTER_ADDRESS!,
      lendingAdapterAbi,
      this.wallet
    );

    this.copyrightRegistry = new ethers.Contract(
      process.env.COPYRIGHT_REGISTRY_ADDRESS!,
      copyrightRegistryAbi,
      this.wallet
    );
  }

  async supplyCollateral(input: SupplyCollateralInput) {
    try {
      const owner = await this.copyrightRegistry.ownerOf(input.tokenId);
      if (owner.toLowerCase() !== input.userAddress.toLowerCase()) {
        throw new Error('User does not own this NFT');
      }

      const approveTx = await this.copyrightRegistry.approve(
        process.env.LENDING_ADAPTER_ADDRESS!,
        input.tokenId
      );
      await approveTx.wait();

      const supplyTx = await this.lendingAdapter.supplyCollateral(
        process.env.COPYRIGHT_REGISTRY_ADDRESS!,
        input.tokenId
      );
      const receipt = await supplyTx.wait();

      const valuation = await this.getCollateralValuation(input.tokenId);
      const ltv = 0.5;
      const maxBorrow = parseFloat(valuation) * ltv;

      await prisma.collateral.create({
        data: {
          userAddress: input.userAddress,
          nftContract: process.env.COPYRIGHT_REGISTRY_ADDRESS!,
          tokenId: input.tokenId,
          valuation,
          protocol: input.protocol,
          txHash: receipt.hash,
          status: 'ACTIVE',
        },
      });

      return {
        txHash: receipt.hash,
        valuation,
        maxBorrow: maxBorrow.toString(),
        ltv,
        status: 'success',
      };
    } catch (error: any) {
      console.error('Error supplying collateral:', error);
      throw new Error(`Failed to supply collateral: ${error.message}`);
    }
  }

  async borrow(input: BorrowInput) {
    try {
      const healthFactor = await this.lendingAdapter.getHealthFactor(input.userAddress);
      
      if (parseFloat(ethers.formatEther(healthFactor)) < 1.5) {
        throw new Error('Insufficient health factor');
      }

      const tx = await this.lendingAdapter.borrow(
        input.asset,
        ethers.parseEther(input.amount)
      );
      const receipt = await tx.wait();

      await prisma.loan.create({
        data: {
          userAddress: input.userAddress,
          asset: input.asset,
          amount: input.amount,
          txHash: receipt.hash,
          status: 'ACTIVE',
          borrowedAt: new Date(),
        },
      });

      return {
        txHash: receipt.hash,
        amount: input.amount,
        asset: input.asset,
        healthFactor: ethers.formatEther(healthFactor),
        status: 'success',
      };
    } catch (error: any) {
      console.error('Error borrowing:', error);
      throw new Error(`Failed to borrow: ${error.message}`);
    }
  }

  async repay(input: RepayInput) {
    try {
      const tx = await this.lendingAdapter.repay(
        input.asset,
        ethers.parseEther(input.amount)
      );
      const receipt = await tx.wait();

      await prisma.repayment.create({
        data: {
          userAddress: input.userAddress,
          asset: input.asset,
          amount: input.amount,
          txHash: receipt.hash,
          repaidAt: new Date(),
        },
      });

      const activeLoan = await prisma.loan.findFirst({
        where: {
          userAddress: input.userAddress,
          asset: input.asset,
          status: 'ACTIVE',
        },
      });

      if (activeLoan) {
        const remainingAmount = parseFloat(activeLoan.amount) - parseFloat(input.amount);
        if (remainingAmount <= 0) {
          await prisma.loan.update({
            where: { id: activeLoan.id },
            data: { status: 'REPAID' },
          });
        } else {
          await prisma.loan.update({
            where: { id: activeLoan.id },
            data: { amount: remainingAmount.toString() },
          });
        }
      }

      return {
        txHash: receipt.hash,
        amount: input.amount,
        asset: input.asset,
        status: 'success',
      };
    } catch (error: any) {
      console.error('Error repaying:', error);
      throw new Error(`Failed to repay: ${error.message}`);
    }
  }

  async withdrawCollateral(userAddress: string, tokenId: string) {
    try {
      const healthFactor = await this.lendingAdapter.getHealthFactor(userAddress);
      
      if (parseFloat(ethers.formatEther(healthFactor)) < 2.0) {
        throw new Error('Cannot withdraw: health factor too low');
      }

      const tx = await this.lendingAdapter.withdraw(
        process.env.COPYRIGHT_REGISTRY_ADDRESS!,
        tokenId
      );
      const receipt = await tx.wait();

      await prisma.collateral.updateMany({
        where: {
          userAddress,
          tokenId,
          status: 'ACTIVE',
        },
        data: {
          status: 'WITHDRAWN',
        },
      });

      return {
        txHash: receipt.hash,
        status: 'success',
      };
    } catch (error: any) {
      console.error('Error withdrawing collateral:', error);
      throw new Error(`Failed to withdraw collateral: ${error.message}`);
    }
  }

  async getHealthFactor(userAddress: string) {
    try {
      const healthFactor = await this.lendingAdapter.getHealthFactor(userAddress);
      return {
        healthFactor: ethers.formatEther(healthFactor),
        status: parseFloat(ethers.formatEther(healthFactor)) >= 1.5 ? 'healthy' : 'at_risk',
      };
    } catch (error: any) {
      console.error('Error getting health factor:', error);
      throw new Error(`Failed to get health factor: ${error.message}`);
    }
  }

  async getUserPosition(userAddress: string) {
    try {
      const healthFactor = await this.lendingAdapter.getHealthFactor(userAddress);

      const dbCollaterals = await prisma.collateral.findMany({
        where: {
          userAddress,
          status: 'ACTIVE',
        },
      });

      const dbLoans = await prisma.loan.findMany({
        where: {
          userAddress,
          status: 'ACTIVE',
        },
      });

      return {
        collaterals: dbCollaterals,
        loans: dbLoans,
        healthFactor: ethers.formatEther(healthFactor),
        totalCollateralValue: dbCollaterals.reduce((sum: number, c: any) => sum + parseFloat(c.valuation), 0),
        totalDebt: dbLoans.reduce((sum: number, l: any) => sum + parseFloat(l.amount), 0),
      };
    } catch (error: any) {
      console.error('Error getting user position:', error);
      throw new Error(`Failed to get user position: ${error.message}`);
    }
  }

  private async getCollateralValuation(_tokenId: string): Promise<string> {
    return '1000';
  }
}
