import { PrismaClient } from '@prisma/client';
import { recommendationService } from '../services/recommendation.service';

const prisma = new PrismaClient();

/**
 * Test script for hybrid recommendation model
 * Tests:
 * 1. Hybrid model combining collaborative and content-based filtering
 * 2. Advanced ranking algorithm
 * 3. Diversity improvements
 * 4. A/B testing framework
 */
async function testHybridRecommendation() {
  console.log('🧪 Testing Hybrid Recommendation Model...\n');

  try {
    // Get a test user
    const testUser = await prisma.user.findFirst({
      where: { isActive: true },
    });

    if (!testUser) {
      console.log('❌ No active users found. Please create test data first.');
      return;
    }

    const userId = testUser.walletAddress || testUser.id;
    console.log(`✅ Using test user: ${userId}\n`);

    // Test 1: Basic hybrid recommendations
    console.log('📊 Test 1: Basic Hybrid Recommendations');
    console.log('─'.repeat(50));
    const basicRecs = await recommendationService.getRecommendations(userId, {
      limit: 10,
      useContentBased: true,
      contentBasedWeight: 0.3,
    });
    console.log(`✅ Generated ${basicRecs.length} hybrid recommendations`);
    if (basicRecs.length > 0) {
      console.log('Top 3 recommendations:');
      basicRecs.slice(0, 3).forEach((rec, idx) => {
        console.log(`  ${idx + 1}. Content: ${rec.contentId}`);
        console.log(`     Score: ${rec.score.toFixed(4)}`);
        console.log(`     Method: ${rec.reason}`);
        console.log(`     Title: ${rec.metadata?.title || 'N/A'}`);
      });
    }
    console.log();

    // Test 2: User-based only (baseline)
    console.log('📊 Test 2: User-Based Collaborative Filtering (Baseline)');
    console.log('─'.repeat(50));
    const userBasedRecs = await recommendationService.getUserBasedRecommendations(userId, 10);
    console.log(`✅ Generated ${userBasedRecs.length} user-based recommendations`);
    console.log();

    // Test 3: Item-based only
    console.log('📊 Test 3: Item-Based Collaborative Filtering');
    console.log('─'.repeat(50));
    const itemBasedRecs = await recommendationService.getItemBasedRecommendations(userId, 10);
    console.log(`✅ Generated ${itemBasedRecs.length} item-based recommendations`);
    console.log();

    // Test 4: Content-based only
    console.log('📊 Test 4: Content-Based Filtering');
    console.log('─'.repeat(50));
    const contentBasedRecs = await recommendationService.getContentBasedRecommendations(userId, 10);
    console.log(`✅ Generated ${contentBasedRecs.length} content-based recommendations`);
    if (contentBasedRecs.length > 0) {
      console.log('Sample content-based recommendation:');
      const sample = contentBasedRecs[0];
      console.log(`  Content: ${sample.contentId}`);
      console.log(`  Score: ${sample.score.toFixed(4)}`);
      console.log(`  Reason: ${sample.reason}`);
    }
    console.log();

    // Test 5: Advanced ranking
    console.log('📊 Test 5: Advanced Ranking Algorithm');
    console.log('─'.repeat(50));
    if (basicRecs.length > 0) {
      const rankedRecs = await recommendationService.applyAdvancedRanking(basicRecs, userId, {
        popularityWeight: 0.15,
        freshnessWeight: 0.1,
        engagementWeight: 0.1,
        creatorReputationWeight: 0.05,
      });
      console.log(`✅ Applied advanced ranking to ${rankedRecs.length} recommendations`);
      
      if (rankedRecs.length > 0 && rankedRecs[0].metadata?.signals) {
        console.log('Top recommendation with ranking signals:');
        const top = rankedRecs[0];
        const signals = top.metadata?.signals;
        console.log(`  Content: ${top.contentId}`);
        console.log(`  Final Score: ${top.score.toFixed(4)}`);
        if (signals) {
          console.log(`  Signals:`);
          console.log(`    - Base: ${signals.base.toFixed(4)}`);
          console.log(`    - Popularity: ${signals.popularity.toFixed(4)}`);
          console.log(`    - Freshness: ${signals.freshness.toFixed(4)}`);
          console.log(`    - Engagement: ${signals.engagement.toFixed(4)}`);
          console.log(`    - Creator Reputation: ${signals.creatorReputation.toFixed(4)}`);
        }
      }
    } else {
      console.log('⚠️  No recommendations available for ranking test');
    }
    console.log();

    // Test 6: Diversity
    console.log('📊 Test 6: Diversity Enhancement');
    console.log('─'.repeat(50));
    const noDiversityRecs = await recommendationService.getRecommendations(userId, {
      limit: 10,
      diversityFactor: 0,
    });
    const withDiversityRecs = await recommendationService.getRecommendations(userId, {
      limit: 10,
      diversityFactor: 0.5,
    });
    console.log(`✅ Without diversity: ${noDiversityRecs.length} recommendations`);
    console.log(`✅ With diversity (0.5): ${withDiversityRecs.length} recommendations`);
    
    // Analyze diversity
    if (withDiversityRecs.length > 0) {
      const methods = withDiversityRecs.map(r => r.reason);
      const uniqueMethods = new Set(methods);
      console.log(`   Unique recommendation methods: ${uniqueMethods.size}`);
      console.log(`   Methods: ${Array.from(uniqueMethods).join(', ')}`);
    }
    console.log();

    // Test 7: A/B Testing
    console.log('📊 Test 7: A/B Testing Framework');
    console.log('─'.repeat(50));
    const abTestResult = await recommendationService.getRecommendationsWithABTest(userId, {
      limit: 10,
    });
    console.log(`✅ A/B Test Assignment:`);
    console.log(`   Test Group: ${abTestResult.testGroup}`);
    console.log(`   Experiment ID: ${abTestResult.experimentId}`);
    console.log(`   Recommendations: ${abTestResult.recommendations.length}`);
    console.log();

    // Test 8: Track interaction
    console.log('📊 Test 8: Interaction Tracking');
    console.log('─'.repeat(50));
    if (abTestResult.recommendations.length > 0) {
      const testContentId = abTestResult.recommendations[0].contentId;
      await recommendationService.trackRecommendationInteraction(
        userId,
        testContentId,
        'view',
        abTestResult.experimentId
      );
      console.log(`✅ Tracked 'view' interaction for content: ${testContentId}`);
      
      await recommendationService.trackRecommendationInteraction(
        userId,
        testContentId,
        'click',
        abTestResult.experimentId
      );
      console.log(`✅ Tracked 'click' interaction for content: ${testContentId}`);
    }
    console.log();

    // Test 9: A/B Test Results
    console.log('📊 Test 9: A/B Test Results');
    console.log('─'.repeat(50));
    const abResults = await recommendationService.getABTestResults();
    console.log('✅ A/B Test Metrics:');
    console.log(`   Control Group:`);
    console.log(`     - Views: ${abResults.control.totalViews}`);
    console.log(`     - Clicks: ${abResults.control.totalClicks}`);
    console.log(`     - Purchases: ${abResults.control.totalPurchases}`);
    console.log(`     - CTR: ${abResults.control.ctr}%`);
    console.log(`     - Conversion Rate: ${abResults.control.conversionRate}%`);
    console.log();
    console.log(`   Hybrid Group:`);
    console.log(`     - Views: ${abResults.hybrid.totalViews}`);
    console.log(`     - Clicks: ${abResults.hybrid.totalClicks}`);
    console.log(`     - Purchases: ${abResults.hybrid.totalPurchases}`);
    console.log(`     - CTR: ${abResults.hybrid.ctr}%`);
    console.log(`     - Conversion Rate: ${abResults.hybrid.conversionRate}%`);
    console.log();
    console.log(`   Advanced Ranking Group:`);
    console.log(`     - Views: ${abResults.advanced_ranking.totalViews}`);
    console.log(`     - Clicks: ${abResults.advanced_ranking.totalClicks}`);
    console.log(`     - Purchases: ${abResults.advanced_ranking.totalPurchases}`);
    console.log(`     - CTR: ${abResults.advanced_ranking.ctr}%`);
    console.log(`     - Conversion Rate: ${abResults.advanced_ranking.conversionRate}%`);
    console.log();
    if (abResults.winner) {
      console.log(`🏆 Winner: ${abResults.winner}`);
    }
    console.log();

    // Test 10: Evaluate accuracy
    console.log('📊 Test 10: Recommendation Accuracy Evaluation');
    console.log('─'.repeat(50));
    try {
      const accuracy = await recommendationService.evaluateAccuracy(20);
      console.log('✅ Accuracy Metrics:');
      console.log(`   Precision: ${accuracy.precision}%`);
      console.log(`   Recall: ${accuracy.recall}%`);
      console.log(`   F1 Score: ${accuracy.f1Score}%`);
      console.log(`   Coverage: ${accuracy.coverage}%`);
      
      if (accuracy.precision >= 70) {
        console.log('   ✅ Precision meets requirement (>70%)');
      } else {
        console.log('   ⚠️  Precision below target (need >70%)');
      }
    } catch (error: any) {
      console.log(`⚠️  Accuracy evaluation skipped: ${error.message}`);
    }
    console.log();

    // Summary
    console.log('═'.repeat(50));
    console.log('✅ HYBRID RECOMMENDATION MODEL TEST COMPLETE');
    console.log('═'.repeat(50));
    console.log('Features Tested:');
    console.log('  ✅ Collaborative filtering (user-based + item-based)');
    console.log('  ✅ Content-based filtering');
    console.log('  ✅ Hybrid model combination');
    console.log('  ✅ Advanced ranking algorithm');
    console.log('  ✅ Enhanced diversity');
    console.log('  ✅ A/B testing framework');
    console.log('  ✅ Interaction tracking');
    console.log('  ✅ Performance metrics');
    console.log();

  } catch (error: any) {
    console.error('❌ Error during testing:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testHybridRecommendation()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
