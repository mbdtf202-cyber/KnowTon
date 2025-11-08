# Collaborative Filtering Recommendation Engine

## Overview

The KnowTon platform implements a sophisticated collaborative filtering recommendation engine that provides personalized content recommendations to users. The system uses both **user-based** and **item-based** collaborative filtering techniques, combined in a hybrid approach for optimal results.

**Implementation Status**: ✅ TASK-2.3.1 Complete

**Requirements**: REQ-1.7.2 - User Analytics (Content recommendation)

## Features

### 1. User-Based Collaborative Filtering
- Finds users with similar interaction patterns
- Recommends content that similar users have enjoyed
- Uses cosine similarity for user comparison
- Considers multiple interaction types (view, like, share, purchase)

### 2. Item-Based Collaborative Filtering
- Identifies content with similar user engagement patterns
- Recommends content similar to what the user has interacted with
- Uses Jaccard similarity for content comparison
- Analyzes co-occurrence patterns

### 3. Hybrid Recommendations
- Combines user-based and item-based approaches
- Weighted scoring (60% user-based, 40% item-based by default)
- Diversity factor to avoid over-recommending similar items
- Configurable filtering options

### 4. Model Training
- Pre-computes user and content similarities
- Caches results for fast retrieval
- Can be run periodically or on-demand
- Background processing support

### 5. Accuracy Evaluation
- Precision@k and Recall@k metrics
- F1 Score calculation
- Coverage analysis
- Test set validation

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Recommendation Service                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐      ┌──────────────────┐       │
│  │   User-Based CF  │      │   Item-Based CF  │       │
│  │                  │      │                  │       │
│  │ • Find similar   │      │ • Find similar   │       │
│  │   users          │      │   content        │       │
│  │ • Cosine         │      │ • Jaccard        │       │
│  │   similarity     │      │   similarity     │       │
│  └──────────────────┘      └──────────────────┘       │
│           │                         │                   │
│           └────────┬────────────────┘                   │
│                    ▼                                     │
│         ┌──────────────────┐                           │
│         │  Hybrid Combiner │                           │
│         │                  │                           │
│         │ • Weighted merge │                           │
│         │ • Diversity      │                           │
│         │ • Filtering      │                           │
│         └──────────────────┘                           │
│                    │                                     │
│                    ▼                                     │
│         ┌──────────────────┐                           │
│         │  Recommendations │                           │
│         └──────────────────┘                           │
└─────────────────────────────────────────────────────────┘
```

## Data Sources

### User Interactions (ClickHouse)
```sql
user_behavior_events
├── session_id
├── user_address
├── event_type (view, like, share, purchase)
├── target_id (content_id)
├── event_time
└── metadata
```

### Content Metadata (PostgreSQL)
```sql
contents
├── id
├── title
├── category
├── creator_address
└── status
```

### Purchases (PostgreSQL)
```sql
purchases
├── user_id
├── content_id
└── status
```

## API Endpoints

### Get Personalized Recommendations
```http
GET /api/v1/recommendations
Authorization: Bearer <token>

Query Parameters:
- limit: number (default: 20)
- minScore: number (default: 0.1)
- excludeViewed: boolean (default: true)
- excludePurchased: boolean (default: true)
- diversityFactor: number (default: 0.3)

Response:
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "contentId": "uuid",
        "score": 0.85,
        "reason": "hybrid",
        "metadata": {
          "title": "Content Title",
          "category": "Education",
          "creator": "0x..."
        }
      }
    ],
    "count": 20,
    "options": {...}
  }
}
```

### Get User-Based Recommendations
```http
GET /api/v1/recommendations/user-based
Authorization: Bearer <token>

Query Parameters:
- limit: number (default: 20)

Response:
{
  "success": true,
  "data": {
    "recommendations": [...],
    "count": 20,
    "method": "user-based"
  }
}
```

### Get Item-Based Recommendations
```http
GET /api/v1/recommendations/item-based
Authorization: Bearer <token>

Query Parameters:
- limit: number (default: 20)

Response:
{
  "success": true,
  "data": {
    "recommendations": [...],
    "count": 20,
    "method": "item-based"
  }
}
```

### Find Similar Users
```http
GET /api/v1/recommendations/similar-users
Authorization: Bearer <token>

Query Parameters:
- limit: number (default: 50)

Response:
{
  "success": true,
  "data": {
    "similarUsers": [
      {
        "userId": "0x...",
        "similarity": 0.75
      }
    ],
    "count": 50
  }
}
```

### Find Similar Content
```http
GET /api/v1/recommendations/similar-content/:contentId

Query Parameters:
- limit: number (default: 20)

Response:
{
  "success": true,
  "data": {
    "contentId": "uuid",
    "similarContent": [
      {
        "contentId": "uuid",
        "similarity": 0.68
      }
    ],
    "count": 20
  }
}
```

### Train Models (Admin Only)
```http
POST /api/v1/recommendations/train
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "message": "Model training started in background"
}
```

### Evaluate Accuracy (Admin Only)
```http
POST /api/v1/recommendations/evaluate
Authorization: Bearer <admin-token>
Content-Type: application/json

Body:
{
  "testSetSize": 100
}

Response:
{
  "success": true,
  "data": {
    "precision": 72.5,
    "recall": 65.3,
    "f1Score": 68.7,
    "coverage": 45.2
  }
}
```

### Clear Cache
```http
DELETE /api/v1/recommendations/cache
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "User recommendation cache cleared"
}
```

## Algorithms

### User-Based Collaborative Filtering

1. **Build User Interaction Vectors**
   - Create vector of (contentId → weight) for each user
   - Weights based on interaction type:
     - View: 1
     - Like: 3
     - Share: 5
     - Add to cart: 7
     - Purchase: 10

2. **Calculate User Similarity**
   - Use cosine similarity between user vectors
   - Formula: `similarity = (A · B) / (||A|| × ||B||)`
   - Filter users with similarity > threshold (0.1)

3. **Generate Recommendations**
   - Get content liked by similar users
   - Weight by user similarity
   - Aggregate and rank by total score

### Item-Based Collaborative Filtering

1. **Build Co-Occurrence Matrix**
   - Track which users interacted with which content
   - Count co-occurrences of content pairs

2. **Calculate Content Similarity**
   - Use Jaccard similarity
   - Formula: `similarity = |A ∩ B| / |A ∪ B|`
   - Filter content with similarity > threshold (0.1)

3. **Generate Recommendations**
   - For each content user interacted with
   - Find similar content
   - Weight by interaction strength and similarity
   - Aggregate and rank

### Hybrid Approach

1. **Combine Scores**
   - User-based score × 0.6
   - Item-based score × 0.4
   - Merge and deduplicate

2. **Apply Diversity**
   - Penalize over-representation of similar items
   - Configurable diversity factor (0-1)

3. **Filter and Rank**
   - Exclude viewed/purchased content (optional)
   - Filter by minimum score
   - Sort by final score
   - Limit results

## Performance Optimization

### Caching Strategy
- **Redis cache** for all computed similarities
- **TTL**: 1 hour for recommendations, similar users/content
- **Cache keys**:
  - `recommendations:{userId}:{options}`
  - `similar_users:{userId}`
  - `similar_content:{contentId}`

### Query Optimization
- **ClickHouse** for fast aggregation of user events
- **Batch queries** to reduce database round-trips
- **Indexed lookups** on user_address, target_id, event_date

### Pre-computation
- **Background training** to pre-compute similarities
- **Periodic updates** (e.g., daily) to refresh models
- **Incremental updates** for new users/content

## Accuracy Metrics

### Precision@k
- Percentage of recommended items that are relevant
- Formula: `precision = relevant_recommended / total_recommended`
- Target: > 70%

### Recall@k
- Percentage of relevant items that are recommended
- Formula: `recall = relevant_recommended / total_relevant`
- Target: > 60%

### F1 Score
- Harmonic mean of precision and recall
- Formula: `f1 = 2 × (precision × recall) / (precision + recall)`
- Target: > 65%

### Coverage
- Percentage of catalog that gets recommended
- Formula: `coverage = unique_recommended / total_catalog`
- Target: > 40%

## Testing

### Run Test Script
```bash
cd packages/backend
npm run test:recommendation
```

### Test Coverage
- ✅ User-based collaborative filtering
- ✅ Item-based collaborative filtering
- ✅ Hybrid recommendations
- ✅ Similar users finding
- ✅ Similar content finding
- ✅ Accuracy evaluation
- ✅ Cache performance

### Expected Results
- User-based CF: < 500ms
- Item-based CF: < 500ms
- Hybrid recommendations: < 1000ms
- Cache speedup: > 80%
- Precision: > 70%
- Recall: > 60%

## Usage Examples

### Frontend Integration

```typescript
import { useRecommendations } from '@/hooks/useRecommendations';

function RecommendationsPage() {
  const { recommendations, loading, error } = useRecommendations({
    limit: 20,
    excludeViewed: true,
    excludePurchased: true,
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <h2>Recommended for You</h2>
      <ContentGrid contents={recommendations} />
    </div>
  );
}
```

### Backend Service Usage

```typescript
import { recommendationService } from '@/services/recommendation.service';

// Get recommendations
const recommendations = await recommendationService.getRecommendations(
  userId,
  {
    limit: 20,
    minScore: 0.1,
    excludeViewed: true,
    excludePurchased: true,
    diversityFactor: 0.3,
  }
);

// Find similar users
const similarUsers = await recommendationService.findSimilarUsers(
  userId,
  50
);

// Find similar content
const similarContent = await recommendationService.findSimilarContent(
  contentId,
  20
);

// Train models
await recommendationService.trainModels();

// Evaluate accuracy
const metrics = await recommendationService.evaluateAccuracy(100);
```

## Maintenance

### Daily Tasks
- Monitor recommendation quality metrics
- Check cache hit rates
- Review error logs

### Weekly Tasks
- Run accuracy evaluation
- Analyze coverage metrics
- Review user feedback

### Monthly Tasks
- Retrain models with full dataset
- Optimize similarity thresholds
- Update algorithm weights

## Troubleshooting

### Low Precision
- Increase similarity threshold
- Adjust interaction weights
- Improve diversity factor

### Low Recall
- Decrease similarity threshold
- Increase recommendation limit
- Reduce filtering

### Slow Performance
- Check cache hit rate
- Optimize ClickHouse queries
- Increase cache TTL
- Pre-compute more similarities

### Cold Start Problem
- Use content-based filtering for new users
- Recommend popular content
- Use demographic information

## Future Enhancements

### Planned Features
- [ ] Content-based filtering integration
- [ ] Deep learning models (neural collaborative filtering)
- [ ] Real-time model updates
- [ ] A/B testing framework
- [ ] Explainable recommendations
- [ ] Multi-armed bandit for exploration/exploitation
- [ ] Context-aware recommendations (time, location, device)

### Performance Improvements
- [ ] Approximate nearest neighbors (ANN) for similarity search
- [ ] Matrix factorization for dimensionality reduction
- [ ] Distributed computing for large-scale training
- [ ] GPU acceleration for similarity calculations

## References

- [Collaborative Filtering - Wikipedia](https://en.wikipedia.org/wiki/Collaborative_filtering)
- [Item-Based Collaborative Filtering Recommendation Algorithms](https://dl.acm.org/doi/10.1145/371920.372071)
- [Matrix Factorization Techniques for Recommender Systems](https://datajobs.com/data-science-repo/Recommender-Systems-[Netflix].pdf)
- [Evaluation Metrics for Recommender Systems](https://en.wikipedia.org/wiki/Evaluation_measures_(information_retrieval))

## Support

For issues or questions:
- GitHub Issues: [knowton-platform/issues](https://github.com/knowton-platform/issues)
- Documentation: [docs.knowton.io](https://docs.knowton.io)
- Email: support@knowton.io
