import React, { useEffect, useState } from 'react';
import { useAnomalyDetection, AnomalyInvestigation } from '../hooks/useAnomalyDetection';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, Clock, TrendingUp, Activity } from 'lucide-react';

interface Props {
  alertId: string;
  onClose: () => void;
}

export const AnomalyInvestigationTool: React.FC<Props> = ({ alertId, onClose }) => {
  const { investigateAnomaly } = useAnomalyDetection();
  const [investigation, setInvestigation] = useState<AnomalyInvestigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvestigation = async () => {
      try {
        setLoading(true);
        const data = await investigateAnomaly(alertId);
        setInvestigation(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load investigation');
      } finally {
        setLoading(false);
      }
    };

    loadInvestigation();
  }, [alertId, investigateAnomaly]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading investigation...</p>
        </div>
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-center text-gray-900">{error || 'Investigation not found'}</p>
          <button
            onClick={onClose}
            className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const { alert, context } = investigation;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Anomaly Investigation</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Anomaly Summary */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Anomaly Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Metric</p>
                <p className="text-lg font-semibold text-gray-900">
                  {alert.anomaly.metric.replace('_', ' ').toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="text-lg font-semibold text-gray-900">
                  {alert.anomaly.type.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Severity</p>
                <p className={`text-lg font-semibold ${
                  alert.anomaly.severity === 'critical' ? 'text-red-600' :
                  alert.anomaly.severity === 'high' ? 'text-orange-600' :
                  alert.anomaly.severity === 'medium' ? 'text-yellow-600' :
                  'text-blue-600'
                }`}>
                  {alert.anomaly.severity.toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Deviation</p>
                <p className={`text-lg font-semibold ${
                  alert.anomaly.deviation > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {alert.anomaly.deviation > 0 ? '+' : ''}
                  {alert.anomaly.deviation.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Historical Data Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Historical Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={context.historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Actual Value"
                />
                <Line
                  type="monotone"
                  dataKey={() => alert.anomaly.expectedValue}
                  stroke="#10B981"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Expected Value"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Timeline
            </h3>
            <div className="space-y-4">
              {context.timeline.map((event, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-600"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{event.event}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{event.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Similar Anomalies */}
          {context.similarAnomalies.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Similar Anomalies
              </h3>
              <div className="space-y-3">
                {context.similarAnomalies.map((similar) => (
                  <div
                    key={similar.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {similar.anomaly.type.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(similar.alertedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        Deviation: {similar.anomaly.deviation.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-600">
                        {similar.resolved ? 'Resolved' : 'Unresolved'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Metrics */}
          {context.relatedMetrics.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Related Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {context.relatedMetrics.map((metric, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">{metric.metric}</p>
                    <p className="text-xl font-bold text-gray-900">{metric.value.toFixed(2)}</p>
                    <p className={`text-sm ${
                      metric.change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
