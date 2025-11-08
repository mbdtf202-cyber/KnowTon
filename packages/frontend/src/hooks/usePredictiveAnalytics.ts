import { useState, useEffect } from 'react';
import { api } from '../services/api';

export interface TrendData {
  date: string;
  value: number;
}

export interface PredictionResult {
  predictions: TrendData[];
  confidence: number;
  method: string;
  metadata: {
    historicalDataPoints: number;
    predictionHorizon: number;
    modelAccuracy?: number;
  };
}

export interface RevenuePrediction extends PredictionResult {
  totalPredicted: number;
  growthRate: number;
  seasonalFactors?: { [key: string]: number };
}

export interface UserGrowthPrediction extends PredictionResult {
  expectedUsers: number;
  churnRate: number;
  acquisitionRate: number;
}

export interface TrendPrediction {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  strength: number;
  predictions: TrendData[];
  confidence: number;
}

export const usePredictiveAnalytics = () => {
  const [revenuePrediction, setRevenuePrediction] = useState<RevenuePrediction | null>(null);
  const [userGrowthPrediction, setUserGrowthPrediction] = useState<UserGrowthPrediction | null>(null);
  const [trendPredictions, setTrendPredictions] = useState<TrendPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenuePrediction = async (historicalDays: number = 90, forecastDays: number = 30) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/analytics/predict/revenue', {
        params: { historicalDays, forecastDays },
      });
      setRevenuePrediction(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch revenue prediction');
      console.error('Error fetching revenue prediction:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGrowthPrediction = async (historicalDays: number = 90, forecastDays: number = 30) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/analytics/predict/user-growth', {
        params: { historicalDays, forecastDays },
      });
      setUserGrowthPrediction(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch user growth prediction');
      console.error('Error fetching user growth prediction:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendPredictions = async (historicalDays: number = 90, forecastDays: number = 30) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/analytics/predict/trends', {
        params: { historicalDays, forecastDays },
      });
      setTrendPredictions(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch trend predictions');
      console.error('Error fetching trend predictions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryPrediction = async (
    category: string,
    historicalDays: number = 90,
    forecastDays: number = 30
  ): Promise<RevenuePrediction | null> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/analytics/predict/category/${category}`, {
        params: { historicalDays, forecastDays },
      });
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch category prediction');
      console.error('Error fetching category prediction:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPredictions = async (historicalDays: number = 90, forecastDays: number = 30) => {
    await Promise.all([
      fetchRevenuePrediction(historicalDays, forecastDays),
      fetchUserGrowthPrediction(historicalDays, forecastDays),
      fetchTrendPredictions(historicalDays, forecastDays),
    ]);
  };

  return {
    revenuePrediction,
    userGrowthPrediction,
    trendPredictions,
    loading,
    error,
    fetchRevenuePrediction,
    fetchUserGrowthPrediction,
    fetchTrendPredictions,
    fetchCategoryPrediction,
    fetchAllPredictions,
  };
};
