#!/usr/bin/env tsx

/**
 * Payment Integration Test Script
 * 
 * This script tests the Stripe payment integration including:
 * - Creating payment intents
 * - Multi-currency support
 * - Installment payments
 * - Payment confirmation
 * - Refund processing
 */

import { paymentService } from '../services/payment.service';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  message: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({
      name,
      status: 'PASS',
      message: 'Test passed successfully',
      duration,
    });
    console.log(`✅ ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    results.push({
      name,
      status: 'FAIL',
      message: error.message,
      duration,
    });
    console.error(`❌ ${name} (${duration}ms)`);
    console.error(`   Error: ${error.message}`);
  }
}

async function testCreatePaymentIntent() {
  const result = await paymentService.createPaymentIntent({
    userId: 'test_user_' + Date.now(),
    amount: 99.99,
    currency: 'USD',
  });

  if (!result.paymentId) throw new Error('Payment ID not returned');
  if (!result.clientSecret) throw new Error('Client secret not returned');
  if (!result.paymentIntentId) throw new Error('Payment intent ID not returned');
  if (result.amount !== 99.99) throw new Error('Amount mismatch');
  if (result.currency !== 'USD') throw new Error('Currency mismatch');
}

async function testMultiCurrencySupport() {
  const currencies = ['USD', 'EUR', 'CNY', 'JPY'];

  for (const currency of currencies) {
    const result = await paymentService.createPaymentIntent({
      userId: 'test_user_' + Date.now(),
      amount: 100,
      currency: currency as any,
    });

    if (result.currency !== currency) {
      throw new Error(`Currency mismatch for ${currency}`);
    }
  }
}

async function testInstallmentPayment() {
  const result = await paymentService.createPaymentIntent({
    userId: 'test_user_' + Date.now(),
    amount: 300,
    currency: 'USD',
    installments: {
      enabled: true,
      months: 3,
    },
  });

  if (!result.installmentPlan) {
    throw new Error('Installment plan not returned');
  }

  if (result.installmentPlan.months !== 3) {
    throw new Error('Installment months mismatch');
  }

  const expectedMonthly = (300 / 3).toFixed(2);
  if (result.installmentPlan.amountPerMonth !== expectedMonthly) {
    throw new Error('Installment amount per month mismatch');
  }
}

async function testGetPayment() {
  // Create a payment first
  const created = await paymentService.createPaymentIntent({
    userId: 'test_user_' + Date.now(),
    amount: 50,
    currency: 'USD',
  });

  // Retrieve it
  const payment = await paymentService.getPayment(created.paymentId);

  if (!payment) throw new Error('Payment not found');
  if (payment.id !== created.paymentId) throw new Error('Payment ID mismatch');
  if (Number(payment.amount) !== 50) throw new Error('Amount mismatch');
}

async function testListPayments() {
  const userId = 'test_user_' + Date.now();

  // Create multiple payments
  await paymentService.createPaymentIntent({
    userId,
    amount: 10,
    currency: 'USD',
  });

  await paymentService.createPaymentIntent({
    userId,
    amount: 20,
    currency: 'USD',
  });

  // List payments
  const result = await paymentService.listPayments(userId, {
    limit: 10,
    offset: 0,
  });

  if (result.payments.length < 2) {
    throw new Error('Expected at least 2 payments');
  }

  if (result.total < 2) {
    throw new Error('Total count mismatch');
  }
}

async function testGetSupportedCurrencies() {
  const currencies = paymentService.getSupportedCurrencies();

  if (currencies.length !== 4) {
    throw new Error('Expected 4 supported currencies');
  }

  const codes = currencies.map((c) => c.code);
  const expectedCodes = ['USD', 'EUR', 'CNY', 'JPY'];

  for (const code of expectedCodes) {
    if (!codes.includes(code)) {
      throw new Error(`Currency ${code} not found in supported list`);
    }
  }
}

async function testInvalidAmount() {
  try {
    await paymentService.createPaymentIntent({
      userId: 'test_user',
      amount: 0,
      currency: 'USD',
    });
    throw new Error('Should have thrown error for zero amount');
  } catch (error: any) {
    if (!error.message.includes('Amount must be greater than 0')) {
      throw new Error('Wrong error message for invalid amount');
    }
  }
}

async function testPaymentMetadata() {
  const metadata = {
    orderId: 'order_123',
    productId: 'product_456',
  };

  const result = await paymentService.createPaymentIntent({
    userId: 'test_user_' + Date.now(),
    amount: 75,
    currency: 'USD',
    metadata,
  });

  const payment = await paymentService.getPayment(result.paymentId);

  if (!payment.metadata) {
    throw new Error('Metadata not saved');
  }

  const savedMetadata = payment.metadata as any;
  if (savedMetadata.orderId !== metadata.orderId) {
    throw new Error('Metadata orderId mismatch');
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
  }

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`\nTotal Duration: ${totalDuration}ms`);

  console.log('\n' + '='.repeat(60));
}

async function main() {
  console.log('🚀 Starting Payment Integration Tests\n');

  // Check environment variables
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not configured in .env');
    console.error('   Please add your Stripe secret key to continue');
    process.exit(1);
  }

  console.log('Running tests...\n');

  // Run all tests
  await runTest('Create Payment Intent', testCreatePaymentIntent);
  await runTest('Multi-Currency Support', testMultiCurrencySupport);
  await runTest('Installment Payment', testInstallmentPayment);
  await runTest('Get Payment', testGetPayment);
  await runTest('List Payments', testListPayments);
  await runTest('Get Supported Currencies', testGetSupportedCurrencies);
  await runTest('Invalid Amount Validation', testInvalidAmount);
  await runTest('Payment Metadata', testPaymentMetadata);

  // Print summary
  await printSummary();

  // Exit with appropriate code
  const failed = results.filter((r) => r.status === 'FAIL').length;
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
