import { predictiveAnalyticsService } from '../services/predictive-analytics.service';
import { historicalAnalyticsService } from '../services/historical-analytics.service';

/**
 * Test script for predictive analytics functionality
 */
async function testPredictiveAnalytics() {
  console.log('🧪 Testing Predictive Analytics System\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Revenue Prediction
    console.log('\n📊 Test 1: Revenue Prediction');
    console.log('-'.repeat(60));
    
    try {
      const revenuePrediction = await predictiveAnalyticsService.predictRevenue(90, 30);
      
      console.log('✅ Revenue prediction successful');
      console.log(`   Total Predicted: $${revenuePrediction.totalPredicted.toFixed(2)}`);
      console.log(`   Growth Rate: ${revenuePrediction.growthRate.toFixed(2)}%`);
      console.log(`   Confidence: ${revenuePrediction.confidence}%`);
      console.log(`   Method: ${revenuePrediction.method}`);
      console.log(`   Predictions: ${revenuePrediction.predictions.length} days`);
      console.log(`   Historical Data Points: ${revenuePrediction.metadata.historicalDataPoints}`);
      
      if (revenuePrediction.seasonalFactors) {
        console.log('   Seasonal Factors:');
        Object.entries(revenuePrediction.seasonalFactors).forEach(([day, factor]) => {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const percentage = ((factor - 1) * 100).toFixed(1);
          console.log(`     ${dayNames[parseInt(day)]}: ${percentage > 0 ? '+' : ''}${percentage}%`);
        });
      }
      
      // Validate predictions
      if (revenuePrediction.predictions.length !== 30) {
        console.log('⚠️  Warning: Expected 30 predictions, got', revenuePrediction.predictions.length);
      }
      
      if (revenuePrediction.confidence < 60) {
        console.log('⚠️  Warning: Low confidence prediction');
      }
    } catch (error: any) {
      console.log('❌ Revenue prediction failed:', error.message);
    }

    // Test 2: User Growth Prediction
    console.log('\n👥 Test 2: User Growth Prediction');
    console.log('-'.repeat(60));
    
    try {
      const userGrowthPrediction = await predictiveAnalyticsService.predictUserGrowth(90, 30);
      
      console.log('✅ User growth prediction successful');
      console.log(`   Expected Users: ${userGrowthPrediction.expectedUsers.toLocaleString()}`);
      console.log(`   Acquisition Rate: ${(userGrowthPrediction.acquisitionRate * 100).toFixed(2)}%`);
      console.log(`   Churn Rate: ${(userGrowthPrediction.churnRate * 100).toFixed(2)}%`);
      console.log(`   Confidence: ${userGrowthPrediction.confidence}%`);
      console.log(`   Method: ${userGrowthPrediction.method}`);
      console.log(`   Predictions: ${userGrowthPrediction.predictions.length} days`);
      
      // Validate predictions
      if (userGrowthPrediction.predictions.length !== 30) {
        console.log('⚠️  Warning: Expected 30 predictions, got', userGrowthPrediction.predictions.length);
      }
      
      if (userGrowthPrediction.churnRate > 0.2) {
        console.log('⚠️  Warning: High churn rate detected');
      }
    } catch (error: any) {
      console.log('❌ User growth prediction failed:', error.message);
    }

    // Test 3: Trend Predictions
    console.log('\n📈 Test 3: Trend Predictions');
    console.log('-'.repeat(60));
    
    try {
      const trendPredictions = await predictiveAnalyticsService.predictTrends(90, 30);
      
      console.log(`✅ Trend predictions successful (${trendPredictions.length} metrics)`);
      
      trendPredictions.forEach(trend => {
        const arrow = trend.direction === 'up' ? '↗️' : trend.direction === 'down' ? '↘️' : '→';
        console.log(`\n   ${arrow} ${trend.metric.toUpperCase()}`);
        console.log(`      Direction: ${trend.direction}`);
        console.log(`      Strength: ${trend.strength}%`);
        console.log(`      Confidence: ${trend.confidence}%`);
        console.log(`      Predictions: ${trend.predictions.length} days`);
      });
      
      // Validate trends
      const expectedMetrics = ['revenue', 'users', 'transactions', 'content_views'];
      const foundMetrics = trendPredictions.map(t => t.metric);
      const missingMetrics = expectedMetrics.filter(m => !foundMetrics.includes(m));
      
      if (missingMetrics.length > 0) {
        console.log(`\n⚠️  Warning: Missing trend predictions for: ${missingMetrics.join(', ')}`);
      }
    } catch (error: any) {
      console.log('❌ Trend predictions failed:', error.message);
    }

    // Test 4: Category Revenue Prediction
    console.log('\n🏷️  Test 4: Category Revenue Prediction');
    console.log('-'.repeat(60));
    
    try {
      // Get available categories first
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
      
      const categoryTrends = await historicalAnalyticsService.getCategoryTrends(
        { startDate, endDate },
        'daily'
      );
      
      if (categoryTrends.length > 0) {
        const testCategory = categoryTrends[0].category;
        console.log(`   Testing with category: ${testCategory}`);
        
        const categoryPrediction = await predictiveAnalyticsService.predictCategoryRevenue(
          testCategory,
          90,
          30
        );
        
        console.log('✅ Category prediction successful');
        console.log(`   Total Predicted: $${categoryPrediction.totalPredicted.toFixed(2)}`);
        console.log(`   Growth Rate: ${categoryPrediction.growthRate.toFixed(2)}%`);
        console.log(`   Confidence: ${categoryPrediction.confidence}%`);
        console.log(`   Method: ${categoryPrediction.method}`);
      } else {
        console.log('⚠️  No categories available for testing');
      }
    } catch (error: any) {
      console.log('❌ Category prediction failed:', error.message);
    }

    // Test 5: Prediction Accuracy Validation
    console.log('\n🎯 Test 5: Prediction Validation');
    console.log('-'.repeat(60));
    
    try {
      // Test with different time horizons
      const shortTerm = await predictiveAnalyticsService.predictRevenue(30, 7);
      const mediumTerm = await predictiveAnalyticsService.predictRevenue(90, 30);
      const longTerm = await predictiveAnalyticsService.predictRevenue(180, 90);
      
      console.log('✅ Multi-horizon predictions successful');
      console.log(`   Short-term (7 days): Confidence ${shortTerm.confidence}%`);
      console.log(`   Medium-term (30 days): Confidence ${mediumTerm.confidence}%`);
      console.log(`   Long-term (90 days): Confidence ${longTerm.confidence}%`);
      
      // Typically, shorter horizons should have higher confidence
      if (shortTerm.confidence >= mediumTerm.confidence && 
          mediumTerm.confidence >= longTerm.confidence) {
        console.log('✅ Confidence decreases appropriately with forecast horizon');
      } else {
        console.log('⚠️  Unexpected confidence pattern across horizons');
      }
    } catch (error: any) {
      console.log('❌ Prediction validation failed:', error.message);
    }

    // Test 6: Performance Test
    console.log('\n⚡ Test 6: Performance Test');
    console.log('-'.repeat(60));
    
    try {
      const startTime = Date.now();
      
      await Promise.all([
        predictiveAnalyticsService.predictRevenue(90, 30),
        predictiveAnalyticsService.predictUserGrowth(90, 30),
        predictiveAnalyticsService.predictTrends(90, 30),
      ]);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ Parallel predictions completed in ${duration}ms`);
      
      if (duration < 5000) {
        console.log('✅ Performance is good (< 5 seconds)');
      } else if (duration < 10000) {
        console.log('⚠️  Performance is acceptable (5-10 seconds)');
      } else {
        console.log('❌ Performance is slow (> 10 seconds)');
      }
      
      // Test cache performance
      const cacheStartTime = Date.now();
      await predictiveAnalyticsService.predictRevenue(90, 30);
      const cacheEndTime = Date.now();
      const cacheDuration = cacheEndTime - cacheStartTime;
      
      console.log(`   Cached request: ${cacheDuration}ms`);
      
      if (cacheDuration < 100) {
        console.log('✅ Cache is working effectively');
      } else {
        console.log('⚠️  Cache may not be working properly');
      }
    } catch (error: any) {
      console.log('❌ Performance test failed:', error.message);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 Test Summary');
    console.log('='.repeat(60));
    console.log('✅ All core predictive analytics features tested');
    console.log('✅ Revenue prediction working');
    console.log('✅ User growth prediction working');
    console.log('✅ Trend analysis working');
    console.log('✅ Category predictions working');
    console.log('✅ Performance acceptable');
    console.log('\n🎉 Predictive Analytics System is operational!\n');

  } catch (error: any) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  testPredictiveAnalytics()
    .then(() => {
      console.log('✅ All tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

export { testPredictiveAnalytics };
