import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

/**
 * Soak Test - Tests system stability over extended period
 * Task 17.3.4: 执行浸泡测试
 * 
 * Tests:
 * - 运行 24 小时稳定性测试
 * - 监控内存泄漏和资源消耗
 * - 验证长时间运行的可靠性
 * - 检查日志和错误率
 */

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const memoryLeakIndicators = new Counter('memory_leak_indicators');
const performanceDegradation = new Counter('performance_degradation');
const connectionErrors = new Counter('connection_errors');
const timeoutErrors = new Counter('timeout_errors');

const latencyTrend = new Gauge('latency_trend');
const errorRateTrend = new Gauge('error_rate_trend');

let baselineLatency = 0;
let requestCounter = 0;
let errorCounter = 0;
let hourlyMetrics = [];
let currentHour = 0;

export const options = {
  stages: [
    { duration: '10m', target: 50 },    // Ramp up to 50 users
    { duration: '24h', target: 50 },    // Sustained load for 24 hours
    { duration: '10m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
    memory_leak_indicators: ['count<10'],
    performance_degradation: ['count<5'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const TEST_DURATION_HOURS = parseInt(__ENV.SOAK_TEST_HOURS || '24');

export default function () {
  const currentTime = Date.now();
  const elapsedHours = Math.floor(requestCounter / 3600); // Assuming ~1 req/sec
  
  // Track hourly metrics
  if (elapsedHours > currentHour) {
    currentHour = elapsedHours;
    hourlyMetrics.push({
      hour: currentHour,
      avgLatency: apiLatency.values?.avg || 0,
      errorRate: errorCounter / requestCounter,
      timestamp: new Date().toISOString(),
    });
    
    console.log(`📊 Hour ${currentHour} Summary:`);
    console.log(`   Avg Latency: ${(apiLatency.values?.avg || 0).toFixed(2)}ms`);
    console.log(`   Error Rate: ${((errorCounter / requestCounter) * 100).toFixed(2)}%`);
  }

  group('Soak Test - Sustained Load', function () {
    // Test 1: Health check
    const healthRes = http.get(`${BASE_URL}/api/v1/health`, {
      timeout: '5s',
    });
    
    const healthSuccess = check(healthRes, {
      'health check status 200': (r) => r.status === 200,
      'health check time < 200ms': (r) => r.timings.duration < 200,
    });

    if (!healthSuccess) {
      errorCounter++;
      if (healthRes.error_code) {
        connectionErrors.add(1);
      }
    }

    // Establish baseline after 100 requests
    if (requestCounter === 100) {
      baselineLatency = healthRes.timings.duration;
      console.log(`✅ Baseline latency established: ${baselineLatency.toFixed(2)}ms`);
    }

    // Check for performance degradation
    if (requestCounter > 100 && baselineLatency > 0) {
      const latencyIncrease = (healthRes.timings.duration - baselineLatency) / baselineLatency;
      latencyTrend.add(latencyIncrease);
      
      // Alert if latency increased by more than 50%
      if (latencyIncrease > 0.5) {
        memoryLeakIndicators.add(1);
        console.warn(`⚠️  Potential memory leak detected at request ${requestCounter}`);
        console.warn(`   Baseline: ${baselineLatency.toFixed(2)}ms, Current: ${healthRes.timings.duration.toFixed(2)}ms`);
        console.warn(`   Increase: ${(latencyIncrease * 100).toFixed(2)}%`);
      }
      
      // Alert if latency increased by more than 100%
      if (latencyIncrease > 1.0) {
        performanceDegradation.add(1);
        console.error(`❌ Severe performance degradation at request ${requestCounter}`);
      }
    }

    errorRate.add(!healthSuccess);
    apiLatency.add(healthRes.timings.duration);
    requestCounter++;

    // Test 2: Marketplace query (every 3rd request)
    if (requestCounter % 3 === 0) {
      const marketplaceRes = http.get(`${BASE_URL}/api/v1/marketplace/nfts?page=1&limit=20`, {
        timeout: '5s',
      });
      
      const marketplaceSuccess = check(marketplaceRes, {
        'marketplace status 200': (r) => r.status === 200,
        'marketplace time < 500ms': (r) => r.timings.duration < 500,
      });

      if (!marketplaceSuccess) {
        errorCounter++;
      }

      errorRate.add(!marketplaceSuccess);
      apiLatency.add(marketplaceRes.timings.duration);
      requestCounter++;
    }

    // Test 3: Analytics query (every 5th request)
    if (requestCounter % 5 === 0) {
      const analyticsRes = http.get(`${BASE_URL}/api/v1/analytics/stats`, {
        timeout: '10s',
      });
      
      const analyticsSuccess = check(analyticsRes, {
        'analytics status 200': (r) => r.status === 200,
        'analytics time < 1000ms': (r) => r.timings.duration < 1000,
        'analytics no timeout': (r) => r.timings.duration < 10000,
      });

      if (!analyticsSuccess) {
        errorCounter++;
        if (analyticsRes.timings.duration >= 10000) {
          timeoutErrors.add(1);
        }
      }

      errorRate.add(!analyticsSuccess);
      apiLatency.add(analyticsRes.timings.duration);
      requestCounter++;
    }

    // Test 4: NFT details (every 7th request)
    if (requestCounter % 7 === 0) {
      const tokenId = Math.floor(Math.random() * 100) + 1;
      const nftRes = http.get(`${BASE_URL}/api/v1/nft/${tokenId}`, {
        timeout: '5s',
      });
      
      const nftSuccess = check(nftRes, {
        'nft details status 200 or 404': (r) => r.status === 200 || r.status === 404,
        'nft details time < 300ms': (r) => r.timings.duration < 300,
      });

      if (!nftSuccess) {
        errorCounter++;
      }

      errorRate.add(!nftSuccess);
      apiLatency.add(nftRes.timings.duration);
      requestCounter++;
    }

    // Calculate and track error rate trend
    const currentErrorRate = errorCounter / requestCounter;
    errorRateTrend.add(currentErrorRate);

    sleep(1);
  });
}

// Setup function
export function setup() {
  console.log('='.repeat(80));
  console.log('KnowTon Platform Soak Test - Task 17.3.4');
  console.log('='.repeat(80));
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Test Duration: ${TEST_DURATION_HOURS} hours`);
  console.log(`Sustained Load: 50 concurrent users`);
  console.log(`Test Objectives:`);
  console.log(`  1. Detect memory leaks`);
  console.log(`  2. Monitor performance degradation`);
  console.log(`  3. Verify long-term stability`);
  console.log(`  4. Track error rates over time`);
  console.log('='.repeat(80));
  
  // Pre-test health check
  const healthRes = http.get(`${BASE_URL}/api/v1/health`);
  if (healthRes.status !== 200) {
    console.error(`❌ Pre-test health check failed: ${healthRes.status}`);
    throw new Error('System not healthy before soak test');
  }
  
  console.log('✅ Pre-test health check passed');
  console.log(`   Response time: ${healthRes.timings.duration.toFixed(2)}ms`);
  console.log('='.repeat(80));
  console.log('🚀 Starting soak test...');
  console.log('='.repeat(80));
  
  return {
    startTime: new Date().toISOString(),
    baseUrl: BASE_URL,
    testDurationHours: TEST_DURATION_HOURS,
    initialHealthStatus: healthRes.status,
    initialLatency: healthRes.timings.duration,
  };
}

// Teardown function
export function teardown(data) {
  console.log('='.repeat(80));
  console.log('Soak Test Completed');
  console.log('='.repeat(80));
  console.log(`Started at: ${data.startTime}`);
  console.log(`Ended at: ${new Date().toISOString()}`);
  console.log(`Duration: ${data.testDurationHours} hours`);
  console.log(`Total Requests: ${requestCounter}`);
  console.log(`Total Errors: ${errorCounter}`);
  console.log(`Overall Error Rate: ${((errorCounter / requestCounter) * 100).toFixed(2)}%`);
  
  // Post-test health check
  console.log('='.repeat(80));
  console.log('Running post-test health check...');
  sleep(10); // Wait for system to stabilize
  
  const healthRes = http.get(`${BASE_URL}/api/v1/health`);
  const finalLatency = healthRes.timings.duration;
  const latencyChange = ((finalLatency - data.initialLatency) / data.initialLatency) * 100;
  
  console.log('='.repeat(80));
  console.log('Post-Test System Status:');
  console.log(`  Health Check: ${healthRes.status === 200 ? '✅ Healthy' : '❌ Unhealthy'}`);
  console.log(`  Initial Latency: ${data.initialLatency.toFixed(2)}ms`);
  console.log(`  Final Latency: ${finalLatency.toFixed(2)}ms`);
  console.log(`  Latency Change: ${latencyChange > 0 ? '+' : ''}${latencyChange.toFixed(2)}%`);
  
  // Memory leak analysis
  console.log('='.repeat(80));
  console.log('Memory Leak Analysis:');
  if (memoryLeakIndicators.values?.count > 0) {
    console.log(`  ⚠️  ${memoryLeakIndicators.values.count} potential memory leak indicators detected`);
    console.log('  Recommendations:');
    console.log('    - Review application logs for memory usage patterns');
    console.log('    - Check for unclosed database connections');
    console.log('    - Analyze heap dumps for memory leaks');
    console.log('    - Review event listener cleanup');
  } else {
    console.log('  ✅ No memory leak indicators detected');
  }
  
  // Performance degradation analysis
  console.log('='.repeat(80));
  console.log('Performance Degradation Analysis:');
  if (performanceDegradation.values?.count > 0) {
    console.log(`  ⚠️  ${performanceDegradation.values.count} performance degradation events detected`);
    console.log('  Recommendations:');
    console.log('    - Review slow query logs');
    console.log('    - Check cache effectiveness');
    console.log('    - Analyze resource utilization trends');
  } else {
    console.log('  ✅ No significant performance degradation detected');
  }
  
  // Hourly metrics summary
  if (hourlyMetrics.length > 0) {
    console.log('='.repeat(80));
    console.log('Hourly Metrics Summary:');
    hourlyMetrics.forEach(metric => {
      console.log(`  Hour ${metric.hour}: Avg Latency ${metric.avgLatency.toFixed(2)}ms, Error Rate ${(metric.errorRate * 100).toFixed(2)}%`);
    });
  }
  
  console.log('='.repeat(80));
  
  // Final verdict
  const isHealthy = healthRes.status === 200;
  const hasMemoryLeaks = memoryLeakIndicators.values?.count > 0;
  const hasDegradation = performanceDegradation.values?.count > 0;
  const errorRateAcceptable = (errorCounter / requestCounter) < 0.05;
  
  if (isHealthy && !hasMemoryLeaks && !hasDegradation && errorRateAcceptable) {
    console.log('✅ SOAK TEST PASSED');
    console.log('   System is stable for long-term operation');
  } else {
    console.log('⚠️  SOAK TEST COMPLETED WITH WARNINGS');
    console.log('   Review recommendations above for improvements');
  }
  
  console.log('='.repeat(80));
}

// Generate comprehensive report
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Calculate key metrics
  const metrics = data.metrics;
  const avgLatency = metrics.api_latency?.values?.avg || 0;
  const p95Latency = metrics.http_req_duration?.values?.['p(95)'] || 0;
  const p99Latency = metrics.http_req_duration?.values?.['p(99)'] || 0;
  const errorRateValue = metrics.errors?.values?.rate || 0;
  const totalRequests = metrics.http_reqs?.values?.count || 0;
  
  // Create detailed summary report
  const summaryReport = {
    test: 'Soak Test',
    timestamp: new Date().toISOString(),
    duration: data.state.testRunDurationMs / 1000 / 3600, // hours
    results: {
      totalRequests,
      errorRate: (errorRateValue * 100).toFixed(2) + '%',
      avgLatency: avgLatency.toFixed(2) + 'ms',
      p95Latency: p95Latency.toFixed(2) + 'ms',
      p99Latency: p99Latency.toFixed(2) + 'ms',
      memoryLeakIndicators: metrics.memory_leak_indicators?.values?.count || 0,
      performanceDegradation: metrics.performance_degradation?.values?.count || 0,
      connectionErrors: metrics.connection_errors?.values?.count || 0,
      timeoutErrors: metrics.timeout_errors?.values?.count || 0,
    },
    hourlyMetrics,
    recommendations: generateSoakTestRecommendations(metrics),
  };
  
  return {
    [`reports/soak-test-${timestamp}.html`]: htmlReport(data),
    [`reports/soak-test-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`reports/soak-test-summary-${timestamp}.json`]: JSON.stringify(summaryReport, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function generateSoakTestRecommendations(metrics) {
  const recommendations = [];
  
  const memoryLeaks = metrics.memory_leak_indicators?.values?.count || 0;
  const degradation = metrics.performance_degradation?.values?.count || 0;
  const errorRate = metrics.errors?.values?.rate || 0;
  const avgLatency = metrics.api_latency?.values?.avg || 0;
  
  if (memoryLeaks > 0) {
    recommendations.push('Memory leak indicators detected. Perform heap dump analysis and review resource cleanup.');
  }
  
  if (degradation > 0) {
    recommendations.push('Performance degradation observed. Review database query performance and caching strategies.');
  }
  
  if (errorRate > 0.05) {
    recommendations.push('Error rate exceeds threshold. Review error logs and implement better error handling.');
  }
  
  if (avgLatency > 500) {
    recommendations.push('Average latency is high. Consider optimizing slow endpoints and database queries.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('System performed excellently during soak test. Ready for production workload.');
  }
  
  return recommendations;
}
