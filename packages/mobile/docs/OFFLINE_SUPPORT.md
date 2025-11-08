# Offline Support Implementation

## Overview

This document describes the offline support implementation for the KnowTon mobile app, enabling users to download content for offline viewing and queue purchases when offline.

## Features

### 1. Offline Content Caching

Users can download content to their device for offline access:

- **Download Management**: Start, pause, resume, and cancel downloads
- **Progress Tracking**: Real-time download progress with percentage and bytes downloaded
- **Storage Management**: View cache size and manage downloaded content
- **Automatic Cleanup**: Remove expired or invalid cached content
- **File Types Supported**: PDF, Video (MP4), Audio (MP3), Course packages (ZIP)

### 2. Download Management

The download manager provides:

- **Concurrent Downloads**: Up to 3 simultaneous downloads
- **Queue Management**: Automatic queuing when max concurrent downloads reached
- **Resume Support**: Pause and resume downloads
- **Error Handling**: Retry failed downloads with exponential backoff
- **Background Downloads**: Continue downloads when app is in background

### 3. Offline Purchase Queue

When users are offline, purchases are queued and synced when connection is restored:

- **Purchase Queuing**: Store purchase requests locally
- **Automatic Sync**: Sync purchases when network is available
- **Retry Logic**: Retry failed syncs up to 3 times
- **Status Tracking**: Monitor sync status and attempts
- **Validation**: Validate purchases before queuing

## Architecture

### Services

#### 1. OfflineStorageService (`offlineStorage.service.ts`)

Manages local storage for cached content, download queue, and offline purchases.

**Key Methods:**
- `getCachedContents()`: Get all cached content
- `addCachedContent()`: Add content to cache
- `removeCachedContent()`: Remove content from cache
- `getDownloadQueue()`: Get active downloads
- `addToDownloadQueue()`: Add download to queue
- `getOfflinePurchases()`: Get pending purchases
- `addOfflinePurchase()`: Queue offline purchase

#### 2. DownloadManagerService (`downloadManager.service.ts`)

Handles content downloads with progress tracking and queue management.

**Key Methods:**
- `startDownload()`: Start downloading content
- `pauseDownload()`: Pause active download
- `resumeDownload()`: Resume paused download
- `cancelDownload()`: Cancel and remove download
- `deleteDownload()`: Delete downloaded content
- `isContentAvailableOffline()`: Check if content is cached

#### 3. OfflinePurchaseService (`offlinePurchase.service.ts`)

Manages offline purchase queue and synchronization.

**Key Methods:**
- `queuePurchase()`: Add purchase to offline queue
- `syncPurchases()`: Sync all pending purchases
- `retryFailedPurchase()`: Retry a failed purchase
- `validateOfflinePurchase()`: Validate purchase before queuing

### State Management

#### OfflineStore (`offlineStore.ts`)

Zustand store for managing offline state:

**State:**
- `downloadedContent`: Array of cached content
- `activeDownloads`: Array of active downloads with progress
- `pendingPurchases`: Array of pending offline purchases
- `isOnline`: Network connectivity status
- `cacheSize`: Total size of cached content

**Actions:**
- Download management actions
- Purchase queue actions
- Cache management actions
- Network status actions

### UI Components

#### 1. DownloadButton

A reusable button component for downloading content:

**Props:**
- `contentId`: Content identifier
- `title`: Content title
- `contentType`: Type of content (pdf, video, audio, course)
- `downloadUrl`: URL to download content
- `thumbnailUrl`: Optional thumbnail URL
- `size`: Button size (small, medium, large)
- `onDownloadComplete`: Callback when download completes

**States:**
- Not downloaded: Shows download icon
- Downloading: Shows progress bar with cancel button
- Downloaded: Shows checkmark with delete option

#### 2. DownloadsScreen

Screen displaying all downloaded content:

**Features:**
- List of downloaded content with thumbnails
- Active downloads with progress
- Cache size display
- Delete individual items
- Clear all downloads

#### 3. OfflinePurchasesScreen

Screen for managing offline purchases:

**Features:**
- List of pending purchases
- Sync status for each purchase
- Manual sync button
- Retry failed purchases
- Cancel pending purchases
- Online/offline indicator

## Usage

### Downloading Content

```typescript
import {useOfflineStore} from '@store/offlineStore';

const MyComponent = () => {
  const {startDownload} = useOfflineStore();

  const handleDownload = async () => {
    await startDownload({
      contentId: 'content-123',
      title: 'My Content',
      contentType: 'video',
      downloadUrl: 'https://api.example.com/content/123/download',
      thumbnailUrl: 'https://api.example.com/content/123/thumbnail',
    });
  };

  return <Button onPress={handleDownload}>Download</Button>;
};
```

### Checking Offline Availability

```typescript
import {downloadManagerService} from '@services/downloadManager.service';

const isAvailable = await downloadManagerService.isContentAvailableOffline('content-123');
```

### Queuing Offline Purchase

```typescript
import {useOfflineStore} from '@store/offlineStore';

const MyComponent = () => {
  const {queuePurchase, isOnline} = useOfflineStore();

  const handlePurchase = async () => {
    if (!isOnline) {
      const purchaseId = await queuePurchase({
        contentId: 'content-123',
        userId: 'user-456',
        price: 9.99,
        currency: 'USD',
        paymentMethod: 'wallet',
      });
      
      Alert.alert('Purchase Queued', 'Your purchase will be processed when you\'re online');
    }
  };

  return <Button onPress={handlePurchase}>Purchase</Button>;
};
```

## Storage Locations

### iOS
- Downloaded content: `Documents/knowton_content/`
- AsyncStorage: App's Documents directory

### Android
- Downloaded content: `Internal Storage/knowton_content/`
- AsyncStorage: App's data directory

## Storage Keys

- `@knowton/cached_contents`: List of cached content metadata
- `@knowton/download_queue`: Active download queue
- `@knowton/offline_purchases`: Pending offline purchases

## Network Detection

The app uses `@react-native-community/netinfo` to detect network status:

```typescript
import NetInfo from '@react-native-community/netinfo';

// Listen for network changes
NetInfo.addEventListener(state => {
  console.log('Connection type:', state.type);
  console.log('Is connected?', state.isConnected);
});
```

## Error Handling

### Download Errors

- **Network Error**: Pause download and retry when online
- **Storage Full**: Alert user and prevent new downloads
- **Invalid URL**: Show error and remove from queue
- **File Corruption**: Delete and allow re-download

### Purchase Sync Errors

- **Network Error**: Retry up to 3 times with exponential backoff
- **Server Error**: Mark as failed after max attempts
- **Validation Error**: Remove from queue and notify user

## Performance Considerations

### Download Optimization

- **Concurrent Limit**: Max 3 simultaneous downloads to prevent overwhelming device
- **Chunk Size**: Downloads in chunks for better progress tracking
- **Background Mode**: Continue downloads when app is backgrounded

### Storage Management

- **Cache Limits**: Monitor storage and warn when low
- **Expiration**: Remove expired content automatically
- **Compression**: Use compressed formats when possible

## Testing

### Manual Testing

1. **Download Flow**:
   - Start download and verify progress
   - Pause and resume download
   - Cancel download and verify cleanup
   - Complete download and verify file exists

2. **Offline Purchase**:
   - Turn off network
   - Make purchase and verify queuing
   - Turn on network
   - Verify automatic sync

3. **Storage Management**:
   - Download multiple items
   - Verify cache size calculation
   - Delete items and verify cleanup
   - Clear all and verify complete removal

### Automated Testing

```bash
# Run tests
npm test -- --testPathPattern=offline
```

## Dependencies

- `react-native-fs`: File system access
- `@react-native-community/netinfo`: Network status detection
- `@react-native-async-storage/async-storage`: Local storage
- `zustand`: State management

## Installation

```bash
cd packages/mobile
npm install react-native-fs @react-native-community/netinfo

# iOS
cd ios && pod install && cd ..

# Android - no additional steps needed
```

## Configuration

### iOS Permissions

Add to `Info.plist`:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>fetch</string>
  <string>remote-notification</string>
</array>
```

### Android Permissions

Add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

## Future Enhancements

1. **Smart Sync**: Sync only on WiFi to save data
2. **Download Scheduling**: Schedule downloads for off-peak hours
3. **Selective Sync**: Choose which purchases to sync
4. **Storage Optimization**: Compress cached content
5. **Offline Analytics**: Track offline usage patterns
6. **P2P Sharing**: Share downloaded content between devices

## Troubleshooting

### Downloads Not Starting

- Check network connectivity
- Verify storage space available
- Check download URL validity
- Ensure max concurrent downloads not reached

### Purchases Not Syncing

- Verify network connectivity
- Check sync attempt count (max 3)
- Validate purchase data
- Check server availability

### Storage Issues

- Clear cache if storage full
- Check file permissions
- Verify directory exists
- Monitor storage usage

## Support

For issues or questions:
- GitHub Issues: https://github.com/knowton/mobile/issues
- Documentation: https://docs.knowton.io/mobile/offline
- Email: support@knowton.io
