import { Redis } from 'ioredis';
import { EventEmitter } from 'events';
import { historicalAnalyticsService, TimeRange } from './historical-analytics.service';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export type AnomalyType = 
  | 'spike' 
  | 'drop' 
  | 'trend_change' 
  | 'outlier' 
  | 'pattern_break'
  | 'threshold_breach';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Anomaly {
  id: string;
  metric: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  value: number;
  expectedValue: number;
  deviation: number;
  timestamp: Date;
  description: string;
  metadata?: Record<string, any>;
}

export interface AnomalyAlert {
  id: string;
  anomaly: Anomaly;
  alertedAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  notes?: string;
}

export interface DetectionConfig {
  metric: string;
  enabled: boolean;
  sensitivity: number; // 1-10, higher = more sensitive
  algorithms: ('zscore' | 'iqr' | 'mad' | 'isolation_forest')[];
  thresholds?: {
    min?: number;
    max?: number;
  };
  alertChannels: ('email' | 'slack' | 'webhook')[];
}

/**
 * Anomaly Detection Service
 * Implements multiple statistical algorithms for detecting anomalies in real-time
 */
export class AnomalyDetectionService extends EventEmitter {
  private detectionInterval: NodeJS.Timeout | null = null;
  private readonly DETECTION_INTERVAL_MS = 60000; // Check every minute
  private alerts: Map<string, AnomalyAlert> = new Map();

  constructor() {
    super();
  }

  /**
   * Start continuous anomaly detection
   */
  async startDetection(): Promise<void> {
    if (this.detectionInterval) {
      return;
    }

    console.log('Starting anomaly detection service...');

    // Initial detection
    await this.detectAnomalies();

    // Set up periodic detection
    this.detectionInterval = setInterval(async () => {
      await this.detectAnomalies();
    }, this.DETECTION_INTERVAL_MS);
  }

  /**
   * Stop anomaly detection
   */
  stopDetection(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
      console.log('Stopped anomaly detection service');
    }
  }

  /**
   * Detect anomalies across all configured metrics
   */
  private async detectAnomalies(): Promise<void> {
    try {
      const configs = await this.getDetectionConfigs();
      const anomalies: Anomaly[] = [];

      for (const config of configs) {
        if (!config.enabled) continue;

        const metricAnomalies = await this.detectMetricAnomalies(config);
        anomalies.push(...metricAnomalies);
      }

      // Process and alert on detected anomalies
      for (const anomaly of anomalies) {
        await this.processAnomaly(anomaly);
      }

      // Cache detection results
      await redis.setex(
        'anomaly:last_detection',
        300,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          anomaliesFound: anomalies.length,
        })
      );
    } catch (error) {
      console.error('Error in anomaly detection:', error);
    }
  }

  /**
   * Detect anomalies for a specific metric
   */
  private async detectMetricAnomalies(config: DetectionConfig): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    try {
      // Get historical data for the metric
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      const historicalData = await this.getMetricHistory(config.metric, { startDate, endDate });

      if (historicalData.length < 7) {
        return anomalies; // Not enough data
      }

      const currentValue = historicalData[historicalData.length - 1];

      // Apply each configured algorithm
      for (const algorithm of config.algorithms) {
        const result = await this.applyAlgorithm(
          algorithm,
          historicalData,
          currentValue,
          config.sensitivity
        );

        if (result.isAnomaly) {
          anomalies.push({
            id: `${config.metric}-${Date.now()}-${algorithm}`,
            metric: config.metric,
            type: result.type,
            severity: this.calculateSeverity(result.deviation, config.sensitivity),
            value: currentValue,
            expectedValue: result.expectedValue,
            deviation: result.deviation,
            timestamp: new Date(),
            description: result.description,
            metadata: {
              algorithm,
              sensitivity: config.sensitivity,
            },
          });
        }
      }

      // Check threshold breaches
      if (config.thresholds) {
        const thresholdAnomaly = this.checkThresholds(config, currentValue);
        if (thresholdAnomaly) {
          anomalies.push(thresholdAnomaly);
        }
      }
    } catch (error) {
      console.error(`Error detecting anomalies for metric ${config.metric}:`, error);
    }

    return anomalies;
  }

  /**
   * Apply anomaly detection algorithm
   */
  private async applyAlgorithm(
    algorithm: string,
    historicalData: number[],
    currentValue: number,
    sensitivity: number
  ): Promise<{
    isAnomaly: boolean;
    type: AnomalyType;
    deviation: number;
    expectedValue: number;
    description: string;
  }> {
    switch (algorithm) {
      case 'zscore':
        return this.zScoreDetection(historicalData, currentValue, sensitivity);
      case 'iqr':
        return this.iqrDetection(historicalData, currentValue, sensitivity);
      case 'mad':
        return this.madDetection(historicalData, currentValue, sensitivity);
      case 'isolation_forest':
        return this.isolationForestDetection(historicalData, currentValue, sensitivity);
      default:
        throw new Error(`Unknown algorithm: ${algorithm}`);
    }
  }

  /**
   * Z-Score anomaly detection
   */
  private zScoreDetection(
    data: number[],
    currentValue: number,
    sensitivity: number
  ): {
    isAnomaly: boolean;
    type: AnomalyType;
    deviation: number;
    expectedValue: number;
    description: string;
  } {
    const mean = data.reduce((sum, v) => sum + v, 0) / data.length;
    const variance = data.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    const zScore = stdDev > 0 ? Math.abs((currentValue - mean) / stdDev) : 0;
    
    // Adjust threshold based on sensitivity (1-10 scale)
    const threshold = 3 - (sensitivity / 10) * 1.5; // Range: 1.5 to 3

    const isAnomaly = zScore > threshold;
    const deviation = ((currentValue - mean) / mean) * 100;

    let type: AnomalyType = 'outlier';
    if (currentValue > mean * 1.5) type = 'spike';
    else if (currentValue < mean * 0.5) type = 'drop';

    return {
      isAnomaly,
      type,
      deviation,
      expectedValue: mean,
      description: `Z-score: ${zScore.toFixed(2)}, threshold: ${threshold.toFixed(2)}`,
    };
  }

  /**
   * Interquartile Range (IQR) anomaly detection
   */
  private iqrDetection(
    data: number[],
    currentValue: number,
    sensitivity: number
  ): {
    isAnomaly: boolean;
    type: AnomalyType;
    deviation: number;
    expectedValue: number;
    description: string;
  } {
    const sorted = [...data].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    const median = sorted[Math.floor(sorted.length / 2)];

    // Adjust multiplier based on sensitivity
    const multiplier = 1.5 + (10 - sensitivity) * 0.15; // Range: 1.5 to 3

    const lowerBound = q1 - multiplier * iqr;
    const upperBound = q3 + multiplier * iqr;

    const isAnomaly = currentValue < lowerBound || currentValue > upperBound;
    const deviation = ((currentValue - median) / median) * 100;

    let type: AnomalyType = 'outlier';
    if (currentValue > upperBound) type = 'spike';
    else if (currentValue < lowerBound) type = 'drop';

    return {
      isAnomaly,
      type,
      deviation,
      expectedValue: median,
      description: `IQR bounds: [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`,
    };
  }

  /**
   * Median Absolute Deviation (MAD) anomaly detection
   */
  private madDetection(
    data: number[],
    currentValue: number,
    sensitivity: number
  ): {
    isAnomaly: boolean;
    type: AnomalyType;
    deviation: number;
    expectedValue: number;
    description: string;
  } {
    const sorted = [...data].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    const absoluteDeviations = data.map(v => Math.abs(v - median));
    const sortedDeviations = absoluteDeviations.sort((a, b) => a - b);
    const mad = sortedDeviations[Math.floor(sortedDeviations.length / 2)];

    const modifiedZScore = mad > 0 ? (0.6745 * (currentValue - median)) / mad : 0;
    
    // Adjust threshold based on sensitivity
    const threshold = 3.5 - (sensitivity / 10) * 1; // Range: 2.5 to 3.5

    const isAnomaly = Math.abs(modifiedZScore) > threshold;
    const deviation = ((currentValue - median) / median) * 100;

    let type: AnomalyType = 'outlier';
    if (currentValue > median * 1.5) type = 'spike';
    else if (currentValue < median * 0.5) type = 'drop';

    return {
      isAnomaly,
      type,
      deviation,
      expectedValue: median,
      description: `Modified Z-score: ${modifiedZScore.toFixed(2)}, threshold: ${threshold.toFixed(2)}`,
    };
  }

  /**
   * Simplified Isolation Forest detection
   */
  private isolationForestDetection(
    data: number[],
    currentValue: number,
    sensitivity: number
  ): {
    isAnomaly: boolean;
    type: AnomalyType;
    deviation: number;
    expectedValue: number;
    description: string;
  } {
    // Simplified isolation score based on distance from cluster center
    const mean = data.reduce((sum, v) => sum + v, 0) / data.length;
    const variance = data.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    // Calculate isolation score (0-1, higher = more isolated)
    const distance = Math.abs(currentValue - mean);
    const normalizedDistance = stdDev > 0 ? distance / (3 * stdDev) : 0;
    const isolationScore = Math.min(1, normalizedDistance);

    // Adjust threshold based on sensitivity
    const threshold = 0.7 - (sensitivity / 10) * 0.3; // Range: 0.4 to 0.7

    const isAnomaly = isolationScore > threshold;
    const deviation = ((currentValue - mean) / mean) * 100;

    let type: AnomalyType = 'outlier';
    if (currentValue > mean * 1.5) type = 'spike';
    else if (currentValue < mean * 0.5) type = 'drop';

    return {
      isAnomaly,
      type,
      deviation,
      expectedValue: mean,
      description: `Isolation score: ${isolationScore.toFixed(2)}, threshold: ${threshold.toFixed(2)}`,
    };
  }

  /**
   * Check threshold breaches
   */
  private checkThresholds(config: DetectionConfig, currentValue: number): Anomaly | null {
    if (!config.thresholds) return null;

    const { min, max } = config.thresholds;

    if (min !== undefined && currentValue < min) {
      return {
        id: `${config.metric}-${Date.now()}-threshold-min`,
        metric: config.metric,
        type: 'threshold_breach',
        severity: 'high',
        value: currentValue,
        expectedValue: min,
        deviation: ((currentValue - min) / min) * 100,
        timestamp: new Date(),
        description: `Value ${currentValue} below minimum threshold ${min}`,
      };
    }

    if (max !== undefined && currentValue > max) {
      return {
        id: `${config.metric}-${Date.now()}-threshold-max`,
        metric: config.metric,
        type: 'threshold_breach',
        severity: 'high',
        value: currentValue,
        expectedValue: max,
        deviation: ((currentValue - max) / max) * 100,
        timestamp: new Date(),
        description: `Value ${currentValue} above maximum threshold ${max}`,
      };
    }

    return null;
  }

  /**
   * Calculate anomaly severity
   */
  private calculateSeverity(deviation: number, sensitivity: number): AnomalySeverity {
    const absDeviation = Math.abs(deviation);
    
    // Adjust thresholds based on sensitivity
    const criticalThreshold = 100 - sensitivity * 5; // Range: 50-95
    const highThreshold = 50 - sensitivity * 2; // Range: 30-48
    const mediumThreshold = 20 - sensitivity; // Range: 10-19

    if (absDeviation >= criticalThreshold) return 'critical';
    if (absDeviation >= highThreshold) return 'high';
    if (absDeviation >= mediumThreshold) return 'medium';
    return 'low';
  }

  /**
   * Process detected anomaly
   */
  private async processAnomaly(anomaly: Anomaly): Promise<void> {
    try {
      // Check if this anomaly was already alerted recently
      const recentAlertKey = `anomaly:alert:${anomaly.metric}:${anomaly.type}`;
      const recentAlert = await redis.get(recentAlertKey);

      if (recentAlert) {
        // Skip if alerted within last 15 minutes
        return;
      }

      // Create alert
      const alert: AnomalyAlert = {
        id: anomaly.id,
        anomaly,
        alertedAt: new Date(),
        acknowledged: false,
        resolved: false,
      };

      this.alerts.set(alert.id, alert);

      // Store in Redis
      await redis.setex(
        `anomaly:alert:${alert.id}`,
        86400, // 24 hours
        JSON.stringify(alert)
      );

      // Set cooldown to prevent alert spam
      await redis.setex(recentAlertKey, 900, '1'); // 15 minutes

      // Emit event for real-time notifications
      this.emit('anomaly-detected', alert);

      // Send alerts based on severity
      await this.sendAlerts(alert);

      console.log(`Anomaly detected: ${anomaly.metric} - ${anomaly.type} (${anomaly.severity})`);
    } catch (error) {
      console.error('Error processing anomaly:', error);
    }
  }

  /**
   * Send alerts through configured channels
   */
  private async sendAlerts(alert: AnomalyAlert): Promise<void> {
    const config = await this.getDetectionConfig(alert.anomaly.metric);
    
    if (!config) return;

    for (const channel of config.alertChannels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailAlert(alert);
            break;
          case 'slack':
            await this.sendSlackAlert(alert);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert);
            break;
        }
      } catch (error) {
        console.error(`Error sending ${channel} alert:`, error);
      }
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: AnomalyAlert): Promise<void> {
    // Email sending logic would go here
    // For now, just log
    console.log(`[EMAIL ALERT] ${alert.anomaly.metric}: ${alert.anomaly.description}`);
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: AnomalyAlert): Promise<void> {
    // Slack webhook logic would go here
    console.log(`[SLACK ALERT] ${alert.anomaly.metric}: ${alert.anomaly.description}`);
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: AnomalyAlert): Promise<void> {
    // Webhook logic would go here
    console.log(`[WEBHOOK ALERT] ${alert.anomaly.metric}: ${alert.anomaly.description}`);
  }

  // ==================== Public API Methods ====================

  /**
   * Get all active anomalies
   */
  async getActiveAnomalies(
    filters?: {
      metric?: string;
      severity?: AnomalySeverity;
      type?: AnomalyType;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<AnomalyAlert[]> {
    try {
      const keys = await redis.keys('anomaly:alert:*');
      const alerts: AnomalyAlert[] = [];

      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const alert = JSON.parse(data) as AnomalyAlert;
          
          // Apply filters
          if (filters) {
            if (filters.metric && alert.anomaly.metric !== filters.metric) continue;
            if (filters.severity && alert.anomaly.severity !== filters.severity) continue;
            if (filters.type && alert.anomaly.type !== filters.type) continue;
            if (filters.startDate && new Date(alert.alertedAt) < filters.startDate) continue;
            if (filters.endDate && new Date(alert.alertedAt) > filters.endDate) continue;
          }

          if (!alert.resolved) {
            alerts.push(alert);
          }
        }
      }

      return alerts.sort((a, b) => 
        new Date(b.alertedAt).getTime() - new Date(a.alertedAt).getTime()
      );
    } catch (error) {
      console.error('Error getting active anomalies:', error);
      return [];
    }
  }

  /**
   * Get anomaly history
   */
  async getAnomalyHistory(
    timeRange: TimeRange,
    filters?: {
      metric?: string;
      severity?: AnomalySeverity;
      type?: AnomalyType;
    }
  ): Promise<AnomalyAlert[]> {
    try {
      const keys = await redis.keys('anomaly:alert:*');
      const alerts: AnomalyAlert[] = [];

      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const alert = JSON.parse(data) as AnomalyAlert;
          const alertDate = new Date(alert.alertedAt);

          if (alertDate >= timeRange.startDate && alertDate <= timeRange.endDate) {
            // Apply filters
            if (filters) {
              if (filters.metric && alert.anomaly.metric !== filters.metric) continue;
              if (filters.severity && alert.anomaly.severity !== filters.severity) continue;
              if (filters.type && alert.anomaly.type !== filters.type) continue;
            }

            alerts.push(alert);
          }
        }
      }

      return alerts.sort((a, b) => 
        new Date(b.alertedAt).getTime() - new Date(a.alertedAt).getTime()
      );
    } catch (error) {
      console.error('Error getting anomaly history:', error);
      return [];
    }
  }

  /**
   * Acknowledge an anomaly alert
   */
  async acknowledgeAnomaly(alertId: string, acknowledgedBy: string): Promise<void> {
    try {
      const key = `anomaly:alert:${alertId}`;
      const data = await redis.get(key);

      if (data) {
        const alert = JSON.parse(data) as AnomalyAlert;
        alert.acknowledged = true;
        alert.acknowledgedBy = acknowledgedBy;
        alert.acknowledgedAt = new Date();

        await redis.setex(key, 86400, JSON.stringify(alert));
        this.alerts.set(alertId, alert);

        this.emit('anomaly-acknowledged', alert);
      }
    } catch (error) {
      console.error('Error acknowledging anomaly:', error);
      throw error;
    }
  }

  /**
   * Resolve an anomaly alert
   */
  async resolveAnomaly(alertId: string, notes?: string): Promise<void> {
    try {
      const key = `anomaly:alert:${alertId}`;
      const data = await redis.get(key);

      if (data) {
        const alert = JSON.parse(data) as AnomalyAlert;
        alert.resolved = true;
        alert.resolvedAt = new Date();
        alert.notes = notes;

        await redis.setex(key, 86400, JSON.stringify(alert));
        this.alerts.set(alertId, alert);

        this.emit('anomaly-resolved', alert);
      }
    } catch (error) {
      console.error('Error resolving anomaly:', error);
      throw error;
    }
  }

  /**
   * Get anomaly statistics
   */
  async getAnomalyStatistics(timeRange: TimeRange): Promise<{
    total: number;
    bySeverity: Record<AnomalySeverity, number>;
    byType: Record<AnomalyType, number>;
    byMetric: Record<string, number>;
    resolved: number;
    unresolved: number;
    averageResolutionTime: number;
  }> {
    try {
      const alerts = await this.getAnomalyHistory(timeRange);

      const stats = {
        total: alerts.length,
        bySeverity: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
        } as Record<AnomalySeverity, number>,
        byType: {
          spike: 0,
          drop: 0,
          trend_change: 0,
          outlier: 0,
          pattern_break: 0,
          threshold_breach: 0,
        } as Record<AnomalyType, number>,
        byMetric: {} as Record<string, number>,
        resolved: 0,
        unresolved: 0,
        averageResolutionTime: 0,
      };

      let totalResolutionTime = 0;
      let resolvedCount = 0;

      for (const alert of alerts) {
        stats.bySeverity[alert.anomaly.severity]++;
        stats.byType[alert.anomaly.type]++;
        
        if (!stats.byMetric[alert.anomaly.metric]) {
          stats.byMetric[alert.anomaly.metric] = 0;
        }
        stats.byMetric[alert.anomaly.metric]++;

        if (alert.resolved) {
          stats.resolved++;
          if (alert.resolvedAt) {
            const resolutionTime = new Date(alert.resolvedAt).getTime() - 
                                  new Date(alert.alertedAt).getTime();
            totalResolutionTime += resolutionTime;
            resolvedCount++;
          }
        } else {
          stats.unresolved++;
        }
      }

      stats.averageResolutionTime = resolvedCount > 0 
        ? totalResolutionTime / resolvedCount / 1000 / 60 // Convert to minutes
        : 0;

      return stats;
    } catch (error) {
      console.error('Error getting anomaly statistics:', error);
      throw error;
    }
  }

  /**
   * Investigate anomaly - get detailed context
   */
  async investigateAnomaly(alertId: string): Promise<{
    alert: AnomalyAlert;
    context: {
      historicalData: { date: string; value: number }[];
      relatedMetrics: { metric: string; value: number; change: number }[];
      similarAnomalies: AnomalyAlert[];
      timeline: { timestamp: Date; event: string; details: string }[];
    };
  }> {
    try {
      const key = `anomaly:alert:${alertId}`;
      const data = await redis.get(key);

      if (!data) {
        throw new Error('Anomaly alert not found');
      }

      const alert = JSON.parse(data) as AnomalyAlert;

      // Get historical data for context
      const endDate = new Date(alert.alertedAt);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 30);

      const historicalData = await this.getMetricHistory(
        alert.anomaly.metric,
        { startDate, endDate }
      );

      const formattedHistory = historicalData.map((value, index) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + index);
        return {
          date: date.toISOString().split('T')[0],
          value,
        };
      });

      // Get related metrics
      const relatedMetrics = await this.getRelatedMetrics(alert.anomaly.metric, endDate);

      // Find similar anomalies
      const similarAnomalies = await this.findSimilarAnomalies(alert);

      // Build timeline
      const timeline = [
        {
          timestamp: alert.alertedAt,
          event: 'Anomaly Detected',
          details: alert.anomaly.description,
        },
      ];

      if (alert.acknowledged && alert.acknowledgedAt) {
        timeline.push({
          timestamp: alert.acknowledgedAt,
          event: 'Acknowledged',
          details: `By ${alert.acknowledgedBy}`,
        });
      }

      if (alert.resolved && alert.resolvedAt) {
        timeline.push({
          timestamp: alert.resolvedAt,
          event: 'Resolved',
          details: alert.notes || 'No notes provided',
        });
      }

      return {
        alert,
        context: {
          historicalData: formattedHistory,
          relatedMetrics,
          similarAnomalies,
          timeline,
        },
      };
    } catch (error) {
      console.error('Error investigating anomaly:', error);
      throw error;
    }
  }

  /**
   * Find similar anomalies
   */
  private async findSimilarAnomalies(alert: AnomalyAlert): Promise<AnomalyAlert[]> {
    try {
      const startDate = new Date(alert.alertedAt);
      startDate.setDate(startDate.getDate() - 7); // Last 7 days

      const history = await this.getAnomalyHistory(
        { startDate, endDate: new Date(alert.alertedAt) },
        {
          metric: alert.anomaly.metric,
          type: alert.anomaly.type,
        }
      );

      return history.slice(0, 5); // Return up to 5 similar anomalies
    } catch (error) {
      console.error('Error finding similar anomalies:', error);
      return [];
    }
  }

  /**
   * Get related metrics at a specific time
   */
  private async getRelatedMetrics(
    _metric: string,
    _timestamp: Date
  ): Promise<{ metric: string; value: number; change: number }[]> {
    // This would query related metrics from the database
    // For now, return empty array
    return [];
  }

  // ==================== Configuration Methods ====================

  /**
   * Get all detection configurations
   */
  private async getDetectionConfigs(): Promise<DetectionConfig[]> {
    try {
      const cached = await redis.get('anomaly:configs');
      if (cached) {
        return JSON.parse(cached);
      }

      // Default configurations
      const configs: DetectionConfig[] = [
        {
          metric: 'revenue',
          enabled: true,
          sensitivity: 7,
          algorithms: ['zscore', 'iqr', 'mad'],
          thresholds: { min: 0 },
          alertChannels: ['email', 'slack'],
        },
        {
          metric: 'active_users',
          enabled: true,
          sensitivity: 6,
          algorithms: ['zscore', 'iqr'],
          thresholds: { min: 0 },
          alertChannels: ['email'],
        },
        {
          metric: 'transactions',
          enabled: true,
          sensitivity: 7,
          algorithms: ['zscore', 'mad'],
          thresholds: { min: 0 },
          alertChannels: ['email', 'slack'],
        },
        {
          metric: 'error_rate',
          enabled: true,
          sensitivity: 9,
          algorithms: ['zscore', 'iqr', 'mad'],
          thresholds: { max: 5 }, // 5% error rate
          alertChannels: ['email', 'slack', 'webhook'],
        },
        {
          metric: 'response_time',
          enabled: true,
          sensitivity: 8,
          algorithms: ['zscore', 'iqr'],
          thresholds: { max: 1000 }, // 1000ms
          alertChannels: ['slack', 'webhook'],
        },
      ];

      await redis.setex('anomaly:configs', 3600, JSON.stringify(configs));
      return configs;
    } catch (error) {
      console.error('Error getting detection configs:', error);
      return [];
    }
  }

  /**
   * Get detection configuration for a specific metric
   */
  private async getDetectionConfig(metric: string): Promise<DetectionConfig | null> {
    const configs = await this.getDetectionConfigs();
    return configs.find(c => c.metric === metric) || null;
  }

  /**
   * Update detection configuration
   */
  async updateDetectionConfig(config: DetectionConfig): Promise<void> {
    try {
      const configs = await this.getDetectionConfigs();
      const index = configs.findIndex(c => c.metric === config.metric);

      if (index >= 0) {
        configs[index] = config;
      } else {
        configs.push(config);
      }

      await redis.setex('anomaly:configs', 3600, JSON.stringify(configs));
    } catch (error) {
      console.error('Error updating detection config:', error);
      throw error;
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Get metric history
   */
  private async getMetricHistory(metric: string, timeRange: TimeRange): Promise<number[]> {
    try {
      // Map metric names to actual data sources
      switch (metric) {
        case 'revenue':
          const revenueData = await historicalAnalyticsService.getRevenueHistory(timeRange, 'daily');
          return revenueData.trend.map(t => t.value);

        case 'active_users':
          const userData = await historicalAnalyticsService.getUserActivityHistory(timeRange, 'daily');
          return userData.trend.map(t => t.value);

        case 'transactions':
          const txData = await historicalAnalyticsService.getTransactionHistory(timeRange, 'daily');
          return txData.trend.map(t => t.value);

        case 'error_rate':
          // Would query error rate from monitoring system
          return Array(30).fill(0).map(() => Math.random() * 2); // Mock data

        case 'response_time':
          // Would query response time from monitoring system
          return Array(30).fill(0).map(() => 200 + Math.random() * 100); // Mock data

        default:
          return [];
      }
    } catch (error) {
      console.error(`Error getting metric history for ${metric}:`, error);
      return [];
    }
  }

}


export const anomalyDetectionService = new AnomalyDetectionService();
