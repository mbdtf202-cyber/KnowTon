import axios from 'axios';
import { logger } from '../utils/logger';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message?: string;
  data?: any;
}

const results: TestResult[] = [];

/**
 * Test Payout Integration
 */
async function testPayoutIntegration() {
  console.log('🧪 Testing Payout Integration with Stripe Connect\n');
  console.log('='.repeat(60));

  const testUserId = 'test-creator-' + Date.now();
  const testEmail = `creator-${Date.now()}@test.com`;
  let accountId: string;
  let payoutId: string;

  // Test 1: Create Stripe Connect Account
  try {
    console.log('\n📝 Test 1: Create Stripe Connect Account');
    const response = await axios.post(`${API_BASE_URL}/api/v1/payouts/connect/create`, {
      userId: testUserId,
      email: testEmail,
      country: 'US',
      businessType: 'individual',
      metadata: {
        testMode: 'true',
      },
    });

    if (response.data.success && response.data.data.accountId) {
      accountId = response.data.data.accountId;
      results.push({
        test: 'Create Connect Account',
        status: 'PASS',
        data: {
          accountId,
          status: response.data.data.status,
          onboardingUrl: response.data.data.onboardingUrl ? 'Generated' : 'N/A',
        },
      });
      console.log('✅ PASS - Connect account created');
      console.log(`   Account ID: ${accountId}`);
      console.log(`   Status: ${response.data.data.status}`);
      if (response.data.data.onboardingUrl) {
        console.log(`   Onboarding URL: ${response.data.data.onboardingUrl.substring(0, 50)}...`);
      }
    } else {
      throw new Error('Invalid response structure');
    }
  } catch (error: any) {
    results.push({
      test: 'Create Connect Account',
      status: 'FAIL',
      message: error.response?.data?.error || error.message,
    });
    console.log('❌ FAIL - ' + (error.response?.data?.error || error.message));
    return; // Stop if account creation fails
  }

  // Test 2: Get Connect Account Details
  try {
    console.log('\n📝 Test 2: Get Connect Account Details');
    const response = await axios.get(`${API_BASE_URL}/api/v1/payouts/connect/${testUserId}`);

    if (response.data.success && response.data.data.accountId === accountId) {
      results.push({
        test: 'Get Connect Account',
        status: 'PASS',
        data: {
          accountId: response.data.data.accountId,
          email: response.data.data.email,
          country: response.data.data.country,
          status: response.data.data.status,
          payoutsEnabled: response.data.data.payoutsEnabled,
        },
      });
      console.log('✅ PASS - Account details retrieved');
      console.log(`   Email: ${response.data.data.email}`);
      console.log(`   Country: ${response.data.data.country}`);
      console.log(`   Status: ${response.data.data.status}`);
      console.log(`   Payouts Enabled: ${response.data.data.payoutsEnabled}`);
    } else {
      throw new Error('Invalid response or account ID mismatch');
    }
  } catch (error: any) {
    results.push({
      test: 'Get Connect Account',
      status: 'FAIL',
      message: error.response?.data?.error || error.message,
    });
    console.log('❌ FAIL - ' + (error.response?.data?.error || error.message));
  }

  // Test 3: Create Payout (will fail in test mode without completed onboarding)
  try {
    console.log('\n📝 Test 3: Create Payout (Expected to fail without onboarding)');
    const response = await axios.post(`${API_BASE_URL}/api/v1/payouts/create`, {
      userId: testUserId,
      amount: 100,
      currency: 'USD',
      description: 'Test payout',
      metadata: {
        testMode: 'true',
      },
    });

    if (response.data.success) {
      payoutId = response.data.data.payoutId;
      results.push({
        test: 'Create Payout',
        status: 'PASS',
        data: {
          payoutId,
          amount: response.data.data.amount,
          currency: response.data.data.currency,
          fee: response.data.data.fee,
          netAmount: response.data.data.netAmount,
          status: response.data.data.status,
        },
      });
      console.log('✅ PASS - Payout created (unexpected in test mode)');
      console.log(`   Payout ID: ${payoutId}`);
      console.log(`   Amount: ${response.data.data.currency} ${response.data.data.amount}`);
      console.log(`   Fee: ${response.data.data.currency} ${response.data.data.fee}`);
      console.log(`   Net Amount: ${response.data.data.currency} ${response.data.data.netAmount}`);
    }
  } catch (error: any) {
    // Expected to fail without completed onboarding
    const errorMsg = error.response?.data?.error || error.message;
    if (errorMsg.includes('onboarding') || errorMsg.includes('not enabled')) {
      results.push({
        test: 'Create Payout',
        status: 'PASS',
        message: 'Expected failure: ' + errorMsg,
      });
      console.log('✅ PASS - Expected failure (onboarding not completed)');
      console.log(`   Message: ${errorMsg}`);
    } else {
      results.push({
        test: 'Create Payout',
        status: 'FAIL',
        message: errorMsg,
      });
      console.log('❌ FAIL - ' + errorMsg);
    }
  }

  // Test 4: Get Payout History
  try {
    console.log('\n📝 Test 4: Get Payout History');
    const response = await axios.get(`${API_BASE_URL}/api/v1/payouts/history/${testUserId}`, {
      params: {
        limit: 10,
        offset: 0,
      },
    });

    if (response.data.success) {
      results.push({
        test: 'Get Payout History',
        status: 'PASS',
        data: {
          total: response.data.data.total,
          payouts: response.data.data.payouts.length,
          totalPaid: response.data.data.totalPaid,
        },
      });
      console.log('✅ PASS - Payout history retrieved');
      console.log(`   Total Payouts: ${response.data.data.total}`);
      console.log(`   Total Paid: $${response.data.data.totalPaid}`);
    } else {
      throw new Error('Invalid response structure');
    }
  } catch (error: any) {
    results.push({
      test: 'Get Payout History',
      status: 'FAIL',
      message: error.response?.data?.error || error.message,
    });
    console.log('❌ FAIL - ' + (error.response?.data?.error || error.message));
  }

  // Test 5: Validation - Minimum Payout Amount
  try {
    console.log('\n📝 Test 5: Validation - Minimum Payout Amount');
    await axios.post(`${API_BASE_URL}/api/v1/payouts/create`, {
      userId: testUserId,
      amount: 25, // Below minimum of $50
      currency: 'USD',
    });

    results.push({
      test: 'Minimum Payout Validation',
      status: 'FAIL',
      message: 'Should have rejected amount below $50',
    });
    console.log('❌ FAIL - Should have rejected amount below $50');
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || error.message;
    if (errorMsg.includes('Minimum') || errorMsg.includes('50')) {
      results.push({
        test: 'Minimum Payout Validation',
        status: 'PASS',
        message: 'Correctly rejected: ' + errorMsg,
      });
      console.log('✅ PASS - Correctly rejected minimum amount');
      console.log(`   Message: ${errorMsg}`);
    } else {
      results.push({
        test: 'Minimum Payout Validation',
        status: 'FAIL',
        message: 'Wrong error: ' + errorMsg,
      });
      console.log('❌ FAIL - Wrong error: ' + errorMsg);
    }
  }

  // Test 6: Validation - Missing Required Fields
  try {
    console.log('\n📝 Test 6: Validation - Missing Required Fields');
    await axios.post(`${API_BASE_URL}/api/v1/payouts/create`, {
      userId: testUserId,
      // Missing amount and currency
    });

    results.push({
      test: 'Required Fields Validation',
      status: 'FAIL',
      message: 'Should have rejected missing fields',
    });
    console.log('❌ FAIL - Should have rejected missing fields');
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || error.message;
    if (errorMsg.includes('required') || errorMsg.includes('Missing')) {
      results.push({
        test: 'Required Fields Validation',
        status: 'PASS',
        message: 'Correctly rejected: ' + errorMsg,
      });
      console.log('✅ PASS - Correctly rejected missing fields');
      console.log(`   Message: ${errorMsg}`);
    } else {
      results.push({
        test: 'Required Fields Validation',
        status: 'FAIL',
        message: 'Wrong error: ' + errorMsg,
      });
      console.log('❌ FAIL - Wrong error: ' + errorMsg);
    }
  }

  // Print Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary\n');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  console.log('\n' + '='.repeat(60));
  console.log('📋 Detailed Results:\n');

  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${index + 1}. ${icon} ${result.test}: ${result.status}`);
    if (result.message) {
      console.log(`   Message: ${result.message}`);
    }
    if (result.data) {
      console.log(`   Data:`, JSON.stringify(result.data, null, 2));
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Integration Notes:');
  console.log('   - Stripe Connect accounts require onboarding to enable payouts');
  console.log('   - In production, creators must complete identity verification');
  console.log('   - Bank account verification may require micro-deposits');
  console.log('   - Minimum payout amount is $50');
  console.log('   - Payout fee is 2.5% for bank transfers');
  console.log('   - Standard bank transfers take 3-5 business days');
  console.log('\n' + '='.repeat(60));
}

// Run tests
testPayoutIntegration()
  .then(() => {
    console.log('\n✨ Payout integration tests completed\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });
