import { useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ForecastReport {
  generatedAt: string;
  period: {
    historical: {
      startDate: Date;
      endDate: Date;
    };
    forecast: {
      startDate: Date;
      endDate: Date;
    };
  };
  summary: {
    totalHistoricalRevenue: number;
    totalForecastedRevenue: number;
    averageDailyRevenue: number;
    projectedGrowthRate: number;
    confidence: number;
  };
  forecast: {
    predictions: Array<{ date: string; value: number }>;
    confidence: number;
    method: string;
    totalPredicted: number;
    growthRate: number;
    seasonalFactors?: { [key: string]: number };
  };
  breakdown: {
    byCategory: Array<{
      category: string;
      historicalRevenue: number;
      forecastedRevenue: number;
      growthRate: number;
      confidence: number;
    }>;
    byPaymentMethod: Array<{
      method: string;
      historicalRevenue: number;
      forecastedRevenue: number;
      percentage: number;
    }>;
    byRegion?: Array<{
      region: string;
      historicalRevenue: number;
      forecastedRevenue: number;
      growthRate: number;
    }>;
  };
  seasonalInsights: {
    peakDays: string[];
    lowDays: string[];
    seasonalFactors: { [key: string]: number };
  };
  recommendations: string[];
}

export function useRevenueForecast() {
  const [report, setReport] = useState<ForecastReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = useCallback(
    async (historicalDays: number = 90, forecastDays: number = 30) => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/v1/analytics/forecast/report`,
          {
            params: { historicalDays, forecastDays },
          }
        );

        setReport(response.data);
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || err.message || 'Failed to generate forecast report';
        setError(errorMessage);
        console.error('Error generating forecast report:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const exportToPDF = useCallback(
    async (historicalDays: number = 90, forecastDays: number = 30) => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/v1/analytics/forecast/export/pdf`,
          {
            params: { historicalDays, forecastDays },
            responseType: 'blob',
          }
        );

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `revenue-forecast-${Date.now()}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || err.message || 'Failed to export PDF';
        setError(errorMessage);
        console.error('Error exporting PDF:', err);
      }
    },
    []
  );

  const exportToCSV = useCallback(
    async (historicalDays: number = 90, forecastDays: number = 30) => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/v1/analytics/forecast/export/csv`,
          {
            params: { historicalDays, forecastDays },
            responseType: 'blob',
          }
        );

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `revenue-forecast-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || err.message || 'Failed to export CSV';
        setError(errorMessage);
        console.error('Error exporting CSV:', err);
      }
    },
    []
  );

  return {
    report,
    loading,
    error,
    generateReport,
    exportToPDF,
    exportToCSV,
  };
}
