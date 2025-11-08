/**
 * Notification Service
 * Handles Firebase Cloud Messaging integration and local notifications
 */

import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_PREFS_KEY = '@notification_preferences';
const FCM_TOKEN_KEY = '@fcm_token';

export interface NotificationPreferences {
  enabled: boolean;
  purchaseUpdates: boolean;
  contentReleases: boolean;
  creatorUpdates: boolean;
  promotions: boolean;
  systemAlerts: boolean;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  type?: 'purchase' | 'content' | 'creator' | 'promotion' | 'system';
}

class NotificationService {
  private initialized = false;
  private fcmToken: string | null = null;

  /**
   * Initialize notification service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Request permission
      const authStatus = await this.requestPermission();
      
      if (authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL) {
        
        // Get FCM token
        await this.getFCMToken();
        
        // Setup notification handlers
        this.setupNotificationHandlers();
        
        // Setup background handler
        this.setupBackgroundHandler();
        
        this.initialized = true;
        console.log('Notification service initialized');
      } else {
        console.log('Notification permission denied');
      }
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      throw error;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<messaging.AuthorizationStatus> {
    try {
      const authStatus = await messaging().requestPermission();
      return authStatus;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return messaging.AuthorizationStatus.DENIED;
    }
  }

  /**
   * Get FCM token
   */
  async getFCMToken(): Promise<string | null> {
    try {
      // Check if token exists in storage
      const storedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      
      if (storedToken) {
        this.fcmToken = storedToken;
        return storedToken;
      }

      // Get new token
      const token = await messaging().getToken();
      
      if (token) {
        this.fcmToken = token;
        await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
        console.log('FCM Token:', token);
        return token;
      }

      return null;
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      return null;
    }
  }

  /**
   * Setup notification handlers
   */
  private setupNotificationHandlers(): void {
    // Foreground message handler
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground message received:', remoteMessage);
      await this.displayNotification(remoteMessage);
    });

    // Token refresh handler
    messaging().onTokenRefresh(async (token) => {
      console.log('FCM token refreshed:', token);
      this.fcmToken = token;
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
      // TODO: Send updated token to backend
    });

    // Notification opened handler
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened app:', remoteMessage);
      this.handleNotificationOpen(remoteMessage);
    });

    // Check if app was opened from notification
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('App opened from notification:', remoteMessage);
          this.handleNotificationOpen(remoteMessage);
        }
      });

    // Setup notifee event handlers
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('Notification pressed:', detail.notification);
        this.handleNotificationPress(detail.notification);
      }
    });
  }

  /**
   * Setup background message handler
   */
  private setupBackgroundHandler(): void {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message received:', remoteMessage);
      await this.displayNotification(remoteMessage);
    });
  }

  /**
   * Display notification using notifee
   */
  private async displayNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> {
    try {
      const { notification, data } = remoteMessage;

      if (!notification) {
        return;
      }

      // Check if notification type is enabled in preferences
      const prefs = await this.getPreferences();
      const notificationType = data?.type as string;

      if (!this.isNotificationEnabled(notificationType, prefs)) {
        console.log('Notification type disabled:', notificationType);
        return;
      }

      // Create notification channel (Android)
      const channelId = await this.createNotificationChannel(notificationType);

      // Display notification
      await notifee.displayNotification({
        title: notification.title,
        body: notification.body,
        android: {
          channelId,
          importance: AndroidImportance.HIGH,
          smallIcon: 'ic_notification',
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
        },
        data: data || {},
      });
    } catch (error) {
      console.error('Failed to display notification:', error);
    }
  }

  /**
   * Create notification channel (Android)
   */
  private async createNotificationChannel(type?: string): Promise<string> {
    const channelId = type || 'default';
    
    await notifee.createChannel({
      id: channelId,
      name: this.getChannelName(channelId),
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });

    return channelId;
  }

  /**
   * Get channel name based on type
   */
  private getChannelName(type: string): string {
    const channelNames: Record<string, string> = {
      purchase: 'Purchase Updates',
      content: 'Content Releases',
      creator: 'Creator Updates',
      promotion: 'Promotions',
      system: 'System Alerts',
      default: 'General Notifications',
    };

    return channelNames[type] || channelNames.default;
  }

  /**
   * Handle notification open
   */
  private handleNotificationOpen(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): void {
    const { data } = remoteMessage;
    
    // Navigate based on notification type
    if (data?.contentId) {
      // Navigate to content details
      console.log('Navigate to content:', data.contentId);
    } else if (data?.creatorId) {
      // Navigate to creator profile
      console.log('Navigate to creator:', data.creatorId);
    } else if (data?.purchaseId) {
      // Navigate to purchase details
      console.log('Navigate to purchase:', data.purchaseId);
    }
  }

  /**
   * Handle notification press (notifee)
   */
  private handleNotificationPress(notification: any): void {
    const { data } = notification;
    
    if (data?.contentId) {
      console.log('Navigate to content:', data.contentId);
    } else if (data?.creatorId) {
      console.log('Navigate to creator:', data.creatorId);
    } else if (data?.purchaseId) {
      console.log('Navigate to purchase:', data.purchaseId);
    }
  }

  /**
   * Check if notification type is enabled
   */
  private isNotificationEnabled(
    type: string | undefined,
    prefs: NotificationPreferences
  ): boolean {
    if (!prefs.enabled) {
      return false;
    }

    switch (type) {
      case 'purchase':
        return prefs.purchaseUpdates;
      case 'content':
        return prefs.contentReleases;
      case 'creator':
        return prefs.creatorUpdates;
      case 'promotion':
        return prefs.promotions;
      case 'system':
        return prefs.systemAlerts;
      default:
        return true;
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const prefsJson = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      
      if (prefsJson) {
        return JSON.parse(prefsJson);
      }

      // Default preferences
      return {
        enabled: true,
        purchaseUpdates: true,
        contentReleases: true,
        creatorUpdates: true,
        promotions: true,
        systemAlerts: true,
      };
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      return {
        enabled: true,
        purchaseUpdates: true,
        contentReleases: true,
        creatorUpdates: true,
        promotions: true,
        systemAlerts: true,
      };
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    prefs: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      const currentPrefs = await this.getPreferences();
      const updatedPrefs = { ...currentPrefs, ...prefs };
      
      await AsyncStorage.setItem(
        NOTIFICATION_PREFS_KEY,
        JSON.stringify(updatedPrefs)
      );

      console.log('Notification preferences updated:', updatedPrefs);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  }

  /**
   * Send local notification
   */
  async sendLocalNotification(payload: NotificationPayload): Promise<void> {
    try {
      const channelId = await this.createNotificationChannel(payload.type);

      await notifee.displayNotification({
        title: payload.title,
        body: payload.body,
        android: {
          channelId,
          importance: AndroidImportance.HIGH,
          smallIcon: 'ic_notification',
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
        },
        data: payload.data || {},
      });
    } catch (error) {
      console.error('Failed to send local notification:', error);
      throw error;
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await notifee.cancelAllNotifications();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }

  /**
   * Get badge count (iOS)
   */
  async getBadgeCount(): Promise<number> {
    if (Platform.OS === 'ios') {
      return await notifee.getBadgeCount();
    }
    return 0;
  }

  /**
   * Set badge count (iOS)
   */
  async setBadgeCount(count: number): Promise<void> {
    if (Platform.OS === 'ios') {
      await notifee.setBadgeCount(count);
    }
  }

  /**
   * Clear badge (iOS)
   */
  async clearBadge(): Promise<void> {
    if (Platform.OS === 'ios') {
      await notifee.setBadgeCount(0);
    }
  }

  /**
   * Subscribe to topic
   */
  async subscribeToTopic(topic: string): Promise<void> {
    try {
      await messaging().subscribeToTopic(topic);
      console.log('Subscribed to topic:', topic);
    } catch (error) {
      console.error('Failed to subscribe to topic:', error);
    }
  }

  /**
   * Unsubscribe from topic
   */
  async unsubscribeFromTopic(topic: string): Promise<void> {
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log('Unsubscribed from topic:', topic);
    } catch (error) {
      console.error('Failed to unsubscribe from topic:', error);
    }
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    const authStatus = await messaging().hasPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  }

  /**
   * Get current FCM token
   */
  getCurrentToken(): string | null {
    return this.fcmToken;
  }
}

export default new NotificationService();
