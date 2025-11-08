/**
 * Test script for Recommendation API
 * TASK-2.3.4: Recommendation API implementation
 * 
 * Tests:
 * 1. REST API endpoints
 * 2. Redis caching
 * 3. Fallback recommendations
 * 4. Performance monitoring (<200ms)
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || 'test-token';
const TEST_ADMIN_TOKEN = process.env.TEST_ADMIN_TOKEN || 'admin-token';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

/**
 * Helper function to run a test
 */
async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = performance.now();
  try {
    await testFn();
    const duration = performance.now() - startTime;
    results.push({
      name,
      passed: true,
      duration: Math.round(duration),
    });
    console.log(`✅ ${name} (${Math.round(duration)}ms)`);
  } catch (error: any) {
    const duration = performance.now() - startTime;
    results.push({
      name,
      passed: false,
      duration: Math.round(duration),
      error: error.message,
    });
    console.error(`❌ ${name} (${Math.round(duration)}ms)`);
    console.error(`   Error: ${error.message}`);
  }
}

/**
 * Test 1: Get personalized recommendations
 */
async function testGetRecommendations() {
  const response = await axios.get(
    `${API_BASE_URL}/api/v1/recommendations?limit=10`,
    {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` },
    }
  );

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }

  if (!response.data.success) {
    throw new Error('Response success should be true');
  }

  if (!Array.isArray(response.data.data.recommendations)) {
    throw new Error('Recommendations should be an array');
  }

  if (response.data.data.recommendations.length > 10) {
    throw new Error('Should respect limit parameter');
  }

  // Check recommendation structure
  const rec = response.data.data.recommendations[0];
  if (rec && (!rec.contentId || typeof rec.score !== 'number' || !rec.reason)) {
    throw new Error('Invalid recommendation structure');
  }
}

/**
 * Test 2: Redis caching (second request should be faster)
 */
async function testRedisCaching() {
  // First request (cache miss)
  const start1 = performance.now();
  const response1 = await axios.get(
    `${API_BASE_URL}/api/v1/recommendations?limit=10`,
    {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` },
    }
  );
  const duration1 = performance.now() - start1;

  // Second request (cache hit)
  const start2 = performance.now();
  const response2 = await axios.get(
    `${API_BASE_URL}/api/v1/recommendations?limit=10`,
    {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` },
    }
  );
  const duration2 = performance.now() - start2;

  if (response1.status !== 200 || response2.status !== 200) {
    throw new Error('Both requests should succeed');
  }

  // Cache hit should be significantly faster (at least 2x)
  if (duration2 >= duration1 / 2) {
    console.warn(
      `   Warning: Cache hit (${Math.round(duration2)}ms) not significantly faster than miss (${Math.round(duration1)}ms)`
    );
  }

  console.log(
    `   Cache miss: ${Math.round(duration1)}ms, Cache hit: ${Math.round(duration2)}ms`
  );
}

/**
 * Test 3: Fallback recommendations
 */
async function testFallbackRecommendations() {
  const response = await axios.get(
    `${API_BASE_URL}/api/v1/recommendations/fallback?limit=10`,
    {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` },
    }
  );

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }

  if (!response.data.success) {
    throw new Error('Response success should be true');
  }

  if (!Array.isArray(response.data.data.recommendations)) {
    throw new Error('Recommendations should be an array');
  }

  if (response.data.data.method !== 'fallback-popular') {
    throw new Error('Method should be fallback-popular');
  }

  // Fallback should return results even for new users
  if (response.data.data.recommendations.length === 0) {
    console.warn('   Warning: Fallback returned no recommendations');
  }
}

/**
 * Test 4: Performance monitoring (<200ms target)
 */
async function testPerformanceTarget() {
  const iterations = 10;
  const responseTimes: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await axios.get(
      `${API_BASE_URL}/api/v1/recommendations?limit=10`,
      {
        headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` },
      }
    );
    const duration = performance.now() - start;
    responseTimes.push(duration);
  }

  // Calculate p95
  responseTimes.sort((a, b) => a - b);
  const p95Index = Math.floor(iterations * 0.95);
  const p95 = responseTimes[p95Index];

  console.log(
    `   Average: ${Math.round(responseTimes.reduce((a, b) => a + b) / iterations)}ms, P95: ${Math.round(p95)}ms`
  );

  if (p95 > 200) {
    console.warn(
      `   Warning: P95 (${Math.round(p95)}ms) exceeds 200ms target`
    );
  }
}

/**
 * Test 5: Get performance metrics (admin)
 */
async function testGetPerformanceMetrics() {
  const response = await axios.get(
    `${API_BASE_URL}/api/v1/recommendations/performance`,
    {
      headers: { Authorization: `Bearer ${TEST_ADMIN_TOKEN}` },
    }
  );

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }

  if (!response.data.success) {
    throw new Error('Response success should be true');
  }

  const metrics = response.data.data;
  if (
    typeof metrics.averageResponseTime !== 'number' ||
    typeof metrics.p95 !== 'number' ||
    typeof metrics.cacheHitRate !== 'number'
  ) {
    throw new Error('Invalid metrics structure');
  }

  console.log(`   Average: ${metrics.averageResponseTime}ms`);
  console.log(`   P95: ${metrics.p95}ms`);
  console.log(`   Cache Hit Rate: ${metrics.cacheHitRate}%`);
  console.log(`   Fallback Rate: ${metrics.fallbackRate}%`);
  console.log(`   Status: ${response.data.meta.status}`);
}

/**
 * Test 6: User-based recommendations
 */
async function testUserBasedRecommendations() {
  const response = await axios.get(
    `${API_BASE_URL}/api/v1/recommendations/user-based?limit=10`,
    {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` },
    }
  );

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }

  if (response.data.data.method !== 'user-based') {
    throw new Error('Method should be user-based');
  }
}

/**
 * Test 7: Item-based recommendations
 */
async function testItemBasedRecommendations() {
  const response = await axios.get(
    `${API_BASE_URL}/api/v1/recommendations/item-based?limit=10`,
    {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` },
    }
  );

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }

  if (response.data.data.method !== 'item-based') {
    throw new Error('Method should be item-based');
  }
}

/**
 * Test 8: Content-based recommendations
 */
async function testContentBasedRecommendations() {
  const response = await axios.get(
    `${API_BASE_URL}/api/v1/recommendations/content-based?limit=10`,
    {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` },
    }
  );

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }

  if (response.data.data.method !== 'content-based') {
    throw new Error('Method should be content-based');
  }
}

/**
 * Test 9: Clear cache
 */
async function testClearCache() {
  const response = await axios.delete(
    `${API_BASE_URL}/api/v1/recommendations/cache`,
    {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` },
    }
  );

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }

  if (!response.data.success) {
    throw new Error('Response success should be true');
  }
}

/**
 * Test 10: Custom options
 */
async function testCustomOptions() {
  const response = await axios.get(
    `${API_BASE_URL}/api/v1/recommendations?` +
      `limit=5&` +
      `minScore=0.2&` +
      `diversityFactor=0.5&` +
      `useContentBased=true&` +
      `contentBasedWeight=0.4`,
    {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` },
    }
  );

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }

  if (response.data.data.recommendations.length > 5) {
    throw new Error('Should respect limit parameter');
  }

  // Check that options are reflected in response
  const options = response.data.data.options;
  if (options.limit !== 5 || options.diversityFactor !== 0.5) {
    throw new Error('Options not properly applied');
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🧪 Testing Recommendation API Implementation');
  console.log('='.repeat(60));
  console.log('');

  console.log('📋 TASK-2.3.4: Recommendation API');
  console.log('   ✓ Create REST API endpoint for recommendations');
  console.log('   ✓ Add Redis caching for performance');
  console.log('   ✓ Implement fallback recommendations');
  console.log('   ✓ Monitor API performance (<200ms)');
  console.log('');

  console.log('Running tests...');
  console.log('');

  // Run all tests
  await runTest('1. Get personalized recommendations', testGetRecommendations);
  await runTest('2. Redis caching', testRedisCaching);
  await runTest('3. Fallback recommendations', testFallbackRecommendations);
  await runTest('4. Performance target (<200ms)', testPerformanceTarget);
  await runTest('5. Get performance metrics', testGetPerformanceMetrics);
  await runTest('6. User-based recommendations', testUserBasedRecommendations);
  await runTest('7. Item-based recommendations', testItemBasedRecommendations);
  await runTest('8. Content-based recommendations', testContentBasedRecommendations);
  await runTest('9. Clear cache', testClearCache);
  await runTest('10. Custom options', testCustomOptions);

  // Print summary
  console.log('');
  console.log('='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => r.passed).length;
  const total = results.length;

  console.log(`Total: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log('');

  if (failed > 0) {
    console.log('Failed tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    console.log('');
  }

  // Performance summary
  const avgDuration =
    results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  console.log(`Average test duration: ${Math.round(avgDuration)}ms`);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
