import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface License {
  id: string;
  licenseKey: string;
  contentId: string;
  totalSeats: number;
  usedSeats: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

interface UsageStats {
  totalUsage: number;
  usageByAction: Array<{ action: string; _count: number }>;
  topUsers: Array<{ userEmail: string; _count: number }>;
}

interface DashboardStats {
  totalLicenses: number;
  activeLicenses: number;
  totalSeats: number;
  usedSeats: number;
  utilizationRate: number;
  expiringLicenses: number;
}

export const EnterpriseDashboard: React.FC = () => {
  const { user } = useAuth();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [usageData, setUsageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (user?.enterpriseId) {
      fetchDashboardData();
    }
  }, [user, selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch licenses
      const licensesResponse = await fetch(
        `/api/v1/bulk-purchase/enterprises/${user?.enterpriseId}/licenses`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!licensesResponse.ok) {
        throw new Error('Failed to fetch licenses');
      }

      const licensesData = await licensesResponse.json();
      const fetchedLicenses = licensesData.data.licenses;
      setLicenses(fetchedLicenses);

      // Calculate dashboard stats
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const dashboardStats: DashboardStats = {
        totalLicenses: fetchedLicenses.length,
        activeLicenses: fetchedLicenses.filter((l: License) => l.status === 'active').length,
        totalSeats: fetchedLicenses.reduce((sum: number, l: License) => sum + l.totalSeats, 0),
        usedSeats: fetchedLicenses.reduce((sum: number, l: License) => sum + l.usedSeats, 0),
        utilizationRate: 0,
        expiringLicenses: fetchedLicenses.filter((l: License) => {
          if (!l.expiresAt) return false;
          const expiryDate = new Date(l.expiresAt);
          return expiryDate <= thirtyDaysFromNow && expiryDate > now;
        }).length,
      };

      dashboardStats.utilizationRate =
        dashboardStats.totalSeats > 0
          ? (dashboardStats.usedSeats / dashboardStats.totalSeats) * 100
          : 0;

      setStats(dashboardStats);

      // Fetch aggregated usage data
      await fetchUsageData(fetchedLicenses);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageData = async (licensesList: License[]) => {
    try {
      const endDate = new Date();
      const startDate = new Date();

      // Calculate start date based on selected period
      switch (selectedPeriod) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      // Fetch usage stats for all licenses
      const usagePromises = licensesList.map((license) =>
        fetch(
          `/api/v1/bulk-purchase/licenses/${license.id}/stats?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        )
          .then((res) => res.json())
          .then((data) => ({ licenseId: license.id, stats: data.data }))
          .catch(() => ({ licenseId: license.id, stats: null }))
      );

      const usageResults = await Promise.all(usagePromises);

      // Aggregate usage data
      const aggregatedUsage = {
        totalUsage: 0,
        usageByAction: {} as Record<string, number>,
        topUsers: {} as Record<string, number>,
        usageByLicense: {} as Record<string, number>,
      };

      usageResults.forEach((result) => {
        if (result.stats) {
          aggregatedUsage.totalUsage += result.stats.totalUsage || 0;

          // Aggregate by action
          result.stats.usageByAction?.forEach((item: any) => {
            aggregatedUsage.usageByAction[item.action] =
              (aggregatedUsage.usageByAction[item.action] || 0) + item._count;
          });

          // Aggregate by user
          result.stats.topUsers?.forEach((item: any) => {
            aggregatedUsage.topUsers[item.userEmail] =
              (aggregatedUsage.topUsers[item.userEmail] || 0) + item._count;
          });

          // Track by license
          aggregatedUsage.usageByLicense[result.licenseId] = result.stats.totalUsage || 0;
        }
      });

      setUsageData(aggregatedUsage);
    } catch (err) {
      console.error('Error fetching usage data:', err);
    }
  };

  const handleExportReport = async (format: 'csv' | 'pdf') => {
    try {
      setExportLoading(true);

      const response = await fetch(
        `/api/v1/bulk-purchase/enterprises/${user?.enterpriseId}/reports/export?format=${format}&period=${selectedPeriod}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enterprise-report-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getExpiryStatus = (expiresAt: string | null) => {
    if (!expiresAt) return { text: 'Never', color: 'text-gray-600' };

    const now = new Date();
    const expiry = new Date(expiresAt);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { text: 'Expired', color: 'text-red-600' };
    } else if (daysUntilExpiry <= 7) {
      return { text: `${daysUntilExpiry} days`, color: 'text-red-600' };
    } else if (daysUntilExpiry <= 30) {
      return { text: `${daysUntilExpiry} days`, color: 'text-yellow-600' };
    } else {
      return { text: formatDate(expiresAt), color: 'text-gray-600' };
    }
  };

  // Chart data
  const usageByActionChart = usageData
    ? {
        labels: Object.keys(usageData.usageByAction),
        datasets: [
          {
            label: 'Usage Count',
            data: Object.values(usageData.usageByAction),
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1,
          },
        ],
      }
    : null;

  const topUsersChart = usageData
    ? {
        labels: Object.keys(usageData.topUsers).slice(0, 10),
        datasets: [
          {
            label: 'Usage Count',
            data: Object.values(usageData.topUsers).slice(0, 10),
            backgroundColor: 'rgba(16, 185, 129, 0.5)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 1,
          },
        ],
      }
    : null;

  const seatUtilizationChart = stats
    ? {
        labels: ['Used Seats', 'Available Seats'],
        datasets: [
          {
            data: [stats.usedSeats, stats.totalSeats - stats.usedSeats],
            backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(229, 231, 235, 0.8)'],
            borderColor: ['rgba(59, 130, 246, 1)', 'rgba(229, 231, 235, 1)'],
            borderWidth: 1,
          },
        ],
      }
    : null;

  if (loading) {
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enterprise Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Monitor license usage, manage seats, and track analytics
            </p>
          </div>
          <div className="flex space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <button
              onClick={() => handleExportReport('csv')}
              disabled={exportLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => handleExportReport('pdf')}
              disabled={exportLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Licenses</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalLicenses || 0}</p>
              <p className="text-sm text-green-600 mt-1">
                {stats?.activeLicenses || 0} active
              </p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Seats</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalSeats || 0}</p>
              <p className="text-sm text-gray-600 mt-1">
                {stats?.usedSeats || 0} used
              </p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Utilization Rate</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.utilizationRate.toFixed(1) || 0}%
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${stats?.utilizationRate || 0}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expiring Soon</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.expiringLicenses || 0}</p>
              <p className="text-sm text-yellow-600 mt-1">Within 30 days</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seat Utilization */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Seat Utilization</h3>
          {seatUtilizationChart && (
            <Doughnut
              data={seatUtilizationChart}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          )}
        </div>

        {/* Usage by Action */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage by Action</h3>
          {usageByActionChart && (
            <Bar
              data={usageByActionChart}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          )}
        </div>

        {/* Top Users */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Users</h3>
          {topUsersChart && (
            <Bar
              data={topUsersChart}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          )}
        </div>
      </div>

      {/* Active Licenses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active Licenses</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  License Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Content ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {licenses.map((license) => {
                const utilization =
                  license.totalSeats > 0
                    ? ((license.usedSeats / license.totalSeats) * 100).toFixed(0)
                    : 0;
                const expiryStatus = getExpiryStatus(license.expiresAt);

                return (
                  <tr key={license.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {license.licenseKey}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {license.contentId.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {license.usedSeats} / {license.totalSeats}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${
                              Number(utilization) >= 80
                                ? 'bg-red-600'
                                : Number(utilization) >= 50
                                ? 'bg-yellow-600'
                                : 'bg-green-600'
                            }`}
                            style={{ width: `${utilization}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{utilization}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          license.status
                        )}`}
                      >
                        {license.status}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${expiryStatus.color}`}>
                      {expiryStatus.text}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <a
                        href={`/enterprise/licenses/${license.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Manage
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage Statistics */}
      {usageData && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Usage Events</p>
              <p className="text-2xl font-bold text-gray-900">{usageData.totalUsage}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.keys(usageData.topUsers).length}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Action Types</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.keys(usageData.usageByAction).length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
