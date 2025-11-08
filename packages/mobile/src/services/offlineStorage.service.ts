import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

export interface CachedContent {
  id: string;
  title: string;
  contentType: 'pdf' | 'video' | 'audio' | 'course';
  localPath: string;
  thumbnailPath?: string;
  metadata: {
    size: number;
    downloadedAt: string;
    expiresAt?: string;
  };
  encryptionKey?: string;
}

export interface DownloadProgress {
  contentId: string;
  progress: number; // 0-100
  bytesDownloaded: number;
  totalBytes: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';
  error?: string;
}

const STORAGE_KEYS = {
  CACHED_CONTENTS: '@knowton/cached_contents',
  DOWNLOAD_QUEUE: '@knowton/download_queue',
  OFFLINE_PURCHASES: '@knowton/offline_purchases',
};

class OfflineStorageService {
  private downloadDirectory = `${RNFS.DocumentDirectoryPath}/knowton_content`;

  constructor() {
    this.initializeStorage();
  }

  private async initializeStorage() {
    try {
      // Create download directory if it doesn't exist
      const dirExists = await RNFS.exists(this.downloadDirectory);
      if (!dirExists) {
        await RNFS.mkdir(this.downloadDirectory);
      }
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
    }
  }

  // Cached Content Management
  async getCachedContents(): Promise<CachedContent[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_CONTENTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get cached contents:', error);
      return [];
    }
  }

  async getCachedContent(contentId: string): Promise<CachedContent | null> {
    try {
      const contents = await this.getCachedContents();
      return contents.find(c => c.id === contentId) || null;
    } catch (error) {
      console.error('Failed to get cached content:', error);
      return null;
    }
  }

  async addCachedContent(content: CachedContent): Promise<void> {
    try {
      const contents = await this.getCachedContents();
      const existingIndex = contents.findIndex(c => c.id === content.id);
      
      if (existingIndex >= 0) {
        contents[existingIndex] = content;
      } else {
        contents.push(content);
      }
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.CACHED_CONTENTS,
        JSON.stringify(contents)
      );
    } catch (error) {
      console.error('Failed to add cached content:', error);
      throw error;
    }
  }

  async removeCachedContent(contentId: string): Promise<void> {
    try {
      const contents = await this.getCachedContents();
      const content = contents.find(c => c.id === contentId);
      
      if (content) {
        // Delete local files
        if (await RNFS.exists(content.localPath)) {
          await RNFS.unlink(content.localPath);
        }
        if (content.thumbnailPath && await RNFS.exists(content.thumbnailPath)) {
          await RNFS.unlink(content.thumbnailPath);
        }
        
        // Remove from cache list
        const updatedContents = contents.filter(c => c.id !== contentId);
        await AsyncStorage.setItem(
          STORAGE_KEYS.CACHED_CONTENTS,
          JSON.stringify(updatedContents)
        );
      }
    } catch (error) {
      console.error('Failed to remove cached content:', error);
      throw error;
    }
  }

  async clearAllCachedContent(): Promise<void> {
    try {
      const contents = await this.getCachedContents();
      
      // Delete all local files
      for (const content of contents) {
        if (await RNFS.exists(content.localPath)) {
          await RNFS.unlink(content.localPath);
        }
        if (content.thumbnailPath && await RNFS.exists(content.thumbnailPath)) {
          await RNFS.unlink(content.thumbnailPath);
        }
      }
      
      // Clear cache list
      await AsyncStorage.removeItem(STORAGE_KEYS.CACHED_CONTENTS);
    } catch (error) {
      console.error('Failed to clear cached content:', error);
      throw error;
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      const contents = await this.getCachedContents();
      return contents.reduce((total, content) => total + content.metadata.size, 0);
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return 0;
    }
  }

  // Download Queue Management
  async getDownloadQueue(): Promise<DownloadProgress[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.DOWNLOAD_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get download queue:', error);
      return [];
    }
  }

  async addToDownloadQueue(download: DownloadProgress): Promise<void> {
    try {
      const queue = await this.getDownloadQueue();
      const existingIndex = queue.findIndex(d => d.contentId === download.contentId);
      
      if (existingIndex >= 0) {
        queue[existingIndex] = download;
      } else {
        queue.push(download);
      }
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.DOWNLOAD_QUEUE,
        JSON.stringify(queue)
      );
    } catch (error) {
      console.error('Failed to add to download queue:', error);
      throw error;
    }
  }

  async updateDownloadProgress(
    contentId: string,
    updates: Partial<DownloadProgress>
  ): Promise<void> {
    try {
      const queue = await this.getDownloadQueue();
      const index = queue.findIndex(d => d.contentId === contentId);
      
      if (index >= 0) {
        queue[index] = {...queue[index], ...updates};
        await AsyncStorage.setItem(
          STORAGE_KEYS.DOWNLOAD_QUEUE,
          JSON.stringify(queue)
        );
      }
    } catch (error) {
      console.error('Failed to update download progress:', error);
      throw error;
    }
  }

  async removeFromDownloadQueue(contentId: string): Promise<void> {
    try {
      const queue = await this.getDownloadQueue();
      const updatedQueue = queue.filter(d => d.contentId !== contentId);
      await AsyncStorage.setItem(
        STORAGE_KEYS.DOWNLOAD_QUEUE,
        JSON.stringify(updatedQueue)
      );
    } catch (error) {
      console.error('Failed to remove from download queue:', error);
      throw error;
    }
  }

  async clearDownloadQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.DOWNLOAD_QUEUE);
    } catch (error) {
      console.error('Failed to clear download queue:', error);
      throw error;
    }
  }

  // Offline Purchase Queue
  async getOfflinePurchases(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_PURCHASES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get offline purchases:', error);
      return [];
    }
  }

  async addOfflinePurchase(purchase: any): Promise<void> {
    try {
      const purchases = await this.getOfflinePurchases();
      purchases.push({
        ...purchase,
        timestamp: new Date().toISOString(),
        synced: false,
      });
      await AsyncStorage.setItem(
        STORAGE_KEYS.OFFLINE_PURCHASES,
        JSON.stringify(purchases)
      );
    } catch (error) {
      console.error('Failed to add offline purchase:', error);
      throw error;
    }
  }

  async markPurchaseAsSynced(purchaseId: string): Promise<void> {
    try {
      const purchases = await this.getOfflinePurchases();
      const updatedPurchases = purchases.map(p =>
        p.id === purchaseId ? {...p, synced: true} : p
      );
      await AsyncStorage.setItem(
        STORAGE_KEYS.OFFLINE_PURCHASES,
        JSON.stringify(updatedPurchases)
      );
    } catch (error) {
      console.error('Failed to mark purchase as synced:', error);
      throw error;
    }
  }

  async removeOfflinePurchase(purchaseId: string): Promise<void> {
    try {
      const purchases = await this.getOfflinePurchases();
      const updatedPurchases = purchases.filter(p => p.id !== purchaseId);
      await AsyncStorage.setItem(
        STORAGE_KEYS.OFFLINE_PURCHASES,
        JSON.stringify(updatedPurchases)
      );
    } catch (error) {
      console.error('Failed to remove offline purchase:', error);
      throw error;
    }
  }

  async clearSyncedPurchases(): Promise<void> {
    try {
      const purchases = await this.getOfflinePurchases();
      const unsyncedPurchases = purchases.filter(p => !p.synced);
      await AsyncStorage.setItem(
        STORAGE_KEYS.OFFLINE_PURCHASES,
        JSON.stringify(unsyncedPurchases)
      );
    } catch (error) {
      console.error('Failed to clear synced purchases:', error);
      throw error;
    }
  }

  // File Operations
  getContentPath(contentId: string, extension: string): string {
    return `${this.downloadDirectory}/${contentId}.${extension}`;
  }

  getThumbnailPath(contentId: string): string {
    return `${this.downloadDirectory}/${contentId}_thumb.jpg`;
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      return await RNFS.exists(path);
    } catch (error) {
      return false;
    }
  }

  async getFileSize(path: string): Promise<number> {
    try {
      const stat = await RNFS.stat(path);
      return parseInt(stat.size, 10);
    } catch (error) {
      return 0;
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      if (await this.fileExists(path)) {
        await RNFS.unlink(path);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }
}

export const offlineStorageService = new OfflineStorageService();
