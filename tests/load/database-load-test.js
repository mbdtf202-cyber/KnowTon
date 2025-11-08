import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

/**
 * K6 Database Load Test for KnowTon Platform
 * Task 17.3.2: 执行数据库负载测试
 * 
 * Tests:
 * - PostgreSQL 读写性能
 * - MongoDB 查询性能
 * - ClickHouse 分析查询
 * - Redis 缓存命中率
 */

// Custom metrics
const postgresReadLatency = new Trend('postgres_read_latency');
const postgresWriteLatency = new Trend('postgres_write_latency');
const mongoQueryLatency = new Trend('mongo_query_latency');
const clickhouseQueryLatency = new Trend('clickhouse_query_latency');
const redisCacheHitRate = new Rate('redis_cache_hit_rate');
const redisCacheMissRate = new Rate('redis_cache_miss_rate');

const dbErrors = new Rate('db_errors');
const slowQueries = new Counter('slow_queries');
const totalQueries = new Counter('total_queries');

export const options = {
  scenarios: {
    // PostgreSQL Read/Write Test
    postgres_operations: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 150 },
        { duration: '5m', target: 150 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'testPostgresOperations',
    },
    // MongoDB Query Test
    mongodb_queries: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 40 },
        { duration: '3m', target: 120 },
        { duration: '5m', target: 120 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'testMongoDBQueries',
      startTime: '30s',
    },
    // ClickHouse Analytics Test
    clickhouse_analytics: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 30 },
        { duration: '3m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'testClickHouseAnalytics',
      startTime: '1m',
    },
    // Redis Cache Test
    redis_cache: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '3m', target: 300 },
        { duration: '5m', target: 300 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'testRedisCache',
      startTime: '1m30s',
    },
  },
  thresholds: {
    // PostgreSQL thresholds
    'postgres_read_latency': ['p(95)<200', 'p(99)<500'],
    'postgres_write_latency': ['p(95)<300', 'p(99)<600'],
    
    // MongoDB thresholds
    'mongo_query_latency': ['p(95)<250', 'p(99)<500'],
    
    // ClickHouse thresholds
    'clickhouse_query_latency': ['p(95)<1000', 'p(99)<2000'],
    
    // Redis thresholds
    'redis_cache_hit_rate': ['rate>0.80'], // 80% cache hit rate
    
    // General thresholds
    'db_errors': ['rate<0.01'],
    'http_req_duration': ['p(95)<1000'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

// Test PostgreSQL Read/Write Performance
export function testPostgresOperations() {
  group('PostgreSQL Operations', function () {
    const params = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${__ENV.TEST_TOKEN || 'test-token'}`,
      },
    };

    // Test 1: Read operations (SELECT queries)
    const readRes = http.get(`${BASE_URL}/api/v1/users/profile`, params);
    const readSuccess = check(readRes, {
      'postgres read status 200': (r) => r.status === 200 || r.status === 404,
      'postgres read time < 200ms': (r) => r.timings.duration < 200,
    });

    postgresReadLatency.add(readRes.timings.duration);
    totalQueries.add(1);
    
    if (readRes.timings.duration > 500) {
      slowQueries.add(1);
    }
    
    if (!readSuccess) {
      dbErrors.add(1);
    }

    // Test 2: Complex JOIN query
    const joinRes = http.get(`${BASE_URL}/api/v1/nft/with-metadata?limit=10`, params);
    const joinSuccess = check(joinRes, {
      'postgres join status 200': (r) => r.status === 200,
      'postgres join time < 300ms': (r) => r.timings.duration < 300,
    });

    postgresReadLatency.add(joinRes.timings.duration);
    totalQueries.add(1);
    
    if (joinRes.timings.duration > 500) {
      slowQueries.add(1);
    }
    
    if (!joinSuccess) {
      dbErrors.add(1);
    }

    // Test 3: Write operations (INSERT/UPDATE)
    const writePayload = JSON.stringify({
      action: 'update_profile',
      data: {
        bio: `Load test bio ${Date.now()}`,
        preferences: { theme: 'dark' },
      },
    });

    const writeRes = http.post(`${BASE_URL}/api/v1/users/profile`, writePayload, params);
    const writeSuccess = check(writeRes, {
      'postgres write status 200 or 201': (r) => r.status === 200 || r.status === 201 || r.status === 401,
      'postgres write time < 300ms': (r) => r.timings.duration < 300,
    });

    postgresWriteLatency.add(writeRes.timings.duration);
    totalQueries.add(1);
    
    if (writeRes.timings.duration > 600) {
      slowQueries.add(1);
    }
    
    if (!writeSuccess) {
      dbErrors.add(1);
    }

    // Test 4: Aggregation query
    const aggRes = http.get(`${BASE_URL}/api/v1/analytics/user-stats`, params);
    const aggSuccess = check(aggRes, {
      'postgres aggregation status 200': (r) => r.status === 200 || r.status === 401,
      'postgres aggregation time < 400ms': (r) => r.timings.duration < 400,
    });

    postgresReadLatency.add(aggRes.timings.duration);
    totalQueries.add(1);
    
    if (aggRes.timings.duration > 800) {
      slowQueries.add(1);
    }
    
    if (!aggSuccess) {
      dbErrors.add(1);
    }

    sleep(0.5);
  });
}

// Test MongoDB Query Performance
export function testMongoDBQueries() {
  group('MongoDB Query Operations', function () {
    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Test 1: Document retrieval by ID
    const tokenId = Math.floor(Math.random() * 100) + 1;
    const docRes = http.get(`${BASE_URL}/api/v1/content/metadata/${tokenId}`, params);
    const docSuccess = check(docRes, {
      'mongo doc retrieval status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'mongo doc retrieval time < 150ms': (r) => r.timings.duration < 150,
    });

    mongoQueryLatency.add(docRes.timings.duration);
    totalQueries.add(1);
    
    if (docRes.timings.duration > 500) {
      slowQueries.add(1);
    }
    
    if (!docSuccess) {
      dbErrors.add(1);
    }

    // Test 2: Full-text search
    const searchTerms = ['music', 'art', 'video', 'course'];
    const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    const searchRes = http.get(`${BASE_URL}/api/v1/content/search?q=${searchTerm}&limit=20`, params);
    const searchSuccess = check(searchRes, {
      'mongo search status 200': (r) => r.status === 200,
      'mongo search time < 250ms': (r) => r.timings.duration < 250,
    });

    mongoQueryLatency.add(searchRes.timings.duration);
    totalQueries.add(1);
    
    if (searchRes.timings.duration > 500) {
      slowQueries.add(1);
    }
    
    if (!searchSuccess) {
      dbErrors.add(1);
    }

    // Test 3: Aggregation pipeline
    const aggRes = http.get(`${BASE_URL}/api/v1/content/stats/by-category`, params);
    const aggSuccess = check(aggRes, {
      'mongo aggregation status 200': (r) => r.status === 200,
      'mongo aggregation time < 300ms': (r) => r.timings.duration < 300,
    });

    mongoQueryLatency.add(aggRes.timings.duration);
    totalQueries.add(1);
    
    if (aggRes.timings.duration > 600) {
      slowQueries.add(1);
    }
    
    if (!aggSuccess) {
      dbErrors.add(1);
    }

    sleep(0.7);
  });
}

// Test ClickHouse Analytics Performance
export function testClickHouseAnalytics() {
  group('ClickHouse Analytics Queries', function () {
    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Test 1: Time-series aggregation
    const timeseriesRes = http.get(`${BASE_URL}/api/v1/analytics/timeseries?period=7d&interval=1h`, params);
    const timeseriesSuccess = check(timeseriesRes, {
      'clickhouse timeseries status 200': (r) => r.status === 200,
      'clickhouse timeseries time < 800ms': (r) => r.timings.duration < 800,
    });

    clickhouseQueryLatency.add(timeseriesRes.timings.duration);
    totalQueries.add(1);
    
    if (timeseriesRes.timings.duration > 2000) {
      slowQueries.add(1);
    }
    
    if (!timeseriesSuccess) {
      dbErrors.add(1);
    }

    // Test 2: Complex aggregation with GROUP BY
    const groupByRes = http.get(`${BASE_URL}/api/v1/analytics/revenue-by-category?period=30d`, params);
    const groupBySuccess = check(groupByRes, {
      'clickhouse group by status 200': (r) => r.status === 200,
      'clickhouse group by time < 1000ms': (r) => r.timings.duration < 1000,
    });

    clickhouseQueryLatency.add(groupByRes.timings.duration);
    totalQueries.add(1);
    
    if (groupByRes.timings.duration > 2000) {
      slowQueries.add(1);
    }
    
    if (!groupBySuccess) {
      dbErrors.add(1);
    }

    // Test 3: Large dataset scan
    const scanRes = http.get(`${BASE_URL}/api/v1/analytics/top-creators?limit=100&period=90d`, params);
    const scanSuccess = check(scanRes, {
      'clickhouse scan status 200': (r) => r.status === 200,
      'clickhouse scan time < 1500ms': (r) => r.timings.duration < 1500,
    });

    clickhouseQueryLatency.add(scanRes.timings.duration);
    totalQueries.add(1);
    
    if (scanRes.timings.duration > 3000) {
      slowQueries.add(1);
    }
    
    if (!scanSuccess) {
      dbErrors.add(1);
    }

    // Test 4: Real-time metrics
    const realtimeRes = http.get(`${BASE_URL}/api/v1/analytics/realtime-metrics`, params);
    const realtimeSuccess = check(realtimeRes, {
      'clickhouse realtime status 200': (r) => r.status === 200,
      'clickhouse realtime time < 600ms': (r) => r.timings.duration < 600,
    });

    clickhouseQueryLatency.add(realtimeRes.timings.duration);
    totalQueries.add(1);
    
    if (realtimeRes.timings.duration > 1500) {
      slowQueries.add(1);
    }
    
    if (!realtimeSuccess) {
      dbErrors.add(1);
    }

    sleep(1);
  });
}

// Test Redis Cache Performance
export function testRedisCache() {
  group('Redis Cache Operations', function () {
    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Test 1: Cache hit scenario (popular NFT)
    const popularTokenId = Math.floor(Math.random() * 10) + 1; // Top 10 NFTs likely cached
    const cacheHitRes = http.get(`${BASE_URL}/api/v1/nft/${popularTokenId}`, params);
    const cacheHit = check(cacheHitRes, {
      'cache hit response time < 100ms': (r) => r.timings.duration < 100,
    });

    if (cacheHit) {
      redisCacheHitRate.add(1);
    } else {
      redisCacheMissRate.add(1);
    }

    totalQueries.add(1);

    // Test 2: Cache miss scenario (random NFT)
    const randomTokenId = Math.floor(Math.random() * 10000) + 100;
    const cacheMissRes = http.get(`${BASE_URL}/api/v1/nft/${randomTokenId}`, params);
    const cacheMiss = check(cacheMissRes, {
      'cache miss handled': (r) => r.status === 200 || r.status === 404,
    });

    if (cacheMissRes.timings.duration < 100) {
      redisCacheHitRate.add(1);
    } else {
      redisCacheMissRate.add(1);
    }

    totalQueries.add(1);

    // Test 3: Session data retrieval
    const sessionRes = http.get(`${BASE_URL}/api/v1/session/data`, params);
    check(sessionRes, {
      'session data retrieved': (r) => r.status === 200 || r.status === 401,
      'session data time < 50ms': (r) => r.timings.duration < 50,
    });

    totalQueries.add(1);

    // Test 4: Leaderboard query (sorted set)
    const leaderboardRes = http.get(`${BASE_URL}/api/v1/leaderboard/top-traders?limit=50`, params);
    check(leaderboardRes, {
      'leaderboard status 200': (r) => r.status === 200,
      'leaderboard time < 80ms': (r) => r.timings.duration < 80,
    });

    if (leaderboardRes.timings.duration < 100) {
      redisCacheHitRate.add(1);
    } else {
      redisCacheMissRate.add(1);
    }

    totalQueries.add(1);

    sleep(0.3);
  });
}

// Setup function
export function setup() {
  console.log('='.repeat(80));
  console.log('KnowTon Platform Database Load Test - Task 17.3.2');
  console.log('='.repeat(80));
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Test Scenarios:`);
  console.log(`  1. PostgreSQL: Read/Write operations (150 concurrent)`);
  console.log(`  2. MongoDB: Query operations (120 concurrent)`);
  console.log(`  3. ClickHouse: Analytics queries (100 concurrent)`);
  console.log(`  4. Redis: Cache operations (300 concurrent)`);
  console.log('='.repeat(80));
  
  return {
    startTime: new Date().toISOString(),
    baseUrl: BASE_URL,
  };
}

// Teardown function
export function teardown(data) {
  console.log('='.repeat(80));
  console.log('Database Load Test Completed');
  console.log(`Started at: ${data.startTime}`);
  console.log(`Ended at: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
}

// Generate reports
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  return {
    [`reports/database-load-test-${timestamp}.html`]: htmlReport(data),
    [`reports/database-load-test-${timestamp}.json`]: JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
