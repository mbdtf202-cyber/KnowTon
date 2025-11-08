/**
 * Notification Store
 * Manages notification state and preferences
 */

import { create } from 'zustand';
import notificationService, {
  NotificationPreferences,
  NotificationPayload,
} from '../services/notification.service';

interface NotificationState {
  // State
  preferences: NotificationPreferences;
  fcmToken: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  getPreferences: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  sendLocalNotification: (payload: NotificationPayload) => Promise<void>;
  subscribeToTopic: (topic: string) => Promise<void>;
  unsubscribeFromTopic: (topic: string) => Promise<void>;
  clearBadge: () => Promise<void>;
  reset: () => void;
}

const useNotificationStore = create<NotificationState>((set, get) => ({
  // Initial state
  preferences: {
    enabled: true,
    purchaseUpdates: true,
    contentReleases: true,
    creatorUpdates: true,
    promotions: true,
    systemAlerts: true,
  },
  fcmToken: null,
  isInitialized: false,
  isLoading: false,
  error: null,

  // Initialize notification service
  initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      await notificationService.initialize();
      const token = notificationService.getCurrentToken();
      const prefs = await notificationService.getPreferences();

      set({
        fcmToken: token,
        preferences: prefs,
        isInitialized: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to initialize notifications',
        isLoading: false,
      });
    }
  },

  // Get notification preferences
  getPreferences: async () => {
    try {
      set({ isLoading: true, error: null });

      const prefs = await notificationService.getPreferences();

      set({
        preferences: prefs,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to get preferences',
        isLoading: false,
      });
    }
  },

  // Update notification preferences
  updatePreferences: async (prefs: Partial<NotificationPreferences>) => {
    try {
      set({ isLoading: true, error: null });

      await notificationService.updatePreferences(prefs);
      const updatedPrefs = await notificationService.getPreferences();

      set({
        preferences: updatedPrefs,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update preferences',
        isLoading: false,
      });
      throw error;
    }
  },

  // Send local notification
  sendLocalNotification: async (payload: NotificationPayload) => {
    try {
      await notificationService.sendLocalNotification(payload);
    } catch (error) {
      console.error('Failed to send local notification:', error);
      throw error;
    }
  },

  // Subscribe to topic
  subscribeToTopic: async (topic: string) => {
    try {
      await notificationService.subscribeToTopic(topic);
    } catch (error) {
      console.error('Failed to subscribe to topic:', error);
      throw error;
    }
  },

  // Unsubscribe from topic
  unsubscribeFromTopic: async (topic: string) => {
    try {
      await notificationService.unsubscribeFromTopic(topic);
    } catch (error) {
      console.error('Failed to unsubscribe from topic:', error);
      throw error;
    }
  },

  // Clear badge
  clearBadge: async () => {
    try {
      await notificationService.clearBadge();
    } catch (error) {
      console.error('Failed to clear badge:', error);
    }
  },

  // Reset store
  reset: () => {
    set({
      preferences: {
        enabled: true,
        purchaseUpdates: true,
        contentReleases: true,
        creatorUpdates: true,
        promotions: true,
        systemAlerts: true,
      },
      fcmToken: null,
      isInitialized: false,
      isLoading: false,
      error: null,
    });
  },
}));

export default useNotificationStore;
