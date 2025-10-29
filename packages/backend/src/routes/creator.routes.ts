import { Router } from 'express';
import { CreatorController } from '../controllers/creator.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const creatorController = new CreatorController();

router.post('/register', creatorController.register);
router.get('/:address', creatorController.getProfile);
router.put('/:address/profile', authMiddleware, creatorController.updateProfile);
router.get('/:address/portfolio', creatorController.getPortfolio);

export default router;
