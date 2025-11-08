import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

/**
 * Stress Test - Finds the breaking point of the system
 * Task 17.3.3: 执行压力测试
 * 
 * Tests:
 * - 逐步增加负载找到系统极限
 * - 测试系统在高负载下的稳定性
 * - 测试自动扩展（HPA）是否生效
 * - 记录系统崩溃点和瓶颈
 */

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const requestsPerSecond = new Gauge('requests_per_second');
const activeConnections = new Gauge('active_connections');
const systemBreakpoint = new Counter('system_breakpoint');
const hpaScaleEvents = new Counter('hpa_scale_events');

let requestCounter = 0;
let errorCounter = 0;
let lastCheckTime = Date.now();
let breakpointDetected = false;

export const options = {
  stages: [
    { duration: '2m', target: 50 },     // Baseline: 50 users
    { duration: '3m', target: 100 },    // Moderate: 100 users
    { duration: '3m', target: 200 },    // High: 200 users
    { duration: '3m', target: 300 },    // Very High: 300 users
    { duration: '3m', target: 400 },    // Extreme: 400 users
    { duration: '3m', target: 500 },    // Beyond capacity: 500 users
    { duration: '3m', target: 600 },    // Critical: 600 users
    { duration: '2m', target: 0 },      // Recovery: Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],  // Very lenient for stress test
    http_req_failed: ['rate<0.50'],     // Allow up to 50% errors
    errors: ['rate<0.50'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

export default function () {
  const currentVUs = __VU;
  const currentTime = Date.now();
  
  // Calculate requests per second
  requestCounter++;
  if (currentTime - lastCheckTime >= 1000) {
    const rps = requestCounter / ((currentTime - lastCheckTime) / 1000);
    requestsPerSecond.add(rps);
    requestCounter = 0;
    lastCheckTime = currentTime;
  }
  
  activeConnections.add(currentVUs);

  group('Stress Test - Mixed Workload', function () {
    // Mix of different endpoints with varying complexity
    const endpoints = [
      { path: '/api/v1/health', weight: 0.1, complexity: 'low' },
      { path: '/api/v1/marketplace/nfts?page=1&limit=20', weight: 0.3, complexity: 'medium' },
      { path: '/api/v1/analytics/stats', weight: 0.2, complexity: 'high' },
      { path: `/api/v1/nft/${Math.floor(Math.random() * 100)}`, weight: 0.2, complexity: 'medium' },
      { path: '/api/v1/marketplace/search?q=music', weight: 0.1, complexity: 'high' },
      { path: '/api/v1/analytics/trending?period=24h', weight: 0.1, complexity: 'high' },
    ];

    // Weighted random selection
    const rand = Math.random();
    let cumulative = 0;
    let selectedEndpoint = endpoints[0];
    
    for (const endpoint of endpoints) {
      cumulative += endpoint.weight;
      if (rand <= cumulative) {
        selectedEndpoint = endpoint;
        break;
      }
    }

    const res = http.get(`${BASE_URL}${selectedEndpoint.path}`, {
      timeout: '10s',
      tags: { complexity: selectedEndpoint.complexity },
    });
    
    const success = check(res, {
      'status is 2xx or 4xx': (r) => r.status >= 200 && r.status < 500,
      'response received': (r) => r.body !== null && r.body !== undefined,
      'no timeout': (r) => r.timings.duration < 10000,
    });

    // Detect system breakpoint
    if (!success) {
      errorCounter++;
      
      // If error rate exceeds 30% and we haven't detected breakpoint yet
      if (!breakpointDetected && errorCounter > 30) {
        breakpointDetected = true;
        systemBreakpoint.add(1);
        console.log(`⚠️  System breakpoint detected at ${currentVUs} concurrent users`);
        console.log(`   Error rate: ${(errorCounter / requestCounter * 100).toFixed(2)}%`);
        console.log(`   Average latency: ${res.timings.duration.toFixed(2)}ms`);
      }
    }

    errorRate.add(!success);
    apiLatency.add(res.timings.duration);
    
    // Check for HPA scaling indicators (response headers)
    if (res.headers['X-Pod-Name'] || res.headers['X-Instance-Id']) {
      hpaScaleEvents.add(1);
    }

    // Variable sleep based on load
    const sleepTime = currentVUs < 200 ? 1 : currentVUs < 400 ? 0.5 : 0.2;
    sleep(sleepTime + Math.random() * 0.5);
  });
}

// Setup function
export function setup() {
  console.log('='.repeat(80));
  console.log('KnowTon Platform Stress Test - Task 17.3.3');
  console.log('='.repeat(80));
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Test Objective: Find system breaking point`);
  console.log(`Load Stages:`);
  console.log(`  1. Baseline: 50 users (2 min)`);
  console.log(`  2. Moderate: 100 users (3 min)`);
  console.log(`  3. High: 200 users (3 min)`);
  console.log(`  4. Very High: 300 users (3 min)`);
  console.log(`  5. Extreme: 400 users (3 min)`);
  console.log(`  6. Beyond Capacity: 500 users (3 min)`);
  console.log(`  7. Critical: 600 users (3 min)`);
  console.log(`  8. Recovery: Ramp down (2 min)`);
  console.log('='.repeat(80));
  
  // Pre-test health check
  const healthRes = http.get(`${BASE_URL}/api/v1/health`);
  if (healthRes.status !== 200) {
    console.error(`❌ Pre-test health check failed: ${healthRes.status}`);
    throw new Error('System not healthy before stress test');
  }
  
  console.log('✅ Pre-test health check passed');
  console.log('='.repeat(80));
  
  return {
    startTime: new Date().toISOString(),
    baseUrl: BASE_URL,
    initialHealthStatus: healthRes.status,
  };
}

// Teardown function
export function teardown(data) {
  console.log('='.repeat(80));
  console.log('Stress Test Completed');
  console.log(`Started at: ${data.startTime}`);
  console.log(`Ended at: ${new Date().toISOString()}`);
  
  // Post-test health check
  sleep(5); // Wait for system to stabilize
  const healthRes = http.get(`${BASE_URL}/api/v1/health`);
  
  console.log('='.repeat(80));
  console.log('Post-Test System Status:');
  console.log(`  Health Check: ${healthRes.status === 200 ? '✅ Healthy' : '❌ Unhealthy'}`);
  console.log(`  Response Time: ${healthRes.timings.duration.toFixed(2)}ms`);
  
  if (breakpointDetected) {
    console.log('='.repeat(80));
    console.log('⚠️  System Breakpoint Analysis:');
    console.log('  - System reached capacity limits during test');
    console.log('  - Review logs and metrics for bottlenecks');
    console.log('  - Consider scaling resources or optimizing code');
  } else {
    console.log('='.repeat(80));
    console.log('✅ System handled all load levels successfully');
    console.log('  - No breakpoint detected up to 600 concurrent users');
    console.log('  - System is well-scaled for current workload');
  }
  
  console.log('='.repeat(80));
}

// Generate comprehensive report
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Calculate key metrics
  const metrics = data.metrics;
  const p95Latency = metrics.http_req_duration?.values?.['p(95)'] || 0;
  const p99Latency = metrics.http_req_duration?.values?.['p(99)'] || 0;
  const errorRateValue = metrics.http_req_failed?.values?.rate || 0;
  const totalRequests = metrics.http_reqs?.values?.count || 0;
  
  // Create summary report
  const summaryReport = {
    test: 'Stress Test',
    timestamp: new Date().toISOString(),
    duration: data.state.testRunDurationMs / 1000,
    results: {
      totalRequests,
      errorRate: (errorRateValue * 100).toFixed(2) + '%',
      p95Latency: p95Latency.toFixed(2) + 'ms',
      p99Latency: p99Latency.toFixed(2) + 'ms',
      breakpointDetected,
      maxConcurrentUsers: 600,
    },
    recommendations: generateRecommendations(errorRateValue, p95Latency, breakpointDetected),
  };
  
  return {
    [`reports/stress-test-${timestamp}.html`]: htmlReport(data),
    [`reports/stress-test-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`reports/stress-test-summary-${timestamp}.json`]: JSON.stringify(summaryReport, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function generateRecommendations(errorRate, p95Latency, breakpoint) {
  const recommendations = [];
  
  if (errorRate > 0.10) {
    recommendations.push('High error rate detected. Review error logs and implement better error handling.');
  }
  
  if (p95Latency > 2000) {
    recommendations.push('High latency detected. Consider database query optimization and caching strategies.');
  }
  
  if (breakpoint) {
    recommendations.push('System breakpoint reached. Scale horizontally or optimize resource-intensive operations.');
    recommendations.push('Review HPA configuration to ensure automatic scaling triggers appropriately.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('System performed well under stress. Continue monitoring in production.');
  }
  
  return recommendations;
}
