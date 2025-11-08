import { Request, Response } from 'express';
import { churnPredictionService } from '../services/churn-prediction.service';

export class ChurnPredictionController {
  /**
   * GET /api/v1/analytics/churn/at-risk
   * Get list of users at risk of churning
   */
  async getAtRiskUsers(req: Request, res: Response): Promise<void> {
    try {
      const lookbackDays = parseInt(req.query.lookbackDays as string) || 90;
      const limit = parseInt(req.query.limit as string) || 100;

      if (lookbackDays < 7 || lookbackDays > 365) {
        res.status(400).json({ error: 'lookbackDays must be between 7 and 365' });
        return;
      }

      if (limit < 1 || limit > 1000) {
        res.status(400).json({ error: 'limit must be between 1 and 1000' });
        return;
      }

      const result = await churnPredictionService.identifyAtRiskUsers(
        lookbackDays,
        limit
      );

      res.json(result);
    } catch (error: any) {
      console.error('Error in getAtRiskUsers:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/analytics/churn/recommendations/:userId
   * Get retention recommendations for a specific user
   */
  async getRetentionRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const recommendations = await churnPredictionService.generateRetentionRecommendations(
        userId
      );

      res.json(recommendations);
    } catch (error: any) {
      console.error('Error in getRetentionRecommendations:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/analytics/churn/metrics
   * Get churn metrics over time
   */
  async getChurnMetrics(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      const interval = (req.query.interval as 'daily' | 'weekly' | 'monthly') || 'monthly';

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({ error: 'Invalid date format' });
        return;
      }

      if (startDate >= endDate) {
        res.status(400).json({ error: 'startDate must be before endDate' });
        return;
      }

      if (!['daily', 'weekly', 'monthly'].includes(interval)) {
        res.status(400).json({ error: 'interval must be daily, weekly, or monthly' });
        return;
      }

      const metrics = await churnPredictionService.getChurnMetrics(
        startDate,
        endDate,
        interval
      );

      res.json(metrics);
    } catch (error: any) {
      console.error('Error in getChurnMetrics:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export const churnPredictionController = new ChurnPredictionController();
