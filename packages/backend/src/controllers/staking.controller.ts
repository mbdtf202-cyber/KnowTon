import { Request, Response } from 'express';
import { StakingService } from '../services/staking.service';
import { logger } from '../utils/logger';

const stakingService = new StakingService();

export class StakingController {
  async stake(req: Request, res: Response) {
    try {
      const { amount, lockPeriod } = req.body;
      const user = (req as any).user?.address;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!amount || !lockPeriod) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await stakingService.stake(user, amount, parseInt(lockPeriod));

      res.json({
        success: true,
        txHash: result.txHash,
        amount: result.amount,
        lockPeriod: result.lockPeriod,
      });
    } catch (error) {
      logger.error('Error staking:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async unstake(req: Request, res: Response) {
    try {
      const { stakeIndex } = req.params;
      const user = (req as any).user?.address;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (stakeIndex === undefined) {
        return res.status(400).json({ error: 'Stake index is required' });
      }

      const result = await stakingService.unstake(user, parseInt(stakeIndex));

      res.json({
        success: true,
        txHash: result.txHash,
        stakeIndex: result.stakeIndex,
      });
    } catch (error) {
      logger.error('Error unstaking:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async claimRewards(req: Request, res: Response) {
    try {
      const { stakeIndex } = req.params;
      const user = (req as any).user?.address;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (stakeIndex === undefined) {
        return res.status(400).json({ error: 'Stake index is required' });
      }

      const result = await stakingService.claimRewards(user, parseInt(stakeIndex));

      res.json({
        success: true,
        txHash: result.txHash,
        stakeIndex: result.stakeIndex,
      });
    } catch (error) {
      logger.error('Error claiming rewards:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getUserStakes(req: Request, res: Response) {
    try {
      const { address } = req.params;

      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }

      const stakes = await stakingService.getUserStakes(address);

      res.json({
        address,
        stakesCount: stakes.length,
        stakes,
      });
    } catch (error) {
      logger.error('Error getting user stakes:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserStats(req: Request, res: Response) {
    try {
      const { address } = req.params;

      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }

      const stats = await stakingService.getUserStats(address);

      res.json({
        address,
        ...stats,
      });
    } catch (error) {
      logger.error('Error getting user stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async calculateRewards(req: Request, res: Response) {
    try {
      const { address, stakeIndex } = req.params;

      if (!address || stakeIndex === undefined) {
        return res.status(400).json({ error: 'Address and stake index are required' });
      }

      const rewards = await stakingService.calculateRewards(address, parseInt(stakeIndex));

      res.json({
        address,
        stakeIndex: parseInt(stakeIndex),
        rewards,
      });
    } catch (error) {
      logger.error('Error calculating rewards:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAvailableLockPeriods(req: Request, res: Response) {
    try {
      const periods = await stakingService.getAvailableLockPeriods();

      res.json({
        periods: periods.map((p) => ({
          period: p.period,
          periodDays: Math.floor(p.period / (24 * 60 * 60)),
          apy: p.apy,
          apyPercent: p.apy / 100,
        })),
      });
    } catch (error) {
      logger.error('Error getting available lock periods:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
