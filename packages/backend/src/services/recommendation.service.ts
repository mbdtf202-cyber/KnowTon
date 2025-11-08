import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// ClickHouse client for analytics queries
const clickhouse = {
  query: (sql: string) => ({
    toPromise: async () => {
      // Mock implementation - replace with actual ClickHouse client if available
      console.warn('ClickHouse query called but client not configured:', sql.substring(0, 100));
      return [];
    }
  })
};

export interface UserInteraction {
  userId: string;
  contentId: string;
  interactionType: string; // view, like, purchase, download
  weight: number;
  timestamp: Date;
}

export interface ContentRecommendation {
  contentId: string;
  score: number;
  reason: string;
  metadata?: {
    title?: string;
    category?: string;
    creator?: string;
    price?: number;
    signals?: {
      base: number;
      popularity: number;
      freshness: number;
      engagement: number;
      creatorReputation: number;
    };
  };
}

export interface UserSimilarity {
  userId: string;
  similarity: number;
}

export interface ItemSimilarity {
  contentId: string;
  similarity: number;
}

export interface RecommendationOptions {
  limit?: number;
  minScore?: number;
  excludeViewed?: boolean;
  excludePurchased?: boolean;
  diversityFactor?: number;
  useContentBased?: boolean;
  contentBasedWeight?: number;
}

export interface ContentFeatures {
  contentId: string;
  category: string;
  tags: string[];
  fingerprint: string;
  fileType: string;
  creatorAddress: string;
}

export interface ContentSimilarity {
  contentId: string;
  similarity: number;
  matchedFeatures: string[];
}

/**
 * Collaborative Filtering Recommendation Engine
 * REQ-1.7.2: User Analytics - Content recommendation
 * 
 * Implements both user-based and item-based collaborative filtering
 * to generate personalized content recommendations
 */
export class RecommendationService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly SIMILARITY_THRESHOLD = 0.1;
  private readonly PERFORMANCE_THRESHOLD_MS = 200; // Target API response time

  /**
   * Get personalized recommendations using hybrid approach
   * Combines user-based, item-based, and content-based filtering
   * REQ-1.7.2: Content recommendation with Redis caching and fallback
   * 
   * Performance target: <200ms response time
   */
  async getRecommendations(
    userId: string,
    options: RecommendationOptions = {}
  ): Promise<ContentRecommendation[]> {
    const startTime = Date.now();
    
    const {
      limit = 20,
      minScore = 0.1,
      excludeViewed = true,
      excludePurchased = true,
      diversityFactor = 0.3,
      useContentBased = true,
      contentBasedWeight = 0.3,
    } = options;

    try {
      // Check cache first for fast response
      const cacheKey = `recommendations:${userId}:${JSON.stringify(options)}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        const responseTime = Date.now() - startTime;
        this.logPerformance('getRecommendations', responseTime, true);
        return JSON.parse(cached);
      }

      // Get user-based recommendations
      const userBasedRecs = await this.getUserBasedRecommendations(userId, limit * 2);

      // Get item-based recommendations
      const itemBasedRecs = await this.getItemBasedRecommendations(userId, limit * 2);

      // Get content-based recommendations if enabled
      let contentBasedRecs: ContentRecommendation[] = [];
      if (useContentBased) {
        contentBasedRecs = await this.getContentBasedRecommendations(userId, limit * 2);
      }

      // Combine and rank recommendations
      let combinedRecs: ContentRecommendation[];
      if (useContentBased && contentBasedRecs.length > 0) {
        // Three-way hybrid: collaborative + content-based
        const collaborativeWeight = 1 - contentBasedWeight;
        const userWeight = collaborativeWeight * 0.6;
        const itemWeight = collaborativeWeight * 0.4;

        combinedRecs = this.combineThreeWayRecommendations(
          userBasedRecs,
          itemBasedRecs,
          contentBasedRecs,
          userWeight,
          itemWeight,
          contentBasedWeight
        );
      } else {
        // Two-way hybrid: user-based + item-based
        combinedRecs = this.combineRecommendations(
          userBasedRecs,
          itemBasedRecs,
          0.6, // Weight for user-based
          0.4  // Weight for item-based
        );
      }

      // Filter out viewed/purchased content if requested
      let filteredRecs = combinedRecs;
      if (excludeViewed || excludePurchased) {
        const excludedIds = await this.getExcludedContent(userId, excludeViewed, excludePurchased);
        filteredRecs = combinedRecs.filter(rec => !excludedIds.has(rec.contentId));
      }

      // Apply diversity factor to avoid recommending too similar items
      const diverseRecs = await this.applyDiversity(filteredRecs, diversityFactor);

      // Filter by minimum score and limit
      const finalRecs = diverseRecs
        .filter(rec => rec.score >= minScore)
        .slice(0, limit);

      // Enrich with content metadata
      const enrichedRecs = await this.enrichRecommendations(finalRecs);

      // Cache results with shorter TTL for better freshness
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(enrichedRecs));

      const responseTime = Date.now() - startTime;
      this.logPerformance('getRecommendations', responseTime, false);

      return enrichedRecs;
    } catch (error: any) {
      console.error('Error getting recommendations:', error);
      
      // Fallback to simpler recommendations if hybrid fails
      try {
        const fallbackRecs = await this.getFallbackRecommendations(userId, limit);
        const responseTime = Date.now() - startTime;
        this.logPerformance('getRecommendations', responseTime, false, true);
        return fallbackRecs;
      } catch (fallbackError: any) {
        console.error('Fallback recommendations also failed:', fallbackError);
        throw new Error(`Failed to get recommendations: ${error.message}`);
      }
    }
  }

  /**
   * User-based collaborative filtering
   * Find similar users and recommend content they liked
   */
  async getUserBasedRecommendations(
    userId: string,
    limit: number = 20
  ): Promise<ContentRecommendation[]> {
    try {
      // Find similar users
      const similarUsers = await this.findSimilarUsers(userId, 50);

      if (similarUsers.length === 0) {
        return [];
      }

      // Get content liked by similar users
      const userIds = similarUsers.map(u => `'${u.userId}'`).join(',');
      
      const query = `
        SELECT 
          target_id as content_id,
          sum(
            CASE event_type
              WHEN 'nft_view' THEN 1
              WHEN 'nft_like' THEN 3
              WHEN 'nft_share' THEN 5
              WHEN 'add_to_cart' THEN 7
              WHEN 'purchase_complete' THEN 10
            END
          ) as total_weight,
          count(DISTINCT user_address) as user_count
        FROM user_behavior_events
        WHERE user_address IN (${userIds})
          AND target_id != ''
          AND event_type IN ('nft_view', 'nft_like', 'nft_share', 'add_to_cart', 'purchase_complete')
          AND event_date >= today() - INTERVAL 30 DAY
        GROUP BY content_id
        ORDER BY total_weight DESC, user_count DESC
        LIMIT ${limit}
      `;

      const result = await clickhouse.query(query).toPromise();

      // Calculate scores based on similar user weights
      const recommendations: ContentRecommendation[] = result.map((row: any) => {
        const contentId = row.content_id;
        const totalWeight = parseFloat(row.total_weight);
        const userCount = parseInt(row.user_count);

        // Calculate weighted score based on similar users
        let score = 0;
        for (const simUser of similarUsers) {
          // Assume users who interacted with this content
          score += simUser.similarity * (totalWeight / userCount);
        }

        // Normalize score
        score = Math.min(score / 10, 1);

        return {
          contentId,
          score,
          reason: 'user-based',
        };
      });

      return recommendations;
    } catch (error: any) {
      console.error('Error in user-based recommendations:', error);
      return [];
    }
  }

  /**
   * Item-based collaborative filtering
   * Find similar content based on user interaction patterns
   */
  async getItemBasedRecommendations(
    userId: string,
    limit: number = 20
  ): Promise<ContentRecommendation[]> {
    try {
      // Get user's interaction history
      const userInteractions = await this.getUserInteractions(userId);

      if (userInteractions.length === 0) {
        return [];
      }

      // Find similar content for each interacted item
      const recommendations = new Map<string, number>();

      for (const interaction of userInteractions) {
        const similarItems = await this.findSimilarContent(interaction.contentId, 20);

        for (const item of similarItems) {
          const currentScore = recommendations.get(item.contentId) || 0;
          // Weight by interaction strength and similarity
          const newScore = currentScore + (interaction.weight * item.similarity);
          recommendations.set(item.contentId, newScore);
        }
      }

      // Convert to array and sort
      const sortedRecs = Array.from(recommendations.entries())
        .map(([contentId, score]) => ({
          contentId,
          score: Math.min(score / 10, 1), // Normalize
          reason: 'item-based',
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return sortedRecs;
    } catch (error: any) {
      console.error('Error in item-based recommendations:', error);
      return [];
    }
  }

  /**
   * Content-based filtering
   * Recommend content similar to what the user has interacted with
   * Based on content features: tags, category, fingerprint, file type
   */
  async getContentBasedRecommendations(
    userId: string,
    limit: number = 20
  ): Promise<ContentRecommendation[]> {
    try {
      // Get user's interaction history
      const userInteractions = await this.getUserInteractions(userId);

      if (userInteractions.length === 0) {
        return [];
      }

      // Get content features for interacted items
      const interactedContentIds = userInteractions.map(i => i.contentId);
      const userProfile = await this.buildUserContentProfile(interactedContentIds, userInteractions);

      if (!userProfile) {
        return [];
      }

      // Find similar content based on features
      const recommendations = new Map<string, { score: number; matchedFeatures: string[] }>();

      // Get all published content (excluding already interacted)
      const allContent = await prisma.content.findMany({
        where: {
          status: 'published',
          id: { notIn: interactedContentIds },
        },
        select: {
          id: true,
          category: true,
          tags: true,
          aiFingerprint: true,
          fileType: true,
          creatorAddress: true,
        },
      });

      // Calculate similarity for each content
      for (const content of allContent) {
        const features: ContentFeatures = {
          contentId: content.id,
          category: content.category,
          tags: content.tags,
          fingerprint: content.aiFingerprint,
          fileType: content.fileType,
          creatorAddress: content.creatorAddress,
        };

        const similarity = this.calculateContentSimilarity(userProfile, features);

        if (similarity.similarity >= this.SIMILARITY_THRESHOLD) {
          recommendations.set(content.id, {
            score: similarity.similarity,
            matchedFeatures: similarity.matchedFeatures,
          });
        }
      }

      // Convert to array and sort
      const sortedRecs = Array.from(recommendations.entries())
        .map(([contentId, data]) => ({
          contentId,
          score: data.score,
          reason: `content-based: ${data.matchedFeatures.join(', ')}`,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return sortedRecs;
    } catch (error: any) {
      console.error('Error in content-based recommendations:', error);
      return [];
    }
  }

  /**
   * Build user content profile from interaction history
   * Creates a weighted profile of preferred categories, tags, and features
   */
  private async buildUserContentProfile(
    contentIds: string[],
    interactions: UserInteraction[]
  ): Promise<ContentFeatures | null> {
    try {
      if (contentIds.length === 0) {
        return null;
      }

      // Get content features for all interacted items
      const contents = await prisma.content.findMany({
        where: {
          id: { in: contentIds },
        },
        select: {
          id: true,
          category: true,
          tags: true,
          aiFingerprint: true,
          fileType: true,
          creatorAddress: true,
        },
      });

      if (contents.length === 0) {
        return null;
      }

      // Build weighted profile
      const categoryWeights = new Map<string, number>();
      const tagWeights = new Map<string, number>();
      const fileTypeWeights = new Map<string, number>();
      const creatorWeights = new Map<string, number>();
      const fingerprints: string[] = [];

      for (const content of contents) {
        // Find interaction weight for this content
        const interaction = interactions.find(i => i.contentId === content.id);
        const weight = interaction?.weight || 1;

        // Accumulate category weights
        categoryWeights.set(
          content.category,
          (categoryWeights.get(content.category) || 0) + weight
        );

        // Accumulate tag weights
        for (const tag of content.tags) {
          tagWeights.set(tag, (tagWeights.get(tag) || 0) + weight);
        }

        // Accumulate file type weights
        fileTypeWeights.set(
          content.fileType,
          (fileTypeWeights.get(content.fileType) || 0) + weight
        );

        // Accumulate creator weights
        creatorWeights.set(
          content.creatorAddress,
          (creatorWeights.get(content.creatorAddress) || 0) + weight
        );

        // Collect fingerprints
        fingerprints.push(content.aiFingerprint);
      }

      // Get top category
      const topCategory = Array.from(categoryWeights.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

      // Get top tags (weighted)
      const topTags = Array.from(tagWeights.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag]) => tag);

      // Get top file type
      const topFileType = Array.from(fileTypeWeights.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

      // Get top creator
      const topCreator = Array.from(creatorWeights.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

      // Use most recent fingerprint as representative
      const representativeFingerprint = fingerprints[fingerprints.length - 1] || '';

      return {
        contentId: 'user-profile',
        category: topCategory,
        tags: topTags,
        fingerprint: representativeFingerprint,
        fileType: topFileType,
        creatorAddress: topCreator,
      };
    } catch (error: any) {
      console.error('Error building user content profile:', error);
      return null;
    }
  }

  /**
   * Calculate similarity between user profile and content features
   * Uses multiple feature matching strategies
   */
  private calculateContentSimilarity(
    userProfile: ContentFeatures,
    contentFeatures: ContentFeatures
  ): ContentSimilarity {
    let totalScore = 0;
    const matchedFeatures: string[] = [];
    let featureCount = 0;

    // 1. Category match (weight: 0.3)
    if (userProfile.category === contentFeatures.category) {
      totalScore += 0.3;
      matchedFeatures.push('category');
    }
    featureCount++;

    // 2. Tag overlap (weight: 0.35)
    const userTags = new Set(userProfile.tags);
    const contentTags = new Set(contentFeatures.tags);
    const tagIntersection = new Set(
      [...userTags].filter(tag => contentTags.has(tag))
    );
    
    if (userTags.size > 0 && contentTags.size > 0) {
      const tagSimilarity = tagIntersection.size / Math.sqrt(userTags.size * contentTags.size);
      totalScore += tagSimilarity * 0.35;
      if (tagIntersection.size > 0) {
        matchedFeatures.push(`tags(${tagIntersection.size})`);
      }
    }
    featureCount++;

    // 3. File type match (weight: 0.15)
    if (userProfile.fileType === contentFeatures.fileType) {
      totalScore += 0.15;
      matchedFeatures.push('file-type');
    }
    featureCount++;

    // 4. Creator match (weight: 0.1)
    if (userProfile.creatorAddress === contentFeatures.creatorAddress) {
      totalScore += 0.1;
      matchedFeatures.push('creator');
    }
    featureCount++;

    // 5. Fingerprint similarity (weight: 0.1)
    // Use Hamming distance for fingerprint comparison
    if (userProfile.fingerprint && contentFeatures.fingerprint) {
      const fingerprintSimilarity = this.calculateFingerprintSimilarity(
        userProfile.fingerprint,
        contentFeatures.fingerprint
      );
      totalScore += fingerprintSimilarity * 0.1;
      if (fingerprintSimilarity > 0.5) {
        matchedFeatures.push('fingerprint');
      }
    }
    featureCount++;

    // Normalize score
    const normalizedScore = totalScore;

    return {
      contentId: contentFeatures.contentId,
      similarity: normalizedScore,
      matchedFeatures,
    };
  }

  /**
   * Calculate fingerprint similarity using normalized Hamming distance
   * Assumes fingerprints are hex strings
   */
  private calculateFingerprintSimilarity(fp1: string, fp2: string): number {
    try {
      if (!fp1 || !fp2 || fp1.length !== fp2.length) {
        return 0;
      }

      let matchingBits = 0;
      const totalBits = fp1.length * 4; // Each hex char = 4 bits

      for (let i = 0; i < fp1.length; i++) {
        const val1 = parseInt(fp1[i], 16);
        const val2 = parseInt(fp2[i], 16);
        
        if (isNaN(val1) || isNaN(val2)) {
          continue;
        }

        // Count matching bits using XOR
        const xor = val1 ^ val2;
        const matchingInNibble = 4 - this.countSetBits(xor);
        matchingBits += matchingInNibble;
      }

      return matchingBits / totalBits;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Count set bits in a number (Brian Kernighan's algorithm)
   */
  private countSetBits(n: number): number {
    let count = 0;
    while (n > 0) {
      n &= n - 1;
      count++;
    }
    return count;
  }

  /**
   * Find content similar to given content based on features
   * Used for "similar items" recommendations
   */
  async findSimilarContentByFeatures(
    contentId: string,
    limit: number = 20
  ): Promise<ContentSimilarity[]> {
    try {
      const cacheKey = `similar_content_features:${contentId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get source content features
      const sourceContent = await prisma.content.findUnique({
        where: { id: contentId },
        select: {
          id: true,
          category: true,
          tags: true,
          aiFingerprint: true,
          fileType: true,
          creatorAddress: true,
        },
      });

      if (!sourceContent) {
        return [];
      }

      const sourceFeatures: ContentFeatures = {
        contentId: sourceContent.id,
        category: sourceContent.category,
        tags: sourceContent.tags,
        fingerprint: sourceContent.aiFingerprint,
        fileType: sourceContent.fileType,
        creatorAddress: sourceContent.creatorAddress,
      };

      // Get all other published content
      const allContent = await prisma.content.findMany({
        where: {
          status: 'published',
          id: { not: contentId },
        },
        select: {
          id: true,
          category: true,
          tags: true,
          aiFingerprint: true,
          fileType: true,
          creatorAddress: true,
        },
      });

      // Calculate similarities
      const similarities: ContentSimilarity[] = [];

      for (const content of allContent) {
        const targetFeatures: ContentFeatures = {
          contentId: content.id,
          category: content.category,
          tags: content.tags,
          fingerprint: content.aiFingerprint,
          fileType: content.fileType,
          creatorAddress: content.creatorAddress,
        };

        const similarity = this.calculateContentSimilarity(sourceFeatures, targetFeatures);

        if (similarity.similarity >= this.SIMILARITY_THRESHOLD) {
          similarities.push(similarity);
        }
      }

      // Sort and limit
      similarities.sort((a, b) => b.similarity - a.similarity);
      const topSimilar = similarities.slice(0, limit);

      // Cache results
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(topSimilar));

      return topSimilar;
    } catch (error: any) {
      console.error('Error finding similar content by features:', error);
      return [];
    }
  }

  /**
   * Find users similar to the given user based on interaction patterns
   * Uses cosine similarity
   */
  async findSimilarUsers(
    userId: string,
    limit: number = 50
  ): Promise<UserSimilarity[]> {
    try {
      const cacheKey = `similar_users:${userId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get target user's interaction vector
      const targetVector = await this.getUserInteractionVector(userId);

      if (Object.keys(targetVector).length === 0) {
        return [];
      }

      // Get all users who interacted with similar content
      const contentIds = Object.keys(targetVector).map(id => `'${id}'`).join(',');
      
      const query = `
        SELECT 
          user_address,
          target_id as content_id,
          sum(
            CASE event_type
              WHEN 'nft_view' THEN 1
              WHEN 'nft_like' THEN 3
              WHEN 'nft_share' THEN 5
              WHEN 'add_to_cart' THEN 7
              WHEN 'purchase_complete' THEN 10
            END
          ) as weight
        FROM user_behavior_events
        WHERE target_id IN (${contentIds})
          AND user_address != '${userId}'
          AND event_date >= today() - INTERVAL 30 DAY
        GROUP BY user_address, content_id
      `;

      const result = await clickhouse.query(query).toPromise();

      // Build interaction vectors for other users
      const userVectors = new Map<string, Record<string, number>>();
      
      for (const row of result as any[]) {
        const userAddr = row.user_address;
        const contentId = row.content_id;
        const weight = parseFloat(row.weight);

        if (!userVectors.has(userAddr)) {
          userVectors.set(userAddr, {});
        }
        userVectors.get(userAddr)![contentId] = weight;
      }

      // Calculate cosine similarity with each user
      const similarities: UserSimilarity[] = [];

      for (const [otherUserId, otherVector] of userVectors.entries()) {
        const similarity = this.cosineSimilarity(targetVector, otherVector);
        
        if (similarity >= this.SIMILARITY_THRESHOLD) {
          similarities.push({
            userId: otherUserId,
            similarity,
          });
        }
      }

      // Sort by similarity and limit
      similarities.sort((a, b) => b.similarity - a.similarity);
      const topSimilar = similarities.slice(0, limit);

      // Cache results
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(topSimilar));

      return topSimilar;
    } catch (error: any) {
      console.error('Error finding similar users:', error);
      return [];
    }
  }

  /**
   * Find content similar to the given content based on user co-interactions
   * Uses Jaccard similarity and co-occurrence patterns
   */
  async findSimilarContent(
    contentId: string,
    limit: number = 20
  ): Promise<ItemSimilarity[]> {
    try {
      const cacheKey = `similar_content:${contentId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get users who interacted with this content
      const query = `
        SELECT 
          user_address,
          groupArray(target_id) as other_content
        FROM user_behavior_events
        WHERE user_address IN (
          SELECT DISTINCT user_address
          FROM user_behavior_events
          WHERE target_id = '${contentId}'
            AND event_date >= today() - INTERVAL 30 DAY
        )
        AND target_id != '${contentId}'
        AND target_id != ''
        AND event_date >= today() - INTERVAL 30 DAY
        GROUP BY user_address
      `;

      const result = await clickhouse.query(query).toPromise();

      // Count co-occurrences
      const coOccurrences = new Map<string, number>();
      const totalUsers = result.length;

      for (const row of result as any[]) {
        const otherContent = row.other_content;
        for (const otherId of otherContent) {
          coOccurrences.set(otherId, (coOccurrences.get(otherId) || 0) + 1);
        }
      }

      // Calculate Jaccard similarity
      const similarities: ItemSimilarity[] = [];

      for (const [otherId, coCount] of coOccurrences.entries()) {
        // Get users who interacted with the other content
        const otherUsersQuery = `
          SELECT count(DISTINCT user_address) as user_count
          FROM user_behavior_events
          WHERE target_id = '${otherId}'
            AND event_date >= today() - INTERVAL 30 DAY
        `;

        const otherResult = await clickhouse.query(otherUsersQuery).toPromise() as any[];
        const otherUserCount = parseInt(otherResult[0]?.user_count || '0');

        // Jaccard similarity: intersection / union
        const intersection = coCount;
        const union = totalUsers + otherUserCount - intersection;
        const similarity = union > 0 ? intersection / union : 0;

        if (similarity >= this.SIMILARITY_THRESHOLD) {
          similarities.push({
            contentId: otherId,
            similarity,
          });
        }
      }

      // Sort by similarity and limit
      similarities.sort((a, b) => b.similarity - a.similarity);
      const topSimilar = similarities.slice(0, limit);

      // Cache results
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(topSimilar));

      return topSimilar;
    } catch (error: any) {
      console.error('Error finding similar content:', error);
      return [];
    }
  }

  /**
   * Get user's interaction history with weights
   */
  private async getUserInteractions(userId: string): Promise<UserInteraction[]> {
    try {
      const query = `
        SELECT 
          user_address as user_id,
          target_id as content_id,
          event_type as interaction_type,
          max(event_time) as timestamp,
          sum(
            CASE event_type
              WHEN 'nft_view' THEN 1
              WHEN 'nft_like' THEN 3
              WHEN 'nft_share' THEN 5
              WHEN 'add_to_cart' THEN 7
              WHEN 'purchase_complete' THEN 10
            END
          ) as weight
        FROM user_behavior_events
        WHERE user_address = '${userId}'
          AND target_id != ''
          AND event_date >= today() - INTERVAL 30 DAY
        GROUP BY user_id, content_id, interaction_type
        ORDER BY timestamp DESC
      `;

      const result = await clickhouse.query(query).toPromise();

      return result.map((row: any) => ({
        userId: row.user_id,
        contentId: row.content_id,
        interactionType: row.interaction_type,
        weight: parseFloat(row.weight),
        timestamp: new Date(row.timestamp),
      }));
    } catch (error: any) {
      console.error('Error getting user interactions:', error);
      return [];
    }
  }

  /**
   * Build user interaction vector (contentId -> weight)
   */
  private async getUserInteractionVector(userId: string): Promise<Record<string, number>> {
    const interactions = await this.getUserInteractions(userId);
    const vector: Record<string, number> = {};

    for (const interaction of interactions) {
      vector[interaction.contentId] = (vector[interaction.contentId] || 0) + interaction.weight;
    }

    return vector;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(
    vectorA: Record<string, number>,
    vectorB: Record<string, number>
  ): number {
    const keysA = Object.keys(vectorA);
    const keysB = Object.keys(vectorB);
    const commonKeys = keysA.filter(key => key in vectorB);

    if (commonKeys.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (const key of keysA) {
      magnitudeA += vectorA[key] ** 2;
      if (key in vectorB) {
        dotProduct += vectorA[key] * vectorB[key];
      }
    }

    for (const key of keysB) {
      magnitudeB += vectorB[key] ** 2;
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Combine user-based and item-based recommendations
   */
  private combineRecommendations(
    userBased: ContentRecommendation[],
    itemBased: ContentRecommendation[],
    userWeight: number,
    itemWeight: number
  ): ContentRecommendation[] {
    const combined = new Map<string, ContentRecommendation>();

    // Add user-based recommendations
    for (const rec of userBased) {
      combined.set(rec.contentId, {
        ...rec,
        score: rec.score * userWeight,
        reason: 'user-based',
      });
    }

    // Add or merge item-based recommendations
    for (const rec of itemBased) {
      const existing = combined.get(rec.contentId);
      if (existing) {
        combined.set(rec.contentId, {
          ...existing,
          score: existing.score + (rec.score * itemWeight),
          reason: 'hybrid',
        });
      } else {
        combined.set(rec.contentId, {
          ...rec,
          score: rec.score * itemWeight,
          reason: 'item-based',
        });
      }
    }

    // Convert to array and sort
    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Combine user-based, item-based, and content-based recommendations
   */
  private combineThreeWayRecommendations(
    userBased: ContentRecommendation[],
    itemBased: ContentRecommendation[],
    contentBased: ContentRecommendation[],
    userWeight: number,
    itemWeight: number,
    contentWeight: number
  ): ContentRecommendation[] {
    const combined = new Map<string, ContentRecommendation>();

    // Add user-based recommendations
    for (const rec of userBased) {
      combined.set(rec.contentId, {
        ...rec,
        score: rec.score * userWeight,
        reason: 'user-based',
      });
    }

    // Add or merge item-based recommendations
    for (const rec of itemBased) {
      const existing = combined.get(rec.contentId);
      if (existing) {
        combined.set(rec.contentId, {
          ...existing,
          score: existing.score + (rec.score * itemWeight),
          reason: existing.reason === 'user-based' ? 'hybrid-collaborative' : existing.reason,
        });
      } else {
        combined.set(rec.contentId, {
          ...rec,
          score: rec.score * itemWeight,
          reason: 'item-based',
        });
      }
    }

    // Add or merge content-based recommendations
    for (const rec of contentBased) {
      const existing = combined.get(rec.contentId);
      if (existing) {
        combined.set(rec.contentId, {
          ...existing,
          score: existing.score + (rec.score * contentWeight),
          reason: 'hybrid-full',
        });
      } else {
        combined.set(rec.contentId, {
          ...rec,
          score: rec.score * contentWeight,
          reason: rec.reason, // Keep content-based reason with matched features
        });
      }
    }

    // Convert to array and sort
    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Get content IDs to exclude (viewed/purchased)
   */
  private async getExcludedContent(
    userId: string,
    excludeViewed: boolean,
    excludePurchased: boolean
  ): Promise<Set<string>> {
    const excluded = new Set<string>();

    try {
      if (excludeViewed) {
        const viewQuery = `
          SELECT DISTINCT target_id
          FROM user_behavior_events
          WHERE user_address = '${userId}'
            AND event_type = 'nft_view'
            AND target_id != ''
        `;
        const viewResult = await clickhouse.query(viewQuery).toPromise();
        viewResult.forEach((row: any) => excluded.add(row.target_id));
      }

      if (excludePurchased) {
        // Use Trade model to find purchased content (buyer = userId)
        const trades = await prisma.trade.findMany({
          where: { buyer: userId },
          select: { tokenId: true },
        });
        trades.forEach((t: any) => excluded.add(t.tokenId));
      }
    } catch (error) {
      console.error('Error getting excluded content:', error);
    }

    return excluded;
  }

  /**
   * Apply diversity to avoid recommending too similar items
   * Enhanced with category, creator, and feature-based diversity
   * REQ-1.7.2: Add diversity to recommendations
   */
  private async applyDiversity(
    recommendations: ContentRecommendation[],
    diversityFactor: number
  ): Promise<ContentRecommendation[]> {
    if (diversityFactor === 0 || recommendations.length <= 1) {
      return recommendations;
    }

    try {
      // Fetch content metadata for diversity calculation
      const contentIds = recommendations.map(r => r.contentId);
      const contents = await prisma.content.findMany({
        where: { id: { in: contentIds } },
        select: {
          id: true,
          category: true,
          tags: true,
          creatorAddress: true,
          fileType: true,
        },
      });

      const contentMap = new Map(contents.map(c => [c.id, c]));

      // Start with highest scored item
      const diverse: ContentRecommendation[] = [recommendations[0]];
      const selectedCategories = new Map<string, number>();
      const selectedCreators = new Map<string, number>();
      const selectedTags = new Set<string>();

      // Track first item's features
      const firstContent = contentMap.get(recommendations[0].contentId);
      if (firstContent) {
        selectedCategories.set(firstContent.category, 1);
        selectedCreators.set(firstContent.creatorAddress, 1);
        firstContent.tags.forEach(tag => selectedTags.add(tag));
      }

      // Greedy selection with diversity penalty
      for (let i = 1; i < recommendations.length; i++) {
        const candidate = recommendations[i];
        const candidateContent = contentMap.get(candidate.contentId);

        if (!candidateContent) {
          diverse.push(candidate);
          continue;
        }

        // Calculate diversity penalties
        let diversityPenalty = 0;

        // 1. Category diversity (weight: 0.3)
        const categoryCount = selectedCategories.get(candidateContent.category) || 0;
        const categoryPenalty = (categoryCount / diverse.length) * 0.3;
        diversityPenalty += categoryPenalty;

        // 2. Creator diversity (weight: 0.2)
        const creatorCount = selectedCreators.get(candidateContent.creatorAddress) || 0;
        const creatorPenalty = (creatorCount / diverse.length) * 0.2;
        diversityPenalty += creatorPenalty;

        // 3. Tag overlap diversity (weight: 0.3)
        const candidateTags = new Set(candidateContent.tags);
        const tagOverlap = [...candidateTags].filter(tag => selectedTags.has(tag)).length;
        const tagPenalty = candidateTags.size > 0 
          ? (tagOverlap / candidateTags.size) * 0.3 
          : 0;
        diversityPenalty += tagPenalty;

        // 4. Recommendation method diversity (weight: 0.2)
        const methodCounts = diverse.reduce((acc, rec) => {
          acc[rec.reason] = (acc[rec.reason] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const methodCount = methodCounts[candidate.reason] || 0;
        const methodPenalty = (methodCount / diverse.length) * 0.2;
        diversityPenalty += methodPenalty;

        // Apply diversity factor
        const totalPenalty = diversityPenalty * diversityFactor;
        const adjustedScore = candidate.score * (1 - totalPenalty);

        if (adjustedScore > 0) {
          diverse.push({
            ...candidate,
            score: adjustedScore,
          });

          // Update tracking
          selectedCategories.set(
            candidateContent.category,
            (selectedCategories.get(candidateContent.category) || 0) + 1
          );
          selectedCreators.set(
            candidateContent.creatorAddress,
            (selectedCreators.get(candidateContent.creatorAddress) || 0) + 1
          );
          candidateContent.tags.forEach(tag => selectedTags.add(tag));
        }
      }

      return diverse.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error('Error applying diversity:', error);
      // Fallback to simple diversity
      return recommendations;
    }
  }

  /**
   * Enrich recommendations with content metadata
   */
  private async enrichRecommendations(
    recommendations: ContentRecommendation[]
  ): Promise<ContentRecommendation[]> {
    if (recommendations.length === 0) {
      return [];
    }

    try {
      const contentIds = recommendations.map(r => r.contentId);
      const contents = await prisma.content.findMany({
        where: {
          id: { in: contentIds },
        },
        select: {
          id: true,
          title: true,
          category: true,
          creatorAddress: true,
        },
      });

      const contentMap = new Map(contents.map(c => [c.id, c]));

      return recommendations.map(rec => {
        const content = contentMap.get(rec.contentId);
        return {
          ...rec,
          metadata: content ? {
            title: content.title,
            category: content.category,
            creator: content.creatorAddress,
          } : undefined,
        };
      });
    } catch (error) {
      console.error('Error enriching recommendations:', error);
      return recommendations;
    }
  }

  /**
   * Train/update recommendation models
   * This can be run periodically to pre-compute similarities
   */
  async trainModels(): Promise<void> {
    try {
      console.log('Starting recommendation model training...');

      // Get all active users
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, walletAddress: true },
      });

      console.log(`Training models for ${users.length} users...`);

      // Pre-compute user similarities
      for (const user of users) {
        const userId = user.walletAddress || user.id;
        await this.findSimilarUsers(userId, 50);
      }

      // Get all content
      const contents = await prisma.content.findMany({
        where: { status: 'published' },
        select: { id: true },
      });

      console.log(`Training models for ${contents.length} content items...`);

      // Pre-compute content similarities
      for (const content of contents) {
        await this.findSimilarContent(content.id, 20);
      }

      console.log('Model training completed successfully');
    } catch (error: any) {
      console.error('Error training models:', error);
      throw new Error(`Failed to train models: ${error.message}`);
    }
  }

  /**
   * Evaluate recommendation accuracy using test set
   * Uses precision@k and recall@k metrics
   */
  async evaluateAccuracy(testSetSize: number = 100): Promise<{
    precision: number;
    recall: number;
    f1Score: number;
    coverage: number;
  }> {
    try {
      console.log(`Evaluating recommendation accuracy with test set size: ${testSetSize}`);

      // Get random sample of users with purchase history
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
        },
        take: testSetSize,
        select: {
          id: true,
          walletAddress: true,
        },
      });

      let totalPrecision = 0;
      let totalRecall = 0;
      let totalUsers = 0;
      const allRecommendedContent = new Set<string>();

      for (const user of users) {
        const userId = user.walletAddress || user.id;

        // Get user's actual purchases (ground truth) using Trade model
        const actualPurchases = await prisma.trade.findMany({
          where: {
            buyer: userId,
          },
          select: { tokenId: true },
        });

        if (actualPurchases.length === 0) {
          continue;
        }

        const actualSet = new Set(actualPurchases.map((p: any) => p.tokenId));

        // Get recommendations (excluding already purchased)
        const recommendations = await this.getRecommendations(userId, {
          limit: 10,
          excludePurchased: false, // Don't exclude for evaluation
        });

        const recommendedSet = new Set(recommendations.map(r => r.contentId));

        // Calculate precision and recall
        const intersection = new Set(
          [...actualSet].filter(id => recommendedSet.has(id))
        );

        const precision = recommendedSet.size > 0 
          ? intersection.size / recommendedSet.size 
          : 0;
        
        const recall = actualSet.size > 0 
          ? intersection.size / actualSet.size 
          : 0;

        totalPrecision += precision;
        totalRecall += recall;
        totalUsers++;

        // Track coverage
        recommendations.forEach(r => allRecommendedContent.add(r.contentId));
      }

      // Calculate average metrics
      const avgPrecision = totalUsers > 0 ? totalPrecision / totalUsers : 0;
      const avgRecall = totalUsers > 0 ? totalRecall / totalUsers : 0;
      const f1Score = (avgPrecision + avgRecall) > 0
        ? (2 * avgPrecision * avgRecall) / (avgPrecision + avgRecall)
        : 0;

      // Calculate coverage (% of catalog recommended)
      const totalContent = await prisma.content.count({
        where: { status: 'published' },
      });
      const coverage = totalContent > 0 
        ? allRecommendedContent.size / totalContent 
        : 0;

      const results = {
        precision: Math.round(avgPrecision * 10000) / 100,
        recall: Math.round(avgRecall * 10000) / 100,
        f1Score: Math.round(f1Score * 10000) / 100,
        coverage: Math.round(coverage * 10000) / 100,
      };

      console.log('Evaluation results:', results);

      return results;
    } catch (error: any) {
      console.error('Error evaluating accuracy:', error);
      throw new Error(`Failed to evaluate accuracy: ${error.message}`);
    }
  }

  /**
   * Get fallback recommendations when main algorithm fails
   * Uses simple popularity-based recommendations
   * REQ-1.7.2: Implement fallback recommendations
   */
  async getFallbackRecommendations(
    userId: string,
    limit: number = 20
  ): Promise<ContentRecommendation[]> {
    try {
      console.log(`Using fallback recommendations for user ${userId}`);

      // Check cache for fallback recommendations
      const cacheKey = `fallback_recommendations:${userId}:${limit}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get user's viewed/purchased content to exclude
      const excludedIds = await this.getExcludedContent(userId, true, true);

      // Get popular content from last 30 days
      const popularContent = await prisma.content.findMany({
        where: {
          status: 'published',
          id: { notIn: Array.from(excludedIds) },
        },
        orderBy: [
          { views: 'desc' },
          { likes: 'desc' },
        ],
        take: limit * 2,
        select: {
          id: true,
          title: true,
          category: true,
          creatorAddress: true,
          views: true,
          likes: true,
          createdAt: true,
        },
      });

      if (popularContent.length === 0) {
        // Ultimate fallback: get any published content
        const anyContent = await prisma.content.findMany({
          where: { status: 'published' },
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            category: true,
            creatorAddress: true,
          },
        });

        return anyContent.map(content => ({
          contentId: content.id,
          score: 0.5,
          reason: 'fallback-recent',
          metadata: {
            title: content.title,
            category: content.category,
            creator: content.creatorAddress,
          },
        }));
      }

      // Calculate simple popularity scores
      const maxViews = Math.max(...popularContent.map(c => c.views), 1);
      const maxLikes = Math.max(...popularContent.map(c => c.likes), 1);

      const recommendations: ContentRecommendation[] = popularContent.map(content => {
        const viewScore = content.views / maxViews;
        const likeScore = content.likes / maxLikes;
        const popularityScore = (viewScore * 0.7 + likeScore * 0.3);

        // Add freshness bonus
        const ageInDays = (Date.now() - content.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        const freshnessBonus = Math.max(0, 1 - (ageInDays / 30)) * 0.2;

        return {
          contentId: content.id,
          score: popularityScore + freshnessBonus,
          reason: 'fallback-popular',
          metadata: {
            title: content.title,
            category: content.category,
            creator: content.creatorAddress,
          },
        };
      });

      // Sort by score and limit
      const sortedRecs = recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Cache fallback recommendations with shorter TTL
      await redis.setex(cacheKey, 1800, JSON.stringify(sortedRecs)); // 30 minutes

      return sortedRecs;
    } catch (error: any) {
      console.error('Error getting fallback recommendations:', error);
      // Return empty array as last resort
      return [];
    }
  }

  /**
   * Log API performance metrics
   * REQ-1.7.2: Monitor API performance (<200ms)
   */
  private logPerformance(
    method: string,
    responseTime: number,
    fromCache: boolean,
    isFallback: boolean = false
  ): void {
    const status = responseTime < this.PERFORMANCE_THRESHOLD_MS ? 'OK' : 'SLOW';
    const source = fromCache ? 'cache' : isFallback ? 'fallback' : 'computed';

    console.log(
      `[PERFORMANCE] ${method} - ${responseTime}ms [${status}] [${source}]`
    );

    // Store performance metrics in Redis for monitoring
    const metricsKey = `performance:recommendations:${method}`;
    const metricsData = {
      timestamp: Date.now(),
      responseTime,
      status,
      source,
      threshold: this.PERFORMANCE_THRESHOLD_MS,
    };

    redis.lpush(metricsKey, JSON.stringify(metricsData)).catch(err => {
      console.error('Failed to log performance metrics:', err);
    });

    // Keep only last 1000 metrics
    redis.ltrim(metricsKey, 0, 999).catch(err => {
      console.error('Failed to trim performance metrics:', err);
    });

    // Alert if consistently slow
    if (responseTime > this.PERFORMANCE_THRESHOLD_MS * 2) {
      console.warn(
        `[ALERT] Recommendation API is significantly slow: ${responseTime}ms (threshold: ${this.PERFORMANCE_THRESHOLD_MS}ms)`
      );
    }
  }

  /**
   * Get performance metrics for monitoring
   * REQ-1.7.2: Monitor API performance
   */
  async getPerformanceMetrics(method: string = 'getRecommendations'): Promise<{
    averageResponseTime: number;
    p50: number;
    p95: number;
    p99: number;
    cacheHitRate: number;
    fallbackRate: number;
    slowRequestRate: number;
    totalRequests: number;
  }> {
    try {
      const metricsKey = `performance:recommendations:${method}`;
      const metricsData = await redis.lrange(metricsKey, 0, 999);

      if (metricsData.length === 0) {
        return {
          averageResponseTime: 0,
          p50: 0,
          p95: 0,
          p99: 0,
          cacheHitRate: 0,
          fallbackRate: 0,
          slowRequestRate: 0,
          totalRequests: 0,
        };
      }

      const metrics = metricsData.map(data => JSON.parse(data));
      const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);

      const totalRequests = metrics.length;
      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / totalRequests;

      const p50Index = Math.floor(totalRequests * 0.5);
      const p95Index = Math.floor(totalRequests * 0.95);
      const p99Index = Math.floor(totalRequests * 0.99);

      const p50 = responseTimes[p50Index] || 0;
      const p95 = responseTimes[p95Index] || 0;
      const p99 = responseTimes[p99Index] || 0;

      const cacheHits = metrics.filter(m => m.source === 'cache').length;
      const fallbacks = metrics.filter(m => m.source === 'fallback').length;
      const slowRequests = metrics.filter(m => m.status === 'SLOW').length;

      return {
        averageResponseTime: Math.round(averageResponseTime),
        p50: Math.round(p50),
        p95: Math.round(p95),
        p99: Math.round(p99),
        cacheHitRate: Math.round((cacheHits / totalRequests) * 100),
        fallbackRate: Math.round((fallbacks / totalRequests) * 100),
        slowRequestRate: Math.round((slowRequests / totalRequests) * 100),
        totalRequests,
      };
    } catch (error: any) {
      console.error('Error getting performance metrics:', error);
      throw new Error(`Failed to get performance metrics: ${error.message}`);
    }
  }

  /**
   * Clear recommendation cache
   */
  async clearCache(userId?: string): Promise<void> {
    try {
      if (userId) {
        const pattern = `recommendations:${userId}:*`;
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } else {
        const patterns = ['recommendations:*', 'similar_users:*', 'similar_content:*'];
        for (const pattern of patterns) {
          const keys = await redis.keys(pattern);
          if (keys.length > 0) {
            await redis.del(...keys);
          }
        }
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Advanced ranking algorithm with multiple signals
   * REQ-1.7.2: Implement ranking algorithm
   * 
   * Combines:
   * - Recommendation score (collaborative + content-based)
   * - Content popularity (views, purchases)
   * - Content freshness (recency)
   * - User engagement signals
   * - Creator reputation
   */
  async applyAdvancedRanking(
    recommendations: ContentRecommendation[],
    _userId: string, // Prefix with underscore to indicate intentionally unused
    options: {
      popularityWeight?: number;
      freshnessWeight?: number;
      engagementWeight?: number;
      creatorReputationWeight?: number;
    } = {}
  ): Promise<ContentRecommendation[]> {
    const {
      popularityWeight = 0.15,
      freshnessWeight = 0.1,
      engagementWeight = 0.1,
      creatorReputationWeight = 0.05,
    } = options;

    try {
      if (recommendations.length === 0) {
        return [];
      }

      const contentIds = recommendations.map(r => r.contentId);

      // Fetch content data for ranking signals
      const contents = await prisma.content.findMany({
        where: { id: { in: contentIds } },
        select: {
          id: true,
          views: true,
          likes: true,
          createdAt: true,
          creatorAddress: true,
        },
      });

      const contentMap = new Map(contents.map(c => [c.id, c]));

      // Get creator reputation scores (basic info only)
      const creatorAddresses = [...new Set(contents.map(c => c.creatorAddress))];
      const creators = await prisma.creator.findMany({
        where: { walletAddress: { in: creatorAddresses } },
        select: {
          walletAddress: true,
          createdAt: true,
        },
      });

      const creatorMap = new Map(creators.map(c => [c.walletAddress, c]));

      // Calculate max values for normalization
      const maxViews = Math.max(...contents.map(c => c.views), 1);
      const maxLikes = Math.max(...contents.map(c => c.likes), 1);
      const now = Date.now();
      const maxAge = Math.max(
        ...contents.map(c => now - c.createdAt.getTime()),
        1
      );

      // Apply ranking to each recommendation
      const rankedRecs = recommendations.map(rec => {
        const content = contentMap.get(rec.contentId);
        if (!content) {
          return rec;
        }

        const creator = creatorMap.get(content.creatorAddress);

        // 1. Popularity score (normalized views + likes)
        const viewScore = content.views / maxViews;
        const likeScore = content.likes / maxLikes;
        const popularityScore = (viewScore * 0.6 + likeScore * 0.4);

        // 2. Freshness score (exponential decay)
        const contentAge = now - content.createdAt.getTime();
        const freshnessScore = Math.exp(-contentAge / maxAge);

        // 3. Engagement score (like rate)
        const likeRate = content.views > 0 
          ? content.likes / content.views 
          : 0;
        const engagementScore = Math.min(likeRate * 2, 1); // Normalize to 0-1

        // 4. Creator reputation score (based on creator age)
        let creatorScore = 0;
        if (creator) {
          const creatorAge = now - creator.createdAt.getTime();
          const maxCreatorAge = 365 * 24 * 60 * 60 * 1000; // 1 year in ms
          creatorScore = Math.min(creatorAge / maxCreatorAge, 1);
        }

        // Combine all signals with weights
        const baseScore = rec.score * (1 - popularityWeight - freshnessWeight - engagementWeight - creatorReputationWeight);
        const finalScore = 
          baseScore +
          popularityScore * popularityWeight +
          freshnessScore * freshnessWeight +
          engagementScore * engagementWeight +
          creatorScore * creatorReputationWeight;

        return {
          ...rec,
          score: finalScore,
          metadata: {
            ...rec.metadata,
            signals: {
              base: rec.score,
              popularity: popularityScore,
              freshness: freshnessScore,
              engagement: engagementScore,
              creatorReputation: creatorScore,
            },
          },
        };
      });

      return rankedRecs.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error('Error applying advanced ranking:', error);
      return recommendations;
    }
  }

  /**
   * Get recommendations with A/B testing
   * REQ-1.7.2: A/B test against baseline
   * 
   * Assigns users to test groups and tracks performance
   */
  async getRecommendationsWithABTest(
    userId: string,
    options: RecommendationOptions = {}
  ): Promise<{
    recommendations: ContentRecommendation[];
    testGroup: 'control' | 'hybrid' | 'advanced_ranking';
    experimentId: string;
  }> {
    try {
      // Determine test group based on user ID hash
      const testGroup = this.assignTestGroup(userId);
      const experimentId = `rec_ab_test_${Date.now()}`;

      let recommendations: ContentRecommendation[];

      switch (testGroup) {
        case 'control':
          // Baseline: User-based collaborative filtering only
          recommendations = await this.getUserBasedRecommendations(
            userId,
            options.limit || 20
          );
          break;

        case 'hybrid':
          // Hybrid model without advanced ranking
          recommendations = await this.getRecommendations(userId, {
            ...options,
            useContentBased: true,
            contentBasedWeight: 0.3,
          });
          break;

        case 'advanced_ranking':
          // Full hybrid with advanced ranking
          const hybridRecs = await this.getRecommendations(userId, {
            ...options,
            useContentBased: true,
            contentBasedWeight: 0.3,
          });
          recommendations = await this.applyAdvancedRanking(hybridRecs, userId);
          break;

        default:
          recommendations = await this.getRecommendations(userId, options);
      }

      // Log A/B test assignment for analysis
      await this.logABTestAssignment(userId, testGroup, experimentId);

      return {
        recommendations,
        testGroup,
        experimentId,
      };
    } catch (error: any) {
      console.error('Error in A/B test recommendations:', error);
      throw new Error(`Failed to get A/B test recommendations: ${error.message}`);
    }
  }

  /**
   * Assign user to test group using consistent hashing
   */
  private assignTestGroup(userId: string): 'control' | 'hybrid' | 'advanced_ranking' {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }

    const bucket = Math.abs(hash) % 100;

    // 33% control, 33% hybrid, 34% advanced_ranking
    if (bucket < 33) {
      return 'control';
    } else if (bucket < 66) {
      return 'hybrid';
    } else {
      return 'advanced_ranking';
    }
  }

  /**
   * Log A/B test assignment for analysis
   */
  private async logABTestAssignment(
    userId: string,
    testGroup: string,
    experimentId: string
  ): Promise<void> {
    try {
      const key = `ab_test:${userId}`;
      const data = {
        userId,
        testGroup,
        experimentId,
        timestamp: new Date().toISOString(),
      };

      await redis.setex(key, 86400 * 7, JSON.stringify(data)); // 7 days TTL
    } catch (error) {
      console.error('Error logging A/B test assignment:', error);
    }
  }

  /**
   * Track recommendation interaction for A/B test analysis
   */
  async trackRecommendationInteraction(
    userId: string,
    contentId: string,
    interactionType: 'view' | 'click' | 'purchase',
    experimentId?: string
  ): Promise<void> {
    try {
      // Get user's test group
      const testDataKey = `ab_test:${userId}`;
      const testData = await redis.get(testDataKey);

      if (!testData) {
        return;
      }

      const { testGroup, experimentId: userExperimentId } = JSON.parse(testData);

      // Log interaction
      const interactionKey = `ab_test_interaction:${testGroup}:${interactionType}`;
      await redis.hincrby(interactionKey, contentId, 1);

      // Log to analytics
      const analyticsData = {
        userId,
        contentId,
        interactionType,
        testGroup,
        experimentId: experimentId || userExperimentId,
        timestamp: new Date().toISOString(),
      };

      await redis.lpush('ab_test_interactions', JSON.stringify(analyticsData));
      await redis.ltrim('ab_test_interactions', 0, 9999); // Keep last 10k interactions
    } catch (error) {
      console.error('Error tracking recommendation interaction:', error);
    }
  }

  /**
   * Get A/B test results and metrics
   */
  async getABTestResults(): Promise<{
    control: ABTestMetrics;
    hybrid: ABTestMetrics;
    advanced_ranking: ABTestMetrics;
    winner?: string;
  }> {
    try {
      const groups = ['control', 'hybrid', 'advanced_ranking'];
      const results: any = {};

      for (const group of groups) {
        const metrics = await this.calculateABTestMetrics(group);
        results[group] = metrics;
      }

      // Determine winner based on CTR and conversion rate
      const winner = this.determineABTestWinner(results);

      return {
        ...results,
        winner,
      };
    } catch (error: any) {
      console.error('Error getting A/B test results:', error);
      throw new Error(`Failed to get A/B test results: ${error.message}`);
    }
  }

  /**
   * Calculate metrics for a test group
   */
  private async calculateABTestMetrics(testGroup: string): Promise<ABTestMetrics> {
    try {
      const viewKey = `ab_test_interaction:${testGroup}:view`;
      const clickKey = `ab_test_interaction:${testGroup}:click`;
      const purchaseKey = `ab_test_interaction:${testGroup}:purchase`;

      const views = await redis.hgetall(viewKey);
      const clicks = await redis.hgetall(clickKey);
      const purchases = await redis.hgetall(purchaseKey);

      const totalViews = Object.values(views).reduce((sum, val) => sum + parseInt(val), 0);
      const totalClicks = Object.values(clicks).reduce((sum, val) => sum + parseInt(val), 0);
      const totalPurchases = Object.values(purchases).reduce((sum, val) => sum + parseInt(val), 0);

      const ctr = totalViews > 0 ? totalClicks / totalViews : 0;
      const conversionRate = totalClicks > 0 ? totalPurchases / totalClicks : 0;
      const purchaseRate = totalViews > 0 ? totalPurchases / totalViews : 0;

      return {
        testGroup,
        totalViews,
        totalClicks,
        totalPurchases,
        ctr: Math.round(ctr * 10000) / 100, // Percentage
        conversionRate: Math.round(conversionRate * 10000) / 100,
        purchaseRate: Math.round(purchaseRate * 10000) / 100,
      };
    } catch (error) {
      console.error(`Error calculating metrics for ${testGroup}:`, error);
      return {
        testGroup,
        totalViews: 0,
        totalClicks: 0,
        totalPurchases: 0,
        ctr: 0,
        conversionRate: 0,
        purchaseRate: 0,
      };
    }
  }

  /**
   * Determine A/B test winner based on metrics
   */
  private determineABTestWinner(results: Record<string, ABTestMetrics>): string {
    const groups = Object.keys(results);
    
    // Score each group based on weighted metrics
    const scores = groups.map(group => {
      const metrics = results[group];
      // Weight: CTR (40%), Conversion Rate (40%), Purchase Rate (20%)
      const score = 
        metrics.ctr * 0.4 +
        metrics.conversionRate * 0.4 +
        metrics.purchaseRate * 0.2;
      
      return { group, score };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores[0].group;
  }
}

export interface ABTestMetrics {
  testGroup: string;
  totalViews: number;
  totalClicks: number;
  totalPurchases: number;
  ctr: number; // Click-through rate (%)
  conversionRate: number; // Purchase/Click (%)
  purchaseRate: number; // Purchase/View (%)
}

export const recommendationService = new RecommendationService();
