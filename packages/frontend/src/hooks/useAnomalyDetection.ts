import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Anomaly {
  id: string;
  metric: string;
  type: 'spike' | 'drop' | 'trend_change' | 'outlier' | 'pattern_break' | 'threshold_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
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

export interface AnomalyStatistics {
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  byMetric: Record<string, number>;
  resolved: number;
  unresolved: number;
  averageResolutionTime: number;
}

export interface AnomalyInvestigation {
  alert: AnomalyAlert;
  context: {
    historicalData: { date: string; value: number }[];
    relatedMetrics: { metric: string; value: number; change: number }[];
    similarAnomalies: AnomalyAlert[];
    timeline: { timestamp: Date; event: string; details: string }[];
  };
}

export function useAnomalyDetection() {
  const [activeAnomalies, setActiveAnomalies] = useState<AnomalyAlert[]>([]);
  const [statistics, setStatistics] = useState<AnomalyStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveAnomalies = useCallback(async (filters?: {
    metric?: string;
    severity?: string;
    type?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.metric) params.append('metric', filters.metric);
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.type) params.append('type', filters.type);

      const response = await axios.get(
        `${API_BASE_URL}/api/v1/analytics/anomaly-detection/active?${params.toString()}`
      );

      setActiveAnomalies(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch active anomalies');
      console.error('Error fetching active anomalies:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnomalyHistory = useCallback(async (
    startDate: Date,
    endDate: Date,
    filters?: {
      metric?: string;
      severity?: string;
      type?: string;
    }
  ): Promise<AnomalyAlert[]> => {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      if (filters?.metric) params.append('metric', filters.metric);
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.type) params.append('type', filters.type);

      const response = await axios.get(
        `${API_BASE_URL}/api/v1/analytics/anomaly-detection/history?${params.toString()}`
      );

      return response.data;
    } catch (err: any) {
      console.error('Error fetching anomaly history:', err);
      throw err;
    }
  }, []);

  const fetchStatistics = useCallback(async (startDate: Date, endDate: Date) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await axios.get(
        `${API_BASE_URL}/api/v1/analytics/anomaly-detection/statistics?${params.toString()}`
      );

      setStatistics(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch statistics');
      console.error('Error fetching statistics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const acknowledgeAnomaly = useCallback(async (alertId: string, acknowledgedBy: string) => {
    try {
      await axios.post(
        `${API_BASE_URL}/api/v1/analytics/anomaly-detection/${alertId}/acknowledge`,
        { acknowledgedBy }
      );

      // Refresh active anomalies
      await fetchActiveAnomalies();
    } catch (err: any) {
      console.error('Error acknowledging anomaly:', err);
      throw err;
    }
  }, [fetchActiveAnomalies]);

  const resolveAnomaly = useCallback(async (alertId: string, notes?: string) => {
    try {
      await axios.post(
        `${API_BASE_URL}/api/v1/analytics/anomaly-detection/${alertId}/resolve`,
        { notes }
      );

      // Refresh active anomalies
      await fetchActiveAnomalies();
    } catch (err: any) {
      console.error('Error resolving anomaly:', err);
      throw err;
    }
  }, [fetchActiveAnomalies]);

  const investigateAnomaly = useCallback(async (alertId: string): Promise<AnomalyInvestigation> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/analytics/anomaly-detection/${alertId}/investigate`
      );

      return response.data;
    } catch (err: any) {
      console.error('Error investigating anomaly:', err);
      throw err;
    }
  }, []);

  const updateDetectionConfig = useCallback(async (config: any) => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/v1/analytics/anomaly-detection/config`,
        config
      );
    } catch (err: any) {
      console.error('Error updating detection config:', err);
      throw err;
    }
  }, []);

  return {
    activeAnomalies,
    statistics,
    loading,
    error,
    fetchActiveAnomalies,
    fetchAnomalyHistory,
    fetchStatistics,
    acknowledgeAnomaly,
    resolveAnomaly,
    investigateAnomaly,
    updateDetectionConfig,
  };
}
