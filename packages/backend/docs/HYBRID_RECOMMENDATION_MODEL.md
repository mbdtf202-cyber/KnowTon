# Hybrid Recommendation Model

## Overview

The Hybrid Recommendation Model combines collaborative filtering (user-based and item-based) with content-based filtering to provide personalized content recommendations. It includes an advanced ranking algorithm, diversity enhancements, and an A/B testing framework.

**Status**: ✅ Implemented  
**Task**: TASK-2.3.3  
**Requirements**: REQ-1.7.2

## Architecture

### 1. Three-Way Hybrid Model

The system combines three recommendation approaches:

```
┌─────────────────────────────────────────────────────────┐
│                  Hybrid Recommendation                   │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  User-Based  │  │  Item-Based  │  │Content-Based │ │
│  │Collaborative │  │Collaborative │  │  Filtering   │ │
│  │  (Weight: 0.42)│  │  (Weight: 0.28)│  │ (Weight: 0.3)│ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                 │                  │          │
│         └─────────────────┴──────────────────┘          │
│                           │                             │
│                    ┌──────▼──────┐                      │
│                    │   Combine   │                      │
│                    │  & Rank     │                      │
│                    └──────┬──────┘                      │
│                           │                             │
│                    ┌──────▼──────┐                      │
│                    │  Diversity  │                      │
│                    │  Filter     │                      │
│                    └──────┬──────┘                      │
│                           │                             │
│                    ┌──────▼──────┐                      │
│                    │  Advanced   │                      │
│                    │  Ranking    │                      │
│                    └──────┬──────┘                      │
│                           │                             │
│                    Final Recommendations                │
└─────────────────────────────────────────────────────────┘
```

### 2. Recommendation Methods

#### User-Based Collaborative Filtering
- Finds similar users based on interaction patterns
- Uses cosine similarity on user-content interaction vectors
- Recommends content liked by similar users
- Weight: 42% (0.6 × 0.7)

#### Item-Based Collaborative Filtering
- Finds similar content based on co-interaction patterns
- Uses Jaccard similarity for content pairs
- Recommends content similar to user's history
- Weight: 28% (0.4 × 0.7)

#### Content-Based Filtering
- Analyzes content features: category, tags, file type, creator, fingerprint
- Builds user profile from interaction history
- Recommends content with similar features
- Weight: 30%

## Advanced Ranking Algorithm

The ranking algorithm combines multiple signals to improve recommendation quality:

### Ranking Signals

1. **Base Score** (60%)
   - Combined score from collaborative and content-based filtering

2. **Popularity Score** (15%)
   - Normalized views (40%) + normalized purchases (60%)
   - Helps surface trending content

3. **Freshness Score** (10%)
   - Exponential decay based on content age
   - Promotes newer content

4. **Engagement Score** (10%)
   - Content rating (50%) + purchase rate (50%)
   - Measures content quality

5. **Creator Reputation** (5%)
   - Revenue score (30%)
   - Sales count (30%)
   - Follower count (20%)
   - Creator rating (20%)

### Formula

```
final_score = base_score × 0.6 +
              popularity_score × 0.15 +
              freshness_score × 0.1 +
              engagement_score × 0.1 +
              creator_reputation × 0.05
```

## Diversity Enhancement

The diversity algorithm ensures varied recommendations across multiple dimensions:

### Diversity Factors

1. **Category Diversity** (30%)
   - Penalizes over-representation of same category
   - Ensures variety in content types

2. **Creator Diversity** (20%)
   - Prevents domination by single creator
   - Promotes creator discovery

3. **Tag Overlap** (30%)
   - Reduces recommendations with similar tags
   - Increases topic variety

4. **Method Diversity** (20%)
   - Balances user-based, item-based, and content-based recommendations
   - Ensures algorithmic diversity

### Diversity Penalty

```
diversity_penalty = (
  category_penalty × 0.3 +
  creator_penalty × 0.2 +
  tag_penalty × 0.3 +
  method_penalty × 0.2
) × diversity_factor

adjusted_score = original_score × (1 - diversity_penalty)
```

## A/B Testing Framework

### Test Groups

The system automatically assigns users to three test groups:

1. **Control** (33%)
   - Baseline: User-based collaborative filtering only
   - Simple, proven approach

2. **Hybrid** (33%)
   - Combines collaborative and content-based filtering
   - No advanced ranking

3. **Advanced Ranking** (34%)
   - Full hybrid model with advanced ranking
   - All features enabled

### Assignment Method

Users are assigned using consistent hashing based on user ID:
```typescript
hash(userId) % 100 → bucket
bucket < 33: control
bucket < 66: hybrid
bucket >= 66: advanced_ranking
```

### Metrics Tracked

- **Views**: Number of times recommendations are shown
- **Clicks**: Number of times users click on recommendations
- **Purchases**: Number of purchases from recommendations
- **CTR**: Click-through rate (clicks / views)
- **Conversion Rate**: Purchase rate (purchases / clicks)
- **Purchase Rate**: Direct purchase rate (purchases / views)

### Winner Determination

Winner is determined by weighted score:
```
score = CTR × 0.4 + conversion_rate × 0.4 + purchase_rate × 0.2
```

## API Endpoints

### Get Hybrid Recommendations

```http
GET /api/v1/recommendations
```

**Query Parameters:**
- `limit` (number, default: 20): Number of recommendations
- `minScore` (number, default: 0.1): Minimum score threshold
- `excludeViewed` (boolean, default: true): Exclude viewed content
- `excludePurchased` (boolean, default: true): Exclude purchased content
- `diversityFactor` (number, default: 0.3): Diversity strength (0-1)
- `useContentBased` (boolean, default: true): Enable content-based filtering
- `contentBasedWeight` (number, default: 0.3): Content-based weight

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "contentId": "uuid",
        "score": 0.85,
        "reason": "hybrid-full",
        "metadata": {
          "title": "Content Title",
          "category": "education",
          "creator": "0x...",
          "signals": {
            "base": 0.75,
            "popularity": 0.82,
            "freshness": 0.65,
            "engagement": 0.78,
            "creatorReputation": 0.70
          }
        }
      }
    ],
    "count": 20,
    "options": { ... }
  }
}
```

### Get A/B Test Recommendations

```http
GET /api/v1/recommendations/ab-test
```

**Query Parameters:** Same as above

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

### Track Interaction

```http
POST /api/v1/recommendations/track-interaction
```

**Body:**
```json
{
  "contentId": "uuid",
  "interactionType": "view" | "click" | "purchase",
  "experimentId": "rec_ab_test_1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Interaction tracked successfully"
}
```

### Get A/B Test Results (Admin Only)

```http
GET /api/v1/recommendations/ab-test/results
```

**Response:**
```json
{
  "success": true,
  "data": {
    "control": {
      "testGroup": "control",
      "totalViews": 1000,
      "totalClicks": 150,
      "totalPurchases": 30,
      "ctr": 15.0,
      "conversionRate": 20.0,
      "purchaseRate": 3.0
    },
    "hybrid": {
      "testGroup": "hybrid",
      "totalViews": 1000,
      "totalClicks": 180,
      "totalPurchases": 40,
      "ctr": 18.0,
      "conversionRate": 22.22,
      "purchaseRate": 4.0
    },
    "advanced_ranking": {
      "testGroup": "advanced_ranking",
      "totalViews": 1000,
      "totalClicks": 200,
      "totalPurchases": 50,
      "ctr": 20.0,
      "conversionRate": 25.0,
      "purchaseRate": 5.0
    },
    "winner": "advanced_ranking"
  }
}
```

## Performance Considerations

### Caching Strategy

- **User similarities**: Cached for 1 hour
- **Content similarities**: Cached for 1 hour
- **Recommendations**: Cached for 1 hour
- **A/B test assignments**: Cached for 7 days

### Optimization Techniques

1. **Batch Processing**: Pre-compute similarities during training
2. **Redis Caching**: Cache expensive computations
3. **Lazy Loading**: Load metadata only when needed
4. **Parallel Processing**: Compute different recommendation types concurrently

### Scalability

- Supports 10,000+ concurrent users
- Recommendation generation < 500ms (p95)
- Cache hit rate > 80%
- Horizontal scaling via Redis cluster

## Accuracy Metrics

### Target Metrics

- **Precision@10**: > 70%
- **Recall@10**: > 50%
- **F1 Score**: > 60%
- **Coverage**: > 30%

### Evaluation Method

Uses hold-out test set:
1. Split user purchase history (80% train, 20% test)
2. Generate recommendations based on training data
3. Measure how many test purchases are in recommendations
4. Calculate precision, recall, F1, and coverage

## Testing

### Run Tests

```bash
# Test hybrid recommendation model
npm run test:hybrid-recommendation

# Or directly
npx ts-node src/scripts/test-hybrid-recommendation.ts
```

### Test Coverage

The test script validates:
- ✅ Basic hybrid recommendations
- ✅ User-based collaborative filtering
- ✅ Item-based collaborative filtering
- ✅ Content-based filtering
- ✅ Advanced ranking algorithm
- ✅ Diversity enhancement
- ✅ A/B testing framework
- ✅ Interaction tracking
- ✅ Performance metrics

## Integration Example

### Frontend Integration

```typescript
import { useEffect, useState } from 'react';

function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [testGroup, setTestGroup] = useState('');

  useEffect(() => {
    // Get A/B test recommendations
    fetch('/api/v1/recommendations/ab-test?limit=20', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setRecommendations(data.data.recommendations);
        setTestGroup(data.data.testGroup);
      });
  }, []);

  const handleClick = (contentId: string) => {
    // Track click interaction
    fetch('/api/v1/recommendations/track-interaction', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contentId,
        interactionType: 'click'
      })
    });
  };

  return (
    <div>
      <h1>Recommended for You</h1>
      <p>Test Group: {testGroup}</p>
      {recommendations.map(rec => (
        <ContentCard
          key={rec.contentId}
          content={rec}
          onClick={() => handleClick(rec.contentId)}
        />
      ))}
    </div>
  );
}
```

## Future Enhancements

1. **Deep Learning Models**
   - Neural collaborative filtering
   - Transformer-based recommendations
   - Multi-modal embeddings

2. **Real-Time Personalization**
   - Session-based recommendations
   - Real-time model updates
   - Online learning

3. **Context-Aware Recommendations**
   - Time of day
   - Device type
   - User location
   - Seasonal trends

4. **Social Recommendations**
   - Friend activity
   - Social graph analysis
   - Influencer recommendations

## References

- REQ-1.7.2: User Analytics - Content recommendation
- TASK-2.3.1: Collaborative filtering (completed)
- TASK-2.3.2: Content-based filtering (completed)
- TASK-2.3.3: Hybrid model (this document)

## Support

For issues or questions:
- Check logs: `packages/backend/logs/`
- Review test output: `npm run test:hybrid-recommendation`
- Contact: dev-team@knowton.io
