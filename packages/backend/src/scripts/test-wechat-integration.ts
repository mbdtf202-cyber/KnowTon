import axios from 'axios';
import QRCode from 'qrcode';
import { logger } from '../utils/logger';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
  data?: any;
}

const results: TestResult[] = [];

/**
 * Test WeChat Pay Native payment creation
 */
async function testNativePayment() {
  try {
    console.log('\n🧪 Testing WeChat Pay Native payment creation...');

    const response = await axios.post(`${API_BASE_URL}/api/v1/payments/wechat/native`, {
      userId: 'test-user-123',
      contentId: 'test-content-456',
      amount: 99.99,
      subject: 'Test Content Purchase',
      body: 'Testing WeChat Pay Native payment',
      metadata: {
        testMode: 'true',
      },
    });

    if (response.data.success && response.data.data.codeUrl) {
      console.log('✅ Native payment created successfully');
      console.log('Payment ID:', response.data.data.paymentId);
      console.log('Out Trade No:', response.data.data.outTradeNo);
      console.log('Code URL:', response.data.data.codeUrl);

      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(response.data.data.codeUrl);
      console.log('QR Code generated (data URL):', qrCodeDataUrl.substring(0, 50) + '...');

      results.push({
        test: 'Native Payment Creation',
        status: 'PASS',
        message: 'Successfully created native payment with QR code',
        data: response.data.data,
      });

      return response.data.data;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error: any) {
    console.error('❌ Native payment creation failed:', error.response?.data || error.message);
    results.push({
      test: 'Native Payment Creation',
      status: 'FAIL',
      message: error.response?.data?.error || error.message,
    });
    return null;
  }
}

/**
 * Test WeChat Pay JSAPI payment creation
 */
async function testJsapiPayment() {
  try {
    console.log('\n🧪 Testing WeChat Pay JSAPI payment creation...');

    const response = await axios.post(`${API_BASE_URL}/api/v1/payments/wechat/jsapi`, {
      userId: 'test-user-123',
      contentId: 'test-content-456',
      amount: 88.88,
      subject: 'Test Content Purchase (JSAPI)',
      body: 'Testing WeChat Pay JSAPI payment',
      openid: 'test-openid-123',
      metadata: {
        testMode: 'true',
      },
    });

    if (response.data.success && response.data.data.prepayId) {
      console.log('✅ JSAPI payment created successfully');
      console.log('Payment ID:', response.data.data.paymentId);
      console.log('Prepay ID:', response.data.data.prepayId);
      console.log('Payment Params:', JSON.stringify(response.data.data.paymentParams, null, 2));

      results.push({
        test: 'JSAPI Payment Creation',
        status: 'PASS',
        message: 'Successfully created JSAPI payment with prepay ID',
        data: response.data.data,
      });

      return response.data.data;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error: any) {
    console.error('❌ JSAPI payment creation failed:', error.response?.data || error.message);
    results.push({
      test: 'JSAPI Payment Creation',
      status: 'FAIL',
      message: error.response?.data?.error || error.message,
    });
    return null;
  }
}

/**
 * Test payment query
 */
async function testPaymentQuery(outTradeNo: string) {
  try {
    console.log('\n🧪 Testing WeChat Pay payment query...');

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/payments/wechat/query/${outTradeNo}`
    );

    if (response.data.success) {
      console.log('✅ Payment query successful');
      console.log('Trade State:', response.data.data.tradeState);
      console.log('Trade State Desc:', response.data.data.tradeStateDesc);

      results.push({
        test: 'Payment Query',
        status: 'PASS',
        message: 'Successfully queried payment status',
        data: response.data.data,
      });

      return response.data.data;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error: any) {
    console.error('❌ Payment query failed:', error.response?.data || error.message);
    results.push({
      test: 'Payment Query',
      status: 'FAIL',
      message: error.response?.data?.error || error.message,
    });
    return null;
  }
}

/**
 * Test payment closure
 */
async function testPaymentClose(outTradeNo: string) {
  try {
    console.log('\n🧪 Testing WeChat Pay payment closure...');

    const response = await axios.post(`${API_BASE_URL}/api/v1/payments/wechat/close`, {
      outTradeNo,
    });

    if (response.data.success) {
      console.log('✅ Payment closed successfully');

      results.push({
        test: 'Payment Closure',
        status: 'PASS',
        message: 'Successfully closed payment',
        data: response.data.data,
      });

      return response.data.data;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error: any) {
    console.error('❌ Payment closure failed:', error.response?.data || error.message);
    results.push({
      test: 'Payment Closure',
      status: 'FAIL',
      message: error.response?.data?.error || error.message,
    });
    return null;
  }
}

/**
 * Test refund
 */
async function testRefund(outTradeNo: string) {
  try {
    console.log('\n🧪 Testing WeChat Pay refund...');

    const response = await axios.post(`${API_BASE_URL}/api/v1/payments/wechat/refund`, {
      outTradeNo,
      refundAmount: 50.00,
      refundReason: 'Test refund',
    });

    if (response.data.success) {
      console.log('✅ Refund processed successfully');
      console.log('Refund ID:', response.data.data.refundId);
      console.log('Out Refund No:', response.data.data.outRefundNo);

      results.push({
        test: 'Payment Refund',
        status: 'PASS',
        message: 'Successfully processed refund',
        data: response.data.data,
      });

      return response.data.data;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error: any) {
    console.error('❌ Refund failed:', error.response?.data || error.message);
    results.push({
      test: 'Payment Refund',
      status: 'FAIL',
      message: error.response?.data?.error || error.message,
    });
    return null;
  }
}

/**
 * Test get payment by outTradeNo
 */
async function testGetPayment(outTradeNo: string) {
  try {
    console.log('\n🧪 Testing get payment by outTradeNo...');

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/payments/wechat/payment/${outTradeNo}`
    );

    if (response.data.success) {
      console.log('✅ Payment retrieved successfully');
      console.log('Payment ID:', response.data.data.id);
      console.log('Status:', response.data.data.status);
      console.log('Amount:', response.data.data.amount);

      results.push({
        test: 'Get Payment',
        status: 'PASS',
        message: 'Successfully retrieved payment',
        data: response.data.data,
      });

      return response.data.data;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error: any) {
    console.error('❌ Get payment failed:', error.response?.data || error.message);
    results.push({
      test: 'Get Payment',
      status: 'FAIL',
      message: error.response?.data?.error || error.message,
    });
    return null;
  }
}

/**
 * Print test summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.message}`);
  });

  console.log('\n' + '-'.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please check the logs above.');
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting WeChat Pay Integration Tests...');
  console.log('API Base URL:', API_BASE_URL);

  try {
    // Test 1: Create Native payment
    const nativePayment = await testNativePayment();

    // Test 2: Create JSAPI payment
    const jsapiPayment = await testJsapiPayment();

    // Test 3: Query payment (if native payment was created)
    if (nativePayment) {
      await testPaymentQuery(nativePayment.outTradeNo);
      
      // Test 4: Get payment by outTradeNo
      await testGetPayment(nativePayment.outTradeNo);

      // Test 5: Close payment
      await testPaymentClose(nativePayment.outTradeNo);
    }

    // Note: Refund test is commented out as it requires a successful payment first
    // Uncomment and use a real outTradeNo from a successful payment to test refund
    // await testRefund('WX1234567890');

    // Print summary
    printSummary();

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };
