import React, { useEffect, useState } from 'react';
import { useAnomalyDetection, AnomalyAlert } from '../hooks/useAnomalyDetection';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  Check,
  X,
} from 'lucide-react';

export const AnomalyDetectionDashboard: React.FC = () => {
  const {
    activeAnomalies,
    statistics,
    loading,
    error,
    fetchActiveAnomalies,
    fetchStatistics,
    acknowledgeAnomaly,
    resolveAnomaly,
  } = useAnomalyDetection();

  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    fetchActiveAnomalies();
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    fetchStatistics(startDate, endDate);

    // Refresh every minute
    const interval = setInterval(() => {
      fetchActiveAnomalies();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchActiveAnomalies, fetchStatistics]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAnomaly(alertId, 'current-user'); // Replace with actual user
      alert('Anomaly acknowledged');
    } catch (err) {
      alert('Failed to acknowledge anomaly');
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await resolveAnomaly(alertId, resolutionNotes);
      setSelectedAnomaly(null);
      setResolutionNotes('');
      alert('Anomaly resolved');
    } catch (err) {
      alert('Failed to resolve anomaly');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'spike':
        return <TrendingUp className="w-5 h-5" />;
      case 'drop':
        return <TrendingDown className="w-5 h-5" />;
      case 'outlier':
        return <Activity className="w-5 h-5" />;
      case 'threshold_breach':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const filteredAnomalies = activeAnomalies.filter((alert) => {
    if (selectedSeverity && alert.anomaly.severity !== selectedSeverity) return false;
    if (selectedType && alert.anomaly.type !== selectedType) return false;
    if (selectedMetric && alert.anomaly.metric !== selectedMetric) return false;
    return true;
  });

  if (loading && !activeAnomalies.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Anomaly Detection</h2>
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
          <span className="text-sm text-gray-600">Live Monitoring</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Anomalies</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unresolved</p>
                <p className="text-2xl font-bold text-orange-600">{statistics.unresolved}</p>
              </div>
              <XCircle className="w-8 h-8 text-orange-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{statistics.resolved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div>
              <p className="text-sm text-gray-600">Avg Resolution Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(statistics.averageResolutionTime)} min
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="spike">Spike</option>
              <option value="drop">Drop</option>
              <option value="outlier">Outlier</option>
              <option value="threshold_breach">Threshold Breach</option>
              <option value="trend_change">Trend Change</option>
              <option value="pattern_break">Pattern Break</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Metric
            </label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Metrics</option>
              <option value="revenue">Revenue</option>
              <option value="active_users">Active Users</option>
              <option value="transactions">Transactions</option>
              <option value="error_rate">Error Rate</option>
              <option value="response_time">Response Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Anomaly List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Active Anomalies ({filteredAnomalies.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredAnomalies.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">No active anomalies detected</p>
            </div>
          ) : (
            filteredAnomalies.map((alert) => (
              <div key={alert.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`p-2 rounded-lg ${getSeverityColor(alert.anomaly.severity)}`}>
                      {getTypeIcon(alert.anomaly.type)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {alert.anomaly.metric.replace('_', ' ').toUpperCase()}
                        </h4>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(
                            alert.anomaly.severity
                          )}`}
                        >
                          {alert.anomaly.severity}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          {alert.anomaly.type.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mb-2">
                        {alert.anomaly.description}
                      </p>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Current Value:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {alert.anomaly.value.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Expected:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {alert.anomaly.expectedValue.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Deviation:</span>
                          <span className={`ml-2 font-medium ${
                            alert.anomaly.deviation > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {alert.anomaly.deviation > 0 ? '+' : ''}
                            {alert.anomaly.deviation.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-gray-500">
                        Detected: {new Date(alert.alertedAt).toLocaleString()}
                      </div>

                      {alert.acknowledged && (
                        <div className="mt-2 flex items-center text-xs text-green-600">
                          <Check className="w-4 h-4 mr-1" />
                          Acknowledged by {alert.acknowledgedBy} at{' '}
                          {alert.acknowledgedAt && new Date(alert.acknowledgedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setSelectedAnomaly(alert)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Investigate"
                    >
                      <Eye className="w-5 h-5" />
                    </button>

                    {!alert.acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Acknowledge"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    )}

                    {!alert.resolved && (
                      <button
                        onClick={() => setSelectedAnomaly(alert)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Resolve"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Resolution Modal */}
      {selectedAnomaly && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Resolve Anomaly</h3>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Add notes about how this anomaly was resolved:
              </p>

              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Enter resolution notes..."
              />
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSelectedAnomaly(null);
                  setResolutionNotes('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolve(selectedAnomaly.id)}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
