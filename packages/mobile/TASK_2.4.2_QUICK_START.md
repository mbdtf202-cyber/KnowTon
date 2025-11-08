# TASK-2.4.2: Core Screens - Quick Start Guide

## Overview
This guide helps you quickly get started with the newly implemented core screens in the KnowTon mobile app.

## Installation

### 1. Install Dependencies

```bash
cd packages/mobile
npm install
```

### 2. iOS Setup (macOS only)

```bash
cd ios
pod install
cd ..
```

### 3. Android Setup

Ensure you have Android Studio and Android SDK installed.

## Running the App

### iOS
```bash
npm run ios
# or
npx react-native run-ios
```

### Android
```bash
npm run android
# or
npx react-native run-android
```

## Features Overview

### 1. Home Screen
- **Path**: `src/screens/HomeScreen.tsx`
- **Features**:
  - Featured content carousel
  - Trending content section
  - Category browsing
  - Pull-to-refresh

**Usage**:
```typescript
import {HomeScreen} from '@screens/HomeScreen';
```

### 2. Explore Screen
- **Path**: `src/screens/ExploreScreen.tsx`
- **Features**:
  - Search bar with debouncing
  - Content type filters
  - Sort options
  - Grid layout

**Usage**:
```typescript
import {ExploreScreen} from '@screens/ExploreScreen';
```

### 3. Profile Screen
- **Path**: `src/screens/ProfileScreen.tsx`
- **Features**:
  - User information
  - Statistics display
  - Wallet connection
  - Menu navigation

**Usage**:
```typescript
import {ProfileScreen} from '@screens/ProfileScreen';
```

### 4. Content Details Screen
- **Path**: `src/screens/ContentDetailsScreen.tsx`
- **Features**:
  - Full content information
  - Preview player
  - Add to cart
  - Buy now

**Navigation**:
```typescript
navigation.navigate('ContentDetails', {contentId: '123'});
```

### 5. Checkout Screen
- **Path**: `src/screens/CheckoutScreen.tsx`
- **Features**:
  - Order summary
  - Payment method selection
  - Price breakdown
  - Purchase confirmation

**Navigation**:
```typescript
navigation.navigate('Checkout', {contentId: '123'});
```

### 6. Login Screen
- **Path**: `src/screens/LoginScreen.tsx`
- **Features**:
  - Email/password login
  - Sign up flow
  - Wallet connection
  - Form validation

## Components

### ContentCard
Display content in a card format:

```typescript
import {ContentCard} from '@components/ContentCard';

<ContentCard
  content={contentData}
  onPress={() => handlePress(contentData.id)}
/>
```

### VideoPlayer
Play video content:

```typescript
import {VideoPlayer} from '@components/VideoPlayer';

<VideoPlayer
  uri="https://example.com/video.mp4"
  onEnd={() => console.log('Video ended')}
  onProgress={(progress) => console.log(progress)}
/>
```

### AudioPlayer
Play audio content:

```typescript
import {AudioPlayer} from '@components/AudioPlayer';

<AudioPlayer
  uri="https://example.com/audio.mp3"
  title="Audio Title"
  artist="Artist Name"
  onEnd={() => console.log('Audio ended')}
/>
```

### WalletConnectButton
Connect wallet:

```typescript
import {WalletConnectButton} from '@components/WalletConnectButton';

<WalletConnectButton
  onConnect={(address) => console.log('Connected:', address)}
/>
```

## State Management

### Auth Store
```typescript
import {useAuthStore} from '@store/authStore';

const {user, isAuthenticated, login, logout} = useAuthStore();
```

### Content Store
```typescript
import {useContentStore} from '@store/contentStore';

const {contents, setContents, isLoading} = useContentStore();
```

### Cart Store
```typescript
import {useCartStore} from '@store/cartStore';

const {items, addItem, removeItem, total} = useCartStore();
```

## API Service

### Making API Calls
```typescript
import {apiService} from '@services/api';

// GET request
const data = await apiService.get('/contents');

// POST request
const result = await apiService.post('/auth/login', {
  email: 'user@example.com',
  password: 'password'
});
```

## Navigation

### Navigate to Screen
```typescript
import {useNavigation} from '@react-navigation/native';
import {RootStackNavigationProp} from '@types/navigation';

const navigation = useNavigation<RootStackNavigationProp<'MainTabs'>>();

// Navigate to content details
navigation.navigate('ContentDetails', {contentId: '123'});

// Navigate to checkout
navigation.navigate('Checkout', {contentId: '123'});

// Go back
navigation.goBack();
```

## Styling

### Using Constants
```typescript
import {COLORS, SPACING, FONT_SIZES} from '@utils/constants';

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  text: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
});
```

## Testing

### Run Tests
```bash
npm test
```

### Type Check
```bash
npm run type-check
```

### Lint
```bash
npm run lint
```

## Troubleshooting

### Issue: Metro bundler not starting
**Solution**:
```bash
npm start -- --reset-cache
```

### Issue: iOS build fails
**Solution**:
```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

### Issue: Android build fails
**Solution**:
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### Issue: Video/Audio not playing
**Solution**:
- Ensure native modules are linked
- Check iOS Info.plist for permissions
- Check Android AndroidManifest.xml for permissions

## Environment Configuration

### Development
The app uses `http://localhost:3001/api/v1` for API calls in development mode.

### Production
Update `API_BASE_URL` in `src/utils/constants.ts` for production:

```typescript
export const API_CONFIG = {
  BASE_URL: 'https://api.knowton.io/api/v1',
  TIMEOUT: 30000,
};
```

## Permissions

### iOS (Info.plist)
```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access for profile pictures</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access for profile pictures</string>
```

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

## Next Steps

1. **Test all screens** - Navigate through each screen and test functionality
2. **Configure backend** - Ensure backend API is running
3. **Test purchase flow** - Complete a test purchase
4. **Test wallet connection** - Connect a test wallet
5. **Review styling** - Ensure consistent design across screens

## Support

For issues or questions:
- Check the implementation summary: `TASK_2.4.2_IMPLEMENTATION_SUMMARY.md`
- Review the main README: `README.md`
- Check React Native documentation: https://reactnative.dev/

## Resources

- [React Navigation](https://reactnavigation.org/)
- [Zustand](https://github.com/pmndrs/zustand)
- [React Native Video](https://github.com/react-native-video/react-native-video)
- [React Native Sound](https://github.com/zmxv/react-native-sound)
