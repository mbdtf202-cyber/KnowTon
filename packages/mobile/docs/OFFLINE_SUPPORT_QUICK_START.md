# Offline Support - Quick Start Guide

## Installation

```bash
cd packages/mobile
npm install
```

The required dependencies are already added to `package.json`:
- `react-native-fs@^2.20.0`
- `@react-native-community/netinfo@^11.2.1`

### iOS Setup

```bash
cd ios
pod install
cd ..
```

### Android Setup

No additional setup required. Permissions are already configured in `AndroidManifest.xml`.

## Quick Usage

### 1. Download Content for Offline Access

```typescript
import {DownloadButton} from '@components/DownloadButton';

<DownloadButton
  contentId="content-123"
  title="My Video"
  contentType="video"
  downloadUrl="https://api.knowton.io/content/123/download"
  thumbnailUrl="https://api.knowton.io/content/123/thumbnail"
  size="medium"
/>
```

### 2. View Downloaded Content

Navigate to the Downloads tab in the app to see all downloaded content.

### 3. Make Offline Purchases

When offline, purchases are automatically queued and synced when online:

```typescript
import {useOfflineStore} from '@store/offlineStore';

const {queuePurchase, isOnline} = useOfflineStore();

if (!isOnline) {
  await queuePurchase({
    contentId: 'content-123',
    userId: 'user-456',
    price: 9.99,
    currency: 'USD',
    paymentMethod: 'wallet',
  });
}
```

### 4. Check Offline Availability

```typescript
import {downloadManagerService} from '@services/downloadManager.service';

const isAvailable = await downloadManagerService.isContentAvailableOffline('content-123');
```

## Key Features

✅ **Download Management**
- Start, pause, resume, and cancel downloads
- Track download progress in real-time
- Manage up to 3 concurrent downloads

✅ **Offline Content Access**
- View downloaded content without internet
- Automatic expiration handling
- Storage management

✅ **Offline Purchase Queue**
- Queue purchases when offline
- Automatic sync when online
- Retry failed syncs up to 3 times

✅ **Network Detection**
- Automatic online/offline detection
- Visual indicators for network status
- Auto-sync when connection restored

## Testing

### Test Download Flow

1. Open any content details screen
2. Tap the download button
3. Watch progress indicator
4. Go to Downloads tab to see downloaded content

### Test Offline Purchase

1. Turn off WiFi and mobile data
2. Try to purchase content
3. Purchase will be queued
4. Turn on network
5. Purchase will sync automatically

### Test Storage Management

1. Go to Downloads tab
2. View total cache size
3. Delete individual items
4. Use "Clear All" to remove all downloads

## File Structure

```
packages/mobile/src/
├── services/
│   ├── offlineStorage.service.ts      # Storage management
│   ├── downloadManager.service.ts     # Download handling
│   └── offlinePurchase.service.ts     # Purchase queue
├── store/
│   └── offlineStore.ts                # State management
├── components/
│   └── DownloadButton.tsx             # Download UI component
├── screens/
│   ├── DownloadsScreen.tsx            # Downloads list
│   └── OfflinePurchasesScreen.tsx     # Purchase queue
└── docs/
    ├── OFFLINE_SUPPORT.md             # Full documentation
    └── OFFLINE_SUPPORT_QUICK_START.md # This file
```

## Common Issues

### Downloads Not Working

**Problem**: Downloads fail to start
**Solution**: 
- Check network connectivity
- Verify storage space
- Ensure download URL is valid

### Purchases Not Syncing

**Problem**: Offline purchases don't sync
**Solution**:
- Check network connection
- Verify max sync attempts not reached
- Check server availability

### Storage Full

**Problem**: Can't download more content
**Solution**:
- Go to Downloads tab
- Delete unused content
- Use "Clear All" if needed

## API Integration

### Backend Endpoints Required

```typescript
// Download content
GET /api/v1/contents/:id/download
Authorization: Bearer {token}

// Sync offline purchase
POST /api/v1/purchases/offline-sync
{
  "offlinePurchaseId": "offline_123",
  "contentId": "content-456",
  "price": 9.99,
  "currency": "USD",
  "paymentMethod": "wallet",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Next Steps

1. **Customize Download Limits**: Adjust `maxConcurrentDownloads` in `downloadManager.service.ts`
2. **Add Expiration Logic**: Set content expiration in download options
3. **Implement Analytics**: Track offline usage patterns
4. **Add WiFi-Only Mode**: Restrict downloads to WiFi only
5. **Optimize Storage**: Implement compression for cached content

## Resources

- [Full Documentation](./OFFLINE_SUPPORT.md)
- [React Native FS Docs](https://github.com/itinance/react-native-fs)
- [NetInfo Docs](https://github.com/react-native-netinfo/react-native-netinfo)
- [Zustand Docs](https://github.com/pmndrs/zustand)

## Support

Need help? Contact us:
- GitHub: https://github.com/knowton/mobile/issues
- Email: support@knowton.io
- Docs: https://docs.knowton.io
