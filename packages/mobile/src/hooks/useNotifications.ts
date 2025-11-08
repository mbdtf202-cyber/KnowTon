/**
 * useNotifications Hook
 * Provides easy access to notification functionality
 */

import { useCallback } from 'react';
import useNotificationStore from '../store/notificationStore';
import { NotificationPayload } from '../services/notification.service';

export const useNotifications = () => {
  const {
    preferences,
    fcmToken,
    isInitialized,
    isLoading,
    error,
    initialize,
    getPreferences,
    updatePreferences,
    sendLocalNotification,
    subscribeToTopic,
    unsubscribeFromTopic,
    clearBadge,
  } = useNotificationStore();

  const sendNotification = useCallback(
    async (payload: NotificationPayload) => {
      try {
        await sendLocalNotification(payload);
      } catch (error) {
        console.error('Failed to send notification:', error);
        throw error;
      }
    },
    [sendLocalNotification]
  );

  const updateNotificationPreferences = useCallback(
    async (prefs: Partial<typeof preferences>) => {
      try {
        await updatePreferences(prefs);
      } catch (error) {
        console.error('Failed to update preferences:', error);
        throw error;
      }
    },
    [updatePreferences]
  );

  const subscribeToCreator = useCallback(
    async (creatorId: string) => {
      try {
        await subscribeToTopic(`creator_${creatorId}`);
      } catch (error) {
        console.error('Failed to subscribe to creator:', error);
        throw error;
      }
    },
    [subscribeToTopic]
  );

  const unsubscribeFromCreator = useCallback(
    async (creatorId: string) => {
      try {
        await unsubscribeFromTopic(`creator_${creatorId}`);
      } catch (error) {
        console.error('Failed to unsubscribe from creator:', error);
        throw error;
      }
    },
    [unsubscribeFromTopic]
  );

  const subscribeToContent = useCallback(
    async (contentId: string) => {
      try {
        await subscribeToTopic(`content_${contentId}`);
      } catch (error) {
        console.error('Failed to subscribe to content:', error);
        throw error;
      }
    },
    [subscribeToTopic]
  );

  const unsubscribeFromContent = useCallback(
    async (contentId: string) => {
      try {
        await unsubscribeFromTopic(`content_${contentId}`);
      } catch (error) {
        console.error('Failed to unsubscribe from content:', error);
        throw error;
      }
    },
    [unsubscribeFromTopic]
  );

  return {
    // State
    preferences,
    fcmToken,
    isInitialized,
    isLoading,
    error,

    // Actions
    initialize,
    getPreferences,
    updateNotificationPreferences,
    sendNotification,
    subscribeToCreator,
    unsubscribeFromCreator,
    subscribeToContent,
    unsubscribeFromContent,
    clearBadge,
  };
};

export default useNotifications;
