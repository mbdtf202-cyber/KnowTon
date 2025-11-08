# Hybrid Recommendation Model - Quick Start Guide

## Overview

This guide helps you quickly get started with the Hybrid Recommendation Model, which combines collaborative and content-based filtering with advanced ranking and A/B testing.

## Quick Setup

### 1. Prerequisites

- Redis running (for caching)
- PostgreSQL with content and user data
- ClickHouse (optional, for analytics)

### 2. Test the Implementation

```bash
cd packages/backend

# Run the test script
npm run test:hybrid-recommendation

# Or directly
npx ts-node src/scripts/test-hybrid-recommendation.ts
```

## Basic Usage

### Get Hybrid Recommendations

```bash
curl -X GET "http://localhost:3001/api/v1/recommendations?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "contentId": "abc-123",
        "score": 0.85,
        "reason": "hybrid-full",
        "metadata": {
          "title": "Advanced TypeScript",
          "category": "education",
          "creator": "0x..."
        }
      }
    ],
    "count": 10
  }
}
```

### Get A/B Test Recommendations

```bash
curl -X GET "http://localhost:3001/api/v1/recommendations/ab-test?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [...],
    "testGroup": "advanced_ranking",
    "experimentId": "rec_ab_test_1234567890"
  }
}
```

### Track User Interaction

```bash
curl -X POST "http://localhost:3001/api/v1/recommendations/track-interaction" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "abc-123",
    "interactionType": "click",
    "experimentId": "rec_ab_test_1234567890"
  }'
```

### Get A/B Test Results (Admin)

```bash
curl -X GET "http://localhost:3001/api/v1/recommendations/ab-test/results" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

## Configuration Options

### Recommendation Options

```typescript
{
  limit: 20,                    // Number of recommendations
  minScore: 0.1,                // Minimum score threshold
  excludeViewed: true,          // Exclude viewed content
  excludePurchased: true,       // Exclude purchased content
  diversityFactor: 0.3,         // Diversity strength (0-1)
  useContentBased: true,        // Enable content-based filtering
  contentBasedWeight: 0.3       // Content-based weight (0-1)
}
```

### Ranking Options

```typescript
{
  popularityWeight: 0.15,       // Weight for popularity signal
  freshnessWeight: 0.1,         // Weight for freshness signal
  engagementWeight: 0.1,        // Weight for engagement signal
  creatorReputationWeight: 0.05 // Weight for creator reputation
}
```

## Frontend Integration

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

export function useRecommendations(limit = 20) {
  const [recommendations, setRecommendations] = useState([]);
  const [testGroup, setTestGroup] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const response = await fetch(
          `/api/v1/recommendations/ab-test?limit=${limit}`,
          {
            headers: {
              'Authorization': `Bearer ${getToken()}`
            }
          }
        );
        const data = await response.json();
        
        if (data.success) {
          setRecommendations(data.data.recommendations);
          setTestGroup(data.data.testGroup);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [limit]);

  const trackInteraction = async (contentId: string, type: string) => {
    try {
      await fetch('/api/v1/recommendations/track-interaction', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contentId,
          interactionType: type
        })
      });
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  };

  return {
    recommendations,
    testGroup,
    loading,
    trackInteraction
  };
}
```

### Component Example

```typescript
import { useRecommendations } from './hooks/useRecommendations';

export function RecommendationsSection() {
  const { recommendations, testGroup, loading, trackInteraction } = 
    useRecommendations(10);

  if (loading) {
    return <div>Loading recommendations...</div>;
  }

  return (
    <div>
      <h2>Recommended for You</h2>
      <p className="text-sm text-gray-500">
        Personalized using {testGroup} algorithm
      </p>
      
      <div className="grid grid-cols-3 gap-4">
        {recommendations.map(rec => (
          <ContentCard
            key={rec.contentId}
            content={rec.metadata}
            score={rec.score}
            onClick={() => trackInteraction(rec.contentId, 'click')}
          />
        ))}
      </div>
    </div>
  );
}
```

## Common Use Cases

### 1. Homepage Recommendations

```typescript
// Show personalized recommendations on homepage
const recommendations = await recommendationService.getRecommendations(userId, {
  limit: 12,
  diversityFactor: 0.4, // Higher diversity for discovery
  useContentBased: true
});
```

### 2. Similar Content

```typescript
// Show similar content on detail page
const similarContent = await recommendationService.findSimilarContentByFeatures(
  contentId,
  6
);
```

### 3. Trending Content

```typescript
// Show trending content with popularity boost
const recommendations = await recommendationService.getRecommendations(userId, {
  limit: 10,
  useContentBased: true
});

const ranked = await recommendationService.applyAdvancedRanking(
  recommendations,
  userId,
  {
    popularityWeight: 0.3,  // Boost popularity
    freshnessWeight: 0.2    // Boost fresh content
  }
);
```

## Monitoring

### Check A/B Test Performance

```bash
# Get current A/B test results
curl -X GET "http://localhost:3001/api/v1/recommendations/ab-test/results" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Clear Cache

```bash
# Clear user's recommendation cache
curl -X DELETE "http://localhost:3001/api/v1/recommendations/cache" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Clear all cache (admin only)
curl -X DELETE "http://localhost:3001/api/v1/recommendations/cache" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Evaluate Accuracy

```bash
curl -X POST "http://localhost:3001/api/v1/recommendations/evaluate" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"testSetSize": 100}'
```

## Troubleshooting

### No Recommendations Returned

**Problem**: API returns empty recommendations array

**Solutions**:
1. Check if user has interaction history
2. Verify content is published (`status = 'published'`)
3. Check if `minScore` threshold is too high
4. Review cache - try clearing it

### Low Accuracy

**Problem**: Recommendations not relevant

**Solutions**:
1. Increase `contentBasedWeight` for better personalization
2. Adjust `diversityFactor` (lower = more similar items)
3. Train models: `POST /api/v1/recommendations/train`
4. Check if enough user interaction data exists

### Slow Performance

**Problem**: Recommendations take too long to generate

**Solutions**:
1. Verify Redis is running and connected
2. Pre-compute similarities: `POST /api/v1/recommendations/train`
3. Reduce `limit` parameter
4. Check ClickHouse query performance

### A/B Test Not Working

**Problem**: All users in same test group

**Solutions**:
1. Verify user ID is being passed correctly
2. Check Redis for test assignments
3. Clear A/B test cache and retry
4. Review hash function in `assignTestGroup()`

## Performance Tips

1. **Pre-compute Similarities**
   ```bash
   # Run training to pre-compute and cache similarities
   curl -X POST "http://localhost:3001/api/v1/recommendations/train" \
     -H "Authorization: Bearer ADMIN_JWT_TOKEN"
   ```

2. **Use Appropriate Limits**
   - Homepage: 12-20 recommendations
   - Similar items: 4-6 recommendations
   - Search results: 20-50 recommendations

3. **Tune Diversity**
   - Discovery pages: 0.4-0.5
   - Personalized pages: 0.2-0.3
   - Similar items: 0.1-0.2

4. **Cache Warming**
   - Pre-generate recommendations for active users
   - Run during off-peak hours
   - Use background jobs

## Next Steps

1. **Review Full Documentation**
   - [Hybrid Recommendation Model](./HYBRID_RECOMMENDATION_MODEL.md)
   - [Collaborative Filtering](./RECOMMENDATION_ENGINE.md)
   - [Content-Based Filtering](./CONTENT_BASED_FILTERING.md)

2. **Customize for Your Use Case**
   - Adjust weights based on your metrics
   - Add custom ranking signals
   - Implement domain-specific features

3. **Monitor and Optimize**
   - Track A/B test results
   - Analyze user engagement
   - Iterate on algorithm parameters

## Support

- **Documentation**: `packages/backend/docs/`
- **Tests**: `npm run test:hybrid-recommendation`
- **Logs**: Check application logs for errors
- **Issues**: Report to dev-team@knowton.io
