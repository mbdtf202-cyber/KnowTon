import { Router } from 'express';
import { RoyaltyController } from '../controllers/royalty.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const royaltyController = new RoyaltyController();

// Withdraw royalty earnings
router.post('/withdraw', authMiddleware, royaltyController.withdraw.bind(royaltyController));

// Get user earnings
router.get('/earnings/:address', royaltyController.getEarnings.bind(royaltyController));

// Get distribution history for a token
router.get(
  '/history/:tokenId',
  royaltyController.getDistributionHistory.bind(royaltyController)
);

// Get withdrawal status
router.get(
  '/withdrawal/:txHash',
  royaltyController.getWithdrawalStatus.bind(royaltyController)
);

export default router;
