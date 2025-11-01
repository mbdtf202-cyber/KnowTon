/**
 * Client-side cache manager
 * Manages browser cache, localStorage, and IndexedDB
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  storage?: 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB';
}

class CacheManager {
  private memoryCache: Map<string, CacheEntry<any>>;
  private dbName = 'knowton-cache';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.memoryCache = new Map();
    this.initIndexedDB();
  }

  /**
   * Initialize IndexedDB
   */
  private async initIndexedDB(): Promise<void> {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not supported');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Set cache entry
   */
  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const {
      ttl = 5 * 60 * 1000, // 5 minutes default
      storage = 'memory'
    } = options;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };

    switch (storage) {
      case 'memory':
        this.memoryCache.set(key, entry);
        break;

      case 'localStorage':
        try {
          localStorage.setItem(key, JSON.stringify(entry));
        } catch (error) {
          console.error('localStorage set error:', error);
        }
        break;

      case 'sessionStorage':
        try {
          sessionStorage.setItem(key, JSON.stringify(entry));
        } catch (error) {
          console.error('sessionStorage set error:', error);
        }
        break;

      case 'indexedDB':
        await this.setIndexedDB(key, entry);
        break;
    }
  }

  /**
   * Get cache entry
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const { storage = 'memory' } = options;

    let entry: CacheEntry<T> | null = null;

    switch (storage) {
      case 'memory':
        entry = this.memoryCache.get(key) || null;
        break;

      case 'localStorage':
        try {
          const stored = localStorage.getItem(key);
          entry = stored ? JSON.parse(stored) : null;
        } catch (error) {
          console.error('localStorage get error:', error);
        }
        break;

      case 'sessionStorage':
        try {
          const stored = sessionStorage.getItem(key);
          entry = stored ? JSON.parse(stored) : null;
        } catch (error) {
          console.error('sessionStorage get error:', error);
        }
        break;

      case 'indexedDB':
        entry = await this.getIndexedDB<T>(key);
        break;
    }

    if (!entry) {
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      await this.delete(key, options);
      return null;
    }

    return entry.data;
  }

  /**
   * Delete cache entry
   */
  async delete(key: string, options: CacheOptions = {}): Promise<void> {
    const { storage = 'memory' } = options;

    switch (storage) {
      case 'memory':
        this.memoryCache.delete(key);
        break;

      case 'localStorage':
        localStorage.removeItem(key);
        break;

      case 'sessionStorage':
        sessionStorage.removeItem(key);
        break;

      case 'indexedDB':
        await this.deleteIndexedDB(key);
        break;
    }
  }

  /**
   * Clear all cache
   */
  async clear(storage?: 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB'): Promise<void> {
    if (!storage || storage === 'memory') {
      this.memoryCache.clear();
    }

    if (!storage || storage === 'localStorage') {
      localStorage.clear();
    }

    if (!storage || storage === 'sessionStorage') {
      sessionStorage.clear();
    }

    if (!storage || storage === 'indexedDB') {
      await this.clearIndexedDB();
    }
  }

  /**
   * Get or set with fallback
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options);

    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, options);

    return data;
  }

  /**
   * IndexedDB operations
   */
  private async setIndexedDB<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (!this.db) {
      await this.initIndexedDB();
    }

    if (!this.db) {
      throw new Error('IndexedDB not available');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put({ key, ...entry });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getIndexedDB<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.db) {
      await this.initIndexedDB();
    }

    if (!this.db) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve({
            data: result.data,
            timestamp: result.timestamp,
            ttl: result.ttl
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteIndexedDB(key: string): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async clearIndexedDB(): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cache size
   */
  async getSize(storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): Promise<number> {
    switch (storage) {
      case 'memory':
        return this.memoryCache.size;

      case 'localStorage':
        return Object.keys(localStorage).length;

      case 'sessionStorage':
        return Object.keys(sessionStorage).length;

      default:
        return 0;
    }
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(storage?: 'memory' | 'localStorage' | 'sessionStorage'): Promise<number> {
    let cleaned = 0;

    if (!storage || storage === 'memory') {
      for (const [key, entry] of this.memoryCache.entries()) {
        const age = Date.now() - entry.timestamp;
        if (age > entry.ttl) {
          this.memoryCache.delete(key);
          cleaned++;
        }
      }
    }

    if (!storage || storage === 'localStorage') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const entry = JSON.parse(stored);
              const age = Date.now() - entry.timestamp;
              if (age > entry.ttl) {
                localStorage.removeItem(key);
                cleaned++;
              }
            }
          } catch (error) {
            // Invalid entry, remove it
            localStorage.removeItem(key);
            cleaned++;
          }
        }
      }
    }

    if (!storage || storage === 'sessionStorage') {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          try {
            const stored = sessionStorage.getItem(key);
            if (stored) {
              const entry = JSON.parse(stored);
              const age = Date.now() - entry.timestamp;
              if (age > entry.ttl) {
                sessionStorage.removeItem(key);
                cleaned++;
              }
            }
          } catch (error) {
            sessionStorage.removeItem(key);
            cleaned++;
          }
        }
      }
    }

    return cleaned;
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

// Helper functions
export const cache = {
  set: <T>(key: string, data: T, options?: CacheOptions) => 
    cacheManager.set(key, data, options),
  
  get: <T>(key: string, options?: CacheOptions) => 
    cacheManager.get<T>(key, options),
  
  delete: (key: string, options?: CacheOptions) => 
    cacheManager.delete(key, options),
  
  clear: (storage?: 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB') => 
    cacheManager.clear(storage),
  
  getOrSet: <T>(key: string, fetcher: () => Promise<T>, options?: CacheOptions) => 
    cacheManager.getOrSet(key, fetcher, options),
  
  cleanup: (storage?: 'memory' | 'localStorage' | 'sessionStorage') => 
    cacheManager.cleanup(storage)
};

// Auto cleanup every 5 minutes
setInterval(() => {
  cacheManager.cleanup().then(cleaned => {
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired cache entries`);
    }
  });
}, 5 * 60 * 1000);
