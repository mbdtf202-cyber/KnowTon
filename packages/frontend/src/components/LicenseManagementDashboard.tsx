import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface License {
  id: string;
  licenseKey: string;
  enterpriseId: string;
  contentId: string;
  totalSeats: number;
  usedSeats: number;
  pricePerSeat: number;
  totalAmount: number;
  discountPercent: number;
  currency: string;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  enterprise: {
    companyName: string;
    companyEmail: string;
  };
  seats: Seat[];
}

interface Seat {
  id: string;
  userEmail: string;
  userId: string | null;
  status: string;
  assignedAt: string;
  lastUsedAt: string | null;
}

interface UsageStats {
  totalUsage: number;
  usageByAction: Array<{ action: string; _count: number }>;
  topUsers: Array<{ userEmail: string; _count: number }>;
}

export const LicenseManagementDashboard: React.FC = () => {
  const { user } = useAuth();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Fetch licenses
  useEffect(() => {
    if (user?.enterpriseId) {
      fetchLicenses();
    }
  }, [user]);

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/bulk-purchase/enterprises/${user?.enterpriseId}/licenses`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch licenses');
      }

      const data = await response.json();
      setLicenses(data.data.licenses);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLicenseDetails = async (licenseId: string) => {
    try {
      const response = await fetch(`/api/v1/bulk-purchase/licenses/${licenseId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch license details');
      }

      const data = await response.json();
      setSelectedLicense(data.data);

      // Fetch usage stats
      fetchUsageStats(licenseId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchUsageStats = async (licenseId: string) => {
    try {
      const response = await fetch(`/api/v1/bulk-purchase/licenses/${licenseId}/stats`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch usage stats');
      }

      const data = await response.json();
      setUsageStats(data.data);
    } catch (err: any) {
      console.error('Error fetching usage stats:', err);
    }
  };

  const handleAssignSeat = async () => {
    if (!selectedLicense || !newUserEmail) return;

    try {
      setAssignLoading(true);
      const response = await fetch(
        `/api/v1/bulk-purchase/licenses/${selectedLicense.id}/seats/assign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ userEmail: newUserEmail }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign seat');
      }

      // Refresh license details
      await fetchLicenseDetails(selectedLicense.id);
      setShowAssignModal(false);
      setNewUserEmail('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRevokeSeat = async (seatId: string) => {
    if (!confirm('Are you sure you want to revoke this seat?')) return;

    try {
      const response = await fetch(`/api/v1/bulk-purchase/seats/${seatId}/revoke`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to revoke seat');
      }

      // Refresh license details
      if (selectedLicense) {
        await fetchLicenseDetails(selectedLicense.id);
      }
    } catch (err: any) {
      alert(err.message);
    }
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

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
        <h1 className="text-2xl font-bold text-gray-900">License Management</h1>
        <p className="text-gray-600 mt-2">Manage your enterprise content licenses and seats</p>
      </div>

      {/* Licenses Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Licenses</p>
              <p className="text-3xl font-bold text-gray-900">{licenses.length}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg
                className="w-6 h-6 text-blue-600"
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
              <p className="text-3xl font-bold text-gray-900">
                {licenses.reduce((sum, l) => sum + l.totalSeats, 0)}
              </p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <svg
                className="w-6 h-6 text-green-600"
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
              <p className="text-sm text-gray-600">Used Seats</p>
              <p className="text-3xl font-bold text-gray-900">
                {licenses.reduce((sum, l) => sum + l.usedSeats, 0)}
              </p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Licenses List */}
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
              {licenses.map((license) => (
                <tr key={license.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {license.licenseKey}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {license.contentId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {license.usedSeats} / {license.totalSeats}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(license.expiresAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => fetchLicenseDetails(license.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* License Details Modal */}
      {selectedLicense && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">License Details</h3>
              <button
                onClick={() => setSelectedLicense(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* License Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">License Key</p>
                <p className="font-medium">{selectedLicense.licenseKey}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Content ID</p>
                <p className="font-medium">{selectedLicense.contentId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="font-medium">
                  {formatCurrency(selectedLicense.totalAmount, selectedLicense.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Expires At</p>
                <p className="font-medium">{formatDate(selectedLicense.expiresAt)}</p>
              </div>
            </div>

            {/* Usage Stats */}
            {usageStats && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3">Usage Statistics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Usage</p>
                    <p className="text-2xl font-bold">{usageStats.totalUsage}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Active Users</p>
                    <p className="text-2xl font-bold">{usageStats.topUsers.length}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Actions</p>
                    <p className="text-2xl font-bold">{usageStats.usageByAction.length}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Seats Management */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-semibold">Assigned Seats</h4>
                <button
                  onClick={() => setShowAssignModal(true)}
                  disabled={selectedLicense.usedSeats >= selectedLicense.totalSeats}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Assign Seat
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        User Email
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Assigned At
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Last Used
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedLicense.seats.map((seat) => (
                      <tr key={seat.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">{seat.userEmail}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {formatDate(seat.assignedAt)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {formatDate(seat.lastUsedAt)}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <button
                            onClick={() => handleRevokeSeat(seat.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Seat Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold mb-4">Assign Seat</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Email
              </label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user@example.com"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setNewUserEmail('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSeat}
                disabled={assignLoading || !newUserEmail}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                {assignLoading ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
