import {create} from 'zustand';
import {
  downloadManagerService,
  DownloadOptions,
} from '@services/downloadManager.service';
import {
  CachedContent,
  DownloadProgress,
} from '@services/offlineStorage.service';
import {
  offlinePurchaseService,
  OfflinePurchase,
} from '@services/offlinePurchase.service';

interface OfflineState {
  // Downloaded content
  downloadedContent: CachedContent[];
  
  // Active downloads
  activeDownloads: DownloadProgress[];
  
  // Pending purchases
  pendingPurchases: OfflinePurchase[];
  
  // Network status
  isOnline: boolean;
  
  // Cache info
  cacheSize: number;
  
  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions - Downloads
  startDownload: (options: DownloadOptions) => Promise<void>;
  pauseDownload: (contentId: string) => Promise<void>;
  resumeDownload: (contentId: string) => Promise<void>;
  cancelDownload: (contentId: string) => Promise<void>;
  deleteDownload: (contentId: string) => Promise<void>;
  refreshDownloads: () => Promise<void>;
  
  // Actions - Purchases
  queuePurchase: (purchase: Omit<OfflinePurchase, 'id' | 'timestamp' | 'synced'>) => Promise<string>;
  syncPurchases: () => Promise<void>;
  retryPurchase: (purchaseId: string) => Promise<void>;
  cancelPurchase: (purchaseId: string) => Promise<void>;
  refreshPurchases: () => Promise<void>;
  
  // Actions - Cache
  clearCache: () => Promise<void>;
  refreshCacheSize: () => Promise<void>;
  
  // Actions - Network
  setOnlineStatus: (isOnline: boolean) => void;
  
  // Actions - General
  initialize: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  downloadedContent: [],
  activeDownloads: [],
  pendingPurchases: [],
  isOnline: true,
  cacheSize: 0,
  isLoading: false,
  error: null,

  // Download Actions
  startDownload: async (options: DownloadOptions) => {
    try {
      set({isLoading: true, error: null});
      
      await downloadManagerService.startDownload(options, (progress) => {
        // Update active downloads in real-time
        const {activeDownloads} = get();
        const index = activeDownloads.findIndex(d => d.contentId === progress.contentId);
        
        if (index >= 0) {
          const updated = [...activeDownloads];
          updated[index] = progress;
          set({activeDownloads: updated});
        } else {
          set({activeDownloads: [...activeDownloads, progress]});
        }
      });

      await get().refreshDownloads();
    } catch (error) {
      set({error: error instanceof Error ? error.message : 'Download failed'});
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  pauseDownload: async (contentId: string) => {
    try {
      await downloadManagerService.pauseDownload(contentId);
      await get().refreshDownloads();
    } catch (error) {
      set({error: error instanceof Error ? error.message : 'Failed to pause download'});
      throw error;
    }
  },

  resumeDownload: async (contentId: string) => {
    try {
      await downloadManagerService.resumeDownload(contentId);
      await get().refreshDownloads();
    } catch (error) {
      set({error: error instanceof Error ? error.message : 'Failed to resume download'});
      throw error;
    }
  },

  cancelDownload: async (contentId: string) => {
    try {
      await downloadManagerService.cancelDownload(contentId);
      await get().refreshDownloads();
    } catch (error) {
      set({error: error instanceof Error ? error.message : 'Failed to cancel download'});
      throw error;
    }
  },

  deleteDownload: async (contentId: string) => {
    try {
      set({isLoading: true, error: null});
      await downloadManagerService.deleteDownload(contentId);
      await get().refreshDownloads();
      await get().refreshCacheSize();
    } catch (error) {
      set({error: error instanceof Error ? error.message : 'Failed to delete download'});
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  refreshDownloads: async () => {
    try {
      const [downloadedContent, activeDownloads] = await Promise.all([
        downloadManagerService.getAllDownloadedContent(),
        downloadManagerService.getAllDownloads(),
      ]);
      
      set({downloadedContent, activeDownloads});
    } catch (error) {
      console.error('Failed to refresh downloads:', error);
    }
  },

  // Purchase Actions
  queuePurchase: async (purchase) => {
    try {
      set({isLoading: true, error: null});
      
      // Validate purchase
      const validation = await offlinePurchaseService.validateOfflinePurchase(purchase);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const purchaseId = await offlinePurchaseService.queuePurchase(purchase);
      await get().refreshPurchases();
      
      return purchaseId;
    } catch (error) {
      set({error: error instanceof Error ? error.message : 'Failed to queue purchase'});
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  syncPurchases: async () => {
    try {
      set({isLoading: true, error: null});
      await offlinePurchaseService.syncPurchases();
      await get().refreshPurchases();
    } catch (error) {
      set({error: error instanceof Error ? error.message : 'Failed to sync purchases'});
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  retryPurchase: async (purchaseId: string) => {
    try {
      set({isLoading: true, error: null});
      await offlinePurchaseService.retryFailedPurchase(purchaseId);
      await get().refreshPurchases();
    } catch (error) {
      set({error: error instanceof Error ? error.message : 'Failed to retry purchase'});
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  cancelPurchase: async (purchaseId: string) => {
    try {
      await offlinePurchaseService.cancelPendingPurchase(purchaseId);
      await get().refreshPurchases();
    } catch (error) {
      set({error: error instanceof Error ? error.message : 'Failed to cancel purchase'});
      throw error;
    }
  },

  refreshPurchases: async () => {
    try {
      const pendingPurchases = await offlinePurchaseService.getPendingPurchases();
      set({pendingPurchases});
    } catch (error) {
      console.error('Failed to refresh purchases:', error);
    }
  },

  // Cache Actions
  clearCache: async () => {
    try {
      set({isLoading: true, error: null});
      await downloadManagerService.clearAllDownloads();
      await get().refreshDownloads();
      await get().refreshCacheSize();
    } catch (error) {
      set({error: error instanceof Error ? error.message : 'Failed to clear cache'});
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  refreshCacheSize: async () => {
    try {
      const cacheSize = await downloadManagerService.getCacheSize();
      set({cacheSize});
    } catch (error) {
      console.error('Failed to refresh cache size:', error);
    }
  },

  // Network Actions
  setOnlineStatus: (isOnline: boolean) => {
    set({isOnline});
    
    // Auto-sync when coming online
    if (isOnline) {
      get().syncPurchases();
    }
  },

  // General Actions
  initialize: async () => {
    try {
      set({isLoading: true, error: null});
      
      await Promise.all([
        get().refreshDownloads(),
        get().refreshPurchases(),
        get().refreshCacheSize(),
      ]);

      // Check online status
      const isOnline = await offlinePurchaseService.isOnline();
      set({isOnline});
    } catch (error) {
      set({error: error instanceof Error ? error.message : 'Failed to initialize'});
    } finally {
      set({isLoading: false});
    }
  },

  setLoading: (loading: boolean) => set({isLoading: loading}),
  
  setError: (error: string | null) => set({error}),
}));
