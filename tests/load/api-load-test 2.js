import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * K6 Load Test for KnowTon Platform APIs
 * Tests API performance under various load conditions
 */

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const requestCount = new Counter('request_count');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.05'],                  // Error rate < 5%
    errors: ['rate<0.1'],                            // Custom error rate < 10%
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

// Test data
const testWallet = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

export default function () {
  // Test 1: Health check endpoint
  testHealthCheck();
  sleep(1);

  // Test 2: List NFTs
  testListNFTs();
  sleep(1);

  // Test 3: Get NFT details
  testGetNFTDetails();
  sleep(1);

  // Test 4: Marketplace operations
  testMarketplace();
  sleep(1);

  // Test 5: Analytics queries
  testAnalytics();
  sleep(2);
}

function testHealthCheck() {
  const res = http.get(`${BASE_URL}/api/v1/health`);
  
  const success = check(res, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 200ms': (r) => r.timings.duration < 200,
  });

  errorRate.add(!success);
  apiLatency.add(res.timings.duration);
  requestCount.add(1);
}

function testListNFTs() {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.get(`${BASE_URL}/api/v1/marketplace/nfts?page=1&limit=20`, params);
  
  const success = check(res, {
    'list NFTs status is 200': (r) => r.status === 200,
    'list NFTs response time < 500ms': (r) => r.timings.duration < 500,
    'list NFTs returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.nfts);
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);
  apiLatency.add(res.timings.duration);
  requestCount.add(1);
}

function testGetNFTDetails() {
  const tokenId = Math.floor(Math.random() * 100) + 1;
  const res = http.get(`${BASE_URL}/api/v1/nft/${tokenId}`);
  
  const success = check(res, {
    'get NFT status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'get NFT response time < 300ms': (r) => r.timings.duration < 300,
  });

  errorRate.add(!success);
  apiLatency.add(res.timings.duration);
  requestCount.add(1);
}

function testMarketplace() {
  // Get order book
  const tokenId = Math.floor(Math.random() * 100) + 1;
  const res = http.get(`${BASE_URL}/api/v1/marketplace/orderbook/${tokenId}`);
  
  const success = check(res, {
    'orderbook status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'orderbook response time < 400ms': (r) => r.timings.duration < 400,
  });

  errorRate.add(!success);
  apiLatency.add(res.timings.duration);
  requestCount.add(1);
}

function testAnalytics() {
  const res = http.get(`${BASE_URL}/api/v1/analytics/stats`);
  
  const success = check(res, {
    'analytics status is 200': (r) => r.status === 200,
    'analytics response time < 1000ms': (r) => r.timings.duration < 1000,
    'analytics returns stats': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.totalNFTs !== undefined;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);
  apiLatency.add(res.timings.duration);
  requestCount.add(1);
}

// Setup function - runs once before test
export function setup() {
  console.log('Starting load test...');
  console.log(`Target URL: ${BASE_URL}`);
}

// Teardown function - runs once after test
export function teardown(data) {
  console.log('Load test completed');
}
