/**
 * Integration test script for Similarity Detection API
 * 
 * This script tests the complete similarity detection workflow:
 * 1. Generate fingerprints for test content
 * 2. Search for similar content
 * 3. Detect plagiarism
 * 4. Compare two content items
 * 
 * Usage:
 *   npm run test:similarity-integration
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const ORACLE_ADAPTER_URL = process.env.ORACLE_ADAPTER_URL || 'http://localhost:8001';

// Test data - base64 encoded small test images
const TEST_IMAGE_1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const TEST_IMAGE_2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// Mock auth token (in real scenario, this would be obtained from login)
const AUTH_TOKEN = 'mock-jwt-token';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  duration: number;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

async function runTest(testName: string, testFn: () => Promise<any>): Promise<void> {
  const startTime = Date.now();
  console.log(`\n🧪 Running: ${testName}`);
  
  try {
    const data = await testFn();
    const duration = Date.now() - startTime;
    
    results.push({
      test: testName,
      status: 'PASS',
      duration,
      data,
    });
    
    console.log(`✅ PASS (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    results.push({
      test: testName,
      status: 'FAIL',
      duration,
      error: errorMessage,
    });
    
    console.log(`❌ FAIL (${duration}ms)`);
    console.log(`   Error: ${errorMessage}`);
  }
}

async function testOracleAdapterHealth(): Promise<any> {
  const response = await axios.get(`${ORACLE_ADAPTER_URL}/health`, {
    timeout: 5000,
  });
  
  if (response.data.status !== 'healthy') {
    throw new Error('Oracle adapter is not healthy');
  }
  
  return response.data;
}

async function testBackendSimilarityHealth(): Promise<any> {
  const response = await axios.get(`${BACKEND_URL}/api/v1/similarity/health`, {
    timeout: 5000,
  });
  
  if (response.data.status !== 'healthy') {
    throw new Error('Backend similarity service is not healthy');
  }
  
  return response.data;
}

async function testGenerateFingerprint(): Promise<any> {
  const response = await axios.post(
    `${BACKEND_URL}/api/v1/similarity/fingerprint`,
    {
      content_url: TEST_IMAGE_1,
      content_type: 'image',
      metadata: {
        title: 'Test Image 1',
        description: 'Integration test image',
      },
    },
    {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      timeout: 60000,
    }
  );
  
  if (!response.data.fingerprint) {
    throw new Error('No fingerprint returned');
  }
  
  if (!response.data.features || !response.data.features.feature_vector) {
    throw new Error('No feature vector returned');
  }
  
  console.log(`   Fingerprint: ${response.data.fingerprint.substring(0, 16)}...`);
  console.log(`   Processing time: ${response.data.processing_time_ms}ms`);
  
  return response.data;
}

async function testSearchSimilarContent(): Promise<any> {
  const response = await axios.post(
    `${BACKEND_URL}/api/v1/similarity/search`,
    {
      content_url: TEST_IMAGE_1,
      content_type: 'image',
      threshold: 0.85,
      limit: 10,
      offset: 0,
    },
    {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      timeout: 60000,
    }
  );
  
  console.log(`   Total results: ${response.data.total_results}`);
  console.log(`   Results returned: ${response.data.results.length}`);
  console.log(`   Processing time: ${response.data.processing_time_ms}ms`);
  
  if (response.data.results.length > 0) {
    console.log(`   Top similarity: ${response.data.results[0].similarity_score}`);
  }
  
  return response.data;
}

async function testSearchWithPagination(): Promise<any> {
  // First page
  const page1 = await axios.post(
    `${BACKEND_URL}/api/v1/similarity/search`,
    {
      content_url: TEST_IMAGE_1,
      content_type: 'image',
      threshold: 0.5, // Lower threshold to get more results
      limit: 5,
      offset: 0,
    },
    {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      timeout: 60000,
    }
  );
  
  console.log(`   Page 1: ${page1.data.results.length} results`);
  console.log(`   Has next: ${page1.data.pagination.has_next}`);
  console.log(`   Has prev: ${page1.data.pagination.has_prev}`);
  
  // Second page if available
  if (page1.data.pagination.has_next) {
    const page2 = await axios.post(
      `${BACKEND_URL}/api/v1/similarity/search`,
      {
        content_url: TEST_IMAGE_1,
        content_type: 'image',
        threshold: 0.5,
        limit: 5,
        offset: page1.data.pagination.next_offset,
      },
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        timeout: 60000,
      }
    );
    
    console.log(`   Page 2: ${page2.data.results.length} results`);
  }
  
  return page1.data;
}

async function testDetectPlagiarism(): Promise<any> {
  const response = await axios.post(
    `${BACKEND_URL}/api/v1/similarity/detect-plagiarism`,
    {
      content_url: TEST_IMAGE_1,
      content_type: 'image',
    },
    {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      timeout: 60000,
    }
  );
  
  console.log(`   Plagiarism detected: ${response.data.is_plagiarism}`);
  console.log(`   Confidence: ${response.data.confidence}`);
  console.log(`   Max similarity: ${response.data.analysis.max_similarity}`);
  console.log(`   Total matches: ${response.data.analysis.total_matches}`);
  
  return response.data;
}

async function testCompareTwoContent(): Promise<any> {
  // First generate fingerprints for both images
  const fp1Response = await axios.post(
    `${BACKEND_URL}/api/v1/similarity/fingerprint`,
    {
      content_url: TEST_IMAGE_1,
      content_type: 'image',
    },
    {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      timeout: 60000,
    }
  );
  
  const fp2Response = await axios.post(
    `${BACKEND_URL}/api/v1/similarity/fingerprint`,
    {
      content_url: TEST_IMAGE_2,
      content_type: 'image',
    },
    {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      timeout: 60000,
    }
  );
  
  // Compare the fingerprints
  const response = await axios.post(
    `${BACKEND_URL}/api/v1/similarity/compare`,
    {
      fingerprint1: fp1Response.data.fingerprint,
      fingerprint2: fp2Response.data.fingerprint,
    },
    {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      timeout: 30000,
    }
  );
  
  console.log(`   Similarity score: ${response.data.similarity_score}`);
  console.log(`   Is infringement: ${response.data.is_infringement}`);
  console.log(`   Confidence: ${response.data.confidence}`);
  console.log(`   Matched features: ${response.data.matched_features.join(', ')}`);
  
  return response.data;
}

async function testErrorHandling(): Promise<any> {
  try {
    await axios.post(
      `${BACKEND_URL}/api/v1/similarity/search`,
      {
        content_url: TEST_IMAGE_1,
        content_type: 'invalid_type', // Invalid content type
        threshold: 0.85,
      },
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        timeout: 60000,
      }
    );
    
    throw new Error('Should have thrown validation error');
  } catch (error: any) {
    if (error.response && error.response.status === 400) {
      console.log(`   Correctly rejected invalid content type`);
      return { validated: true };
    }
    throw error;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Similarity Detection API - Integration Tests');
  console.log('='.repeat(60));
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Oracle Adapter URL: ${ORACLE_ADAPTER_URL}`);
  console.log('='.repeat(60));
  
  // Health checks
  await runTest('Oracle Adapter Health Check', testOracleAdapterHealth);
  await runTest('Backend Similarity Service Health Check', testBackendSimilarityHealth);
  
  // Core functionality tests
  await runTest('Generate Fingerprint', testGenerateFingerprint);
  await runTest('Search Similar Content', testSearchSimilarContent);
  await runTest('Search with Pagination', testSearchWithPagination);
  await runTest('Detect Plagiarism', testDetectPlagiarism);
  await runTest('Compare Two Content Items', testCompareTwoContent);
  
  // Error handling
  await runTest('Error Handling - Invalid Input', testErrorHandling);
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Total duration: ${totalDuration}ms`);
  console.log(`Average duration: ${Math.round(totalDuration / results.length)}ms`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`  - ${r.test}: ${r.error}`);
      });
  }
  
  console.log('='.repeat(60));
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
