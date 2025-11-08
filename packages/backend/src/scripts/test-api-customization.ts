import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  data?: any;
}

const results: TestResult[] = [];

async function runTests() {
  console.log('🧪 Testing API Customization Implementation\n');
  console.log('='.repeat(60));

  let tenantId: string;
  let apiKey: string;
  let apiKeyId: string;

  // Test 1: Create a test tenant
  try {
    console.log('\n📝 Test 1: Create test tenant...');
    const response = await axios.post(`${API_BASE_URL}/api/v1/tenants`, {
      name: 'API Test Tenant',
      slug: 'api-test-tenant',
      plan: 'enterprise',
      maxUsers: 100,
      maxStorage: 107374182400 // 100GB
    });

    tenantId = response.data.id;
    results.push({
      test: 'Create test tenant',
      passed: true,
      message: 'Tenant created successfully',
      data: { tenantId }
    });
    console.log('✅ Tenant created:', tenantId);
  } catch (error: any) {
    results.push({
      test: 'Create test tenant',
      passed: false,
      message: error.response?.data?.message || error.message
    });
    console.log('❌ Failed to create tenant');
    return;
  }

  // Test 2: Create custom API endpoint
  try {
    console.log('\n📝 Test 2: Create custom API endpoint...');
    const response = await axios.post(`${API_BASE_URL}/api/v1/api-customization/endpoints`, {
      tenantId,
      path: '/api/v1/custom/analytics',
      method: 'GET',
      enabled: true,
      rateLimit: 50,
      requiresAuth: true,
      metadata: {
        description: 'Custom analytics endpoint',
        version: '1.0'
      }
    });

    results.push({
      test: 'Create custom API endpoint',
      passed: response.data.success,
      message: 'Custom endpoint created',
      data: response.data.data
    });
    console.log('✅ Custom endpoint created');
  } catch (error: any) {
    results.push({
      test: 'Create custom API endpoint',
      passed: false,
      message: error.response?.data?.message || error.message
    });
    console.log('❌ Failed to create custom endpoint');
  }

  // Test 3: List API endpoints
  try {
    console.log('\n📝 Test 3: List API endpoints...');
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/api-customization/endpoints/${tenantId}`
    );

    const count = response.data.count;
    results.push({
      test: 'List API endpoints',
      passed: count > 0,
      message: `Found ${count} endpoint(s)`,
      data: response.data.data
    });
    console.log(`✅ Found ${count} endpoint(s)`);
  } catch (error: any) {
    results.push({
      test: 'List API endpoints',
      passed: false,
      message: error.response?.data?.message || error.message
    });
    console.log('❌ Failed to list endpoints');
  }

  // Test 4: Update API endpoint
  try {
    console.log('\n📝 Test 4: Update API endpoint...');
    const response = await axios.put(
      `${API_BASE_URL}/api/v1/api-customization/endpoints/${tenantId}/${encodeURIComponent('/api/v1/custom/analytics')}/GET`,
      {
        rateLimit: 100,
        enabled: true
      }
    );

    results.push({
      test: 'Update API endpoint',
      passed: response.data.success,
      message: 'Endpoint updated successfully',
      data: response.data.data
    });
    console.log('✅ Endpoint updated');
  } catch (error: any) {
    results.push({
      test: 'Update API endpoint',
      passed: false,
      message: error.response?.data?.message || error.message
    });
    console.log('❌ Failed to update endpoint');
  }

  // Test 5: Create API key with custom permissions
  try {
    console.log('\n📝 Test 5: Create API key with custom permissions...');
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/api-customization/keys/${tenantId}`,
      {
        name: 'Test API Key',
        permissions: {
          endpoints: ['/api/v1/custom/analytics', '/api/v1/content'],
          methods: ['GET', 'POST'],
          rateLimit: 200,
          ipWhitelist: [],
          allowedOrigins: ['https://example.com']
        },
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      }
    );

    apiKey = response.data.data.key;
    apiKeyId = response.data.data.id;
    results.push({
      test: 'Create API key',
      passed: response.data.success,
      message: 'API key created successfully',
      data: { key: apiKey.substring(0, 10) + '...' }
    });
    console.log('✅ API key created:', apiKey.substring(0, 20) + '...');
  } catch (error: any) {
    results.push({
      test: 'Create API key',
      passed: false,
      message: error.response?.data?.message || error.message
    });
    console.log('❌ Failed to create API key');
  }

  // Test 6: Validate API key
  if (apiKey) {
    try {
      console.log('\n📝 Test 6: Validate API key...');
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/api-customization/keys/${apiKey}/validate`,
        {
          params: {
            path: '/api/v1/custom/analytics',
            method: 'GET'
          }
        }
      );

      results.push({
        test: 'Validate API key',
        passed: response.data.data.valid,
        message: response.data.data.valid ? 'API key is valid' : 'API key is invalid',
        data: response.data.data
      });
      console.log('✅ API key validated');
    } catch (error: any) {
      results.push({
        test: 'Validate API key',
        passed: false,
        message: error.response?.data?.message || error.message
      });
      console.log('❌ Failed to validate API key');
    }
  }

  // Test 7: Get tenant rate limit
  try {
    console.log('\n📝 Test 7: Get tenant rate limit...');
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/api-customization/rate-limit/${tenantId}`,
      {
        params: {
          endpoint: '/api/v1/custom/analytics'
        }
      }
    );

    results.push({
      test: 'Get tenant rate limit',
      passed: response.data.success,
      message: `Rate limit: ${response.data.data.rateLimit} req/min`,
      data: response.data.data
    });
    console.log(`✅ Rate limit: ${response.data.data.rateLimit} req/min`);
  } catch (error: any) {
    results.push({
      test: 'Get tenant rate limit',
      passed: false,
      message: error.response?.data?.message || error.message
    });
    console.log('❌ Failed to get rate limit');
  }

  // Test 8: Check IP whitelist
  try {
    console.log('\n📝 Test 8: Check IP whitelist...');
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/api-customization/security/${tenantId}/ip-whitelist`,
      {
        params: {
          ipAddress: '192.168.1.1'
        }
      }
    );

    results.push({
      test: 'Check IP whitelist',
      passed: response.data.success,
      message: response.data.data.allowed ? 'IP is allowed' : 'IP is blocked',
      data: response.data.data
    });
    console.log(`✅ IP check: ${response.data.data.allowed ? 'Allowed' : 'Blocked'}`);
  } catch (error: any) {
    results.push({
      test: 'Check IP whitelist',
      passed: false,
      message: error.response?.data?.message || error.message
    });
    console.log('❌ Failed to check IP whitelist');
  }

  // Test 9: Check origin allowlist
  try {
    console.log('\n📝 Test 9: Check origin allowlist...');
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/api-customization/security/${tenantId}/origin`,
      {
        params: {
          origin: 'https://example.com'
        }
      }
    );

    results.push({
      test: 'Check origin allowlist',
      passed: response.data.success,
      message: response.data.data.allowed ? 'Origin is allowed' : 'Origin is blocked',
      data: response.data.data
    });
    console.log(`✅ Origin check: ${response.data.data.allowed ? 'Allowed' : 'Blocked'}`);
  } catch (error: any) {
    results.push({
      test: 'Check origin allowlist',
      passed: false,
      message: error.response?.data?.message || error.message
    });
    console.log('❌ Failed to check origin');
  }

  // Test 10: Delete API endpoint
  try {
    console.log('\n📝 Test 10: Delete API endpoint...');
    const response = await axios.delete(
      `${API_BASE_URL}/api/v1/api-customization/endpoints/${tenantId}/${encodeURIComponent('/api/v1/custom/analytics')}/GET`
    );

    results.push({
      test: 'Delete API endpoint',
      passed: response.data.success,
      message: 'Endpoint deleted successfully'
    });
    console.log('✅ Endpoint deleted');
  } catch (error: any) {
    results.push({
      test: 'Delete API endpoint',
      passed: false,
      message: error.response?.data?.message || error.message
    });
    console.log('❌ Failed to delete endpoint');
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.test}: ${r.message}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  // Cleanup: Delete test tenant
  if (tenantId) {
    try {
      await axios.delete(`${API_BASE_URL}/api/v1/tenants/${tenantId}`);
      console.log('\n🧹 Cleanup: Test tenant deleted');
    } catch (error) {
      console.log('\n⚠️  Warning: Failed to delete test tenant');
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error.message);
  process.exit(1);
});
