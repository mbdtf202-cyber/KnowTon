import { EventEmitter } from 'events';
import Redis from 'ioredis';

/**
 * Cache monitoring service
 * Tracks cache performance and health
 */

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
  avgResponseTime: number;
}

interface CacheHealth {
  redis: {
    connected: boolean;
    memory: number;
    keys: number;
    uptime: number;
  };
  metrics: CacheMetrics;
  timestamp: number;
}

export class CacheMonitorService extends EventEmitter {
  private redis: Redis;
  private metrics: CacheMetrics;
  private responseTimes: number[];
  private maxResponseTimes: number = 1000;

  constructor(redis: Redis) {
    super();
    this.redis = redis;
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
      avgResponseTime: 0
    };
    this.responseTimes = [];
  }

  /**
   * Record cache hit
   */
  recordHit(responseTime?: number): void {
    this.metrics.hits++;
    this.updateHitRate();
    
    if (responseTime !== undefined) {
      this.recordResponseTime(responseTime);
    }
    
    this.emit('hit', { hits: this.metrics.hits, hitRate: this.metrics.hitRate });
  }

  /**
   * Record cache miss
   */
  recordMiss(responseTime?: number): void {
    this.metrics.misses++;
    this.updateHitRate();
    
    if (responseTime !== undefined) {
      this.recordResponseTime(responseTime);
    }
    
    this.emit('miss', { misses: this.metrics.misses, hitRate: this.metrics.hitRate });
  }

  /**
   * Record cache set
   */
  recordSet(): void {
    this.metrics.sets++;
    this.emit('set', { sets: this.metrics.sets });
  }

  /**
   * Record cache delete
   */
  recordDelete(): void {
    this.metrics.deletes++;
    this.emit('delete', { deletes: this.metrics.deletes });
  }

  /**
   * Record error
   */
  recordError(error: Error): void {
    this.metrics.errors++;
    this.emit('error', { errors: this.metrics.errors, error });
  }

  /**
   * Record response time
   */
  private recordResponseTime(time: number): void {
    this.responseTimes.push(time);
    
    // Keep only last N response times
    if (this.responseTimes.length > this.maxResponseTimes) {
      this.responseTimes.shift();
    }
    
    // Update average
    this.metrics.avgResponseTime = 
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  /**
   * Get current metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache health
   */
  async getHealth(): Promise<CacheHealth> {
    try {
      const info = await this.redis.info('memory');
      const dbsize = await this.redis.dbsize();
      const serverInfo = await this.redis.info('server');
      
      // Parse memory usage
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memory = memoryMatch ? parseInt(memoryMatch[1]) : 0;
      
      // Parse uptime
      const uptimeMatch = serverInfo.match(/uptime_in_seconds:(\d+)/);
      const uptime = uptimeMatch ? parseInt(uptimeMatch[1]) : 0;
      
      return {
        redis: {
          connected: this.redis.status === 'ready',
          memory,
          keys: dbsize,
          uptime
        },
        metrics: this.getMetrics(),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to get cache health:', error);
      throw error;
    }
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
      avgResponseTime: 0
    };
    this.responseTimes = [];
    this.emit('reset');
  }

  /**
   * Get top keys by access count
   */
  async getTopKeys(limit: number = 10): Promise<Array<{ key: string; ttl: number }>> {
    try {
      const keys = await this.redis.keys('*');
      const keyData = await Promise.all(
        keys.slice(0, limit).map(async (key) => ({
          key,
          ttl: await this.redis.ttl(key)
        }))
      );
      
      return keyData.sort((a, b) => b.ttl - a.ttl);
    } catch (error) {
      console.error('Failed to get top keys:', error);
      return [];
    }
  }

  /**
   * Get cache size by pattern
   */
  async getSizeByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      return keys.length;
    } catch (error) {
      console.error('Failed to get size by pattern:', error);
      return 0;
    }
  }

  /**
   * Get memory usage by pattern
   */
  async getMemoryByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      let totalMemory = 0;
      
      for (const key of keys) {
        const memory = await this.redis.memory('USAGE', key);
        totalMemory += memory || 0;
      }
      
      return totalMemory;
    } catch (error) {
      console.error('Failed to get memory by pattern:', error);
      return 0;
    }
  }

  /**
   * Export metrics for Prometheus
   */
  exportPrometheusMetrics(): string {
    const metrics = this.getMetrics();
    
    return `
# HELP cache_hits_total Total number of cache hits
# TYPE cache_hits_total counter
cache_hits_total ${metrics.hits}

# HELP cache_misses_total Total number of cache misses
# TYPE cache_misses_total counter
cache_misses_total ${metrics.misses}

# HELP cache_sets_total Total number of cache sets
# TYPE cache_sets_total counter
cache_sets_total ${metrics.sets}

# HELP cache_deletes_total Total number of cache deletes
# TYPE cache_deletes_total counter
cache_deletes_total ${metrics.deletes}

# HELP cache_errors_total Total number of cache errors
# TYPE cache_errors_total counter
cache_errors_total ${metrics.errors}

# HELP cache_hit_rate Cache hit rate percentage
# TYPE cache_hit_rate gauge
cache_hit_rate ${metrics.hitRate}

# HELP cache_avg_response_time_ms Average cache response time in milliseconds
# TYPE cache_avg_response_time_ms gauge
cache_avg_response_time_ms ${metrics.avgResponseTime}
`.trim();
  }

  /**
   * Start monitoring
   */
  startMonitoring(interval: number = 60000): NodeJS.Timeout {
    return setInterval(async () => {
      try {
        const health = await this.getHealth();
        this.emit('health', health);
        
        // Log metrics
        console.log('Cache Metrics:', {
          hitRate: `${health.metrics.hitRate.toFixed(2)}%`,
          hits: health.metrics.hits,
          misses: health.metrics.misses,
          avgResponseTime: `${health.metrics.avgResponseTime.toFixed(2)}ms`,
          redisKeys: health.redis.keys,
          redisMemory: `${(health.redis.memory / 1024 / 1024).toFixed(2)}MB`
        });
        
        // Alert on low hit rate
        if (health.metrics.hitRate < 70 && (health.metrics.hits + health.metrics.misses) > 100) {
          this.emit('alert', {
            type: 'low_hit_rate',
            message: `Cache hit rate is low: ${health.metrics.hitRate.toFixed(2)}%`,
            severity: 'warning'
          });
        }
        
        // Alert on high error rate
        const errorRate = health.metrics.errors / (health.metrics.hits + health.metrics.misses + health.metrics.errors);
        if (errorRate > 0.05) {
          this.emit('alert', {
            type: 'high_error_rate',
            message: `Cache error rate is high: ${(errorRate * 100).toFixed(2)}%`,
            severity: 'error'
          });
        }
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, interval);
  }
}

// Singleton instance
let cacheMonitor: CacheMonitorService | null = null;

export function initCacheMonitor(redis: Redis): CacheMonitorService {
  cacheMonitor = new CacheMonitorService(redis);
  return cacheMonitor;
}

export function getCacheMonitor(): CacheMonitorService {
  if (!cacheMonitor) {
    throw new Error('Cache monitor not initialized');
  }
  return cacheMonitor;
}
