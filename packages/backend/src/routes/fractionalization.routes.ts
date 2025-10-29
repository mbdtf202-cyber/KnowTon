import { Router } from 'express';
import { FractionalizationController } from '../controllers/fractionalization.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const fractionalizationController = new FractionalizationController();

router.post(
  '/fractionalize',
  authMiddleware,
  fractionalizationController.fractionalize.bind(fractionalizationController)
);

router.get(
  '/vault/:vaultId',
  fractionalizationController.getVaultInfo.bind(fractionalizationController)
);

router.post(
  '/vault/:vaultId/buyout',
  authMiddleware,
  fractionalizationController.buyout.bind(fractionalizationController)
);

router.post(
  '/vault/:vaultId/redeem',
  authMiddleware,
  fractionalizationController.redeem.bind(fractionalizationController)
);

router.put(
  '/vault/:vaultId/reserve-price',
  authMiddleware,
  fractionalizationController.updateReservePrice.bind(fractionalizationController)
);

router.get(
  '/user/:address/vaults',
  fractionalizationController.getUserVaults.bind(fractionalizationController)
);

router.get('/vaults', fractionalizationController.getAllVaults.bind(fractionalizationController));

export default router;
