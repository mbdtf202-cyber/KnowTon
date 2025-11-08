import React, { useState, useEffect } from 'react';
import { useRealtimeMetrics } from '../hooks/useRealtimeMetrics';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface RevenueDataPoint {
  timestamp: string;
  value: number;
}

export const RealtimeDashboard: React.FC = () => {
  const { metrics, isConnected, error, reconnect } = useRealtimeMetrics();
  const [revenueHistory, setRevenueHistory] = useState<RevenueDataPoint[]>([]);
  const [activeUsersHistory, setActiveUsersHistory] = useState<RevenueDataPoint[]>([]);

  // Update history when metrics change
  useEffect(() => {
    if (metrics) {
      const timestamp = new Date(metrics.timestamp).toLocaleTimeString();
      
      setRevenueHistory((prev) => {
        const newHistory = [...prev, { timestamp, value: metrics.revenue.today }];
        // Keep last 20 data points
        return newHistory.slice(-20);
      });

      setActiveUsersHistory((prev) => {
        const newHistory = [...prev, { timestamp, value: metrics.activeUsers.current }];
        return newHistory.slice(-20);
      });
    }
  }, [metrics]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const revenueChartData = {
    labels: revenueHistory.map((d) => d.timestamp),
    datasets: [
      {
        label: 'Revenue Today',
        data: revenueHistory.map((d) => d.value),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const activeUsersChartData = {
    labels: activeUsersHistory.map((d) => d.timestamp),
    datasets: [
      {
        label: 'Active Users',
        data: activeUsersHistory.map((d) => d.value),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-red-800">Connection Error</h3>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
          <button
            onClick={reconnect}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Reconnect
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading real-time metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Real-time Analytics Dashboard</h2>
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}
          ></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics.revenue.total)}
          icon="💰"
          color="blue"
        />
        <MetricCard
          title="Today's Revenue"
          value={formatCurrency(metrics.revenue.today)}
          icon="📈"
          color="green"
          animated
        />
        <MetricCard
          title="This Week"
          value={formatCurrency(metrics.revenue.thisWeek)}
          icon="📊"
          color="purple"
        />
        <MetricCard
          title="This Month"
          value={formatCurrency(metrics.revenue.thisMonth)}
          icon="💵"
          color="indigo"
        />
      </div>

      {/* Active Users */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Active Users Now"
          value={formatNumber(metrics.activeUsers.current)}
          icon="👥"
          color="green"
          animated
        />
        <MetricCard
          title="Active Today"
          value={formatNumber(metrics.activeUsers.today)}
          icon="📱"
          color="blue"
        />
        <MetricCard
          title="Peak (24h)"
          value={formatNumber(metrics.activeUsers.peak24h)}
          icon="🔥"
          color="red"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <div className="h-64">
            <Line data={revenueChartData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Users Trend</h3>
          <div className="h-64">
            <Line data={activeUsersChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transactions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">
              {formatNumber(metrics.transactions.total)}
            </p>
            <p className="text-sm text-gray-600 mt-1">Total</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600">
              {formatNumber(metrics.transactions.pending)}
            </p>
            <p className="text-sm text-gray-600 mt-1">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {formatNumber(metrics.transactions.completed)}
            </p>
            <p className="text-sm text-gray-600 mt-1">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600">
              {formatNumber(metrics.transactions.failed)}
            </p>
            <p className="text-sm text-gray-600 mt-1">Failed</p>
          </div>
        </div>
      </div>

      {/* Content Metrics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600">Total Views</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {formatNumber(metrics.content.totalViews)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Purchases</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {formatNumber(metrics.content.totalPurchases)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Conversion Rate</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {metrics.content.conversionRate.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date(metrics.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'indigo' | 'red';
  animated?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, animated }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    indigo: 'bg-indigo-50 border-indigo-200',
    red: 'bg-red-50 border-red-200',
  };

  return (
    <div
      className={`${colorClasses[color]} border rounded-lg p-6 ${
        animated ? 'animate-pulse-slow' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
};
