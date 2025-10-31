#!/usr/bin/env node

/**
 * Cache warming script
 * Pre-populates cache with frequently accessed data
 */

import axios from 'axios';
import { warmCache } from '../middleware/cache.middleware';
import Redis from 'ioredis';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

interface WarmupConfig {
  url: string;
  cacheKey: string;
  ttl: number;
}

const WARMUP_ENDPOINTS: WarmupConfig[] = [
  {
    url: '/api/v1/nft/trending',
    cacheKey: 'GET:/api/v1/nft/trending',
    ttl: 300
  },
  {
    url: '/api/v1/nft/list?limit=20',
    cacheKey: 'GET:/api/v1/nft/list?limit=20',
    ttl: 300
  },
  {
    url: '/api/v1/marketplace/stats',
    cacheKey: 'GET:/api/v1/marketplace/stats',
    ttl: 120
  },
  {
    url: '/api/v1/analytics/dashboard',
    cacheKey: 'GET:/api/v1/analytics/dashboard',
    ttl: 300
  }
];

async function warmupCache() {
  console.log('🔥 Starting cache warmup...');
  console.log(`Base URL: ${BASE_URL}`);
  
  const redis = new Redis(REDIS_URL);
  
  try {
    await redis.ping();
    console.log('✅ Redis connected');
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    process.exit(1);
  }
  
  let successCount = 0;
  let failCount = 0;
  
  for (const config of WARMUP_ENDPOINTS) {
    try {
      console.log(`\nWarming up: ${config.url}`);
      
      const response = await axios.get(`${BASE_URL}${config.url}`, {
        timeout: 10000
      });
      
      if (response.status === 200) {
        await warmCache(redis, config.cacheKey, response.data, config.ttl);
        console.log(`✅ Cached: ${config.cacheKey} (TTL: ${config.ttl}s)`);
        successCount++;
      } else {
        console.log(`⚠️  Non-200 response: ${response.status}`);
        failCount++;
      }
    } catch (error: any) {
      console.error(`❌ Failed to warm ${config.url}:`, error.message);
      failCount++;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Cache Warmup Complete!');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('='.repeat(50));
  
  await redis.quit();
  process.exit(failCount > 0 ? 1 : 0);
}

// Run warmup
warmupCache().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
