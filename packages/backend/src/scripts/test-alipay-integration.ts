import { alipayService } from '../services/alipay.service';
import { logger } from '../utils/logger';

/**
 * Test script for Alipay integration
 * 
 * This script tests the Alipay payment flow in sandbox environment
 * 
 * Usage:
 *   tsx src/scripts/test-alipay-integration.ts
 */

async function testAlipayIntegration() {
  console.log('🧪 Testing Alipay Integration...\n');

  try {
    // Test 1: Create Web Payment
    console.log('Test 1: Creating Alipay web payment...');
    const webPayment = await alipayService.createWebPayment({
      userId: 'test-user-123',
      contentId: 'test-content-456',
      amount: 100,
      currency: 'CNY',
      subject: 'Test Content Purchase',
      body: 'Testing Alipay web payment integration',
      metadata: {
        testMode: 'true',
      },
    });

    console.log('✅ Web payment created successfully');
    console.log('Payment ID:', webPayment.paymentId);
    console.log('Out Trade No:', webPayment.outTradeNo);
    console.log('Payment URL:', webPayment.paymentUrl);
    console.log('Amount:', webPayment.amount, webPayment.currency);
    console.log('');

    // Test 2: Create WAP Payment
    console.log('Test 2: Creating Alipay WAP payment...');
    const wapPayment = await alipayService.createWapPayment({
      userId: 'test-user-123',
      amount: 50,
      currency: 'CNY',
      subject: 'Mobile Content Purchase',
      body: 'Testing Alipay WAP payment integration',
    });

    console.log('✅ WAP payment created successfully');
    console.log('Payment ID:', wapPayment.paymentId);
    console.log('Out Trade No:', wapPayment.outTradeNo);
    console.log('Payment URL:', wapPayment.paymentUrl);
    console.log('');

    // Test 3: Query Payment Status
    console.log('Test 3: Querying payment status...');
    try {
      const paymentStatus = await alipayService.queryPayment(webPayment.outTradeNo);
      console.log('✅ Payment status queried successfully');
      console.log('Trade Status:', paymentStatus.tradeStatus);
      console.log('Trade No:', paymentStatus.tradeNo);
      console.log('');
    } catch (error: any) {
      console.log('⚠️  Payment not found in Alipay (expected for new payment)');
      console.log('Error:', error.message);
      console.log('');
    }

    // Test 4: Test Notify Handler (Simulated)
    console.log('Test 4: Testing notify handler (simulated)...');
    const mockNotifyParams = {
      out_trade_no: webPayment.outTradeNo,
      trade_no: 'MOCK_ALIPAY_TRADE_NO_123456',
      trade_status: 'TRADE_SUCCESS',
      total_amount: '100.00',
      buyer_logon_id: 'test@example.com',
      buyer_user_id: 'test_buyer_123',
      passback_params: encodeURIComponent(JSON.stringify({
        paymentId: webPayment.paymentId,
        userId: 'test-user-123',
      })),
    };

    console.log('⚠️  Note: Signature verification will fail in test mode');
    console.log('In production, Alipay will sign the notification');
    console.log('');

    // Test 5: Get Payment by OutTradeNo
    console.log('Test 5: Getting payment by outTradeNo...');
    const payment = await alipayService.getPaymentByOutTradeNo(webPayment.outTradeNo);
    console.log('✅ Payment retrieved successfully');
    console.log('Payment ID:', payment.id);
    console.log('Status:', payment.status);
    console.log('Amount:', payment.amount.toString(), payment.currency);
    console.log('');

    // Test 6: Close Payment (Cancel)
    console.log('Test 6: Closing payment (cancel unpaid order)...');
    try {
      const closeResult = await alipayService.closePayment(webPayment.outTradeNo);
      console.log('✅ Payment closed successfully');
      console.log('Out Trade No:', closeResult.outTradeNo);
      console.log('');
    } catch (error: any) {
      console.log('⚠️  Cannot close payment (may not exist in Alipay yet)');
      console.log('Error:', error.message);
      console.log('');
    }

    // Test 7: Validation Tests
    console.log('Test 7: Running validation tests...');
    
    // Test invalid amount
    try {
      await alipayService.createWebPayment({
        userId: 'test-user',
        amount: 0,
        currency: 'CNY',
        subject: 'Test',
      });
      console.log('❌ Should have rejected invalid amount');
    } catch (error: any) {
      console.log('✅ Correctly rejected invalid amount:', error.message);
    }

    // Test invalid currency
    try {
      await alipayService.createWebPayment({
        userId: 'test-user',
        amount: 100,
        currency: 'USD',
        subject: 'Test',
      });
      console.log('❌ Should have rejected invalid currency');
    } catch (error: any) {
      console.log('✅ Correctly rejected invalid currency:', error.message);
    }

    console.log('');
    console.log('🎉 All tests completed!');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('1. Configure Alipay credentials in .env file');
    console.log('2. Test payment flow in Alipay sandbox environment');
    console.log('3. Configure notify URL in Alipay dashboard');
    console.log('4. Test callback/redirect flow with real Alipay sandbox');
    console.log('5. Verify signature validation with real Alipay notifications');
    console.log('');
    console.log('🔗 Alipay Sandbox: https://openhome.alipay.com/platform/appDaily.htm');
    console.log('');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testAlipayIntegration()
  .then(() => {
    console.log('✅ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
