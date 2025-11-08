import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();
const analyticsController = new AnalyticsController();

// Existing routes
router.get('/content/:tokenId', analyticsController.getContentAnalytics);
router.get('/creator/:creatorAddress', analyticsController.getCreatorAnalytics);
router.get('/platform', analyticsController.getPlatformAnalytics);
router.get('/top-creators', analyticsController.getTopCreators);
router.get('/trending', analyticsController.getTrendingNFTs);
router.get('/realtime-metrics', analyticsController.getRealtimeMetrics);

// Historical analytics routes
router.get('/historical/metrics', analyticsController.getHistoricalMetrics);
router.get('/historical/revenue', analyticsController.getRevenueHistory);
router.get('/historical/users', analyticsController.getUserActivityHistory);
router.get('/historical/categories', analyticsController.getCategoryTrends);
router.get('/historical/top-creators', analyticsController.getTopCreatorsByRevenue);
router.get('/export', analyticsController.exportAnalytics);

// User behavior analytics routes
router.get('/behavior/journeys', analyticsController.getUserJourneys);
router.get('/behavior/funnel', analyticsController.getFunnelAnalysis);
router.get('/behavior/heatmap', analyticsController.getContentHeatmap);
router.get('/behavior/cohorts', analyticsController.getCohortAnalysis);
router.get('/behavior/engagement-patterns', analyticsController.getUserEngagementPatterns);
router.post('/behavior/track', analyticsController.trackUserEvent);

// Predictive analytics routes
router.get('/predict/revenue', analyticsController.predictRevenue);
router.get('/predict/user-growth', analyticsController.predictUserGrowth);
router.get('/predict/trends', analyticsController.predictTrends);
router.get('/predict/category/:category', analyticsController.predictCategoryRevenue);

// Churn prediction routes
import churnPredictionRoutes from './churn-prediction.routes';
router.use('/churn', churnPredictionRoutes);

// Revenue forecasting routes
import revenueForecastingRoutes from './revenue-forecasting.routes';
router.use('/forecast', revenueForecastingRoutes);

// Anomaly detection routes
import anomalyDetectionRoutes from './anomaly-detection.routes';
router.use('/anomaly-detection', anomalyDetectionRoutes);

export default router;
