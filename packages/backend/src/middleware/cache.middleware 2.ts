import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

/**
 * Cache middleware for Express
 * Implements server-side caching with Redis
 */

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string | ((req: Request) => string);
  condition?: (req: Request) => boolean;
  varyBy?: string[]; // Headers to vary cache by
}

// Default cache durations
export const CACHE_DURATIONS = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
  WEEK: 604800, // 7 days
};

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request, customKey?: string | ((req: Request) => string)): string {
  if (typeof customKey === 'function') {
    return customKey(req);
  }
  
  if (typeof customKey === 'string') {
    return customKey;
  }
  
  // Default: method + path + query
  const queryString = JSON.stringify(req.query);
  const baseKey = `${req.method}:${req.path}:${queryString}`;
  
  return createHash('md5').update(baseKey).digest('hex');
}

/**
 * Check if request should be cached
 */
function shouldCache(req: Request, condition?: (req: Request) => boolean): boolean {
  // Don't cache if condition returns false
  if (condition && !condition(req)) {
    return false;
  }
  
  // Only cache GET and HEAD requests
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return false;
  }
  
  // Don't cache if Authorization header present
  if (req.headers.authorization) {
    return false;
  }
  
  // Don't cache if Cache-Control: no-cache
  const cacheControl = req.headers['cache-control'];
  if (cacheControl && cacheControl.includes('no-cache')) {
    return false;
  }
  
  return true;
}

/**
 * Cache middleware factory
 */
export function cache(options: CacheOptions = {}) {
  const {
    ttl = CACHE_DURATIONS.MEDIUM,
    key: customKey,
    condition,
    varyBy = []
  } = options;
  
  return async (req: Request, res: Response, next: NextFunction) => {
    // Check if should cache
    if (!shouldCache(req, condition)) {
      return next();
    }
    
    try {
      // Generate cache key
      let cacheKey = generateCacheKey(req, customKey);
      
      // Add vary headers to key
      if (varyBy.length > 0) {
        const varyValues = varyBy.map(header => req.headers[header.toLowerCase()] || '').join(':');
        cacheKey = `${cacheKey}:${createHash('md5').update(varyValues).digest('hex')}`;
      }
      
      // Try to get from cache (Redis)
      const redis = (req as any).redis;
      if (redis) {
        const cached = await redis.get(cacheKey);
        
        if (cached) {
          const data = JSON.parse(cached);
          
          // Set cache headers
          res.set('X-Cache-Status', 'HIT');
          res.set('X-Cache-Key', cacheKey);
          res.set('Cache-Control', `public, max-age=${ttl}`);
          
          // Send cached response
          return res.status(data.status).json(data.body);
        }
      }
      
      // Cache miss - intercept response
      const originalJson = res.json.bind(res);
      
      res.json = function(body: any) {
        // Store in cache
        if (redis && res.statusCode === 200) {
          const cacheData = {
            status: res.statusCode,
            body: body,
            timestamp: Date.now()
          };
          
          redis.setex(cacheKey, ttl, JSON.stringify(cacheData)).catch((err: Error) => {
            console.error('Cache set error:', err);
          });
        }
        
        // Set cache headers
        res.set('X-Cache-Status', 'MISS');
        res.set('X-Cache-Key', cacheKey);
        res.set('Cache-Control', `public, max-age=${ttl}`);
        
        // Call original json method
        return originalJson(body);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

/**
 * Cache invalidation middleware
 */
export function invalidateCache(pattern: string | string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const redis = (req as any).redis;
    
    if (!redis) {
      return next();
    }
    
    try {
      const patterns = Array.isArray(pattern) ? pattern : [pattern];
      
      for (const p of patterns) {
        const keys = await redis.keys(p);
        if (keys.length > 0) {
          await redis.del(...keys);
          console.log(`Invalidated ${keys.length} cache entries for pattern: ${p}`);
        }
      }
      
      next();
    } catch (error) {
      console.error('Cache invalidation error:', error);
      next();
    }
  };
}

/**
 * Conditional cache middleware
 */
export const cacheIf = (condition: (req: Request) => boolean, options: CacheOptions = {}) => {
  return cache({ ...options, condition });
};

/**
 * Cache by user
 */
export const cacheByUser = (options: CacheOptions = {}) => {
  return cache({
    ...options,
    key: (req: Request) => {
      const userId = (req as any).user?.id || 'anonymous';
      const baseKey = generateCacheKey(req);
      return `user:${userId}:${baseKey}`;
    }
  });
};

/**
 * Cache with tags for easier invalidation
 */
export function cacheWithTags(tags: string[], options: CacheOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const redis = (req as any).redis;
    
    if (!redis) {
      return cache(options)(req, res, next);
    }
    
    // Generate cache key
    const cacheKey = generateCacheKey(req, options.key);
    
    // Store tag associations
    const tagPromises = tags.map(tag => 
      redis.sadd(`tag:${tag}`, cacheKey)
    );
    
    await Promise.all(tagPromises).catch(err => {
      console.error('Tag storage error:', err);
    });
    
    // Use regular cache middleware
    return cache({ ...options, key: cacheKey })(req, res, next);
  };
}

/**
 * Invalidate by tag
 */
export async function invalidateByTag(redis: any, tag: string) {
  try {
    const keys = await redis.smembers(`tag:${tag}`);
    
    if (keys.length > 0) {
      await redis.del(...keys);
      await redis.del(`tag:${tag}`);
      console.log(`Invalidated ${keys.length} cache entries for tag: ${tag}`);
    }
  } catch (error) {
    console.error('Tag invalidation error:', error);
  }
}

/**
 * Cache warming utility
 */
export async function warmCache(redis: any, key: string, data: any, ttl: number) {
  try {
    const cacheData = {
      status: 200,
      body: data,
      timestamp: Date.now()
    };
    
    await redis.setex(key, ttl, JSON.stringify(cacheData));
    console.log(`Cache warmed for key: ${key}`);
  } catch (error) {
    console.error('Cache warming error:', error);
  }
}

/**
 * Stale-while-revalidate pattern
 */
export function cacheWithSWR(options: CacheOptions & { staleTtl?: number } = {}) {
  const {
    ttl = CACHE_DURATIONS.MEDIUM,
    staleTtl = ttl * 2,
    key: customKey,
    condition
  } = options;
  
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!shouldCache(req, condition)) {
      return next();
    }
    
    const redis = (req as any).redis;
    if (!redis) {
      return next();
    }
    
    const cacheKey = generateCacheKey(req, customKey);
    
    try {
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        const age = Date.now() - data.timestamp;
        
        // If fresh, return immediately
        if (age < ttl * 1000) {
          res.set('X-Cache-Status', 'HIT');
          res.set('Age', Math.floor(age / 1000).toString());
          return res.status(data.status).json(data.body);
        }
        
        // If stale but within stale TTL, return stale and revalidate in background
        if (age < staleTtl * 1000) {
          res.set('X-Cache-Status', 'STALE');
          res.set('Age', Math.floor(age / 1000).toString());
          
          // Revalidate in background
          setImmediate(() => {
            // Trigger revalidation by making internal request
            console.log(`Revalidating cache for key: ${cacheKey}`);
          });
          
          return res.status(data.status).json(data.body);
        }
      }
      
      // Cache miss or expired - fetch fresh data
      const originalJson = res.json.bind(res);
      
      res.json = function(body: any) {
        if (res.statusCode === 200) {
          const cacheData = {
            status: res.statusCode,
            body: body,
            timestamp: Date.now()
          };
          
          redis.setex(cacheKey, staleTtl, JSON.stringify(cacheData)).catch((err: Error) => {
            console.error('Cache set error:', err);
          });
        }
        
        res.set('X-Cache-Status', 'MISS');
        res.set('Cache-Control', `public, max-age=${ttl}, stale-while-revalidate=${staleTtl - ttl}`);
        
        return originalJson(body);
      };
      
      next();
    } catch (error) {
      console.error('SWR cache error:', error);
      next();
    }
  };
}
