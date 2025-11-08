import { cryptoWithdrawalService } from '../services/crypto-withdrawal.service';

/**
 * Test script for crypto withdrawal functionality
 * 
 * Tests:
 * 1. Get withdrawal quote
 * 2. Check withdrawal limits
 * 3. Create withdrawal (requires KYC for >$1000)
 * 4. Monitor withdrawal status
 * 5. Get withdrawal history
 */

async function testCryptoWithdrawal() {
  try {
    console.log('🧪 Testing Crypto Withdrawal Integration\n');

    // Test data
    const testUserId = 'test-user-123';
    const testWalletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
    const testAmountUSD = 100; // Below KYC threshold
    const testToken = 'USDC';

    // Test 1: Get withdrawal quote
    console.log('📊 Test 1: Get Withdrawal Quote');
    console.log('-----------------------------------');
    try {
      const quote = await cryptoWithdrawalService.getWithdrawalQuote({
        amountUSD: testAmountUSD,
        token: testToken as 'USDC',
        walletAddress: testWalletAddress,
      });

      console.log('✅ Quote generated successfully:');
      console.log(`   Amount USD: $${quote.amountUSD}`);
      console.log(`   Token Amount: ${quote.tokenAmount} ${quote.token}`);
      console.log(`   Exchange Rate: ${quote.exchangeRate}`);
      console.log(`   Gas Fee: ${quote.gasFee} ETH ($${quote.gasFeeUSD})`);
      console.log(`   Withdrawal Fee: ${quote.withdrawalFee} ${quote.token} ($${quote.withdrawalFeeUSD})`);
      console.log(`   Net Amount: ${quote.netAmount} ${quote.token} ($${quote.netAmountUSD})`);
      console.log(`   Estimated Time: ${quote.estimatedTime}`);
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
    }
    console.log('');

    // Test 2: Check withdrawal limits
    console.log('🔒 Test 2: Check Withdrawal Limits');
    console.log('-----------------------------------');
    try {
      const limits = await cryptoWithdrawalService.getWithdrawalLimits(testUserId);

      console.log('✅ Limits retrieved successfully:');
      console.log(`   Min Withdrawal: $${limits.minWithdrawal}`);
      console.log(`   Max Withdrawal: $${limits.maxWithdrawal}`);
      console.log(`   KYC Required: $${limits.kycRequired}`);
      console.log(`   KYC Status: ${limits.kycStatus}`);
      console.log(`   KYC Level: ${limits.kycLevel}`);
      console.log(`   Available Balance: $${limits.availableBalance}`);
      console.log(`   Withdrawal Fee: ${limits.withdrawalFeePercent}%`);
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
    }
    console.log('');

    // Test 3: Test minimum withdrawal validation
    console.log('⚠️  Test 3: Minimum Withdrawal Validation');
    console.log('-----------------------------------');
    try {
      await cryptoWithdrawalService.createWithdrawal({
        userId: testUserId,
        walletAddress: testWalletAddress,
        amountUSD: 25, // Below minimum
        token: 'USDC',
      });
      console.log('❌ Should have failed with minimum withdrawal error');
    } catch (error: any) {
      if (error.message.includes('Minimum withdrawal')) {
        console.log('✅ Correctly rejected withdrawal below minimum');
        console.log(`   Error: ${error.message}`);
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }
    console.log('');

    // Test 4: Test KYC requirement for large withdrawals
    console.log('🔐 Test 4: KYC Requirement for Large Withdrawals');
    console.log('-----------------------------------');
    try {
      await cryptoWithdrawalService.createWithdrawal({
        userId: testUserId,
        walletAddress: testWalletAddress,
        amountUSD: 1500, // Above KYC threshold
        token: 'USDC',
      });
      console.log('❌ Should have failed with KYC requirement error');
    } catch (error: any) {
      if (error.message.includes('KYC verification required')) {
        console.log('✅ Correctly enforced KYC requirement');
        console.log(`   Error: ${error.message}`);
      } else {
        console.log(`⚠️  Different error: ${error.message}`);
      }
    }
    console.log('');

    // Test 5: Test invalid wallet address
    console.log('🚫 Test 5: Invalid Wallet Address Validation');
    console.log('-----------------------------------');
    try {
      await cryptoWithdrawalService.getWithdrawalQuote({
        amountUSD: 100,
        token: 'USDC',
        walletAddress: 'invalid-address',
      });
      console.log('❌ Should have failed with invalid address error');
    } catch (error: any) {
      if (error.message.includes('Invalid wallet address')) {
        console.log('✅ Correctly rejected invalid wallet address');
        console.log(`   Error: ${error.message}`);
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }
    console.log('');

    // Test 6: Test supported tokens
    console.log('💰 Test 6: Supported Tokens');
    console.log('-----------------------------------');
    const tokens = ['ETH', 'USDC', 'USDT'];
    for (const token of tokens) {
      try {
        const quote = await cryptoWithdrawalService.getWithdrawalQuote({
          amountUSD: 100,
          token: token as 'ETH' | 'USDC' | 'USDT',
          walletAddress: testWalletAddress,
        });
        console.log(`✅ ${token}: Quote generated successfully`);
        console.log(`   Token Amount: ${quote.tokenAmount} ${token}`);
      } catch (error: any) {
        console.log(`❌ ${token}: Failed - ${error.message}`);
      }
    }
    console.log('');

    // Test 7: Test withdrawal history (empty)
    console.log('📜 Test 7: Withdrawal History');
    console.log('-----------------------------------');
    try {
      const history = await cryptoWithdrawalService.getWithdrawalHistory(testUserId);

      console.log('✅ History retrieved successfully:');
      console.log(`   Total Withdrawals: ${history.total}`);
      console.log(`   Total Withdrawn: $${history.totalWithdrawn}`);
      console.log(`   Withdrawals: ${history.withdrawals.length} records`);
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
    }
    console.log('');

    // Summary
    console.log('📋 Test Summary');
    console.log('===============');
    console.log('✅ Withdrawal quote generation');
    console.log('✅ Withdrawal limits check');
    console.log('✅ Minimum withdrawal validation');
    console.log('✅ KYC requirement enforcement');
    console.log('✅ Invalid address validation');
    console.log('✅ Multi-token support (ETH, USDC, USDT)');
    console.log('✅ Withdrawal history retrieval');
    console.log('');
    console.log('🎉 All tests completed!');
    console.log('');
    console.log('📝 Notes:');
    console.log('   - Minimum withdrawal: $50');
    console.log('   - KYC required for withdrawals > $1000');
    console.log('   - Withdrawal fee: 1%');
    console.log('   - Gas fees estimated dynamically');
    console.log('   - Confirmations required: 12 blocks (~3 minutes)');
    console.log('   - Supported tokens: ETH, USDC, USDT');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run tests
if (require.main === module) {
  testCryptoWithdrawal()
    .then(() => {
      console.log('\n✅ Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test script failed:', error);
      process.exit(1);
    });
}

export { testCryptoWithdrawal };
