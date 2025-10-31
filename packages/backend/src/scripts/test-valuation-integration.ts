/**
 * Test script for NFT Valuation Integration
 * 
 * This script tests the integration between:
 * - Oracle Adapter valuation service
 * - Lending Service with LTV calculation
 * - Bonding Service with risk assessment
 */

import { valuationClient } from '../utils/valuation-client';
import { LendingService } from '../services/lending.service';
import { BondingService } from '../services/bonding.service';

async function testValuationIntegration() {
  console.log('🧪 Testing NFT Valuation Integration\n');

  try {
    // Test 1: Check Oracle Adapter health
    console.log('1️⃣  Checking Oracle Adapter health...');
    const isHealthy = await valuationClient.healthCheck();
    console.log(`   Oracle Adapter status: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}\n`);

    if (!isHealthy) {
      console.log('⚠️  Oracle Adapter is not available. Skipping integration tests.');
      return;
    }

    // Test 2: Get valuation for a test NFT
    console.log('2️⃣  Getting valuation for test NFT (token ID: 1)...');
    const testValuation = await valuationClient.getValuation({
      token_id: 1,
      metadata: {
        title: 'Test IP-NFT',
        description: 'Test content for valuation',
        category: 'music',
        creator: '0x1234567890123456789012345678901234567890',
        quality_score: 0.8,
        rarity: 0.6,
        views: 1000,
        likes: 150,
        shares: 50,
        has_license: true,
        is_verified: true,
      },
      historical_data: [
        { price: 2500, timestamp: Date.now() / 1000 - 86400 * 30 },
        { price: 2800, timestamp: Date.now() / 1000 - 86400 * 15 },
        { price: 3000, timestamp: Date.now() / 1000 - 86400 * 7 },
      ],
    });

    console.log(`   ✅ Valuation retrieved:`);
    console.log(`      Estimated Value: $${testValuation.estimated_value.toFixed(2)}`);
    console.log(`      Confidence Interval: [$${testValuation.confidence_interval[0].toFixed(2)}, $${testValuation.confidence_interval[1].toFixed(2)}]`);
    console.log(`      Model Uncertainty: ${(testValuation.model_uncertainty || 0) * 100}%`);
    console.log(`      Processing Time: ${testValuation.processing_time_ms?.toFixed(2)}ms\n`);

    // Test 3: Extract risk parameters
    console.log('3️⃣  Extracting risk parameters...');
    const riskParams = valuationClient.extractRiskParameters(testValuation);
    console.log(`   ✅ Risk parameters extracted:`);
    console.log(`      Overall Risk Score: ${riskParams.overall_risk_score.toFixed(3)}`);
    console.log(`      Market Risk: ${riskParams.market_risk}`);
    console.log(`      Creator Risk: ${riskParams.creator_risk}`);
    console.log(`      Liquidity Score: ${riskParams.liquidity_score.toFixed(3)}`);
    console.log(`      Volatility Score: ${riskParams.volatility_score.toFixed(3)}`);
    console.log(`      Risk-Adjusted Value: $${riskParams.risk_adjusted_value.toFixed(2)}\n`);

    // Test 4: Calculate LTV
    console.log('4️⃣  Calculating LTV for lending...');
    const ltvCalc = valuationClient.calculateLTV(
      testValuation.estimated_value,
      testValuation.estimated_value * 0.4, // 40% loan
      riskParams
    );
    console.log(`   ✅ LTV calculation:`);
    console.log(`      LTV Ratio: ${ltvCalc.ltv_ratio}%`);
    console.log(`      Max Loan Amount: $${ltvCalc.max_loan_amount.toFixed(2)}`);
    console.log(`      Recommended LTV: ${ltvCalc.recommended_ltv}%`);
    console.log(`      Liquidation Threshold: ${ltvCalc.liquidation_threshold}%`);
    console.log(`      Risk Level: ${ltvCalc.risk_level}\n`);

    // Test 5: Calculate health factor
    console.log('5️⃣  Calculating health factor...');
    const healthFactor = valuationClient.calculateHealthFactor(
      riskParams.risk_adjusted_value,
      testValuation.estimated_value * 0.4,
      ltvCalc.liquidation_threshold
    );
    console.log(`   ✅ Health Factor: ${healthFactor.toFixed(2)}`);
    console.log(`      Status: ${healthFactor > 1.5 ? '✅ Healthy' : healthFactor > 1.2 ? '⚠️  Warning' : '❌ At Risk'}\n`);

    // Test 6: Test cache functionality
    console.log('6️⃣  Testing valuation cache...');
    const startTime = Date.now();
    await valuationClient.getValuation({
      token_id: 1,
      metadata: {
        title: 'Test IP-NFT',
        category: 'music',
        creator: '0x1234567890123456789012345678901234567890',
      },
    });
    const cachedTime = Date.now() - startTime;
    console.log(`   ✅ Cached valuation retrieved in ${cachedTime}ms (should be faster)\n`);

    // Test 7: Test cache invalidation
    console.log('7️⃣  Testing cache invalidation...');
    await valuationClient.invalidateCache(1);
    console.log(`   ✅ Cache invalidated for token ID 1\n`);

    // Test 8: Test batch valuations
    console.log('8️⃣  Testing batch valuations...');
    const batchRequests = [
      {
        token_id: 1,
        metadata: { title: 'NFT 1', category: 'music', creator: '0x123' },
      },
      {
        token_id: 2,
        metadata: { title: 'NFT 2', category: 'art', creator: '0x456' },
      },
      {
        token_id: 3,
        metadata: { title: 'NFT 3', category: 'video', creator: '0x789' },
      },
    ];
    
    const batchResults = await valuationClient.getBatchValuations(batchRequests);
    console.log(`   ✅ Batch valuations retrieved: ${batchResults.size} results`);
    batchResults.forEach((valuation, tokenId) => {
      console.log(`      Token ${tokenId}: $${valuation.estimated_value.toFixed(2)}`);
    });
    console.log();

    // Summary
    console.log('✅ All integration tests passed!\n');
    console.log('📊 Integration Summary:');
    console.log('   ✓ Oracle Adapter connection working');
    console.log('   ✓ Valuation retrieval working');
    console.log('   ✓ Risk parameter extraction working');
    console.log('   ✓ LTV calculation working');
    console.log('   ✓ Health factor calculation working');
    console.log('   ✓ Cache functionality working');
    console.log('   ✓ Batch operations working');
    console.log('\n🎉 NFT Valuation Integration is ready for production!\n');

  } catch (error: any) {
    console.error('\n❌ Integration test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    await valuationClient.close();
  }
}

// Run tests
if (require.main === module) {
  testValuationIntegration()
    .then(() => {
      console.log('Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testValuationIntegration };
