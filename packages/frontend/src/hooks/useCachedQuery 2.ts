import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { cache } from '../utils/cacheManager';

/**
 * Custom hook for cached queries with multi-layer caching
 * Combines React Query with browser cache
 */

interface UseCachedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  cacheKey?: string;
  cacheTTL?: number;
  cacheStorage?: 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB';
  skipBrowserCache?: boolean;
}

export function useCachedQuery<T>(
  queryKey: string | string[],
  queryFn: () => Promise<T>,
  options: UseCachedQueryOptions<T> = {}
): UseQueryResult<T> {
  const {
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    cacheStorage = 'memory',
    skipBrowserCache = false,
    ...queryOptions
  } = options;

  const key = Array.isArray(queryKey) ? queryKey.join(':') : queryKey;
  const browserCacheKey = cacheKey || `query:${key}`;

  // Enhanced query function with browser cache
  const enhancedQueryFn = async (): Promise<T> => {
    // Try browser cache first
    if (!skipBrowserCache) {
      const cached = await cache.get<T>(browserCacheKey, { storage: cacheStorage });
      if (cached !== null) {
        console.log(`Browser cache HIT: ${browserCacheKey}`);
        return cached;
      }
    }

    // Fetch from API
    console.log(`Browser cache MISS: ${browserCacheKey}`);
    const data = await queryFn();

    // Store in browser cache
    if (!skipBrowserCache) {
      await cache.set(browserCacheKey, data, {
        ttl: cacheTTL,
        storage: cacheStorage
      });
    }

    return data;
  };

  return useQuery({
    queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
    queryFn: enhancedQueryFn,
    staleTime: cacheTTL,
    gcTime: cacheTTL * 2,
    ...queryOptions
  });
}

/**
 * Hook for NFT data with aggressive caching
 */
export function useCachedNFT(tokenId: string, options: UseCachedQueryOptions<any> = {}) {
  return useCachedQuery(
    ['nft', tokenId],
    async () => {
      const response = await fetch(`/api/v1/nft/${tokenId}`);
      if (!response.ok) throw new Error('Failed to fetch NFT');
      return response.json();
    },
    {
      cacheTTL: 10 * 60 * 1000, // 10 minutes
      cacheStorage: 'indexedDB',
      ...options
    }
  );
}

/**
 * Hook for marketplace data with short cache
 */
export function useCachedMarketplace(options: UseCachedQueryOptions<any> = {}) {
  return useCachedQuery(
    'marketplace',
    async () => {
      const response = await fetch('/api/v1/marketplace/stats');
      if (!response.ok) throw new Error('Failed to fetch marketplace');
      return response.json();
    },
    {
      cacheTTL: 2 * 60 * 1000, // 2 minutes
      cacheStorage: 'memory',
      ...options
    }
  );
}

/**
 * Hook for trending NFTs with medium cache
 */
export function useCachedTrending(options: UseCachedQueryOptions<any> = {}) {
  return useCachedQuery(
    'trending',
    async () => {
      const response = await fetch('/api/v1/nft/trending');
      if (!response.ok) throw new Error('Failed to fetch trending');
      return response.json();
    },
    {
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      cacheStorage: 'localStorage',
      ...options
    }
  );
}

/**
 * Hook for user profile with persistent cache
 */
export function useCachedProfile(address: string, options: UseCachedQueryOptions<any> = {}) {
  return useCachedQuery(
    ['profile', address],
    async () => {
      const response = await fetch(`/api/v1/users/${address}`);
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    {
      cacheTTL: 15 * 60 * 1000, // 15 minutes
      cacheStorage: 'indexedDB',
      ...options
    }
  );
}

/**
 * Hook for IPFS metadata with long cache
 */
export function useCachedIPFS(cid: string, options: UseCachedQueryOptions<any> = {}) {
  return useCachedQuery(
    ['ipfs', cid],
    async () => {
      const response = await fetch(`/ipfs/${cid}`);
      if (!response.ok) throw new Error('Failed to fetch IPFS content');
      return response.json();
    },
    {
      cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
      cacheStorage: 'indexedDB',
      ...options
    }
  );
}

/**
 * Invalidate cache for specific query
 */
export async function invalidateQueryCache(queryKey: string | string[]): Promise<void> {
  const key = Array.isArray(queryKey) ? queryKey.join(':') : queryKey;
  const browserCacheKey = `query:${key}`;
  
  await cache.delete(browserCacheKey, { storage: 'memory' });
  await cache.delete(browserCacheKey, { storage: 'localStorage' });
  await cache.delete(browserCacheKey, { storage: 'sessionStorage' });
  await cache.delete(browserCacheKey, { storage: 'indexedDB' });
}

/**
 * Prefetch and cache data
 */
export async function prefetchAndCache<T>(
  queryKey: string | string[],
  queryFn: () => Promise<T>,
  options: {
    cacheTTL?: number;
    cacheStorage?: 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB';
  } = {}
): Promise<T> {
  const {
    cacheTTL = 5 * 60 * 1000,
    cacheStorage = 'memory'
  } = options;

  const key = Array.isArray(queryKey) ? queryKey.join(':') : queryKey;
  const browserCacheKey = `query:${key}`;

  const data = await queryFn();
  
  await cache.set(browserCacheKey, data, {
    ttl: cacheTTL,
    storage: cacheStorage
  });

  return data;
}
