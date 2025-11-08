import { useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface AtRiskUser {
  userId: string;
  email?: string;
  username?: string;
  churnProbability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastActivityDate: string;
  daysSinceLastActivity: number;
  totalPurchases: number;
  totalSpent: number;
  avgSessionDuration: number;
  engagementScore: number;
  reasons: string[];
}

export interface ChurnPredictionResult {
  totalUsers: number;
  atRiskUsers: AtRiskUser[];
  churnRate: number;
  predictedChurnRate: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  confidence: number;
  generatedAt: string;
}

export interface RetentionRecommendation {
  userId: string;
  recommendations: {
    action: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
    expectedImpact: string;
  }[];
  personalizedMessage?: string;
  incentives?: {
    type: string;
    value: string;
    description: string;
  }[];
}

export interface ChurnMetrics {
  period: string;
  totalUsers: number;
  activeUsers: number;
  churnedUsers: number;
  churnRate: number;
  retentionRate: number;
  avgLifetimeValue: number;
}

export function useChurnPrediction() {
  const [atRiskUsers, setAtRiskUsers] = useState<ChurnPredictionResult | null>(null);
  const [recommendations, setRecommendations] = useState<RetentionRecommendation | null>(null);
  const [churnMetrics, setChurnMetrics] = useState<ChurnMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch users at risk of churning
   */
  const fetchAtRiskUsers = useCallback(async (
    lookbackDays: number = 90,
    limit: number = 100
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/analytics/churn/at-risk`,
        {
          params: { lookbackDays, limit },
        }
      );

      setAtRiskUsers(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch at-risk users';
      setError(errorMessage);
      console.error('Error fetching at-risk users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch retention recommendations for a specific user
   */
  const fetchRetentionRecommendations = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/analytics/churn/recommendations/${userId}`
      );

      setRecommendations(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch recommendations';
      setError(errorMessage);
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch churn metrics over time
   */
  const fetchChurnMetrics = useCallback(async (
    startDate: Date,
    endDate: Date,
    interval: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/analytics/churn/metrics`,
        {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            interval,
          },
        }
      );

      setChurnMetrics(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch churn metrics';
      setError(errorMessage);
      console.error('Error fetching churn metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear all data
   */
  const clearData = useCallback(() => {
    setAtRiskUsers(null);
    setRecommendations(null);
    setChurnMetrics([]);
    setError(null);
  }, []);

  return {
    atRiskUsers,
    recommendations,
    churnMetrics,
    loading,
    error,
    fetchAtRiskUsers,
    fetchRetentionRecommendations,
    fetchChurnMetrics,
    clearData,
  };
}
