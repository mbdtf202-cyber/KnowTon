import React from 'react';
import { UserBehaviorDashboard } from '../components/UserBehaviorDashboard';

export const UserBehaviorAnalyticsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <UserBehaviorDashboard />
    </div>
  );
};

export default UserBehaviorAnalyticsPage;
