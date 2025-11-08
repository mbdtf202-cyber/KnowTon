import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

/**
 * K6 Comprehensive API Load Test for KnowTon Platform
 * Task 17.3.1: 执行 API 负载测试
 * 
 * Tests:
 * - NFT 铸造 API (100 并发)
 * - 市场查询 API (500 并发)
 * - 交易 API (200 并发)
 * - 分析 API (300 并发)
 */

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const requestCount = new Counter('request_count');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Endpoint-specific metrics
const nftMintLatency = new Trend('nft_mint_latency');
const marketplaceLatency = new Trend('marketplace_latency');
const tradingLatency = new Trend('trading_latency');
const analyticsLatency = new Trend('analytics_latency');

const nftMintErrors = new Rate('nft_mint_errors');
const marketplaceErrors = new Rate('marketplace_errors');
const tradingErrors = new Rate('trading_errors');
const analyticsErrors = new Rate('analytics_errors');

const throughput = new Gauge('throughput_rps');

// Test configuration with multiple scenarios
export const options = {
  scenarios: {
    // Scenario 1: NFT Minting API (100 concurrent users)
    nft_minting: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'testNFTMinting',
    },
    // Scenario 2: Marketplace Query API (500 concurrent users)
    marketplace_queries: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '3m', target: 500 },
        { duration: '5m', target: 500 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'testMarketplaceQueries',
      startTime: '30s',
    },
    // Scenario 3: Trading API (200 concurrent users)
    trading_operations: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'testTradingOperations',
      startTime: '1m',
    },
    // Scenario 4: Analytics API (300 concurrent users)
    analytics_queries: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 75 },
        { duration: '3m', target: 300 },
        { duration: '5m', target: 300 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'testAnalyticsQueries',
      startTime: '1m30s',
    },
  },
  thresholds: {
    // Global thresholds
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
    
    // NFT Minting thresholds
    'nft_mint_latency': ['p(95)<800', 'p(99)<1500'],
    'nft_mint_errors': ['rate<0.05'],
    
    // Marketplace thresholds
    'marketplace_latency': ['p(95)<500', 'p(99)<1000'],
    'marketplace_errors': ['rate<0.03'],
    
    // Trading thresholds
    'trading_latency': ['p(95)<600', 'p(99)<1200'],
    'trading_errors': ['rate<0.05'],
    
    // Analytics thresholds
    'analytics_latency': ['p(95)<1000', 'p(99)<2000'],
    'analytics_errors': ['rate<0.05'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

// Test data
const testWallet = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
const testTokenIds = Array.from({ length: 100 }, (_, i) => i + 1);

// Scenario 1: NFT Minting API Test (100 concurrent)
export function testNFTMinting() {
  group('NFT Minting Operations', function () {
    const params = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${__ENV.TEST_TOKEN || 'test-token'}`,
      },
    };

    // Test 1: Prepare NFT metadata
    const metadataRes = http.get(`${BASE_URL}/api/v1/nft/metadata/template`, params);
    check(metadataRes, {
      'metadata template status 200': (r) => r.status === 200,
    });

    // Test 2: Upload content (simulated)
    const uploadPayload = JSON.stringify({
      contentHash: `QmTest${Date.now()}${Math.random()}`,
      category: 'music',
      title: `Test NFT ${Date.now()}`,
      description: 'Load test NFT',
    });

    const uploadRes = http.post(`${BASE_URL}/api/v1/content/upload`, uploadPayload, params);
    const uploadSuccess = check(uploadRes, {
      'upload status 200 or 201': (r) => r.status === 200 || r.status === 201,
      'upload response time < 800ms': (r) => r.timings.duration < 800,
    });

    nftMintLatency.add(uploadRes.timings.duration);
    nftMintErrors.add(!uploadSuccess);
    errorRate.add(!uploadSuccess);
    requestCount.add(1);
    
    if (uploadSuccess) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
    }

    sleep(1);
  });
}

// Scenario 2: Marketplace Query API Test (500 concurrent)
export function testMarketplaceQueries() {
  group('Marketplace Query Operations', function () {
    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Test 1: List NFTs with pagination
    const page = Math.floor(Math.random() * 10) + 1;
    const listRes = http.get(`${BASE_URL}/api/v1/marketplace/nfts?page=${page}&limit=20`, params);
    const listSuccess = check(listRes, {
      'list NFTs status 200': (r) => r.status === 200,
      'list NFTs response time < 500ms': (r) => r.timings.duration < 500,
      'list NFTs returns data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.nfts !== undefined;
        } catch {
          return false;
        }
      },
    });

    marketplaceLatency.add(listRes.timings.duration);
    marketplaceErrors.add(!listSuccess);
    errorRate.add(!listSuccess);
    requestCount.add(1);
    
    if (listSuccess) successfulRequests.add(1);
    else failedRequests.add(1);

    // Test 2: Get NFT details
    const tokenId = testTokenIds[Math.floor(Math.random() * testTokenIds.length)];
    const detailsRes = http.get(`${BASE_URL}/api/v1/nft/${tokenId}`, params);
    const detailsSuccess = check(detailsRes, {
      'NFT details status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'NFT details response time < 300ms': (r) => r.timings.duration < 300,
    });

    marketplaceLatency.add(detailsRes.timings.duration);
    marketplaceErrors.add(!detailsSuccess);
    requestCount.add(1);
    
    if (detailsSuccess) successfulRequests.add(1);
    else failedRequests.add(1);

    // Test 3: Search NFTs
    const searchTerms = ['music', 'art', 'video', 'course', 'ebook'];
    const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    const searchRes = http.get(`${BASE_URL}/api/v1/marketplace/search?q=${searchTerm}`, params);
    const searchSuccess = check(searchRes, {
      'search status 200': (r) => r.status === 200,
      'search response time < 600ms': (r) => r.timings.duration < 600,
    });

    marketplaceLatency.add(searchRes.timings.duration);
    marketplaceErrors.add(!searchSuccess);
    requestCount.add(1);
    
    if (searchSuccess) successfulRequests.add(1);
    else failedRequests.add(1);

    sleep(0.5);
  });
}

// Scenario 3: Trading API Test (200 concurrent)
export function testTradingOperations() {
  group('Trading Operations', function () {
    const params = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${__ENV.TEST_TOKEN || 'test-token'}`,
      },
    };

    // Test 1: Get order book
    const tokenId = testTokenIds[Math.floor(Math.random() * testTokenIds.length)];
    const orderbookRes = http.get(`${BASE_URL}/api/v1/marketplace/orderbook/${tokenId}`, params);
    const orderbookSuccess = check(orderbookRes, {
      'orderbook status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'orderbook response time < 400ms': (r) => r.timings.duration < 400,
    });

    tradingLatency.add(orderbookRes.timings.duration);
    tradingErrors.add(!orderbookSuccess);
    requestCount.add(1);
    
    if (orderbookSuccess) successfulRequests.add(1);
    else failedRequests.add(1);

    // Test 2: Get trading history
    const historyRes = http.get(`${BASE_URL}/api/v1/marketplace/trades/${tokenId}?limit=50`, params);
    const historySuccess = check(historyRes, {
      'trading history status 200': (r) => r.status === 200 || r.status === 404,
      'trading history response time < 500ms': (r) => r.timings.duration < 500,
    });

    tradingLatency.add(historyRes.timings.duration);
    tradingErrors.add(!historySuccess);
    requestCount.add(1);
    
    if (historySuccess) successfulRequests.add(1);
    else failedRequests.add(1);

    // Test 3: Get price data
    const priceRes = http.get(`${BASE_URL}/api/v1/marketplace/price/${tokenId}`, params);
    const priceSuccess = check(priceRes, {
      'price data status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'price data response time < 300ms': (r) => r.timings.duration < 300,
    });

    tradingLatency.add(priceRes.timings.duration);
    tradingErrors.add(!priceSuccess);
    requestCount.add(1);
    
    if (priceSuccess) successfulRequests.add(1);
    else failedRequests.add(1);

    sleep(0.8);
  });
}

// Scenario 4: Analytics API Test (300 concurrent)
export function testAnalyticsQueries() {
  group('Analytics Query Operations', function () {
    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Test 1: Get platform statistics
    const statsRes = http.get(`${BASE_URL}/api/v1/analytics/stats`, params);
    const statsSuccess = check(statsRes, {
      'stats status 200': (r) => r.status === 200,
      'stats response time < 1000ms': (r) => r.timings.duration < 1000,
      'stats returns data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.totalNFTs !== undefined;
        } catch {
          return false;
        }
      },
    });

    analyticsLatency.add(statsRes.timings.duration);
    analyticsErrors.add(!statsSuccess);
    requestCount.add(1);
    
    if (statsSuccess) successfulRequests.add(1);
    else failedRequests.add(1);

    // Test 2: Get trending NFTs
    const trendingRes = http.get(`${BASE_URL}/api/v1/analytics/trending?period=24h&limit=20`, params);
    const trendingSuccess = check(trendingRes, {
      'trending status 200': (r) => r.status === 200,
      'trending response time < 800ms': (r) => r.timings.duration < 800,
    });

    analyticsLatency.add(trendingRes.timings.duration);
    analyticsErrors.add(!trendingSuccess);
    requestCount.add(1);
    
    if (trendingSuccess) successfulRequests.add(1);
    else failedRequests.add(1);

    // Test 3: Get user analytics
    const userAnalyticsRes = http.get(`${BASE_URL}/api/v1/analytics/user/${testWallet}`, params);
    const userAnalyticsSuccess = check(userAnalyticsRes, {
      'user analytics status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'user analytics response time < 700ms': (r) => r.timings.duration < 700,
    });

    analyticsLatency.add(userAnalyticsRes.timings.duration);
    analyticsErrors.add(!userAnalyticsSuccess);
    requestCount.add(1);
    
    if (userAnalyticsSuccess) successfulRequests.add(1);
    else failedRequests.add(1);

    // Test 4: Get market overview
    const marketRes = http.get(`${BASE_URL}/api/v1/analytics/market-overview`, params);
    const marketSuccess = check(marketRes, {
      'market overview status 200': (r) => r.status === 200,
      'market overview response time < 1200ms': (r) => r.timings.duration < 1200,
    });

    analyticsLatency.add(marketRes.timings.duration);
    analyticsErrors.add(!marketSuccess);
    requestCount.add(1);
    
    if (marketSuccess) successfulRequests.add(1);
    else failedRequests.add(1);

    sleep(1);
  });
}

// Setup function - runs once before test
export function setup() {
  console.log('='.repeat(80));
  console.log('KnowTon Platform API Load Test - Task 17.3.1');
  console.log('='.repeat(80));
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Test Scenarios:`);
  console.log(`  1. NFT Minting API: 100 concurrent users`);
  console.log(`  2. Marketplace Query API: 500 concurrent users`);
  console.log(`  3. Trading API: 200 concurrent users`);
  console.log(`  4. Analytics API: 300 concurrent users`);
  console.log('='.repeat(80));
  
  // Warm-up request
  const warmupRes = http.get(`${BASE_URL}/api/v1/health`);
  if (warmupRes.status !== 200) {
    console.warn(`Warning: Health check failed with status ${warmupRes.status}`);
  }
  
  return {
    startTime: new Date().toISOString(),
    baseUrl: BASE_URL,
  };
}

// Teardown function - runs once after test
export function teardown(data) {
  console.log('='.repeat(80));
  console.log('Load Test Completed');
  console.log(`Started at: ${data.startTime}`);
  console.log(`Ended at: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
}

// Generate HTML and text summary report
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  return {
    [`reports/api-load-test-${timestamp}.html`]: htmlReport(data),
    [`reports/api-load-test-${timestamp}.json`]: JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
