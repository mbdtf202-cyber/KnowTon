import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();
const analyticsController = new AnalyticsController();

router.get('/content/:tokenId', analyticsController.getContentAnalytics);
router.get('/creator/:creatorAddress', analyticsController.getCreatorAnalytics);
router.get('/platform', analyticsController.getPlatformAnalytics);
router.get('/top-creators', analyticsController.getTopCreators);
router.get('/trending', analyticsController.getTrendingNFTs);

export default router;
