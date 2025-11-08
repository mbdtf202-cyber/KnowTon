import { useState, useEffect } from 'react';
import api from '../services/api';

export interface UserJourney {
  sessionId: string;
  userAddress: string;
  startTime: string;
  endTime: string;
  events: JourneyEvent[];
  duration: number;
  converted: boolean;
}

export interface JourneyEvent {
  eventType: string;
  targetId: string;
  targetType: string;
  timestamp: string;
  metadata?: any;
}

export interface FunnelStage {
  stage: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
}

export interface FunnelAnalysis {
  stages: FunnelStage[];
  totalUsers: number;
  overallConversionRate: number;
  averageTimeToConvert: number;
}

export interface ContentHeatmap {
  contentId: string;
  tokenId: string;
  title: string;
  category: string;
  views: number;
  likes: number;
  shares: number;
  purchases: number;
  engagementScore: number;
  position: {
    x: number;
    y: number;
  };
}

export interface CohortData {
  cohortDate: string;
  cohortSize: number;
  retention: {
    [key: string]: number;
  };
  revenue: {
    [key: string]: number;
  };
}

export interface EngagementPatterns {
  hourlyActivity: { hour: number; events: number }[];
  dayOfWeekActivity: { day: string; events: number }[];
  topActions: { action: string; count: number }[];
}

export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

export const useUserBehaviorAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserJourneys = async (
    timeRange: TimeRange,
    userAddress?: string,
    limit: number = 100
  ): Promise<UserJourney[]> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: timeRange.startDate.toISOString(),
        endDate: timeRange.endDate.toISOString(),
        limit: limit.toString(),
      });
      if (userAddress) {
        params.append('userAddress', userAddress);
      }

      const response = await api.get(`/analytics/behavior/journeys?${params}`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch user journeys');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getFunnelAnalysis = async (
    timeRange: TimeRange,
    contentId?: string
  ): Promise<FunnelAnalysis> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: timeRange.startDate.toISOString(),
        endDate: timeRange.endDate.toISOString(),
      });
      if (contentId) {
        params.append('contentId', contentId);
      }

      const response = await api.get(`/analytics/behavior/funnel?${params}`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch funnel analysis');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getContentHeatmap = async (
    timeRange: TimeRange,
    category?: string,
    limit: number = 50
  ): Promise<ContentHeatmap[]> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: timeRange.startDate.toISOString(),
        endDate: timeRange.endDate.toISOString(),
        limit: limit.toString(),
      });
      if (category) {
        params.append('category', category);
      }

      const response = await api.get(`/analytics/behavior/heatmap?${params}`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch content heatmap');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getCohortAnalysis = async (
    cohortType: 'daily' | 'weekly' | 'monthly' = 'weekly',
    periods: number = 12
  ): Promise<CohortData[]> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        cohortType,
        periods: periods.toString(),
      });

      const response = await api.get(`/analytics/behavior/cohorts?${params}`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch cohort analysis');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getEngagementPatterns = async (
    timeRange: TimeRange,
    userAddress?: string
  ): Promise<EngagementPatterns> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: timeRange.startDate.toISOString(),
        endDate: timeRange.endDate.toISOString(),
      });
      if (userAddress) {
        params.append('userAddress', userAddress);
      }

      const response = await api.get(`/analytics/behavior/engagement-patterns?${params}`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch engagement patterns');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const trackEvent = async (event: {
    sessionId: string;
    userAddress: string;
    eventType: string;
    targetId?: string;
    targetType?: string;
    metadata?: any;
    deviceType?: string;
    countryCode?: string;
  }): Promise<void> => {
    try {
      await api.post('/analytics/behavior/track', event);
    } catch (err: any) {
      console.error('Failed to track event:', err);
      // Don't throw - tracking failures shouldn't break the app
    }
  };

  return {
    loading,
    error,
    getUserJourneys,
    getFunnelAnalysis,
    getContentHeatmap,
    getCohortAnalysis,
    getEngagementPatterns,
    trackEvent,
  };
};
