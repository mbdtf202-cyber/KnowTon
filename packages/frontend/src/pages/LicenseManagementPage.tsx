import React from 'react';
import { LicenseManagementDashboard } from '../components/LicenseManagementDashboard';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

export const LicenseManagementPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Check if user has enterprise account
  if (!user?.enterpriseId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <h2 className="mt-4 text-xl font-bold text-gray-900">
              Enterprise Account Required
            </h2>
            <p className="mt-2 text-gray-600">
              You need an enterprise account to access license management.
            </p>
            <button
              onClick={() => (window.location.href = '/enterprise/signup')}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Enterprise Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LicenseManagementDashboard />
      </div>
    </div>
  );
};
