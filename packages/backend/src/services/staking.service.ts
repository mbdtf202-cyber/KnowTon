import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class StakingService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private stakingContract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'
    );

    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', this.provider);

    const contractAddress = process.env.STAKING_REWARDS_ADDRESS || '';
    const abi = [
      'function stake(uint256 amount, uint256 lockPeriod) external',
      'function unstake(uint256 stakeIndex) external',
      'function claimRewards(uint256 stakeIndex) external',
      'function calculateRewards(address user, uint256 stakeIndex) external view returns (uint256)',
      'function getUserStakes(address user) external view returns (tuple(uint256 amount, uint256 startTime, uint256 lockPeriod, uint256 apy, uint256 rewardsClaimed)[])',
      'function getUserStakeCount(address user) external view returns (uint256)',
      'function getUserTotalStaked(address user) external view returns (uint256)',
      'function getUserTotalPendingRewards(address user) external view returns (uint256)',
      'function lockPeriodToAPY(uint256 lockPeriod) external view returns (uint256)',
    ];

    this.stakingContract = new ethers.Contract(contractAddress, abi, this.wallet);
  }

  async stake(user: string, amount: string, lockPeriod: number) {
    try {
      const tx = await this.stakingContract.stake(amount, lockPeriod, {
        gasLimit: 300000,
      });

      await tx.wait();

      logger.info(`Staking completed: user=${user}, amount=${amount}, lockPeriod=${lockPeriod}, tx=${tx.hash}`);

      return {
        txHash: tx.hash,
        amount,
        lockPeriod,
      };
    } catch (error) {
      logger.error('Error staking:', error);
      throw error;
    }
  }

  async unstake(user: string, stakeIndex: number) {
    try {
      const tx = await this.stakingContract.unstake(stakeIndex, {
        gasLimit: 300000,
      });

      await tx.wait();

      logger.info(`Unstaking completed: user=${user}, stakeIndex=${stakeIndex}, tx=${tx.hash}`);

      return {
        txHash: tx.hash,
        stakeIndex,
      };
    } catch (error) {
      logger.error('Error unstaking:', error);
      throw error;
    }
  }

  async claimRewards(user: string, stakeIndex: number) {
    try {
      const tx = await this.stakingContract.claimRewards(stakeIndex, {
        gasLimit: 300000,
      });

      await tx.wait();

      logger.info(`Rewards claimed: user=${user}, stakeIndex=${stakeIndex}, tx=${tx.hash}`);

      return {
        txHash: tx.hash,
        stakeIndex,
      };
    } catch (error) {
      logger.error('Error claiming rewards:', error);
      throw error;
    }
  }

  async getUserStakes(address: string) {
    try {
      const stakes = await this.stakingContract.getUserStakes(address);

      return stakes.map((stake: any, index: number) => ({
        index,
        amount: stake.amount.toString(),
        startTime: Number(stake.startTime),
        lockPeriod: Number(stake.lockPeriod),
        apy: Number(stake.apy),
        rewardsClaimed: stake.rewardsClaimed.toString(),
      }));
    } catch (error) {
      logger.error('Error getting user stakes:', error);
      throw error;
    }
  }

  async getUserStats(address: string) {
    try {
      const [totalStaked, pendingRewards, stakeCount] = await Promise.all([
        this.stakingContract.getUserTotalStaked(address),
        this.stakingContract.getUserTotalPendingRewards(address),
        this.stakingContract.getUserStakeCount(address),
      ]);

      return {
        totalStaked: totalStaked.toString(),
        pendingRewards: pendingRewards.toString(),
        stakeCount: Number(stakeCount),
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  async calculateRewards(address: string, stakeIndex: number) {
    try {
      const rewards = await this.stakingContract.calculateRewards(address, stakeIndex);
      return rewards.toString();
    } catch (error) {
      logger.error('Error calculating rewards:', error);
      throw error;
    }
  }

  async getAPYForLockPeriod(lockPeriod: number) {
    try {
      const apy = await this.stakingContract.lockPeriodToAPY(lockPeriod);
      return Number(apy);
    } catch (error) {
      logger.error('Error getting APY:', error);
      throw error;
    }
  }

  async getAvailableLockPeriods() {
    const periods = [
      30 * 24 * 60 * 60, // 30 days
      90 * 24 * 60 * 60, // 90 days
      180 * 24 * 60 * 60, // 180 days
      365 * 24 * 60 * 60, // 365 days
    ];

    const apys = await Promise.all(
      periods.map(async (period) => {
        try {
          const apy = await this.getAPYForLockPeriod(period);
          return { period, apy };
        } catch {
          return { period, apy: 0 };
        }
      })
    );

    return apys.filter((item) => item.apy > 0);
  }
}
