import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { realtimeMetricsService } from '../services/realtime-metrics.service';
import { historicalAnalyticsService, Granularity } from '../services/historical-analytics.service';
import { userBehaviorAnalyticsService } from '../services/user-behavior-analytics.service';
import { predictiveAnalyticsService } from '../services/predictive-analytics.service';

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

  async getRealtimeMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await realtimeMetricsService.getMetrics();
      res.json(metrics);
    } catch (error: any) {
      console.error('Error in getRealtimeMetrics:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Historical Analytics Endpoints

  async getHistoricalMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, granularity } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const timeRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };

      const gran = (granularity as Granularity) || 'daily';
      const result = await historicalAnalyticsService.getHistoricalMetrics(timeRange, gran);
      res.json(result);
    } catch (error: any) {
      console.error('Error in getHistoricalMetrics:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getRevenueHistory(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, granularity } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const timeRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };

      const gran = (granularity as Granularity) || 'daily';
      const result = await historicalAnalyticsService.getRevenueHistory(timeRange, gran);
      res.json(result);
    } catch (error: any) {
      console.error('Error in getRevenueHistory:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getUserActivityHistory(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, granularity } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const timeRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };

      const gran = (granularity as Granularity) || 'daily';
      const result = await historicalAnalyticsService.getUserActivityHistory(timeRange, gran);
      res.json(result);
    } catch (error: any) {
      console.error('Error in getUserActivityHistory:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getCategoryTrends(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, granularity } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const timeRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };

      const gran = (granularity as Granularity) || 'daily';
      const result = await historicalAnalyticsService.getCategoryTrends(timeRange, gran);
      res.json(result);
    } catch (error: any) {
      console.error('Error in getCategoryTrends:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getTopCreatorsByRevenue(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, limit } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const timeRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };

      const limitNum = limit ? parseInt(limit as string) : 10;
      const result = await historicalAnalyticsService.getTopCreatorsByRevenue(timeRange, limitNum);
      res.json(result);
    } catch (error: any) {
      console.error('Error in getTopCreatorsByRevenue:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async exportAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, granularity, format } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const timeRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };

      const gran = (granularity as Granularity) || 'daily';
      const exportFormat = (format as string) || 'csv';

      if (exportFormat === 'csv') {
        const csv = await historicalAnalyticsService.exportToCSV(timeRange, gran);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-${Date.now()}.csv`);
        res.send(csv);
      } else if (exportFormat === 'pdf') {
        const pdf = await historicalAnalyticsService.exportToPDF(timeRange, gran);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-${Date.now()}.pdf`);
        res.send(pdf);
      } else {
        res.status(400).json({ error: 'Invalid format. Use csv or pdf' });
      }
    } catch (error: any) {
      console.error('Error in exportAnalytics:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // User Behavior Analytics Endpoints

  async getUserJourneys(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, userAddress, limit } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const timeRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };

      const limitNum = limit ? parseInt(limit as string) : 100;
      const result = await userBehaviorAnalyticsService.getUserJourneys(
        timeRange,
        userAddress as string,
        limitNum
      );
      res.json(result);
    } catch (error: any) {
      console.error('Error in getUserJourneys:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getFunnelAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, contentId } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const timeRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };

      const result = await userBehaviorAnalyticsService.getFunnelAnalysis(
        timeRange,
        contentId as string
      );
      res.json(result);
    } catch (error: any) {
      console.error('Error in getFunnelAnalysis:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getContentHeatmap(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, category, limit } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const timeRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };

      const limitNum = limit ? parseInt(limit as string) : 50;
      const result = await userBehaviorAnalyticsService.getContentHeatmap(
        timeRange,
        category as string,
        limitNum
      );
      res.json(result);
    } catch (error: any) {
      console.error('Error in getContentHeatmap:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getCohortAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { cohortType, periods } = req.query;

      const type = (cohortType as 'daily' | 'weekly' | 'monthly') || 'weekly';
      const periodsNum = periods ? parseInt(periods as string) : 12;

      const result = await userBehaviorAnalyticsService.getCohortAnalysis(type, periodsNum);
      res.json(result);
    } catch (error: any) {
      console.error('Error in getCohortAnalysis:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getUserEngagementPatterns(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, userAddress } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const timeRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };

      const result = await userBehaviorAnalyticsService.getUserEngagementPatterns(
        timeRange,
        userAddress as string
      );
      res.json(result);
    } catch (error: any) {
      console.error('Error in getUserEngagementPatterns:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async trackUserEvent(req: Request, res: Response): Promise<void> {
    try {
      const event = req.body;

      if (!event.sessionId || !event.userAddress || !event.eventType) {
        res.status(400).json({ error: 'sessionId, userAddress, and eventType are required' });
        return;
      }

      await userBehaviorAnalyticsService.trackEvent(event);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in trackUserEvent:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Predictive Analytics Endpoints

  async predictRevenue(req: Request, res: Response): Promise<void> {
    try {
      const { historicalDays, forecastDays } = req.query;

      const histDays = historicalDays ? parseInt(historicalDays as string) : 90;
      const fcstDays = forecastDays ? parseInt(forecastDays as string) : 30;

      const result = await predictiveAnalyticsService.predictRevenue(histDays, fcstDays);
      res.json(result);
    } catch (error: any) {
      console.error('Error in predictRevenue:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async predictUserGrowth(req: Request, res: Response): Promise<void> {
    try {
      const { historicalDays, forecastDays } = req.query;

      const histDays = historicalDays ? parseInt(historicalDays as string) : 90;
      const fcstDays = forecastDays ? parseInt(forecastDays as string) : 30;

      const result = await predictiveAnalyticsService.predictUserGrowth(histDays, fcstDays);
      res.json(result);
    } catch (error: any) {
      console.error('Error in predictUserGrowth:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async predictTrends(req: Request, res: Response): Promise<void> {
    try {
      const { historicalDays, forecastDays } = req.query;

      const histDays = historicalDays ? parseInt(historicalDays as string) : 90;
      const fcstDays = forecastDays ? parseInt(forecastDays as string) : 30;

      const result = await predictiveAnalyticsService.predictTrends(histDays, fcstDays);
      res.json(result);
    } catch (error: any) {
      console.error('Error in predictTrends:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async predictCategoryRevenue(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.params;
      const { historicalDays, forecastDays } = req.query;

      if (!category) {
        res.status(400).json({ error: 'category is required' });
        return;
      }

      const histDays = historicalDays ? parseInt(historicalDays as string) : 90;
      const fcstDays = forecastDays ? parseInt(forecastDays as string) : 30;

      const result = await predictiveAnalyticsService.predictCategoryRevenue(
        category,
        histDays,
        fcstDays
      );
      res.json(result);
    } catch (error: any) {
      console.error('Error in predictCategoryRevenue:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
