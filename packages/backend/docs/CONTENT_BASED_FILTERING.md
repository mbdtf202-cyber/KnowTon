# Content-Based Filtering Implementation

## Overview

Content-based filtering is a recommendation technique that suggests items similar to what a user has previously interacted with, based on content features rather than user behavior patterns. This implementation complements the existing collaborative filtering (user-based and item-based) to create a comprehensive hybrid recommendation system.

**Status**: ✅ Implemented  
**Task**: TASK-2.3.2  
**Requirements**: REQ-1.7.2

## Features

### 1. Content Feature Extraction

The system extracts and analyzes multiple content features:

- **Category**: Content classification (education, art, music, etc.)
- **Tags**: User-defined keywords and topics
- **File Type**: Media format (pdf, video, audio, etc.)
- **AI Fingerprint**: Unique content signature for similarity detection
- **Creator**: Content creator identification

### 2. Content Similarity Calculation

Multi-dimensional similarity scoring using weighted features:

| Feature | Weight | Description |
|---------|--------|-------------|
| Category | 30% | Exact category match |
| Tags | 35% | Tag overlap using cosine similarity |
| File Type | 15% | Media format match |
| Creator | 10% | Same creator preference |
| Fingerprint | 10% | AI fingerprint similarity (Hamming distance) |

### 3. User Content Profile

Builds a weighted profile of user preferences based on interaction history:

- Aggregates features from all interacted content
- Weights features by interaction strength (view=1, like=3, purchase=10)
- Identifies top categories, tags, file types, and creators
- Uses profile to find similar content

### 4. Hybrid Recommendations

Combines three recommendation approaches:

```
Hybrid Score = (User-Based × 0.42) + (Item-Based × 0.28) + (Content-Based × 0.30)
```

Default weights (configurable):
- Collaborative filtering: 70% (user-based: 60%, item-based: 40%)
- Content-based filtering: 30%

## API Endpoints

### Get Content-Based Recommendations

```http
GET /api/v1/recommendations/content-based
Authorization: Bearer <token>
```

**Query Parameters**:
- `limit` (number, default: 20): Maximum number of recommendations

**Response**:
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "contentId": "uuid",
        "score": 0.85,
        "reason": "content-based: category, tags(3), file-type"
      }
    ],
    "count": 10,
    "method": "content-based"
  }
}
```

### Find Similar Content by Features

```http
GET /api/v1/recommendations/similar-content-features/:contentId
```

**Query Parameters**:
- `limit` (number, default: 20): Maximum number of similar items

**Response**:
```json
{
  "success": true,
  "data": {
    "contentId": "uuid",
    "similarContent": [
      {
        "contentId": "uuid",
        "similarity": 0.78,
        "matchedFeatures": ["category", "tags(5)", "file-type"]
      }
    ],
    "count": 15,
    "method": "content-features"
  }
}
```

### Get Hybrid Recommendations

```http
GET /api/v1/recommendations
Authorization: Bearer <token>
```

**Query Parameters**:
- `limit` (number, default: 20): Maximum recommendations
- `useContentBased` (boolean, default: true): Enable content-based filtering
- `contentBasedWeight` (number, default: 0.3): Weight for content-based (0-1)
- `minScore` (number, default: 0.1): Minimum recommendation score
- `excludeViewed` (boolean, default: true): Exclude viewed content
- `excludePurchased` (boolean, default: true): Exclude purchased content
- `diversityFactor` (number, default: 0.3): Diversity penalty (0-1)

**Response**:
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "contentId": "uuid",
        "score": 0.92,
        "reason": "hybrid-full",
        "metadata": {
          "title": "Content Title",
          "category": "education",
          "creator": "0x..."
        }
      }
    ],
    "count": 20,
    "options": {
      "limit": 20,
      "useContentBased": true,
      "contentBasedWeight": 0.3
    }
  }
}
```

## Implementation Details

### Feature Similarity Algorithm

```typescript
function calculateContentSimilarity(userProfile, contentFeatures) {
  let score = 0;
  
  // 1. Category match (30%)
  if (userProfile.category === contentFeatures.category) {
    score += 0.30;
  }
  
  // 2. Tag overlap (35%)
  const tagSimilarity = cosineSimilarity(userProfile.tags, contentFeatures.tags);
  score += tagSimilarity * 0.35;
  
  // 3. File type match (15%)
  if (userProfile.fileType === contentFeatures.fileType) {
    score += 0.15;
  }
  
  // 4. Creator match (10%)
  if (userProfile.creatorAddress === contentFeatures.creatorAddress) {
    score += 0.10;
  }
  
  // 5. Fingerprint similarity (10%)
  const fingerprintSimilarity = hammingDistance(
    userProfile.fingerprint,
    contentFeatures.fingerprint
  );
  score += fingerprintSimilarity * 0.10;
  
  return score;
}
```

### Tag Similarity (Cosine)

```typescript
function cosineSimilarity(tagsA: Set<string>, tagsB: Set<string>): number {
  const intersection = new Set([...tagsA].filter(tag => tagsB.has(tag)));
  return intersection.size / Math.sqrt(tagsA.size * tagsB.size);
}
```

### Fingerprint Similarity (Hamming)

```typescript
function hammingDistance(fp1: string, fp2: string): number {
  let matchingBits = 0;
  const totalBits = fp1.length * 4; // hex chars
  
  for (let i = 0; i < fp1.length; i++) {
    const xor = parseInt(fp1[i], 16) ^ parseInt(fp2[i], 16);
    matchingBits += 4 - countSetBits(xor);
  }
  
  return matchingBits / totalBits;
}
```

## Performance Optimization

### Caching Strategy

- **User profiles**: Cached for 1 hour
- **Content similarities**: Cached for 1 hour
- **Recommendations**: Cached for 1 hour per user/options combination

### Database Optimization

- Indexed fields: `category`, `tags`, `aiFingerprint`, `status`
- Efficient queries using Prisma ORM
- Batch processing for multiple content items

### Scalability

- Similarity calculations run in O(n) time
- Redis caching reduces database load
- Async processing for large datasets

## Testing

Run the test script:

```bash
npm run test:content-based-filtering
```

Or manually:

```bash
npx ts-node packages/backend/src/scripts/test-content-based-filtering.ts
```

### Test Coverage

1. ✅ Content feature extraction
2. ✅ Similarity calculation (all feature types)
3. ✅ User profile building
4. ✅ Content-based recommendations
5. ✅ Hybrid recommendations
6. ✅ Feature matching and scoring

## Usage Examples

### Example 1: Pure Content-Based Recommendations

```typescript
const recommendations = await recommendationService.getContentBasedRecommendations(
  userId,
  20
);

// Returns content similar to user's interaction history
// Based purely on content features
```

### Example 2: Hybrid Recommendations (Default)

```typescript
const recommendations = await recommendationService.getRecommendations(
  userId,
  {
    limit: 20,
    useContentBased: true,
    contentBasedWeight: 0.3, // 30% content-based, 70% collaborative
  }
);

// Returns balanced recommendations combining:
// - User-based collaborative filtering (42%)
// - Item-based collaborative filtering (28%)
// - Content-based filtering (30%)
```

### Example 3: Find Similar Content

```typescript
const similarContent = await recommendationService.findSimilarContentByFeatures(
  contentId,
  10
);

// Returns content with similar features:
// - Same category
// - Overlapping tags
// - Same file type
// - Similar AI fingerprint
```

### Example 4: Adjust Content-Based Weight

```typescript
// More content-based (50%)
const recommendations = await recommendationService.getRecommendations(
  userId,
  {
    useContentBased: true,
    contentBasedWeight: 0.5,
  }
);

// Less content-based (10%)
const recommendations = await recommendationService.getRecommendations(
  userId,
  {
    useContentBased: true,
    contentBasedWeight: 0.1,
  }
);

// Disable content-based
const recommendations = await recommendationService.getRecommendations(
  userId,
  {
    useContentBased: false,
  }
);
```

## Benefits

### 1. Cold Start Problem

Content-based filtering helps with new users who have limited interaction history:
- Can recommend based on first few interactions
- Doesn't require large user base
- Works immediately after user views/likes content

### 2. Diversity

Adds diversity to recommendations:
- Discovers content in same category but from different creators
- Finds content with similar topics but different formats
- Reduces filter bubble effect

### 3. Explainability

Provides clear reasons for recommendations:
- "Recommended because you liked similar educational content"
- "Matches your interest in machine learning and Python"
- "Similar to content you purchased"

### 4. Serendipity

Balances between:
- **Exploitation**: Recommending similar content (content-based)
- **Exploration**: Discovering new content (collaborative)

## Monitoring

### Key Metrics

Track these metrics to evaluate content-based filtering:

1. **Recommendation Diversity**: Measure category/tag distribution
2. **Click-Through Rate**: Compare content-based vs collaborative
3. **Conversion Rate**: Purchase rate for content-based recommendations
4. **User Satisfaction**: Feedback on recommendation relevance

### A/B Testing

Compare recommendation strategies:

```typescript
// Control group: Collaborative only
const controlRecs = await recommendationService.getRecommendations(userId, {
  useContentBased: false,
});

// Test group: Hybrid with content-based
const testRecs = await recommendationService.getRecommendations(userId, {
  useContentBased: true,
  contentBasedWeight: 0.3,
});
```

## Future Enhancements

1. **Deep Learning Features**: Use neural networks for feature extraction
2. **Semantic Similarity**: Use embeddings for tag/description similarity
3. **Temporal Features**: Consider content recency and trends
4. **User Feedback**: Incorporate explicit feedback (ratings, reviews)
5. **Multi-Modal Features**: Combine text, image, and audio features

## Troubleshooting

### Low Recommendation Scores

**Problem**: All recommendations have low scores (<0.2)

**Solutions**:
- Check if content has sufficient tags and metadata
- Verify AI fingerprints are being generated correctly
- Adjust feature weights in similarity calculation
- Lower `minScore` threshold

### No Content-Based Recommendations

**Problem**: Content-based filtering returns empty results

**Solutions**:
- Ensure user has interaction history
- Check if published content exists with proper features
- Verify database indexes are created
- Check Redis cache connectivity

### Slow Performance

**Problem**: Recommendations take >5 seconds

**Solutions**:
- Enable Redis caching
- Add database indexes on `category`, `tags`, `status`
- Reduce `limit` parameter
- Pre-compute similarities during off-peak hours

## References

- [Content-Based Filtering](https://en.wikipedia.org/wiki/Recommender_system#Content-based_filtering)
- [Hybrid Recommender Systems](https://en.wikipedia.org/wiki/Recommender_system#Hybrid_recommender_systems)
- [Cosine Similarity](https://en.wikipedia.org/wiki/Cosine_similarity)
- [Hamming Distance](https://en.wikipedia.org/wiki/Hamming_distance)

## Support

For issues or questions:
- Check the test script output
- Review server logs for errors
- Verify database schema matches requirements
- Ensure Redis is running and accessible
