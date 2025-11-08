import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

export interface TrendData {
  date: string;
  value: number;
}

export interface HistoricalMetrics {
  revenue: {
    trend: TrendData[];
    total: number;
    growth: number;
  };
  users: {
    trend: TrendData[];
    total: number;
    growth: number;
  };
  transactions: {
    trend: TrendData[];
    total: number;
    growth: number;
  };
  content: {
    trend: TrendData[];
    total: number;
    growth: number;
  };
}

export type Granularity = 'daily' | 'weekly' | 'monthly';

export const useHistoricalAnalytics = (
  timeRange: TimeRange,
  granularity: Granularity = 'daily'
) => {
  const [metrics, setMetrics] = useState<HistoricalMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/analytics/historical/metrics', {
        params: {
          startDate: timeRange.startDate.toISOString(),
          endDate: timeRange.endDate.toISOString(),
          granularity,
        },
      });

      setMetrics(response.data);
    } catch (err: any) {
      console.error('Error fetching historical metrics:', err);
      setError(err.response?.data?.error || 'Failed to fetch historical metrics');
    } finally {
      setLoading(false);
    }
  }, [timeRange, granularity]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, refetch: fetchMetrics };
};

export const useCategoryTrends = (
  timeRange: TimeRange,
  granularity: Granularity = 'daily'
) => {
  const [trends, setTrends] = useState<
    { category: string; trend: TrendData[]; total: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/analytics/historical/categories', {
        params: {
          startDate: timeRange.startDate.toISOString(),
          endDate: timeRange.endDate.toISOString(),
          granularity,
        },
      });

      setTrends(response.data);
    } catch (err: any) {
      console.error('Error fetching category trends:', err);
      setError(err.response?.data?.error || 'Failed to fetch category trends');
    } finally {
      setLoading(false);
    }
  }, [timeRange, granularity]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  return { trends, loading, error, refetch: fetchTrends };
};

export const useTopCreatorsByRevenue = (
  timeRange: TimeRange,
  limit: number = 10
) => {
  const [creators, setCreators] = useState<
    { address: string; revenue: number; transactions: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCreators = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/analytics/historical/top-creators', {
        params: {
          startDate: timeRange.startDate.toISOString(),
          endDate: timeRange.endDate.toISOString(),
          limit,
        },
      });

      setCreators(response.data);
    } catch (err: any) {
      console.error('Error fetching top creators:', err);
      setError(err.response?.data?.error || 'Failed to fetch top creators');
    } finally {
      setLoading(false);
    }
  }, [timeRange, limit]);

  useEffect(() => {
    fetchCreators();
  }, [fetchCreators]);

  return { creators, loading, error, refetch: fetchCreators };
};

export const useExportAnalytics = () => {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = useCallback(
    async (
      timeRange: TimeRange,
      granularity: Granularity = 'daily',
      format: 'csv' | 'pdf' = 'csv'
    ) => {
      try {
        setExporting(true);
        setError(null);

        const response = await api.get('/analytics/export', {
          params: {
            startDate: timeRange.startDate.toISOString(),
            endDate: timeRange.endDate.toISOString(),
            granularity,
            format,
          },
          responseType: 'blob',
        });

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute(
          'download',
          `analytics-${Date.now()}.${format}`
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err: any) {
        console.error('Error exporting analytics:', err);
        setError(err.response?.data?.error || 'Failed to export analytics');
      } finally {
        setExporting(false);
      }
    },
    []
  );

  return { exportData, exporting, error };
};
