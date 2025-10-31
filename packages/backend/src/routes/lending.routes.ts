import { Router } from 'express';
import { LendingController } from '../controllers/lending.controller';

const router = Router();
const lendingController = new LendingController();

router.post('/collateral/supply', lendingController.supplyCollateral);
router.post('/borrow', lendingController.borrow);
router.post('/repay', lendingController.repay);
router.post('/collateral/withdraw', lendingController.withdrawCollateral);
router.get('/health/:userAddress', lendingController.getHealthFactor);
router.get('/position/:userAddress', lendingController.getUserPosition);

// New valuation-integrated endpoints
router.get('/valuation/:tokenId', lendingController.getNFTValuation);
router.get('/max-borrow/:tokenId', lendingController.getMaxBorrowAmount);
router.get('/health-with-valuation/:userAddress', lendingController.getHealthFactorWithValuation);

export default router;
