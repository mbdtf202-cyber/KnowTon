import { Request, Response } from 'express';
import { anomalyDetectionService, AnomalySeverity, AnomalyType } from '../services/anomaly-detection.service';

export class AnomalyDetectionController {
  /**
   * Get active anomalies
   */
  async getActiveAnomalies(req: Request, res: Response): Promise<void> {
    try {
      const { metric, severity, type } = req.query;

      const filters: any = {};
      if (metric) filters.metric = metric as string;
      if (severity) filters.severity = severity as AnomalySeverity;
      if (type) filters.type = type as AnomalyType;

      const anomalies = await anomalyDetectionService.getActiveAnomalies(filters);
      res.json(anomalies);
    } catch (error: any) {
      console.error('Error in getActiveAnomalies:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get anomaly history
   */
  async getAnomalyHistory(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, metric, severity, type } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const timeRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };

      const filters: any = {};
      if (metric) filters.metric = metric as string;
      if (severity) filters.severity = severity as AnomalySeverity;
      if (type) filters.type = type as AnomalyType;

      const history = await anomalyDetectionService.getAnomalyHistory(timeRange, filters);
      res.json(history);
    } catch (error: any) {
      console.error('Error in getAnomalyHistory:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Acknowledge an anomaly
   */
  async acknowledgeAnomaly(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const { acknowledgedBy } = req.body;

      if (!acknowledgedBy) {
        res.status(400).json({ error: 'acknowledgedBy is required' });
        return;
      }

      await anomalyDetectionService.acknowledgeAnomaly(alertId, acknowledgedBy);
      res.json({ success: true, message: 'Anomaly acknowledged' });
    } catch (error: any) {
      console.error('Error in acknowledgeAnomaly:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Resolve an anomaly
   */
  async resolveAnomaly(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const { notes } = req.body;

      await anomalyDetectionService.resolveAnomaly(alertId, notes);
      res.json({ success: true, message: 'Anomaly resolved' });
    } catch (error: any) {
      console.error('Error in resolveAnomaly:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get anomaly statistics
   */
  async getAnomalyStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const timeRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };

      const stats = await anomalyDetectionService.getAnomalyStatistics(timeRange);
      res.json(stats);
    } catch (error: any) {
      console.error('Error in getAnomalyStatistics:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Investigate an anomaly
   */
  async investigateAnomaly(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;

      const investigation = await anomalyDetectionService.investigateAnomaly(alertId);
      res.json(investigation);
    } catch (error: any) {
      console.error('Error in investigateAnomaly:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Update detection configuration
   */
  async updateDetectionConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;

      if (!config.metric) {
        res.status(400).json({ error: 'metric is required' });
        return;
      }

      await anomalyDetectionService.updateDetectionConfig(config);
      res.json({ success: true, message: 'Detection configuration updated' });
    } catch (error: any) {
      console.error('Error in updateDetectionConfig:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
