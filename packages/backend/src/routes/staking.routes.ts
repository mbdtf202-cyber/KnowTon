import { Router } from 'express';
import { StakingController } from '../controllers/staking.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const stakingController = new StakingController();

router.post('/stake', authMiddleware, stakingController.stake.bind(stakingController));

router.post(
  '/unstake/:stakeIndex',
  authMiddleware,
  stakingController.unstake.bind(stakingController)
);

router.post(
  '/claim/:stakeIndex',
  authMiddleware,
  stakingController.claimRewards.bind(stakingController)
);

router.get('/stakes/:address', stakingController.getUserStakes.bind(stakingController));

router.get('/stats/:address', stakingController.getUserStats.bind(stakingController));

router.get(
  '/rewards/:address/:stakeIndex',
  stakingController.calculateRewards.bind(stakingController)
);

router.get('/lock-periods', stakingController.getAvailableLockPeriods.bind(stakingController));

export default router;
