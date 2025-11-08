import { churnPredictionService } from '../services/churn-prediction.service';

/**
 * Test script for Churn Prediction functionality
 * 
 * Usage: npx ts-node src/scripts/test-churn-prediction.ts
 */

async function testChurnPrediction() {
  console.log('🧪 Testing Churn Prediction System\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Identify At-Risk Users
    console.log('\n📊 Test 1: Identifying At-Risk Users');
    console.log('-'.repeat(60));
    
    const atRiskResult = await churnPredictionService.identifyAtRiskUsers(90, 10);
    
    console.log(`✓ Total Users: ${atRiskResult.totalUsers}`);
    console.log(`✓ At-Risk Users: ${atRiskResult.atRiskUsers.length}`);
    console.log(`✓ Current Churn Rate: ${(atRiskResult.churnRate * 100).toFixed(1)}%`);
    console.log(`✓ Predicted Churn Rate: ${(atRiskResult.predictedChurnRate * 100).toFixed(1)}%`);
    console.log(`✓ Prediction Confidence: ${atRiskResult.confidence}%`);
    
    console.log('\n📈 Risk Distribution:');
    console.log(`  - Critical: ${atRiskResult.riskDistribution.critical}`);
    console.log(`  - High: ${atRiskResult.riskDistribution.high}`);
    console.log(`  - Medium: ${atRiskResult.riskDistribution.medium}`);
    console.log(`  - Low: ${atRiskResult.riskDistribution.low}`);

    if (atRiskResult.atRiskUsers.length > 0) {
      console.log('\n👥 Sample At-Risk Users:');
      atRiskResult.atRiskUsers.slice(0, 3).forEach((user, index) => {
        console.log(`\n  User ${index + 1}:`);
        console.log(`    - ID: ${user.userId}`);
        console.log(`    - Email: ${user.email || 'N/A'}`);
        console.log(`    - Risk Level: ${user.riskLevel.toUpperCase()}`);
        console.log(`    - Churn Probability: ${(user.churnProbability * 100).toFixed(1)}%`);
        console.log(`    - Days Since Last Activity: ${user.daysSinceLastActivity}`);
        console.log(`    - Engagement Score: ${user.engagementScore}/100`);
        console.log(`    - Total Purchases: ${user.totalPurchases}`);
        console.log(`    - Total Spent: $${user.totalSpent.toFixed(2)}`);
        console.log(`    - Reasons:`);
        user.reasons.forEach(reason => {
          console.log(`      • ${reason}`);
        });
      });

      // Test 2: Generate Retention Recommendations
      console.log('\n\n💡 Test 2: Generating Retention Recommendations');
      console.log('-'.repeat(60));
      
      const testUserId = atRiskResult.atRiskUsers[0].userId;
      console.log(`Testing with User ID: ${testUserId}`);
      
      const recommendations = await churnPredictionService.generateRetentionRecommendations(
        testUserId
      );
      
      console.log('\n✓ Personalized Message:');
      console.log(`  "${recommendations.personalizedMessage}"`);
      
      console.log('\n✓ Recommended Actions:');
      recommendations.recommendations.forEach((rec, index) => {
        console.log(`\n  ${index + 1}. ${rec.action} [${rec.priority.toUpperCase()}]`);
        console.log(`     Description: ${rec.description}`);
        console.log(`     Expected Impact: ${rec.expectedImpact}`);
      });
      
      if (recommendations.incentives && recommendations.incentives.length > 0) {
        console.log('\n✓ Suggested Incentives:');
        recommendations.incentives.forEach((incentive, index) => {
          console.log(`\n  ${index + 1}. ${incentive.type.toUpperCase()}: ${incentive.value}`);
          console.log(`     ${incentive.description}`);
        });
      }
    } else {
      console.log('\n⚠️  No at-risk users found. This could mean:');
      console.log('   - All users are highly engaged (great!)');
      console.log('   - Insufficient user activity data');
      console.log('   - Analytics events not being tracked');
    }

    // Test 3: Get Churn Metrics
    console.log('\n\n📉 Test 3: Fetching Churn Metrics');
    console.log('-'.repeat(60));
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    
    const metrics = await churnPredictionService.getChurnMetrics(
      startDate,
      endDate,
      'monthly'
    );
    
    console.log(`✓ Retrieved ${metrics.length} periods of data`);
    
    if (metrics.length > 0) {
      console.log('\n📊 Churn Metrics Summary:');
      metrics.forEach((metric, index) => {
        console.log(`\n  Period ${index + 1}: ${metric.period}`);
        console.log(`    - Total Users: ${metric.totalUsers}`);
        console.log(`    - Active Users: ${metric.activeUsers}`);
        console.log(`    - Churned Users: ${metric.churnedUsers}`);
        console.log(`    - Churn Rate: ${(metric.churnRate * 100).toFixed(1)}%`);
        console.log(`    - Retention Rate: ${(metric.retentionRate * 100).toFixed(1)}%`);
        console.log(`    - Avg Lifetime Value: $${metric.avgLifetimeValue.toFixed(2)}`);
      });
    }

    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('✅ All Tests Completed Successfully!');
    console.log('='.repeat(60));
    
    console.log('\n📋 Summary:');
    console.log(`  - At-Risk Users Identified: ${atRiskResult.atRiskUsers.length}`);
    console.log(`  - Churn Rate: ${(atRiskResult.churnRate * 100).toFixed(1)}%`);
    console.log(`  - Prediction Confidence: ${atRiskResult.confidence}%`);
    console.log(`  - Historical Periods Analyzed: ${metrics.length}`);
    
    console.log('\n💡 Next Steps:');
    console.log('  1. Review at-risk users in the dashboard');
    console.log('  2. Implement retention campaigns for high-risk users');
    console.log('  3. Monitor churn metrics regularly');
    console.log('  4. A/B test different retention strategies');
    console.log('  5. Track effectiveness of retention actions\n');

  } catch (error: any) {
    console.error('\n❌ Test Failed:', error.message);
    console.error('\nError Details:', error);
    
    console.log('\n🔍 Troubleshooting:');
    console.log('  1. Ensure ClickHouse is running and accessible');
    console.log('  2. Verify analytics_events table has data');
    console.log('  3. Check Redis connection');
    console.log('  4. Ensure user activity events are being tracked');
    console.log('  5. Review database configuration in .env file\n');
    
    process.exit(1);
  }
}

// Run tests
testChurnPrediction()
  .then(() => {
    console.log('Test script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
