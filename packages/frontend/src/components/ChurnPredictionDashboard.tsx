import React, { useEffect, useState } from 'react';
import { useChurnPrediction } from '../hooks/useChurnPrediction';

export const ChurnPredictionDashboard: React.FC = () => {
  const {
    atRiskUsers,
    recommendations,
    churnMetrics,
    loading,
    error,
    fetchAtRiskUsers,
    fetchRetentionRecommendations,
    fetchChurnMetrics,
  } = useChurnPrediction();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [lookbackDays, setLookbackDays] = useState(90);
  const [metricsInterval, setMetricsInterval] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  useEffect(() => {
    fetchAtRiskUsers(lookbackDays, 100);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    fetchChurnMetrics(startDate, endDate, metricsInterval);
  }, [lookbackDays, metricsInterval]);

  useEffect(() => {
    if (selectedUserId) {
      fetchRetentionRecommendations(selectedUserId);
    }
  }, [selectedUserId]);

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 font-semibold';
      case 'medium':
        return 'text-orange-600 font-medium';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading && !atRiskUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Churn Prediction Dashboard</h2>
        <p className="text-gray-600">
          Identify users at risk of churning and get actionable retention recommendations
        </p>
      </div>

      {/* Summary Cards */}
      {atRiskUsers && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-gray-900">{atRiskUsers.totalUsers.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">At Risk Users</h3>
            <p className="text-3xl font-bold text-orange-600">{atRiskUsers.atRiskUsers.length}</p>
            <p className="text-sm text-gray-500 mt-1">
              {((atRiskUsers.atRiskUsers.length / atRiskUsers.totalUsers) * 100).toFixed(1)}% of total
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Current Churn Rate</h3>
            <p className="text-3xl font-bold text-red-600">
              {(atRiskUsers.churnRate * 100).toFixed(1)}%
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Prediction Confidence</h3>
            <p className="text-3xl font-bold text-blue-600">{atRiskUsers.confidence}%</p>
          </div>
        </div>
      )}

      {/* Risk Distribution */}
      {atRiskUsers && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {atRiskUsers.riskDistribution.critical}
              </div>
              <div className="text-sm text-gray-600">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {atRiskUsers.riskDistribution.high}
              </div>
              <div className="text-sm text-gray-600">High</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {atRiskUsers.riskDistribution.medium}
              </div>
              <div className="text-sm text-gray-600">Medium</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {atRiskUsers.riskDistribution.low}
              </div>
              <div className="text-sm text-gray-600">Low</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lookback Period
            </label>
            <select
              value={lookbackDays}
              onChange={(e) => setLookbackDays(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Metrics Interval
            </label>
            <select
              value={metricsInterval}
              onChange={(e) => setMetricsInterval(e.target.value as 'daily' | 'weekly' | 'monthly')}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
      </div>

      {/* At-Risk Users Table */}
      {atRiskUsers && atRiskUsers.atRiskUsers.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">At-Risk Users</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Churn Probability
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Engagement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {atRiskUsers.atRiskUsers.map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.username || user.email || user.userId.substring(0, 8)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.totalPurchases} purchases • ${user.totalSpent.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRiskLevelColor(user.riskLevel)}`}>
                        {user.riskLevel.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{(user.churnProbability * 100).toFixed(1)}%</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full ${
                            user.churnProbability >= 0.8
                              ? 'bg-red-600'
                              : user.churnProbability >= 0.6
                              ? 'bg-orange-600'
                              : user.churnProbability >= 0.4
                              ? 'bg-yellow-600'
                              : 'bg-green-600'
                          }`}
                          style={{ width: `${user.churnProbability * 100}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.daysSinceLastActivity} days ago</div>
                      <div className="text-xs text-gray-500">{user.lastActivityDate}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">Score: {user.engagementScore}/100</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedUserId(user.userId)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Recommendations
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommendations Modal */}
      {selectedUserId && recommendations && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Retention Recommendations</h3>
              <button
                onClick={() => setSelectedUserId(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Personalized Message */}
              {recommendations.personalizedMessage && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-900">{recommendations.personalizedMessage}</p>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Recommended Actions</h4>
                <div className="space-y-3">
                  {recommendations.recommendations.map((rec, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-gray-900">{rec.action}</h5>
                        <span className={`text-xs uppercase ${getPriorityColor(rec.priority)}`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                      <p className="text-xs text-gray-500 italic">
                        Expected Impact: {rec.expectedImpact}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Incentives */}
              {recommendations.incentives && recommendations.incentives.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Suggested Incentives</h4>
                  <div className="space-y-2">
                    {recommendations.incentives.map((incentive, index) => (
                      <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-green-900">{incentive.type.replace('_', ' ').toUpperCase()}</span>
                            <span className="ml-2 text-green-700 font-bold">{incentive.value}</span>
                          </div>
                        </div>
                        <p className="text-sm text-green-800 mt-1">{incentive.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedUserId(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Churn Metrics Over Time */}
      {churnMetrics.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Churn Metrics Over Time</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Churned Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Churn Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Retention Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg LTV
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {churnMetrics.map((metric, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {metric.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metric.totalUsers.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metric.activeUsers.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metric.churnedUsers.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        metric.churnRate > 0.2 ? 'text-red-600' :
                        metric.churnRate > 0.1 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {(metric.churnRate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        metric.retentionRate < 0.8 ? 'text-red-600' :
                        metric.retentionRate < 0.9 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {(metric.retentionRate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${metric.avgLifetimeValue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
