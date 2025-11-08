import { paypalService } from '../services/paypal.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

async function runTest(
  testName: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({
      test: testName,
      status: 'PASS',
      message: 'Test passed successfully',
      duration,
    });
    console.log(`✅ ${testName} - PASSED (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    results.push({
      test: testName,
      status: 'FAIL',
      message: error.message,
      duration,
    });
    console.error(`❌ ${testName} - FAILED: ${error.message}`);
  }
}

async function testPayPalIntegration() {
  console.log('\n🚀 Starting PayPal Integration Tests\n');
  console.log('='.repeat(60));

  const testUserId = `test-user-${Date.now()}`;
  const testEmail = `test-${Date.now()}@example.com`;
  let accountId: string;
  let payoutId: string;

  // Test 1: Link PayPal Account
  await runTest('Link PayPal Account', async () => {
    const result = await paypalService.linkPayPalAccount({
      userId: testUserId,
      paypalEmail: testEmail,
      metadata: { source: 'test' },
    });

    if (!result.accountId) {
      throw new Error('Account ID not returned');
    }

    if (result.paypalEmail !== testEmail) {
      throw new Error('Email mismatch');
    }

    if (result.status !== 'verified') {
      throw new Error('Account not verified');
    }

    accountId = result.accountId;
    console.log(`   Account ID: ${accountId}`);
  });

  // Test 2: Get PayPal Account
  await runTest('Get PayPal Account', async () => {
    const account = await paypalService.getPayPalAccount(testUserId);

    if (!account) {
      throw new Error('Account not found');
    }

    if (account.paypalEmail !== testEmail) {
      throw new Error('Email mismatch');
    }

    console.log(`   Status: ${account.status}`);
  });

  // Test 3: Update PayPal Account
  await runTest('Update PayPal Account', async () => {
    const newEmail = `updated-${Date.now()}@example.com`;
    const result = await paypalService.linkPayPalAccount({
      userId: testUserId,
      paypalEmail: newEmail,
    });

    if (result.paypalEmail !== newEmail) {
      throw new Error('Email not updated');
    }

    console.log(`   Updated email: ${newEmail}`);
  });

  // Test 4: Validate Email Format
  await runTest('Validate Email Format', async () => {
    try {
      await paypalService.linkPayPalAccount({
        userId: testUserId,
        paypalEmail: 'invalid-email',
      });
      throw new Error('Should have thrown validation error');
    } catch (error: any) {
      if (!error.message.includes('Invalid PayPal email format')) {
        throw error;
      }
    }
  });

  // Test 5: Create Mock Payment for Balance
  await runTest('Create Mock Payment for Balance', async () => {
    // Create a mock payment to have balance for payout
    await prisma.payment.create({
      data: {
        userId: testUserId,
        amount: 1000,
        currency: 'USD',
        paymentMethod: 'test',
        status: 'succeeded',
      },
    });

    console.log('   Mock payment created: $1000');
  });

  // Test 6: Create PayPal Payout (will fail in test without real credentials)
  await runTest('Create PayPal Payout (Mock)', async () => {
    // This test will fail without real PayPal credentials
    // but we can test the validation logic
    try {
      const result = await paypalService.createPayPalPayout({
        userId: testUserId,
        amount: 100,
        currency: 'USD',
        description: 'Test payout',
      });

      payoutId = result.payoutId;
      console.log(`   Payout ID: ${payoutId}`);
      console.log(`   Net Amount: $${result.netAmount}`);
      console.log(`   Fee: $${result.fee}`);
    } catch (error: any) {
      // Expected to fail without real credentials
      if (error.message.includes('Failed to authenticate with PayPal') || 
          error.message.includes('PayPal credentials not configured')) {
        console.log('   ⚠️  Skipped: PayPal credentials not configured');
        return;
      }
      throw error;
    }
  });

  // Test 7: Validate Minimum Payout Amount
  await runTest('Validate Minimum Payout Amount', async () => {
    try {
      await paypalService.createPayPalPayout({
        userId: testUserId,
        amount: 25, // Below minimum
        currency: 'USD',
      });
      throw new Error('Should have thrown minimum amount error');
    } catch (error: any) {
      if (!error.message.includes('Minimum payout amount is $50')) {
        throw error;
      }
    }
  });

  // Test 8: Validate Insufficient Balance
  await runTest('Validate Insufficient Balance', async () => {
    const newUserId = `test-user-no-balance-${Date.now()}`;
    
    // Link account without balance
    await paypalService.linkPayPalAccount({
      userId: newUserId,
      paypalEmail: `no-balance-${Date.now()}@example.com`,
    });

    try {
      await paypalService.createPayPalPayout({
        userId: newUserId,
        amount: 100,
        currency: 'USD',
      });
      throw new Error('Should have thrown insufficient balance error');
    } catch (error: any) {
      if (!error.message.includes('Insufficient balance')) {
        throw error;
      }
    }
  });

  // Test 9: Test Retry Logic
  await runTest('Test Retry Logic', async () => {
    // Create a failed payout
    const failedPayout = await prisma.payout.create({
      data: {
        userId: testUserId,
        payoutMethod: 'paypal',
        paypalEmail: testEmail,
        amount: 100,
        currency: 'USD',
        fee: 1,
        netAmount: 99,
        status: 'failed',
        failureReason: 'Test failure',
        retryCount: 0,
      },
    });

    try {
      // Retry should fail without real credentials
      await paypalService.retryPayPalPayout(failedPayout.id);
    } catch (error: any) {
      if (error.message.includes('Failed to authenticate with PayPal') ||
          error.message.includes('PayPal credentials not configured')) {
        console.log('   ⚠️  Skipped: PayPal credentials not configured');
        return;
      }
      throw error;
    }
  });

  // Test 10: Test Maximum Retry Attempts
  await runTest('Test Maximum Retry Attempts', async () => {
    // Create a payout with max retries
    const maxRetriesPayout = await prisma.payout.create({
      data: {
        userId: testUserId,
        payoutMethod: 'paypal',
        paypalEmail: testEmail,
        amount: 100,
        currency: 'USD',
        fee: 1,
        netAmount: 99,
        status: 'failed',
        failureReason: 'Test failure',
        retryCount: 3, // Max retries
      },
    });

    try {
      await paypalService.retryPayPalPayout(maxRetriesPayout.id);
      throw new Error('Should have thrown max retry error');
    } catch (error: any) {
      if (!error.message.includes('Maximum retry attempts reached')) {
        throw error;
      }
    }
  });

  // Test 11: Test Retry Backoff
  await runTest('Test Retry Backoff', async () => {
    // Create a recently retried payout
    const recentRetryPayout = await prisma.payout.create({
      data: {
        userId: testUserId,
        payoutMethod: 'paypal',
        paypalEmail: testEmail,
        amount: 100,
        currency: 'USD',
        fee: 1,
        netAmount: 99,
        status: 'failed',
        failureReason: 'Test failure',
        retryCount: 1,
        lastRetryAt: new Date(), // Just retried
      },
    });

    try {
      await paypalService.retryPayPalPayout(recentRetryPayout.id);
      throw new Error('Should have thrown backoff error');
    } catch (error: any) {
      if (!error.message.includes('Please wait')) {
        throw error;
      }
    }
  });

  // Test 12: Database Integrity
  await runTest('Database Integrity Check', async () => {
    // Check PayPal account exists
    const account = await prisma.payPalAccount.findUnique({
      where: { userId: testUserId },
    });

    if (!account) {
      throw new Error('PayPal account not found in database');
    }

    // Check payouts exist
    const payouts = await prisma.payout.findMany({
      where: { userId: testUserId },
    });

    console.log(`   PayPal accounts: 1`);
    console.log(`   Payouts: ${payouts.length}`);
  });

  // Cleanup
  console.log('\n' + '='.repeat(60));
  console.log('🧹 Cleaning up test data...');

  try {
    // Delete test payouts
    await prisma.payout.deleteMany({
      where: { userId: testUserId },
    });

    // Delete test payments
    await prisma.payment.deleteMany({
      where: { userId: testUserId },
    });

    // Delete test PayPal accounts
    await prisma.payPalAccount.deleteMany({
      where: { userId: testUserId },
    });

    console.log('✅ Cleanup completed');
  } catch (error: any) {
    console.error('❌ Cleanup failed:', error.message);
  }

  // Print Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary\n');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => {
        console.log(`   - ${r.test}: ${r.message}`);
      });
  }

  console.log('\n' + '='.repeat(60));

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
testPayPalIntegration()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
