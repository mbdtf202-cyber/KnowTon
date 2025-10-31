import Redis from 'ioredis';
import { createHash } from 'crypto';

/**
 * Query Caching Implementation for KnowTon Platform
 * Implements Redis-based caching to reduce database load
 */

export class QueryCache {
  private redis: Redis;
  private defaultTTL: number = 300; // 5 minutes

  constructor(redisUrl: string = 'redis://localhost:6379') {
    this.redis = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
  }

  /**
   * Generate cache key from query and parameters
   */
  private generateKey(query: string, params: any[]): string {
    const hash = createHash('sha256');
    hash.update(query);
    hash.update(JSON.stringify(params));
    return `query:${hash.digest('hex')}`;
  }

  /**
   * Get cached query result
   */
  async get<T>(query: string, params: any[]): Promise<T | null> {
    const key = this.generateKey(query, params);
    const cached = await this.redis.get(key);
    
    if (cached) {
      return JSON.parse(cached) as T;
    }
    
    return null;
  }

  /**
   * Set query result in cache
   */
  async set(query: string, params: any[], result: any, ttl?: number): Promise<void> {
    const key = this.generateKey(query, params);
    const value = JSON.stringify(result);
    
    await this.redis.setex(key, ttl || this.defaultTTL, value);
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(`query:*${pattern}*`);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Clear all query cache
   */
  async clear(): Promise<void> {
    const keys = await this.redis.keys('query:*');
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    keys: number;
    memory: string;
    hits: number;
    misses: number;
  }> {
    const info = await this.redis.info('stats');
    const keys = await this.redis.dbsize();
    
    // Parse Redis INFO output
    const stats = info.split('\r\n').reduce((acc, line) => {
      const [key, value] = line.split(':');
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>);
    
    return {
      keys,
      memory: stats.used_memory_human || '0',
      hits: parseInt(stats.keyspace_hits || '0'),
      misses: parseInt(stats.keyspace_misses || '0'),
    };
  }
}

/**
 * Cached Database Query Wrapper
 */
export class CachedQuery {
  private cache: QueryCache;

  constructor(cache: QueryCache) {
    this.cache = cache;
  }

  /**
   * Execute query with caching
   */
  async execute<T>(
    query: string,
    params: any[],
    executor: () => Promise<T>,
    options: {
      ttl?: number;
      skipCache?: boolean;
      invalidatePattern?: string;
    } = {}
  ): Promise<T> {
    // Skip cache if requested
    if (options.skipCache) {
      const result = await executor();
      
      // Invalidate related cache entries
      if (options.invalidatePattern) {
        await this.cache.invalidate(options.invalidatePattern);
      }
      
      return result;
    }

    // Try to get from cache
    const cached = await this.cache.get<T>(query, params);
    if (cached !== null) {
      return cached;
    }

    // Execute query
    const result = await executor();

    // Store in cache
    await this.cache.set(query, params, result, options.ttl);

    return result;
  }
}

/**
 * Cache Warming Strategy
 * Pre-populate cache with frequently accessed data
 */
export class CacheWarmer {
  private cache: QueryCache;
  private db: any; // Database connection

  constructor(cache: QueryCache, db: any) {
    this.cache = cache;
    this.db = db;
  }

  /**
   * Warm cache with popular NFTs
   */
  async warmPopularNFTs(): Promise<void> {
    const query = `
      SELECT token_id, title, creator_address, price
      FROM nfts
      WHERE is_listed = true
      ORDER BY view_count DESC
      LIMIT 100
    `;

    const result = await this.db.query(query);
    await this.cache.set(query, [], result.rows, 600); // 10 minutes
  }

  /**
   * Warm cache with trending NFTs
   */
  async warmTrendingNFTs(): Promise<void> {
    const query = `
      SELECT n.token_id, n.title, COUNT(t.id) as trade_count
      FROM nfts n
      LEFT JOIN transactions t ON n.token_id = t.token_id
        AND t.timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY n.token_id, n.title
      ORDER BY trade_count DESC
      LIMIT 50
    `;

    const result = await this.db.query(query);
    await this.cache.set(query, [], result.rows, 300); // 5 minutes
  }

  /**
   * Warm cache with platform statistics
   */
  async warmPlatformStats(): Promise<void> {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM nfts) as total_nfts,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT SUM(amount) FROM transactions WHERE timestamp > NOW() - INTERVAL '24 hours') as volume_24h
    `;

    const result = await this.db.query(query);
    await this.cache.set(query, [], result.rows[0], 60); // 1 minute
  }

  /**
   * Run all cache warming tasks
   */
  async warmAll(): Promise<void> {
    await Promise.all([
      this.warmPopularNFTs(),
      this.warmTrendingNFTs(),
      this.warmPlatformStats(),
    ]);
  }
}

/**
 * Cache Invalidation Strategy
 */
export class CacheInvalidator {
  private cache: QueryCache;

  constructor(cache: QueryCache) {
    this.cache = cache;
  }

  /**
   * Invalidate NFT-related cache
   */
  async invalidateNFT(tokenId: string): Promise<void> {
    await this.cache.invalidate(`token_id:${tokenId}`);
    await this.cache.invalidate('nfts');
  }

  /**
   * Invalidate user-related cache
   */
  async invalidateUser(address: string): Promise<void> {
    await this.cache.invalidate(`address:${address}`);
    await this.cache.invalidate('users');
  }

  /**
   * Invalidate marketplace cache
   */
  async invalidateMarketplace(): Promise<void> {
    await this.cache.invalidate('marketplace');
    await this.cache.invalidate('orderbook');
  }

  /**
   * Invalidate analytics cache
   */
  async invalidateAnalytics(): Promise<void> {
    await this.cache.invalidate('analytics');
    await this.cache.invalidate('stats');
  }
}

/**
 * Example Usage
 */
export async function exampleUsage() {
  // Initialize cache
  const cache = new QueryCache('redis://localhost:6379');
  const cachedQuery = new CachedQuery(cache);

  // Example 1: Cached NFT query
  const nfts = await cachedQuery.execute(
    'SELECT * FROM nfts WHERE category = $1 LIMIT 20',
    ['artwork'],
    async () => {
      // This would be your actual database query
      return []; // db.query(...)
    },
    { ttl: 300 } // Cache for 5 minutes
  );

  // Example 2: Invalidate cache on update
  await cachedQuery.execute(
    'UPDATE nfts SET price = $1 WHERE token_id = $2',
    [0.5, '123'],
    async () => {
      // db.query(...)
      return { success: true };
    },
    {
      skipCache: true,
      invalidatePattern: 'token_id:123',
    }
  );

  // Example 3: Cache warming
  const warmer = new CacheWarmer(cache, {} /* db connection */);
  await warmer.warmAll();

  // Example 4: Get cache stats
  const stats = await cache.getStats();
  console.log('Cache stats:', stats);
}
