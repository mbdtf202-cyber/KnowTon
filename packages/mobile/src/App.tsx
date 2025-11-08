/**
 * Main App Component
 */

import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootNavigator from './navigation/RootNavigator';
import useNotificationStore from './store/notificationStore';
import useAuthStore from './store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App: React.FC = () => {
  const { initialize: initializeNotifications } = useNotificationStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Initialize notifications when app starts
    initializeNotifications().catch((error) => {
      console.error('Failed to initialize notifications:', error);
    });
  }, []);

  useEffect(() => {
    // Subscribe to user-specific topics when authenticated
    if (isAuthenticated) {
      // TODO: Subscribe to user-specific notification topics
      console.log('User authenticated, subscribing to topics');
    }
  }, [isAuthenticated]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <RootNavigator />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
};

export default App;
