import Redis from 'ioredis';
import { createHash } from 'crypto';
import { logger } from '../utils/logger';

/**
 * Query Cache Service
 * Implements Redis-based caching to reduce database load
 */

export class QueryCacheService {
  private redis: Redis;
  private defaultTTL: number = 300; // 5 minutes
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.REDIS_ENABLED === 'true';
    
    if (this.enabled) {
      this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      this.redis.on('connect', () => {
        logger.info('Query cache connected to Redis');
      });

      this.redis.on('error', (error) => {
        logger.error('Redis connection error:', error);
      });
    } else {
      logger.info('Query cache disabled (Redis not enabled)');
    }
  }

  /**
   * Generate cache key from query identifier and parameters
   */
  private generateKey(identifier: string, params: any[]): string {
    const hash = createHash('sha256');
    hash.update(identifier);
    hash.update(JSON.stringify(params));
    return `query:${hash.digest('hex')}`;
  }

  /**
   * Get cached query result
   */
  async get<T>(identifier: string, params: any[] = []): Promise<T | null> {
    if (!this.enabled) return null;

    try {
      const key = this.generateKey(identifier, params);
      const cached = await this.redis.get(key);
      
      if (cached) {
        logger.debug(`Cache hit: ${identifier}`);
        return JSON.parse(cached) as T;
      }
      
      logger.debug(`Cache miss: ${identifier}`);
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set query result in cache
   */
  async set(identifier: string, params: any[], result: any, ttl?: number): Promise<void> {
    if (!this.enabled) return;

    try {
      const key = this.generateKey(identifier, params);
      const value = JSON.stringify(result);
      
      await this.redis.setex(key, ttl || this.defaultTTL, value);
      logger.debug(`Cache set: ${identifier} (TTL: ${ttl || this.defaultTTL}s)`);
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern: string): Promise<void> {
    if (!this.enabled) return;

    try {
      const keys = await this.redis.keys(`query:*${pattern}*`);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info(`Invalidated ${keys.length} cache entries matching: ${pattern}`);
      }
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
  }

  /**
   * Clear all query cache
   */
  async clear(): Promise<void> {
    if (!this.enabled) return;

    try {
      const keys = await this.redis.keys('query:*');
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info(`Cleared ${keys.length} cache entries`);
      }
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    enabled: boolean;
    keys: number;
    memory: string;
    hits: number;
    misses: number;
    hitRate: number;
  }> {
    if (!this.enabled) {
      return {
        enabled: false,
        keys: 0,
        memory: '0',
        hits: 0,
        misses: 0,
        hitRate: 0,
      };
    }

    try {
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
      
      const hits = parseInt(stats.keyspace_hits || '0');
      const misses = parseInt(stats.keyspace_misses || '0');
      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;

      return {
        enabled: true,
        keys,
        memory: stats.used_memory_human || '0',
        hits,
        misses,
        hitRate: Math.round(hitRate * 100) / 100,
      };
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return {
        enabled: true,
        keys: 0,
        memory: '0',
        hits: 0,
        misses: 0,
        hitRate: 0,
      };
    }
  }

  /**
   * Execute query with caching
   */
  async execute<T>(
    identifier: string,
    params: any[],
    executor: () => Promise<T>,
    options: {
      ttl?: number;
      skipCache?: boolean;
      invalidatePattern?: string;
    } = {}
  ): Promise<T> {
    // Skip cache if requested or disabled
    if (options.skipCache || !this.enabled) {
      const result = await executor();
      
      // Invalidate related cache entries
      if (options.invalidatePattern) {
        await this.invalidate(options.invalidatePattern);
      }
      
      return result;
    }

    // Try to get from cache
    const cached = await this.get<T>(identifier, params);
    if (cached !== null) {
      return cached;
    }

    // Execute query
    const result = await executor();

    // Store in cache
    await this.set(identifier, params, result, options.ttl);

    return result;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.enabled) {
      await this.redis.quit();
      logger.info('Query cache disconnected from Redis');
    }
  }
}

// Singleton instance
export const queryCacheService = new QueryCacheService();
