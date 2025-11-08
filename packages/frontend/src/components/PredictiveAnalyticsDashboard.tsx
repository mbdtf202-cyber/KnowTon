import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { usePredictiveAnalytics } from '../hooks/usePredictiveAnalytics';

interface PredictiveAnalyticsDashboardProps {
  historicalDays?: number;
  forecastDays?: number;
}

export const PredictiveAnalyticsDashboard: React.FC<PredictiveAnalyticsDashboardProps> = ({
  historicalDays = 90,
  forecastDays = 30,
}) => {
  const {
    revenuePrediction,
    userGrowthPrediction,
    trendPredictions,
    loading,
    error,
    fetchAllPredictions,
  } = usePredictiveAnalytics();

  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'users' | 'trends'>('revenue');

  useEffect(() => {
    fetchAllPredictions(historicalDays, forecastDays);
  }, [historicalDays, forecastDays]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return '↗️';
      case 'down':
        return '↘️';
      case 'stable':
        return '→';
    }
  };

  if (loading && !revenuePrediction) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Predictive Analytics</h2>
        <p className="text-gray-600">
          AI-powered forecasts based on {historicalDays} days of historical data
        </p>
      </div>

      {/* Metric Selector */}
      <div className="flex space-x-4">
        <button
          onClick={() => setSelectedMetric('revenue')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedMetric === 'revenue'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Revenue Prediction
        </button>
        <button
          onClick={() => setSelectedMetric('users')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedMetric === 'users'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          User Growth
        </button>
        <button
          onClick={() => setSelectedMetric('trends')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedMetric === 'trends'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Trend Analysis
        </button>
      </div>

      {/* Revenue Prediction */}
      {selectedMetric === 'revenue' && revenuePrediction && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Predicted Revenue</h3>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(revenuePrediction.totalPredicted)}
              </p>
              <p className="text-sm text-gray-600 mt-2">Next {forecastDays} days</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Growth Rate</h3>
              <p className="text-3xl font-bold text-gray-900">
                {revenuePrediction.growthRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600 mt-2">Based on historical trend</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Confidence</h3>
              <p className={`text-3xl font-bold ${getConfidenceColor(revenuePrediction.confidence)}`}>
                {revenuePrediction.confidence}%
              </p>
              <p className="text-sm text-gray-600 mt-2">Prediction accuracy</p>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Forecast</h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={revenuePrediction.predictions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Predicted Revenue"
                  stroke="#3B82F6"
                  fill="#93C5FD"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 text-sm text-gray-600">
              <p>Method: {revenuePrediction.method}</p>
              <p>Historical data points: {revenuePrediction.metadata.historicalDataPoints}</p>
            </div>
          </div>

          {/* Seasonal Factors */}
          {revenuePrediction.seasonalFactors && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Seasonal Patterns</h3>
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                  const factor = revenuePrediction.seasonalFactors?.[index.toString()] || 1;
                  const percentage = ((factor - 1) * 100).toFixed(0);
                  return (
                    <div key={day} className="text-center">
                      <div className="text-sm font-medium text-gray-700">{day}</div>
                      <div
                        className={`text-lg font-bold ${
                          factor > 1 ? 'text-green-600' : factor < 1 ? 'text-red-600' : 'text-gray-600'
                        }`}
                      >
                        {percentage > 0 ? '+' : ''}{percentage}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Growth Prediction */}
      {selectedMetric === 'users' && userGrowthPrediction && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Expected Users</h3>
              <p className="text-3xl font-bold text-gray-900">
                {formatNumber(userGrowthPrediction.expectedUsers)}
              </p>
              <p className="text-sm text-gray-600 mt-2">By end of forecast period</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Acquisition Rate</h3>
              <p className="text-3xl font-bold text-green-600">
                {(userGrowthPrediction.acquisitionRate * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600 mt-2">Daily growth rate</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Churn Rate</h3>
              <p className="text-3xl font-bold text-red-600">
                {(userGrowthPrediction.churnRate * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600 mt-2">User attrition</p>
            </div>
          </div>

          {/* User Growth Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth Forecast</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={userGrowthPrediction.predictions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tickFormatter={(value) => formatNumber(value)} />
                <Tooltip
                  formatter={(value: number) => formatNumber(value)}
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Predicted Users"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <p>Method: {userGrowthPrediction.method}</p>
                <p>Confidence: {userGrowthPrediction.confidence}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trend Analysis */}
      {selectedMetric === 'trends' && trendPredictions.length > 0 && (
        <div className="space-y-6">
          {/* Trend Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {trendPredictions.map((trend) => (
              <div key={trend.metric} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-500 capitalize">
                    {trend.metric.replace('_', ' ')}
                  </h3>
                  <span className="text-2xl">{getTrendIcon(trend.direction)}</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500">Direction</p>
                    <p className="text-lg font-semibold text-gray-900 capitalize">{trend.direction}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Strength</p>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            trend.strength >= 70
                              ? 'bg-green-500'
                              : trend.strength >= 40
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${trend.strength}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{trend.strength}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Confidence</p>
                    <p className={`text-lg font-semibold ${getConfidenceColor(trend.confidence)}`}>
                      {trend.confidence}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trend Charts */}
          {trendPredictions.map((trend) => (
            <div key={trend.metric} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                {trend.metric.replace('_', ' ')} Forecast
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trend.predictions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip labelFormatter={(date) => new Date(date).toLocaleDateString()} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={
                      trend.direction === 'up'
                        ? '#10B981'
                        : trend.direction === 'down'
                        ? '#EF4444'
                        : '#6B7280'
                    }
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
