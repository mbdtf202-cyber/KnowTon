import { Router } from 'express';
import { ContentController } from '../controllers/content.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const contentController = new ContentController();

router.post('/upload', authMiddleware, contentController.upload);
router.post('/:id/metadata', authMiddleware, contentController.updateMetadata);
router.get('/:id/status', contentController.getStatus);
router.delete('/:id', authMiddleware, contentController.deleteContent);

export default router;
