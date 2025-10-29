import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  async getContentAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { tokenId } = req.params;
      const { startDate, endDate } = req.query;

      const timeRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      } : undefined;

      const result = await analyticsService.getContentAnalytics(tokenId, timeRange);
      res.json(result);
    } catch (error: any) {
      console.error('Error in getContentAnalytics:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getCreatorAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { creatorAddress } = req.params;
      const { startDate, endDate } = req.query;

      const timeRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      } : undefined;

      const result = await analyticsService.getCreatorAnalytics(creatorAddress, timeRange);
      res.json(result);
    } catch (error: any) {
      console.error('Error in getCreatorAnalytics:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getPlatformAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const timeRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      } : undefined;

      const result = await analyticsService.getPlatformAnalytics(timeRange);
      res.json(result);
    } catch (error: any) {
      console.error('Error in getPlatformAnalytics:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getTopCreators(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const result = await analyticsService.getTopCreators(limit);
      res.json(result);
    } catch (error: any) {
      console.error('Error in getTopCreators:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getTrendingNFTs(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const result = await analyticsService.getTrendingNFTs(limit);
      res.json(result);
    } catch (error: any) {
      console.error('Error in getTrendingNFTs:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
