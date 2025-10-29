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

export default router;
