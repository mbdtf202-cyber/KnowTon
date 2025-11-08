# Recommendation API Documentation

## Overview

The Recommendation API provides personalized content recommendations using a hybrid approach that combines:
- **Collaborative Filtering**: User-based and item-based recommendations
- **Content-Based Filtering**: Feature-based similarity matching
- **Advanced Ranking**: Multi-signal ranking with popularity, freshness, and engagement

**Performance Target**: < 200ms response time (p95)

**Requirements**: REQ-1.7.2 - User Analytics - Content recommendation

---

## API Endpoints

### 1. Get Personalized Recommendations

**Endpoint**: `GET /api/v1/recommendations`

**Description**: Get personalized recommendations using hybrid filtering approach with Redis caching.

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Maximum number of recommendations |
| `minScore` | number | 0.1 | Minimum recommendation score (0-1) |
| `excludeViewed` | boolean | true | Exclude already viewed content |
| `excludePurchased` | boolean | true | Exclude already purchased content |
| `diversityFactor` | number | 0.3 | Diversity factor (0-1, higher = more diverse) |
| `useContentBased` | boolean | true | Include content-based filtering |
| `contentBasedWeight` | number | 0.3 | Weight for content-based filtering (0-1) |

**Response**:
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
            "popularity": 0.8,
            "freshness": 0.9,
            "engagement": 0.7,
            "creatorReputation": 0.85
          }
        }
      }
    ],
    "count": 20,
    "options": { ... }
  }
}
```

**Performance**:
- Cache hit: < 10ms
- Cache miss: < 200ms (target)
- Fallback: < 100ms

---

### 2. Get Fallback Recommendations

**Endpoint**: `GET /api/v1/recommendations/fallback`

**Description**: Get popularity-based recommendations as fallback when main algorithm fails.

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Maximum number of recommendations |

**Response**:
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "contentId": "uuid",
        "score": 0.75,
        "reason": "fallback-popular",
        "metadata": {
          "title": "Popular Content",
          "category": "education",
          "creator": "0x..."
        }
      }
    ],
    "count": 20,
    "method": "fallback-popular"
  }
}
```

**Use Cases**:
- Main recommendation algorithm fails
- New users with no interaction history
- Testing and comparison

---

### 3. Get User-Based Recommendations

**Endpoint**: `GET /api/v1/recommendations/user-based`

**Description**: Get recommendations using user-based collaborative filtering only.

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Maximum number of recommendations |

**Response**:
```json
{
  "success": true,
  "data": {
    "recommendations": [...],
    "count": 20,
    "method": "user-based"
  }
}
```

---

### 4. Get Item-Based Recommendations

**Endpoint**: `GET /api/v1/recommendations/item-based`

**Description**: Get recommendations using item-based collaborative filtering only.

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Maximum number of recommendations |

**Response**:
```json
{
  "success": true,
  "data": {
    "recommendations": [...],
    "count": 20,
    "method": "item-based"
  }
}
```

---

### 5. Get Content-Based Recommendations

**Endpoint**: `GET /api/v1/recommendations/content-based`

**Description**: Get recommendations using content-based filtering only.

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Maximum number of recommendations |

**Response**:
```json
{
  "success": true,
  "data": {
    "recommendations": [...],
    "count": 20,
    "method": "content-based"
  }
}
```

---

### 6. Find Similar Content (Collaborative)

**Endpoint**: `GET /api/v1/recommendations/similar-content/:contentId`

**Description**: Find content similar to the specified content using collaborative filtering.

**Authentication**: Not required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `contentId` | string | Content ID to find similar items for |

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Maximum number of similar items |

**Response**:
```json
{
  "success": true,
  "data": {
    "contentId": "uuid",
    "similarContent": [
      {
        "contentId": "uuid",
        "similarity": 0.85
      }
    ],
    "count": 20,
    "method": "collaborative"
  }
}
```

---

### 7. Find Similar Content (Features)

**Endpoint**: `GET /api/v1/recommendations/similar-content-features/:contentId`

**Description**: Find content similar to the specified content using content features.

**Authentication**: Not required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `contentId` | string | Content ID to find similar items for |

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Maximum number of similar items |

**Response**:
```json
{
  "success": true,
  "data": {
    "contentId": "uuid",
    "similarContent": [
      {
        "contentId": "uuid",
        "similarity": 0.85,
        "matchedFeatures": ["category", "tags(3)", "file-type"]
      }
    ],
    "count": 20,
    "method": "content-features"
  }
}
```

---

### 8. Get Performance Metrics (Admin)

**Endpoint**: `GET /api/v1/recommendations/performance`

**Description**: Get API performance metrics for monitoring.

**Authentication**: Required (Admin only)

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `method` | string | getRecommendations | Method name to get metrics for |

**Response**:
```json
{
  "success": true,
  "data": {
    "averageResponseTime": 150,
    "p50": 120,
    "p95": 180,
    "p99": 250,
    "cacheHitRate": 75,
    "fallbackRate": 2,
    "slowRequestRate": 5,
    "totalRequests": 1000
  },
  "meta": {
    "threshold": 200,
    "status": "healthy"
  }
}
```

**Metrics Explanation**:
- `averageResponseTime`: Average response time in milliseconds
- `p50`, `p95`, `p99`: Percentile response times
- `cacheHitRate`: Percentage of requests served from cache
- `fallbackRate`: Percentage of requests using fallback
- `slowRequestRate`: Percentage of requests exceeding 200ms threshold
- `totalRequests`: Total number of requests tracked (last 1000)

**Status**:
- `healthy`: p95 < 200ms
- `degraded`: p95 >= 200ms

---

### 9. Clear Cache

**Endpoint**: `DELETE /api/v1/recommendations/cache`

**Description**: Clear recommendation cache for the authenticated user or all users (admin).

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "message": "User recommendation cache cleared"
}
```

**Admin Response**:
```json
{
  "success": true,
  "message": "All recommendation cache cleared"
}
```

---

### 10. Train Models (Admin)

**Endpoint**: `POST /api/v1/recommendations/train`

**Description**: Train/update recommendation models by pre-computing similarities.

**Authentication**: Required (Admin only)

**Response**:
```json
{
  "success": true,
  "message": "Model training started in background"
}
```

---

### 11. Evaluate Accuracy (Admin)

**Endpoint**: `POST /api/v1/recommendations/evaluate`

**Description**: Evaluate recommendation accuracy using test set.

**Authentication**: Required (Admin only)

**Request Body**:
```json
{
  "testSetSize": 100
}
```

**Response**:
```json
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

---

## Caching Strategy

### Cache Keys
- `recommendations:{userId}:{options}` - User recommendations
- `similar_users:{userId}` - Similar users
- `similar_content:{contentId}` - Similar content
- `similar_content_features:{contentId}` - Similar content by features
- `fallback_recommendations:{userId}:{limit}` - Fallback recommendations

### Cache TTL
- Main recommendations: 1 hour (3600s)
- Fallback recommendations: 30 minutes (1800s)
- Similar users/content: 1 hour (3600s)

### Cache Invalidation
- Manual: `DELETE /api/v1/recommendations/cache`
- Automatic: TTL expiration
- Event-based: User interactions, content updates

---

## Performance Optimization

### 1. Redis Caching
- All recommendations are cached with appropriate TTL
- Cache hit rate target: > 70%
- Cache warming for popular users/content

### 2. Fallback Mechanism
- Automatic fallback to popularity-based recommendations
- Fallback triggers:
  - Main algorithm fails
  - Response time > 500ms
  - No user interaction history

### 3. Performance Monitoring
- Real-time performance tracking
- Metrics stored in Redis
- Alerts for slow requests (> 400ms)
- Performance dashboard for admins

### 4. Query Optimization
- Batch database queries
- Limit result sets
- Use indexes on frequently queried fields
- Parallel processing where possible

---

## Error Handling

### Error Responses

**401 Unauthorized**:
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**403 Forbidden**:
```json
{
  "success": false,
  "error": "Admin access required"
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": "Failed to get recommendations: <error message>"
}
```

### Fallback Behavior
When the main recommendation algorithm fails:
1. Attempt to use cached recommendations
2. Fall back to popularity-based recommendations
3. Return empty array as last resort

---

## Usage Examples

### Basic Usage
```typescript
// Get personalized recommendations
const response = await fetch('/api/v1/recommendations?limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { data } = await response.json();
console.log(data.recommendations);
```

### With Custom Options
```typescript
// Get diverse recommendations with content-based filtering
const response = await fetch(
  '/api/v1/recommendations?' +
  'limit=20&' +
  'diversityFactor=0.5&' +
  'useContentBased=true&' +
  'contentBasedWeight=0.4',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
```

### Get Similar Content
```typescript
// Find similar content
const response = await fetch(
  `/api/v1/recommendations/similar-content/${contentId}?limit=10`
);
const { data } = await response.json();
console.log(data.similarContent);
```

### Monitor Performance (Admin)
```typescript
// Get performance metrics
const response = await fetch('/api/v1/recommendations/performance', {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});
const { data, meta } = await response.json();
console.log(`Status: ${meta.status}`);
console.log(`P95: ${data.p95}ms`);
console.log(`Cache Hit Rate: ${data.cacheHitRate}%`);
```

---

## Best Practices

### 1. Use Appropriate Limits
- Default: 20 recommendations
- Homepage: 10-15 recommendations
- Explore page: 30-50 recommendations
- Similar items: 5-10 recommendations

### 2. Leverage Caching
- Cache recommendations on client side
- Refresh cache periodically (every 5-10 minutes)
- Clear cache after user interactions

### 3. Handle Errors Gracefully
- Always implement fallback UI
- Show popular content if recommendations fail
- Log errors for monitoring

### 4. Monitor Performance
- Track API response times
- Monitor cache hit rates
- Set up alerts for degraded performance

### 5. A/B Testing
- Use `/ab-test` endpoint for experiments
- Track user interactions
- Analyze results regularly

---

## Performance Benchmarks

### Target Metrics
- **Response Time (p95)**: < 200ms
- **Cache Hit Rate**: > 70%
- **Fallback Rate**: < 5%
- **Accuracy (F1 Score)**: > 70%

### Actual Performance
Monitor via `/api/v1/recommendations/performance` endpoint.

---

## Support

For issues or questions:
- Check logs: `[PERFORMANCE] getRecommendations - {time}ms [{status}] [{source}]`
- Monitor metrics: `/api/v1/recommendations/performance`
- Clear cache if stale: `DELETE /api/v1/recommendations/cache`
- Contact: dev@knowton.io
