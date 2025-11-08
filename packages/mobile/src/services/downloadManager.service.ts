import RNFS from 'react-native-fs';
import {
  offlineStorageService,
  CachedContent,
  DownloadProgress,
} from './offlineStorage.service';
import {apiService} from './api';

export interface DownloadOptions {
  contentId: string;
  title: string;
  contentType: 'pdf' | 'video' | 'audio' | 'course';
  downloadUrl: string;
  thumbnailUrl?: string;
  encryptionKey?: string;
  expiresAt?: string;
}

type DownloadCallback = (progress: DownloadProgress) => void;

class DownloadManagerService {
  private activeDownloads: Map<string, RNFS.DownloadBeginCallbackResult> = new Map();
  private downloadCallbacks: Map<string, DownloadCallback[]> = new Map();
  private maxConcurrentDownloads = 3;
  private currentDownloads = 0;

  async startDownload(
    options: DownloadOptions,
    onProgress?: DownloadCallback
  ): Promise<void> {
    const {contentId, title, contentType, downloadUrl, thumbnailUrl, encryptionKey, expiresAt} = options;

    // Check if already downloaded
    const cached = await offlineStorageService.getCachedContent(contentId);
    if (cached) {
      throw new Error('Content already downloaded');
    }

    // Check if already downloading
    if (this.activeDownloads.has(contentId)) {
      if (onProgress) {
        this.addDownloadCallback(contentId, onProgress);
      }
      return;
    }

    // Add to download queue
    const initialProgress: DownloadProgress = {
      contentId,
      progress: 0,
      bytesDownloaded: 0,
      totalBytes: 0,
      status: 'pending',
    };

    await offlineStorageService.addToDownloadQueue(initialProgress);

    if (onProgress) {
      this.addDownloadCallback(contentId, onProgress);
    }

    // Wait if max concurrent downloads reached
    if (this.currentDownloads >= this.maxConcurrentDownloads) {
      await offlineStorageService.updateDownloadProgress(contentId, {
        status: 'pending',
      });
      return;
    }

    await this.executeDownload(options);
  }

  private async executeDownload(options: DownloadOptions): Promise<void> {
    const {contentId, title, contentType, downloadUrl, thumbnailUrl, encryptionKey, expiresAt} = options;

    this.currentDownloads++;

    try {
      // Update status to downloading
      await offlineStorageService.updateDownloadProgress(contentId, {
        status: 'downloading',
      });

      // Determine file extension
      const extension = this.getFileExtension(contentType);
      const localPath = offlineStorageService.getContentPath(contentId, extension);

      // Download main content
      const downloadResult = await RNFS.downloadFile({
        fromUrl: downloadUrl,
        toFile: localPath,
        background: true,
        discretionary: true,
        cacheable: false,
        progressDivider: 10,
        begin: (res) => {
          this.activeDownloads.set(contentId, res);
          this.notifyProgress(contentId, {
            contentId,
            progress: 0,
            bytesDownloaded: 0,
            totalBytes: parseInt(res.contentLength, 10),
            status: 'downloading',
          });
        },
        progress: (res) => {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          this.notifyProgress(contentId, {
            contentId,
            progress: Math.round(progress),
            bytesDownloaded: res.bytesWritten,
            totalBytes: res.contentLength,
            status: 'downloading',
          });
        },
      }).promise;

      if (downloadResult.statusCode !== 200) {
        throw new Error(`Download failed with status ${downloadResult.statusCode}`);
      }

      // Download thumbnail if available
      let thumbnailPath: string | undefined;
      if (thumbnailUrl) {
        thumbnailPath = offlineStorageService.getThumbnailPath(contentId);
        await RNFS.downloadFile({
          fromUrl: thumbnailUrl,
          toFile: thumbnailPath,
        }).promise;
      }

      // Get file size
      const fileSize = await offlineStorageService.getFileSize(localPath);

      // Save to cached contents
      const cachedContent: CachedContent = {
        id: contentId,
        title,
        contentType,
        localPath,
        thumbnailPath,
        metadata: {
          size: fileSize,
          downloadedAt: new Date().toISOString(),
          expiresAt,
        },
        encryptionKey,
      };

      await offlineStorageService.addCachedContent(cachedContent);

      // Update download progress to completed
      await offlineStorageService.updateDownloadProgress(contentId, {
        status: 'completed',
        progress: 100,
      });

      this.notifyProgress(contentId, {
        contentId,
        progress: 100,
        bytesDownloaded: fileSize,
        totalBytes: fileSize,
        status: 'completed',
      });

      // Remove from download queue after a delay
      setTimeout(() => {
        offlineStorageService.removeFromDownloadQueue(contentId);
      }, 3000);

    } catch (error) {
      console.error('Download failed:', error);
      
      await offlineStorageService.updateDownloadProgress(contentId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Download failed',
      });

      this.notifyProgress(contentId, {
        contentId,
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Download failed',
      });

      throw error;
    } finally {
      this.activeDownloads.delete(contentId);
      this.downloadCallbacks.delete(contentId);
      this.currentDownloads--;

      // Process next pending download
      await this.processNextPendingDownload();
    }
  }

  async pauseDownload(contentId: string): Promise<void> {
    const download = this.activeDownloads.get(contentId);
    if (download) {
      download.jobId && RNFS.stopDownload(download.jobId);
      this.activeDownloads.delete(contentId);
      
      await offlineStorageService.updateDownloadProgress(contentId, {
        status: 'paused',
      });

      this.currentDownloads--;
    }
  }

  async resumeDownload(contentId: string): Promise<void> {
    const queue = await offlineStorageService.getDownloadQueue();
    const download = queue.find(d => d.contentId === contentId && d.status === 'paused');
    
    if (download) {
      // Note: Actual resume would require storing download options
      // For now, we'll just mark as pending and let it be processed
      await offlineStorageService.updateDownloadProgress(contentId, {
        status: 'pending',
      });
      
      await this.processNextPendingDownload();
    }
  }

  async cancelDownload(contentId: string): Promise<void> {
    const download = this.activeDownloads.get(contentId);
    if (download) {
      download.jobId && RNFS.stopDownload(download.jobId);
      this.activeDownloads.delete(contentId);
      this.currentDownloads--;
    }

    // Remove from queue
    await offlineStorageService.removeFromDownloadQueue(contentId);

    // Delete partial file if exists
    const extension = 'tmp';
    const localPath = offlineStorageService.getContentPath(contentId, extension);
    if (await offlineStorageService.fileExists(localPath)) {
      await offlineStorageService.deleteFile(localPath);
    }
  }

  async deleteDownload(contentId: string): Promise<void> {
    await offlineStorageService.removeCachedContent(contentId);
  }

  async getDownloadedContent(contentId: string): Promise<CachedContent | null> {
    return await offlineStorageService.getCachedContent(contentId);
  }

  async getAllDownloadedContent(): Promise<CachedContent[]> {
    return await offlineStorageService.getCachedContents();
  }

  async getDownloadProgress(contentId: string): Promise<DownloadProgress | null> {
    const queue = await offlineStorageService.getDownloadQueue();
    return queue.find(d => d.contentId === contentId) || null;
  }

  async getAllDownloads(): Promise<DownloadProgress[]> {
    return await offlineStorageService.getDownloadQueue();
  }

  async getCacheSize(): Promise<number> {
    return await offlineStorageService.getCacheSize();
  }

  async clearAllDownloads(): Promise<void> {
    // Cancel all active downloads
    for (const [contentId] of this.activeDownloads) {
      await this.cancelDownload(contentId);
    }

    // Clear all cached content
    await offlineStorageService.clearAllCachedContent();
    await offlineStorageService.clearDownloadQueue();
  }

  private async processNextPendingDownload(): Promise<void> {
    if (this.currentDownloads >= this.maxConcurrentDownloads) {
      return;
    }

    const queue = await offlineStorageService.getDownloadQueue();
    const pending = queue.find(d => d.status === 'pending');

    if (pending) {
      // Note: We would need to store download options to resume
      // For now, this is a placeholder
      console.log('Processing next pending download:', pending.contentId);
    }
  }

  private addDownloadCallback(contentId: string, callback: DownloadCallback): void {
    const callbacks = this.downloadCallbacks.get(contentId) || [];
    callbacks.push(callback);
    this.downloadCallbacks.set(contentId, callbacks);
  }

  private notifyProgress(contentId: string, progress: DownloadProgress): void {
    const callbacks = this.downloadCallbacks.get(contentId) || [];
    callbacks.forEach(callback => callback(progress));

    // Also update in storage
    offlineStorageService.updateDownloadProgress(contentId, progress);
  }

  private getFileExtension(contentType: string): string {
    const extensions: Record<string, string> = {
      pdf: 'pdf',
      video: 'mp4',
      audio: 'mp3',
      course: 'zip',
    };
    return extensions[contentType] || 'bin';
  }

  // Check if content is available offline
  async isContentAvailableOffline(contentId: string): Promise<boolean> {
    const cached = await offlineStorageService.getCachedContent(contentId);
    if (!cached) return false;

    // Check if file still exists
    const exists = await offlineStorageService.fileExists(cached.localPath);
    if (!exists) {
      // Clean up stale cache entry
      await offlineStorageService.removeCachedContent(contentId);
      return false;
    }

    // Check if expired
    if (cached.metadata.expiresAt) {
      const expiryDate = new Date(cached.metadata.expiresAt);
      if (expiryDate < new Date()) {
        await offlineStorageService.removeCachedContent(contentId);
        return false;
      }
    }

    return true;
  }
}

export const downloadManagerService = new DownloadManagerService();
