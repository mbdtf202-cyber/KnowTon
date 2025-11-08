import { recommendationService } from '../services/recommendation.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Test script for collaborative filtering recommendation engine
 * Tests both user-based and item-based collaborative filtering
 */
async function testRecommendationEngine() {
  console.log('=== Testing Collaborative Filtering Recommendation Engine ===\n');

  try {
    // Get a test user
    const testUser = await prisma.user.findFirst({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        walletAddress: true,
        email: true,
      },
    });

    if (!testUser) {
      console.log('❌ No test user found. Please create a user first.');
      return;
    }

    const userId = testUser.walletAddress || testUser.id;
    console.log(`✅ Test user: ${testUser.email || userId}\n`);

    // Test 1: User-based collaborative filtering
    console.log('--- Test 1: User-Based Collaborative Filtering ---');
    const startUserBased = Date.now();
    const userBasedRecs = await recommendationService.getUserBasedRecommendations(userId, 10);
    const userBasedTime = Date.now() - startUserBased;
    
    console.log(`✅ Generated ${userBasedRecs.length} user-based recommendations in ${userBasedTime}ms`);
    if (userBasedRecs.length > 0) {
      console.log('Top 3 recommendations:');
      userBasedRecs.slice(0, 3).forEach((rec, i) => {
        console.log(`  ${i + 1}. Content ${rec.contentId} (score: ${rec.score.toFixed(3)})`);
      });
    }
    console.log();

    // Test 2: Item-based collaborative filtering
    console.log('--- Test 2: Item-Based Collaborative Filtering ---');
    const startItemBased = Date.now();
    const itemBasedRecs = await recommendationService.getItemBasedRecommendations(userId, 10);
    const itemBasedTime = Date.now() - startItemBased;
    
    console.log(`✅ Generated ${itemBasedRecs.length} item-based recommendations in ${itemBasedTime}ms`);
    if (itemBasedRecs.length > 0) {
      console.log('Top 3 recommendations:');
      itemBasedRecs.slice(0, 3).forEach((rec, i) => {
        console.log(`  ${i + 1}. Content ${rec.contentId} (score: ${rec.score.toFixed(3)})`);
      });
    }
    console.log();

    // Test 3: Hybrid recommendations
    console.log('--- Test 3: Hybrid Recommendations (Combined) ---');
    const startHybrid = Date.now();
    const hybridRecs = await recommendationService.getRecommendations(userId, {
      limit: 10,
      minScore: 0.1,
      excludeViewed: true,
      excludePurchased: true,
      diversityFactor: 0.3,
    });
    const hybridTime = Date.now() - startHybrid;
    
    console.log(`✅ Generated ${hybridRecs.length} hybrid recommendations in ${hybridTime}ms`);
    if (hybridRecs.length > 0) {
      console.log('Top 5 recommendations:');
      hybridRecs.slice(0, 5).forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec.metadata?.title || rec.contentId}`);
        console.log(`     Score: ${rec.score.toFixed(3)} | Reason: ${rec.reason}`);
        console.log(`     Category: ${rec.metadata?.category || 'N/A'}`);
      });
    }
    console.log();

    // Test 4: Find similar users
    console.log('--- Test 4: Find Similar Users ---');
    const startSimilarUsers = Date.now();
    const similarUsers = await recommendationService.findSimilarUsers(userId, 10);
    const similarUsersTime = Date.now() - startSimilarUsers;
    
    console.log(`✅ Found ${similarUsers.length} similar users in ${similarUsersTime}ms`);
    if (similarUsers.length > 0) {
      console.log('Top 3 similar users:');
      similarUsers.slice(0, 3).forEach((user, i) => {
        console.log(`  ${i + 1}. User ${user.userId.substring(0, 10)}... (similarity: ${user.similarity.toFixed(3)})`);
      });
    }
    console.log();

    // Test 5: Find similar content
    const testContent = await prisma.content.findFirst({
      where: {
        status: 'published',
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (testContent) {
      console.log('--- Test 5: Find Similar Content ---');
      console.log(`Test content: ${testContent.title}`);
      
      const startSimilarContent = Date.now();
      const similarContent = await recommendationService.findSimilarContent(testContent.id, 10);
      const similarContentTime = Date.now() - startSimilarContent;
      
      console.log(`✅ Found ${similarContent.length} similar content items in ${similarContentTime}ms`);
      if (similarContent.length > 0) {
        console.log('Top 3 similar content:');
        similarContent.slice(0, 3).forEach((item, i) => {
          console.log(`  ${i + 1}. Content ${item.contentId} (similarity: ${item.similarity.toFixed(3)})`);
        });
      }
      console.log();
    }

    // Test 6: Evaluate accuracy
    console.log('--- Test 6: Evaluate Recommendation Accuracy ---');
    console.log('Running evaluation with test set size: 20');
    const startEval = Date.now();
    const evaluation = await recommendationService.evaluateAccuracy(20);
    const evalTime = Date.now() - startEval;
    
    console.log(`✅ Evaluation completed in ${evalTime}ms`);
    console.log('Results:');
    console.log(`  Precision: ${evaluation.precision}%`);
    console.log(`  Recall: ${evaluation.recall}%`);
    console.log(`  F1 Score: ${evaluation.f1Score}%`);
    console.log(`  Coverage: ${evaluation.coverage}%`);
    console.log();

    // Test 7: Cache performance
    console.log('--- Test 7: Cache Performance ---');
    console.log('First request (no cache):');
    const start1 = Date.now();
    await recommendationService.getRecommendations(userId, { limit: 10 });
    const time1 = Date.now() - start1;
    console.log(`  Time: ${time1}ms`);

    console.log('Second request (with cache):');
    const start2 = Date.now();
    await recommendationService.getRecommendations(userId, { limit: 10 });
    const time2 = Date.now() - start2;
    console.log(`  Time: ${time2}ms`);
    console.log(`  Speed improvement: ${((time1 - time2) / time1 * 100).toFixed(1)}%`);
    console.log();

    // Summary
    console.log('=== Test Summary ===');
    console.log('✅ All tests completed successfully!');
    console.log('\nPerformance Summary:');
    console.log(`  User-based CF: ${userBasedTime}ms`);
    console.log(`  Item-based CF: ${itemBasedTime}ms`);
    console.log(`  Hybrid recommendations: ${hybridTime}ms`);
    console.log(`  Similar users: ${similarUsersTime}ms`);
    if (testContent) {
      console.log(`  Similar content: ${similarContentTime}ms`);
    }
    console.log(`  Accuracy evaluation: ${evalTime}ms`);
    console.log(`  Cache speedup: ${((time1 - time2) / time1 * 100).toFixed(1)}%`);
    console.log('\nAccuracy Metrics:');
    console.log(`  Precision: ${evaluation.precision}%`);
    console.log(`  Recall: ${evaluation.recall}%`);
    console.log(`  F1 Score: ${evaluation.f1Score}%`);
    console.log(`  Coverage: ${evaluation.coverage}%`);

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testRecommendationEngine()
  .then(() => {
    console.log('\n✅ Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
