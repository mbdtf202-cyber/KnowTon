# Push Notifications - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create/select your project
3. Add Android app (package: `com.knowtonmobile`)
4. Download `google-services.json` → place in `packages/mobile/android/app/`
5. Add iOS app (bundle: `com.knowtonmobile`)
6. Download `GoogleService-Info.plist` → place in `packages/mobile/ios/KnowtonMobile/`

### 2. Install Dependencies

```bash
cd packages/mobile
npm install
cd ios && pod install && cd ..
```

### 3. Run the App

```bash
# Android
npm run android

# iOS
npm run ios
```

## 📱 Basic Usage

### Send a Local Notification

```typescript
import { useNotifications } from './hooks/useNotifications';

const { sendNotification } = useNotifications();

await sendNotification({
  title: 'Hello!',
  body: 'This is a test notification',
  type: 'system',
});
```

### Update Preferences

```typescript
const { updateNotificationPreferences } = useNotifications();

await updateNotificationPreferences({
  promotions: false,
  contentReleases: true,
});
```

### Subscribe to Creator

```typescript
const { subscribeToCreator } = useNotifications();

await subscribeToCreator('creator_123');
```

## 🎯 Key Features

✅ Firebase Cloud Messaging integration  
✅ Local notifications with Notifee  
✅ Notification preferences management  
✅ Topic-based subscriptions  
✅ Background message handling  
✅ Badge management (iOS)  
✅ Notification channels (Android)  

## 📋 Notification Types

- **Purchase Updates**: Order confirmations, downloads
- **Content Releases**: New content from creators
- **Creator Updates**: Announcements, live streams
- **Promotions**: Special offers, discounts
- **System Alerts**: Security, account updates

## 🔧 Testing

### Test Local Notification

```typescript
import notificationService from './services/notification.service';

await notificationService.sendLocalNotification({
  title: 'Test',
  body: 'This is a test',
  type: 'system',
});
```

### Test Remote Notification (Firebase Console)

1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter title and body
4. Select target device/topic
5. Send

## 🎨 UI Components

### Notification Settings Screen

```typescript
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';

// Add to your navigator
<Stack.Screen 
  name="NotificationSettings" 
  component={NotificationSettingsScreen} 
/>
```

## 🔐 Permissions

### Android
- `POST_NOTIFICATIONS` (Android 13+)
- `VIBRATE`
- `RECEIVE_BOOT_COMPLETED`

### iOS
- Push Notifications capability
- Background Modes → Remote notifications

## 📊 Backend Integration

### Send Notification from Backend

```typescript
import admin from 'firebase-admin';

const message = {
  token: userFcmToken,
  notification: {
    title: 'New Content',
    body: 'Check it out!',
  },
  data: {
    type: 'content',
    contentId: '123',
  },
};

await admin.messaging().send(message);
```

### Send to Topic

```typescript
const message = {
  topic: 'creator_123',
  notification: {
    title: 'Creator Update',
    body: 'New content available!',
  },
};

await admin.messaging().send(message);
```

## 🐛 Common Issues

### Notifications not appearing?
1. Check permission is granted
2. Verify Firebase config files are in place
3. Check notification preferences are enabled

### Token not generated?
1. Check internet connection
2. Verify Firebase configuration
3. Check console logs for errors

### Background notifications not working?
1. Ensure background handler is in `index.js`
2. Check battery optimization settings

## 📚 Next Steps

- Read full documentation: `PUSH_NOTIFICATIONS.md`
- Customize notification channels
- Implement deep linking
- Add notification analytics
- Set up A/B testing for notifications

## 🆘 Need Help?

- Check logs: `adb logcat | grep FCM` (Android)
- Firebase Console → Cloud Messaging → Diagnostics
- Review notification preferences in app settings

## ✨ Pro Tips

1. Request permission at the right moment (not on app launch)
2. Use topics for efficient targeting
3. Keep notification content concise
4. Test on both platforms
5. Monitor notification open rates
6. Respect user preferences
7. Clear badges when app opens

---

**Ready to send your first notification?** 🎉

```typescript
import { useNotifications } from './hooks/useNotifications';

const { sendNotification } = useNotifications();

await sendNotification({
  title: '🎉 Welcome to KnowTon!',
  body: 'Start exploring amazing content',
  type: 'system',
});
```
