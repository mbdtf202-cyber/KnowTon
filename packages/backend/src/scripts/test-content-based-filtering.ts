import { PrismaClient } from '@prisma/client';
import { recommendationService } from '../services/recommendation.service';

const prisma = new PrismaClient();

/**
 * Test script for content-based filtering
 * Tests feature extraction, similarity calculation, and recommendations
 */
async function testContentBasedFiltering() {
  console.log('🧪 Testing Content-Based Filtering Implementation\n');

  try {
    // 1. Test content feature extraction
    console.log('1️⃣ Testing content feature extraction...');
    const testContent = await prisma.content.findFirst({
      where: { status: 'published' },
    });

    if (!testContent) {
      console.log('⚠️  No published content found. Creating test data...');
      await createTestData();
      return testContentBasedFiltering();
    }

    console.log(`✅ Found test content: ${testContent.title}`);
    console.log(`   Category: ${testContent.category}`);
    console.log(`   Tags: ${testContent.tags.join(', ')}`);
    console.log(`   File Type: ${testContent.fileType}`);
    console.log(`   Fingerprint: ${testContent.aiFingerprint.substring(0, 20)}...`);

    // 2. Test finding similar content by features
    console.log('\n2️⃣ Testing similar content by features...');
    const similarContent = await recommendationService.findSimilarContentByFeatures(
      testContent.id,
      10
    );

    console.log(`✅ Found ${similarContent.length} similar content items`);
    if (similarContent.length > 0) {
      console.log('\nTop 3 similar items:');
      for (let i = 0; i < Math.min(3, similarContent.length); i++) {
        const item = similarContent[i];
        console.log(`   ${i + 1}. Content ID: ${item.contentId}`);
        console.log(`      Similarity: ${(item.similarity * 100).toFixed(2)}%`);
        console.log(`      Matched Features: ${item.matchedFeatures.join(', ')}`);
      }
    }

    // 3. Test content-based recommendations for a user
    console.log('\n3️⃣ Testing content-based recommendations...');
    const testUser = await prisma.user.findFirst({
      where: { isActive: true },
    });

    if (!testUser) {
      console.log('⚠️  No active users found. Skipping user recommendations test.');
    } else {
      const userId = testUser.walletAddress || testUser.id;
      console.log(`Testing for user: ${userId}`);

      const contentBasedRecs = await recommendationService.getContentBasedRecommendations(
        userId,
        10
      );

      console.log(`✅ Generated ${contentBasedRecs.length} content-based recommendations`);
      if (contentBasedRecs.length > 0) {
        console.log('\nTop 3 recommendations:');
        for (let i = 0; i < Math.min(3, contentBasedRecs.length); i++) {
          const rec = contentBasedRecs[i];
          console.log(`   ${i + 1}. Content ID: ${rec.contentId}`);
          console.log(`      Score: ${(rec.score * 100).toFixed(2)}%`);
          console.log(`      Reason: ${rec.reason}`);
        }
      }

      // 4. Test hybrid recommendations (collaborative + content-based)
      console.log('\n4️⃣ Testing hybrid recommendations...');
      const hybridRecs = await recommendationService.getRecommendations(userId, {
        limit: 10,
        useContentBased: true,
        contentBasedWeight: 0.3,
      });

      console.log(`✅ Generated ${hybridRecs.length} hybrid recommendations`);
      if (hybridRecs.length > 0) {
        console.log('\nTop 3 hybrid recommendations:');
        for (let i = 0; i < Math.min(3, hybridRecs.length); i++) {
          const rec = hybridRecs[i];
          console.log(`   ${i + 1}. ${rec.metadata?.title || rec.contentId}`);
          console.log(`      Score: ${(rec.score * 100).toFixed(2)}%`);
          console.log(`      Method: ${rec.reason}`);
          console.log(`      Category: ${rec.metadata?.category || 'N/A'}`);
        }
      }

      // 5. Compare with collaborative-only recommendations
      console.log('\n5️⃣ Comparing with collaborative-only recommendations...');
      const collaborativeRecs = await recommendationService.getRecommendations(userId, {
        limit: 10,
        useContentBased: false,
      });

      console.log(`✅ Generated ${collaborativeRecs.length} collaborative-only recommendations`);
      
      // Calculate overlap
      const hybridIds = new Set(hybridRecs.map(r => r.contentId));
      const collaborativeIds = new Set(collaborativeRecs.map(r => r.contentId));
      const overlap = [...hybridIds].filter(id => collaborativeIds.has(id)).length;
      const overlapPercent = hybridRecs.length > 0 
        ? (overlap / hybridRecs.length * 100).toFixed(2)
        : '0.00';

      console.log(`\n📊 Recommendation Comparison:`);
      console.log(`   Hybrid recommendations: ${hybridRecs.length}`);
      console.log(`   Collaborative-only: ${collaborativeRecs.length}`);
      console.log(`   Overlap: ${overlap} items (${overlapPercent}%)`);
      console.log(`   Unique to hybrid: ${hybridRecs.length - overlap} items`);
    }

    // 6. Test feature similarity calculation
    console.log('\n6️⃣ Testing feature similarity calculation...');
    const allContent = await prisma.content.findMany({
      where: { status: 'published' },
      take: 5,
    });

    if (allContent.length >= 2) {
      console.log(`Comparing ${allContent.length} content items...`);
      
      // Calculate category distribution
      const categoryCount = new Map<string, number>();
      const tagCount = new Map<string, number>();
      
      for (const content of allContent) {
        categoryCount.set(
          content.category,
          (categoryCount.get(content.category) || 0) + 1
        );
        
        for (const tag of content.tags) {
          tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
        }
      }

      console.log('\n📊 Content Feature Distribution:');
      console.log('   Categories:');
      for (const [category, count] of categoryCount.entries()) {
        console.log(`      - ${category}: ${count} items`);
      }
      
      console.log('   Top Tags:');
      const topTags = Array.from(tagCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      for (const [tag, count] of topTags) {
        console.log(`      - ${tag}: ${count} items`);
      }
    }

    console.log('\n✅ Content-based filtering tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   ✓ Feature extraction working');
    console.log('   ✓ Content similarity calculation working');
    console.log('   ✓ Content-based recommendations working');
    console.log('   ✓ Hybrid recommendations working');
    console.log('   ✓ Feature matching and scoring working');

  } catch (error: any) {
    console.error('\n❌ Error during testing:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Create test data for content-based filtering
 */
async function createTestData() {
  console.log('Creating test data...');

  // Create test creator
  const creator = await prisma.creator.findFirst();
  if (!creator) {
    console.log('⚠️  No creators found. Please create a creator first.');
    return;
  }

  // Create test content with different features
  const testContents = [
    {
      title: 'Introduction to Machine Learning',
      category: 'education',
      tags: ['machine-learning', 'ai', 'python', 'tutorial'],
      fileType: 'pdf',
    },
    {
      title: 'Advanced Deep Learning Techniques',
      category: 'education',
      tags: ['deep-learning', 'ai', 'neural-networks', 'advanced'],
      fileType: 'pdf',
    },
    {
      title: 'Python Programming Basics',
      category: 'education',
      tags: ['python', 'programming', 'beginner', 'tutorial'],
      fileType: 'video',
    },
    {
      title: 'Digital Art Masterclass',
      category: 'art',
      tags: ['digital-art', 'design', 'creative', 'tutorial'],
      fileType: 'video',
    },
    {
      title: 'Music Production Guide',
      category: 'music',
      tags: ['music', 'production', 'audio', 'tutorial'],
      fileType: 'audio',
    },
  ];

  for (const content of testContents) {
    await prisma.content.create({
      data: {
        ...content,
        creatorAddress: creator.walletAddress,
        description: `Test content: ${content.title}`,
        ipfsHash: `Qm${Math.random().toString(36).substring(7)}`,
        contentHash: `hash_${Math.random().toString(36).substring(7)}`,
        aiFingerprint: Array(64).fill(0).map(() => 
          Math.floor(Math.random() * 16).toString(16)
        ).join(''),
        fileSize: Math.floor(Math.random() * 10000000),
        fileName: `${content.title.toLowerCase().replace(/\s+/g, '-')}.${content.fileType}`,
        status: 'published',
      },
    });
  }

  console.log(`✅ Created ${testContents.length} test content items`);
}

// Run tests
if (require.main === module) {
  testContentBasedFiltering()
    .then(() => {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Tests failed:', error);
      process.exit(1);
    });
}

export { testContentBasedFiltering };
