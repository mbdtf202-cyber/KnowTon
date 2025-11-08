import React from 'react';
import { DeviceManagement } from '../components/DeviceManagement';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

export const DeviceManagementPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Device Management</h1>
          <p className="mt-2 text-gray-600">
            Manage devices that have access to your content. You can have up to 3
            active devices at a time.
          </p>
        </div>

        <DeviceManagement userId={user.id} />

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            About Device Binding
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• You can access your content from up to 3 devices simultaneously</li>
            <li>
              • Each device is identified by its unique characteristics (browser, OS,
              screen resolution, etc.)
            </li>
            <li>
              • If you reach the device limit, you'll need to revoke access from an
              old device before adding a new one
            </li>
            <li>
              • Revoking a device will immediately terminate all active sessions on
              that device
            </li>
            <li>
              • Inactive devices (not used for 90 days) can be automatically cleaned
              up
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
