import React, { useState } from 'react';
import { useDeviceManagement, UserDevice } from '../hooks/useDeviceManagement';

interface DeviceManagementProps {
  userId: string;
}

export const DeviceManagement: React.FC<DeviceManagementProps> = ({
  userId,
}) => {
  const {
    devices,
    statistics,
    loading,
    error,
    revokeDevice,
    revokeAllDevices,
    cleanupInactiveDevices,
  } = useDeviceManagement(userId);

  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  const handleRevokeDevice = async (deviceId: string) => {
    try {
      await revokeDevice(deviceId);
      setConfirmRevoke(null);
    } catch (err) {
      console.error('Failed to revoke device', err);
    }
  };

  const handleRevokeAll = async () => {
    try {
      await revokeAllDevices();
      setConfirmRevokeAll(false);
    } catch (err) {
      console.error('Failed to revoke all devices', err);
    }
  };

  const handleCleanup = async () => {
    try {
      await cleanupInactiveDevices();
    } catch (err) {
      console.error('Failed to cleanup devices', err);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const getDeviceIcon = (device: UserDevice) => {
    const platform = device.deviceInfo.platform?.toLowerCase() || '';
    const os = device.deviceInfo.os?.toLowerCase() || '';

    if (platform.includes('mobile') || os.includes('android') || os.includes('ios')) {
      return '📱';
    } else if (platform.includes('tablet') || os.includes('ipad')) {
      return '📱';
    } else {
      return '💻';
    }
  };

  if (loading && devices.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Device Management</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Active Devices</div>
              <div className="text-2xl font-bold text-blue-600">
                {statistics.activeDevices} / {statistics.maxDevices}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total Devices</div>
              <div className="text-2xl font-bold text-gray-700">
                {statistics.totalDevices}
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Revoked</div>
              <div className="text-2xl font-bold text-red-600">
                {statistics.revokedDevices}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Can Add</div>
              <div className="text-2xl font-bold text-green-600">
                {statistics.canAddDevice ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={handleCleanup}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            Cleanup Inactive
          </button>
          <button
            onClick={() => setConfirmRevokeAll(true)}
            disabled={loading || devices.length === 0}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Revoke All Devices
          </button>
        </div>

        {/* Device List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Your Devices</h3>

          {devices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No devices registered yet
            </div>
          ) : (
            devices.map((device) => (
              <div
                key={device.id}
                className={`border rounded-lg p-4 ${
                  device.isActive
                    ? 'border-gray-200 bg-white'
                    : 'border-gray-300 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-3xl">{getDeviceIcon(device)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{device.deviceName}</h4>
                        {device.isActive ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            Revoked
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        <div>
                          <span className="font-medium">Browser:</span>{' '}
                          {device.deviceInfo.browser || 'Unknown'}{' '}
                          {device.deviceInfo.browserVersion || ''}
                        </div>
                        <div>
                          <span className="font-medium">OS:</span>{' '}
                          {device.deviceInfo.os || 'Unknown'}{' '}
                          {device.deviceInfo.osVersion || ''}
                        </div>
                        <div>
                          <span className="font-medium">First seen:</span>{' '}
                          {formatDate(device.firstSeenAt)}
                        </div>
                        <div>
                          <span className="font-medium">Last used:</span>{' '}
                          {formatDate(device.lastUsedAt)}
                        </div>
                        <div>
                          <span className="font-medium">Access count:</span>{' '}
                          {device.accessCount}
                        </div>
                        <div className="text-xs text-gray-400">
                          Device ID: {device.deviceId}
                        </div>
                      </div>
                    </div>
                  </div>

                  {device.isActive && (
                    <div>
                      {confirmRevoke === device.deviceId ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRevokeDevice(device.deviceId)}
                            disabled={loading}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmRevoke(null)}
                            disabled={loading}
                            className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRevoke(device.deviceId)}
                          disabled={loading}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Revoke All Confirmation Modal */}
      {confirmRevokeAll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Revoke All Devices?</h3>
            <p className="text-gray-600 mb-6">
              This will revoke access for all {statistics?.activeDevices} active
              device(s). You will need to re-authenticate on each device to regain
              access.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmRevokeAll(false)}
                disabled={loading}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeAll}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Revoking...' : 'Revoke All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
