import { Router } from 'express';
import { BondingController } from '../controllers/bonding.controller';

const router = Router();
const bondingController = new BondingController();

router.post('/bonds/issue', bondingController.issueBond);
router.post('/bonds/invest', bondingController.invest);
router.post('/bonds/:bondId/distribute', bondingController.distributeRevenue);
router.post('/bonds/:bondId/tranches/:trancheId/redeem', bondingController.redeem);
router.get('/bonds/:bondId', bondingController.getBondInfo);
router.get('/investors/:investor/bonds', bondingController.getInvestorBonds);

// New valuation-integrated endpoints
router.get('/bonds/:bondId/valuation', bondingController.getBondValuationAndRisk);
router.post('/bonds/refresh-valuations', bondingController.refreshBondValuations);

export default router;
