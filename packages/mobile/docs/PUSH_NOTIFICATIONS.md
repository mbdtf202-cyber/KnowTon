# Push Notifications Implementation

## Overview

This document describes the push notification implementation for the KnowTon mobile app using Firebase Cloud Messaging (FCM) and Notifee for local notifications.

## Features

### 1. Firebase Cloud Messaging Integration
- Remote push notifications from backend
- Background and foreground message handling
- Token management and refresh
- Topic-based subscriptions

### 2. Local Notifications
- Display notifications using Notifee
- Custom notification channels (Android)
- Badge management (iOS)
- Rich notifications with actions

### 3. Notification Preferences
- Master enable/disable toggle
- Category-based preferences:
  - Purchase Updates
  - Content Releases
  - Creator Updates
  - Promotions
  - System Alerts
- Persistent storage of preferences

### 4. Notification Types
- **Purchase Updates**: Order confirmations, download ready, refunds
- **Content Releases**: New content from followed creators
- **Creator Updates**: Creator announcements, live streams
- **Promotions**: Special offers, discounts
- **System Alerts**: Security alerts, account updates

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Firebase Console                       │
│              (Send notifications)                        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Firebase Cloud Messaging                    │
│           (Deliver to devices)                          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  Mobile App                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │  NotificationService                             │  │
│  │  - Initialize FCM                                │  │
│  │  - Handle messages                               │  │
│  │  - Manage preferences                            │  │
│  └──────────────────────────────────────────────────┘  │
│                            ↓                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Notifee                                         │  │
│  │  - Display notifications                         │  │
│  │  - Handle user interactions                      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Firebase Project Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Add Android app:
   - Package name: `com.knowtonmobile`
   - Download `google-services.json`
   - Place in `android/app/`
3. Add iOS app:
   - Bundle ID: `com.knowtonmobile`
   - Download `GoogleService-Info.plist`
   - Place in `ios/KnowtonMobile/`

### 2. Android Configuration

The following files have been configured:

- `android/build.gradle`: Added Google Services plugin
- `android/app/build.gradle`: Added Firebase dependencies
- `android/app/src/main/AndroidManifest.xml`: Added permissions and services

### 3. iOS Configuration

1. Open `ios/KnowtonMobile.xcworkspace` in Xcode
2. Add `GoogleService-Info.plist` to the project
3. Enable Push Notifications capability
4. Enable Background Modes > Remote notifications
5. Add the following to `Info.plist`:

```xml
<key>FirebaseAppDelegateProxyEnabled</key>
<false/>
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>
```

### 4. Install Dependencies

```bash
cd packages/mobile
npm install
```

For iOS:
```bash
cd ios
pod install
cd ..
```

## Usage

### Initialize Notifications

Notifications are automatically initialized when the app starts:

```typescript
import useNotificationStore from './store/notificationStore';

const { initialize } = useNotificationStore();

useEffect(() => {
  initialize();
}, []);
```

### Using the Hook

```typescript
import { useNotifications } from './hooks/useNotifications';

const MyComponent = () => {
  const {
    preferences,
    fcmToken,
    sendNotification,
    updateNotificationPreferences,
    subscribeToCreator,
  } = useNotifications();

  // Send local notification
  const handleSendNotification = async () => {
    await sendNotification({
      title: 'New Content Available',
      body: 'Check out the latest release!',
      type: 'content',
      data: { contentId: '123' },
    });
  };

  // Update preferences
  const handleTogglePromotions = async () => {
    await updateNotificationPreferences({
      promotions: !preferences.promotions,
    });
  };

  // Subscribe to creator
  const handleFollowCreator = async (creatorId: string) => {
    await subscribeToCreator(creatorId);
  };

  return (
    // Your component JSX
  );
};
```

### Notification Settings Screen

Navigate to the notification settings screen:

```typescript
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';

// In your navigator
<Stack.Screen 
  name="NotificationSettings" 
  component={NotificationSettingsScreen} 
/>
```

## Backend Integration

### Send Notification from Backend

```typescript
// Backend code example
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Send to specific device
const sendToDevice = async (fcmToken: string, payload: any) => {
  const message = {
    token: fcmToken,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data,
    android: {
      priority: 'high',
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
  };

  await admin.messaging().send(message);
};

// Send to topic
const sendToTopic = async (topic: string, payload: any) => {
  const message = {
    topic: topic,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data,
  };

  await admin.messaging().send(message);
};
```

### Store FCM Token

When a user logs in, send their FCM token to the backend:

```typescript
const storeFCMToken = async (userId: string, fcmToken: string) => {
  await api.post('/users/fcm-token', {
    userId,
    fcmToken,
    platform: Platform.OS,
  });
};
```

## Notification Payload Format

### From Backend

```json
{
  "notification": {
    "title": "New Content Available",
    "body": "Your favorite creator just released new content!"
  },
  "data": {
    "type": "content",
    "contentId": "123",
    "creatorId": "456",
    "action": "view_content"
  }
}
```

### Local Notification

```typescript
{
  title: 'Download Complete',
  body: 'Your content is ready to view offline',
  type: 'purchase',
  data: {
    contentId: '123',
    downloadId: '789',
  },
}
```

## Topic Subscriptions

### Available Topics

- `creator_{creatorId}`: Updates from specific creator
- `content_{contentId}`: Updates about specific content
- `promotions`: Platform-wide promotions
- `system_alerts`: Important system notifications

### Subscribe/Unsubscribe

```typescript
// Subscribe
await notificationService.subscribeToTopic('creator_123');

// Unsubscribe
await notificationService.unsubscribeFromTopic('creator_123');
```

## Testing

### Test Local Notifications

```typescript
import notificationService from './services/notification.service';

// Send test notification
await notificationService.sendLocalNotification({
  title: 'Test Notification',
  body: 'This is a test notification',
  type: 'system',
});
```

### Test Remote Notifications

Use Firebase Console:
1. Go to Cloud Messaging
2. Click "Send your first message"
3. Enter notification details
4. Select target (device token or topic)
5. Send

### Test with FCM API

```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "DEVICE_FCM_TOKEN",
    "notification": {
      "title": "Test Notification",
      "body": "This is a test"
    },
    "data": {
      "type": "test"
    }
  }'
```

## Troubleshooting

### Android

**Issue**: Notifications not appearing
- Check if notification permission is granted
- Verify `google-services.json` is in `android/app/`
- Check logcat for errors: `adb logcat | grep FCM`

**Issue**: Background notifications not working
- Ensure background handler is registered in `index.js`
- Check if app has battery optimization disabled

### iOS

**Issue**: Notifications not appearing
- Verify Push Notifications capability is enabled
- Check if `GoogleService-Info.plist` is added to Xcode project
- Verify APNs certificate is configured in Firebase Console

**Issue**: Badge not updating
- Call `clearBadge()` when app is opened
- Ensure badge count is set correctly

### General

**Issue**: Token not generated
- Check internet connection
- Verify Firebase configuration
- Check if permission is granted

**Issue**: Notifications filtered by preferences
- Check notification preferences in settings
- Verify notification type matches preference category

## Best Practices

1. **Request Permission at Right Time**: Don't request notification permission immediately on app launch. Wait for a contextual moment.

2. **Respect User Preferences**: Always check preferences before sending notifications.

3. **Use Topics Wisely**: Subscribe users to relevant topics only to avoid spam.

4. **Handle Token Refresh**: Update backend when FCM token refreshes.

5. **Test Thoroughly**: Test both foreground and background scenarios on both platforms.

6. **Provide Value**: Only send notifications that provide value to users.

7. **Clear Badges**: Clear notification badges when user opens the app.

8. **Handle Deep Links**: Navigate users to relevant content when they tap notifications.

## Security Considerations

1. **Validate Payloads**: Always validate notification payloads on the backend
2. **Secure Token Storage**: Store FCM tokens securely
3. **Rate Limiting**: Implement rate limiting to prevent notification spam
4. **User Privacy**: Don't include sensitive information in notification content
5. **Token Rotation**: Handle token refresh and update backend accordingly

## Performance

- Notification service initialization: < 1s
- Local notification display: < 100ms
- Remote notification delivery: < 5s (depends on network)
- Preference update: < 200ms

## Future Enhancements

1. **Rich Notifications**: Add images, videos, and action buttons
2. **Notification History**: Store and display notification history
3. **Smart Notifications**: ML-based notification timing
4. **Notification Groups**: Group related notifications
5. **Interactive Notifications**: Add quick actions (like, reply, etc.)
6. **Scheduled Notifications**: Schedule notifications for later
7. **Notification Analytics**: Track open rates and engagement

## References

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [React Native Firebase](https://rnfirebase.io/)
- [Notifee Documentation](https://notifee.app/)
- [Android Notifications](https://developer.android.com/develop/ui/views/notifications)
- [iOS Push Notifications](https://developer.apple.com/documentation/usernotifications)
