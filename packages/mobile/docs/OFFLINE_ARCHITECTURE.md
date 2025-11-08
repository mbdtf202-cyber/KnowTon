# Offline Support Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Download     │  │ Downloads    │  │ Offline Purchases    │ │
│  │ Button       │  │ Screen       │  │ Screen               │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      State Management                           │
│                    ┌──────────────────┐                         │
│                    │  OfflineStore    │                         │
│                    │   (Zustand)      │                         │
│                    └──────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       Service Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Download     │  │ Offline      │  │ Offline Storage      │ │
│  │ Manager      │  │ Purchase     │  │ Service              │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Storage Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ AsyncStorage │  │ File System  │  │ Network Detection    │ │
│  │ (Metadata)   │  │ (Content)    │  │ (NetInfo)            │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

### Download Flow

```
User Taps Download Button
         ↓
DownloadButton Component
         ↓
useOfflineStore.startDownload()
         ↓
DownloadManagerService.startDownload()
         ↓
┌─────────────────────────────────────┐
│ Check if already downloaded         │
│ Check if already downloading        │
│ Check concurrent download limit     │
└─────────────────────────────────────┘
         ↓
OfflineStorageService.addToDownloadQueue()
         ↓
RNFS.downloadFile()
         ↓
┌─────────────────────────────────────┐
│ Progress Callbacks                  │
│ - begin: Initialize tracking        │
│ - progress: Update percentage       │
│ - complete: Finalize download       │
└─────────────────────────────────────┘
         ↓
OfflineStorageService.addCachedContent()
         ↓
OfflineStore updates state
         ↓
UI reflects new state
```

### Offline Purchase Flow

```
User Makes Purchase (Offline)
         ↓
CheckoutScreen
         ↓
useOfflineStore.queuePurchase()
         ↓
OfflinePurchaseService.validateOfflinePurchase()
         ↓
┌─────────────────────────────────────┐
│ Validation Checks                   │
│ - Required fields present           │
│ - Price > 0                         │
│ - Payment method allowed            │
└─────────────────────────────────────┘
         ↓
OfflineStorageService.addOfflinePurchase()
         ↓
OfflineStore updates state
         ↓
┌─────────────────────────────────────┐
│ Network Listener Detects Online     │
└─────────────────────────────────────┘
         ↓
OfflineStore.setOnlineStatus(true)
         ↓
OfflineStore.syncPurchases()
         ↓
OfflinePurchaseService.syncPurchases()
         ↓
For each pending purchase:
  ↓
  API.post('/purchases/offline-sync')
  ↓
  OfflineStorageService.markPurchaseAsSynced()
         ↓
OfflineStore updates state
         ↓
UI shows sync success
```

## Data Models

### CachedContent

```typescript
interface CachedContent {
  id: string;                    // Content identifier
  title: string;                 // Content title
  contentType: ContentType;      // pdf | video | audio | course
  localPath: string;             // File system path
  thumbnailPath?: string;        // Thumbnail path (optional)
  metadata: {
    size: number;                // File size in bytes
    downloadedAt: string;        // ISO timestamp
    expiresAt?: string;          // Expiration timestamp (optional)
  };
  encryptionKey?: string;        // Encryption key (optional)
}
```

### DownloadProgress

```typescript
interface DownloadProgress {
  contentId: string;             // Content identifier
  progress: number;              // 0-100 percentage
  bytesDownloaded: number;       // Bytes downloaded
  totalBytes: number;            // Total file size
  status: DownloadStatus;        // pending | downloading | completed | failed | paused
  error?: string;                // Error message (if failed)
}
```

### OfflinePurchase

```typescript
interface OfflinePurchase {
  id: string;                    // Unique purchase ID
  contentId: string;             // Content identifier
  userId: string;                // User identifier
  price: number;                 // Purchase price
  currency: string;              // Currency code (USD, EUR, etc.)
  paymentMethod: string;         // Payment method
  timestamp: string;             // ISO timestamp
  synced: boolean;               // Sync status
  syncAttempts?: number;         // Number of sync attempts
  lastSyncAttempt?: string;      // Last sync attempt timestamp
  error?: string;                // Error message (if failed)
}
```

## State Management

### OfflineStore State

```typescript
interface OfflineState {
  // Downloaded content
  downloadedContent: CachedContent[];
  
  // Active downloads with progress
  activeDownloads: DownloadProgress[];
  
  // Pending purchases
  pendingPurchases: OfflinePurchase[];
  
  // Network status
  isOnline: boolean;
  
  // Cache information
  cacheSize: number;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}
```

### Actions

```typescript
// Download Actions
startDownload(options: DownloadOptions): Promise<void>
pauseDownload(contentId: string): Promise<void>
resumeDownload(contentId: string): Promise<void>
cancelDownload(contentId: string): Promise<void>
deleteDownload(contentId: string): Promise<void>
refreshDownloads(): Promise<void>

// Purchase Actions
queuePurchase(purchase: OfflinePurchase): Promise<string>
syncPurchases(): Promise<void>
retryPurchase(purchaseId: string): Promise<void>
cancelPurchase(purchaseId: string): Promise<void>
refreshPurchases(): Promise<void>

// Cache Actions
clearCache(): Promise<void>
refreshCacheSize(): Promise<void>

// Network Actions
setOnlineStatus(isOnline: boolean): void

// General Actions
initialize(): Promise<void>
```

## Storage Strategy

### AsyncStorage Keys

```
@knowton/cached_contents     → Array<CachedContent>
@knowton/download_queue      → Array<DownloadProgress>
@knowton/offline_purchases   → Array<OfflinePurchase>
```

### File System Structure

```
Documents/
└── knowton_content/
    ├── content-123.mp4          (Video file)
    ├── content-123_thumb.jpg    (Thumbnail)
    ├── content-456.pdf          (PDF file)
    ├── content-456_thumb.jpg    (Thumbnail)
    ├── content-789.mp3          (Audio file)
    └── content-789_thumb.jpg    (Thumbnail)
```

## Network Detection

### NetInfo Integration

```typescript
// Setup in App.tsx
useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    setOnlineStatus(state.isConnected || false);
  });
  
  return () => unsubscribe();
}, []);
```

### Network States

```
Connected (WiFi)     → isOnline: true
Connected (Cellular) → isOnline: true
Disconnected         → isOnline: false
Unknown              → isOnline: false
```

## Concurrency Control

### Download Queue Management

```
Max Concurrent Downloads: 3

Queue State:
┌─────────────────────────────────────┐
│ Active Downloads (3)                │
│ ├── Download 1 (50% complete)      │
│ ├── Download 2 (75% complete)      │
│ └── Download 3 (25% complete)      │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Pending Downloads (2)               │
│ ├── Download 4 (waiting)            │
│ └── Download 5 (waiting)            │
└─────────────────────────────────────┘

When Download 1 completes:
- Download 4 starts automatically
- Active count remains at 3
```

## Error Handling Strategy

### Download Errors

```
Network Error
  ↓
Pause Download
  ↓
Wait for Network
  ↓
Auto-Resume

Storage Full
  ↓
Alert User
  ↓
Prevent New Downloads

Invalid URL
  ↓
Remove from Queue
  ↓
Notify User
```

### Purchase Sync Errors

```
Sync Attempt 1
  ↓ (fails)
Wait 1 second
  ↓
Sync Attempt 2
  ↓ (fails)
Wait 2 seconds
  ↓
Sync Attempt 3
  ↓ (fails)
Mark as Failed
  ↓
Notify User
```

## Performance Optimizations

### Download Optimization

1. **Chunked Downloads**: Download in chunks for better progress tracking
2. **Concurrent Limit**: Max 3 downloads to prevent resource exhaustion
3. **Background Mode**: Continue downloads when app backgrounded
4. **Queue Processing**: Automatic processing of pending downloads

### Storage Optimization

1. **Metadata Caching**: Quick access without file reads
2. **Lazy Loading**: Load file data only when needed
3. **Efficient Cleanup**: Batch deletion operations
4. **Size Calculation**: Cached for quick display

### Sync Optimization

1. **Batch Processing**: Process multiple purchases together
2. **Exponential Backoff**: Prevent server overload
3. **Network Detection**: Only sync when online
4. **Selective Sync**: Skip already synced purchases

## Security Considerations

### Content Protection

```
Download Content
  ↓
Store in Private Directory
  ↓
Set File Permissions (App Only)
  ↓
Optional Encryption
  ↓
Automatic Cleanup on Uninstall
```

### Purchase Security

```
Queue Purchase
  ↓
Validate Data
  ↓
Secure Local Storage
  ↓
Sync to Server
  ↓
Server-Side Verification
  ↓
Prevent Duplicates
```

## Monitoring and Logging

### Key Events to Log

```typescript
// Download Events
'download.started'      → {contentId, size}
'download.progress'     → {contentId, progress}
'download.completed'    → {contentId, duration}
'download.failed'       → {contentId, error}
'download.cancelled'    → {contentId}

// Purchase Events
'purchase.queued'       → {purchaseId, contentId}
'purchase.synced'       → {purchaseId, attempts}
'purchase.failed'       → {purchaseId, error}

// Storage Events
'cache.cleared'         → {itemsRemoved, bytesFreed}
'storage.low'           → {available, total}

// Network Events
'network.online'        → {type}
'network.offline'       → {}
```

## Testing Strategy

### Unit Tests

```
OfflineStorageService
├── getCachedContents()
├── addCachedContent()
├── removeCachedContent()
├── getDownloadQueue()
└── getOfflinePurchases()

DownloadManagerService
├── startDownload()
├── pauseDownload()
├── resumeDownload()
├── cancelDownload()
└── isContentAvailableOffline()

OfflinePurchaseService
├── queuePurchase()
├── syncPurchases()
├── retryFailedPurchase()
└── validateOfflinePurchase()
```

### Integration Tests

```
Download Flow
├── Start download
├── Track progress
├── Complete download
└── Verify file exists

Offline Purchase Flow
├── Queue purchase offline
├── Detect network online
├── Auto-sync purchase
└── Verify sync success

Storage Management
├── Download content
├── Check cache size
├── Delete content
└── Verify cleanup
```

## Deployment Checklist

- [ ] Install dependencies (`react-native-fs`, `@react-native-community/netinfo`)
- [ ] Configure iOS permissions (Info.plist)
- [ ] Configure Android permissions (AndroidManifest.xml)
- [ ] Run pod install for iOS
- [ ] Test on physical devices
- [ ] Verify backend endpoints
- [ ] Test offline scenarios
- [ ] Test sync functionality
- [ ] Monitor storage usage
- [ ] Set up error tracking

## Future Architecture Enhancements

### Phase 1: Smart Sync
```
Add WiFi-Only Mode
  ↓
Detect Connection Type
  ↓
Only Download on WiFi
  ↓
Queue for Later if Cellular
```

### Phase 2: Compression
```
Download Content
  ↓
Compress Before Storage
  ↓
Decompress on Access
  ↓
Save Storage Space
```

### Phase 3: P2P Sharing
```
Discover Nearby Devices
  ↓
Share Downloaded Content
  ↓
Verify Content Integrity
  ↓
Update Local Cache
```

---

This architecture provides a solid foundation for offline functionality while remaining flexible for future enhancements.
