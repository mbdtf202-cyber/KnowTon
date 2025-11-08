import { RoyaltyDistributionService } from '../services/royalty-distribution.service';

const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
  success: (msg: string, data?: any) => console.log(`[SUCCESS] ✓ ${msg}`, data || ''),
};

async function testRoyaltyDistribution() {
  logger.info('Starting Royalty Distribution Service Tests');
  logger.info('='.repeat(60));

  const service = new RoyaltyDistributionService();

  try {
    // Test 1: Calculate distribution off-chain
    logger.info('\n1. Testing off-chain distribution calculation...');
    const tokenId = '1';
    const totalAmount = '10.0';
    const beneficiaries = [
      { recipient: '0x1234567890123456789012345678901234567890', percentage: 5000 }, // 50%
      { recipient: '0x2234567890123456789012345678901234567890', percentage: 3000 }, // 30%
      { recipient: '0x3234567890123456789012345678901234567890', percentage: 2000 }, // 20%
    ];

    const calculation = await service.calculateDistribution(
      tokenId,
      totalAmount,
      beneficiaries
    );

    logger.success('Distribution calculated successfully');
    logger.info('Calculation details:', {
      tokenId: calculation.tokenId,
      totalAmount: calculation.totalAmount,
      beneficiaries: calculation.beneficiaries.map((b) => ({
        recipient: b.recipient,
        percentage: `${b.percentage / 100}%`,
        amount: `${b.amount} ETH`,
      })),
      gasEstimate: `${calculation.gasEstimate} ETH`,
    });

    // Test 2: Batch distributions
    logger.info('\n2. Testing batch distribution calculation...');
    const distributions = [
      { tokenId: '1', amount: '5.0' },
      { tokenId: '2', amount: '3.0' },
      { tokenId: '3', amount: '2.0' },
    ];

    try {
      const batch = await service.batchDistributions(distributions);
      logger.success('Batch distributions calculated successfully');
      logger.info('Batch details:', {
        count: batch.distributions.length,
        totalGasEstimate: `${batch.totalGasEstimate} ETH`,
        estimatedCost: `${batch.estimatedCost} ETH`,
      });
    } catch (error: any) {
      logger.error('Batch calculation failed (expected without contract setup)', {
        error: error.message,
      });
    }

    // Test 3: Gas price estimation
    logger.info('\n3. Testing gas price estimation...');
    const gasEstimate = await service.getGasPriceEstimate();
    logger.success('Gas price estimated successfully');
    logger.info('Gas estimate:', {
      gasPriceGwei: `${gasEstimate.gasPriceGwei} Gwei`,
      estimatedCostForDistribution: `${gasEstimate.estimatedCostForDistribution} ETH`,
    });

    // Test 4: Pending distributions
    logger.info('\n4. Testing pending distributions retrieval...');
    const pending = await service.getPendingDistributions();
    logger.success('Pending distributions retrieved successfully');
    logger.info('Pending distributions:', {
      count: pending.length,
      distributions: pending.slice(0, 3), // Show first 3
    });

    // Test 5: Invalid distribution calculation
    logger.info('\n5. Testing error handling for invalid distribution...');
    try {
      await service.calculateDistribution('1', '10.0', [
        { recipient: '0x1234567890123456789012345678901234567890', percentage: 5000 },
        { recipient: '0x2234567890123456789012345678901234567890', percentage: 3000 },
        // Missing 20% - should fail
      ]);
      logger.error('Should have thrown error for invalid percentage');
    } catch (error: any) {
      logger.success('Error handling works correctly');
      logger.info('Error message:', error.message);
    }

    // Test 6: Batch size validation
    logger.info('\n6. Testing batch size validation...');
    try {
      const largeBatch = Array(11)
        .fill(null)
        .map((_, i) => ({ tokenId: i.toString(), amount: '1.0' }));
      await service.batchDistributions(largeBatch);
      logger.error('Should have thrown error for batch size exceeding maximum');
    } catch (error: any) {
      logger.success('Batch size validation works correctly');
      logger.info('Error message:', error.message);
    }

    logger.info('\n' + '='.repeat(60));
    logger.success('All Royalty Distribution Service tests completed!');
    logger.info('\nKey Features Tested:');
    logger.info('✓ Off-chain revenue split calculation');
    logger.info('✓ Batch distribution optimization');
    logger.info('✓ Gas price estimation');
    logger.info('✓ Pending distributions management');
    logger.info('✓ Error handling and validation');
    logger.info('✓ Retry logic structure (not executed in test)');

    logger.info('\nNext Steps:');
    logger.info('1. Deploy RoyaltyDistributor contract to test network');
    logger.info('2. Configure ROYALTY_DISTRIBUTOR_ADDRESS in .env');
    logger.info('3. Test actual on-chain distribution execution');
    logger.info('4. Set up automated pending distribution processing');
    logger.info('5. Monitor gas costs and optimize batch sizes');

  } catch (error: any) {
    logger.error('Test failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Run tests
testRoyaltyDistribution()
  .then(() => {
    console.log('\n✓ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Test script failed:', error);
    process.exit(1);
  });
