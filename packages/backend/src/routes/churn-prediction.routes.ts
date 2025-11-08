import { Router } from 'express';
import { churnPredictionController } from '../controllers/churn-prediction.controller';

const router = Router();

/**
 * Churn Prediction Routes
 * Base path: /api/v1/analytics/churn
 */

// Get users at risk of churning
router.get('/at-risk', churnPredictionController.getAtRiskUsers.bind(churnPredictionController));

// Get retention recommendations for a specific user
router.get('/recommendations/:userId', churnPredictionController.getRetentionRecommendations.bind(churnPredictionController));

// Get churn metrics over time
router.get('/metrics', churnPredictionController.getChurnMetrics.bind(churnPredictionController));

export default router;
