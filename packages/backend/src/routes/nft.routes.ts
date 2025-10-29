import { Router } from 'express';
import { NFTController } from '../controllers/nft.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const nftController = new NFTController();

router.post('/mint', authMiddleware, nftController.mint);
router.post('/batch-mint', authMiddleware, nftController.batchMint);
router.get('/:tokenId', nftController.getMetadata);
router.put('/:tokenId/metadata', authMiddleware, nftController.updateMetadata);
router.get('/:tokenId/status', nftController.getStatus);

export default router;
