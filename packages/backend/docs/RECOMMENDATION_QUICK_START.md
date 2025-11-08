# Recommendation Engine - Quick Start Guide

## Overview

Get started with the KnowTon collaborative filtering recommendation engine in 5 minutes.

## Prerequisites

- Node.js 18+
- PostgreSQL database
- ClickHouse database
- Redis cache
- User interaction data in ClickHouse

## Quick Setup

### 1. Environment Variables

Ensure these are set in your `.env` file:

```bash
# PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/knowton"

# ClickHouse
CLICKHOUSE_URL="http://localhost"
CLICKHOUSE_PORT="8123"
CLICKHOUSE_DATABASE="knowton"
CLICKHOUSE_USER="default"
CLICKHOUSE_PASSWORD=""

# Redis
REDIS_URL="redis://localhost:6379"
```

### 2. Database Setup

Ensure the ClickHouse `user_behavior_events` table exists:

```sql
CREATE TABLE IF NOT EXISTS user_behavior_events (
  session_id String,
  user_address String,
  event_type String,
  target_id String,
  target_type String,
  event_time DateTime,
  event_date Date DEFAULT toDate(event_time),
  metadata String,
  device_type String,
  country_code String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, user_address, event_time);
```

### 3. Test the Implementation

```bash
cd packages/backend
npm run test:recommendation
```

## Basic Usage

### Get Recommendations for a User

```typescript
import { recommendationService } from './services/recommendation.service';

// Get personalized recommendations
const recommendations = await recommendationService.getRecommendations(
  userId,
  {
    limit: 20,
    minScore: 0.1,
    excludeViewed: true,
    excludePurchased: true,
  }
);

console.log(`Found ${recommendations.length} recommendations`);
recommendations.forEach(rec => {
  console.log(`- ${rec.metadata?.title} (score: ${rec.score})`);
});
```

### API Request Example

```bash
# Get recommendations
curl -X GET "http://localhost:3000/api/v1/recommendations?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Find similar content
curl -X GET "http://localhost:3000/api/v1/recommendations/similar-content/CONTENT_ID?limit=5"

# Train models (admin only)
curl -X POST "http://localhost:3000/api/v1/recommendations/train" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

## Frontend Integration

### React Hook Example

```typescript
// hooks/useRecommendations.ts
import { useState, useEffect } from 'react';
import { api } from '@/services/api';

export function useRecommendations(options = {}) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        setLoading(true);
        const response = await api.get('/recommendations', {
          params: options,
        });
        setRecommendations(response.data.data.recommendations);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [JSON.stringify(options)]);

  return { recommendations, loading, error };
}
```

### Component Example

```typescript
// components/RecommendedContent.tsx
import { useRecommendations } from '@/hooks/useRecommendations';
import { ContentCard } from '@/components/ContentCard';

export function RecommendedContent() {
  const { recommendations, loading, error } = useRecommendations({
    limit: 12,
    excludeViewed: true,
  });

  if (loading) return <div>Loading recommendations...</div>;
  if (error) return <div>Error loading recommendations</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {recommendations.map(rec => (
        <ContentCard
          key={rec.contentId}
          contentId={rec.contentId}
          title={rec.metadata?.title}
          score={rec.score}
          reason={rec.reason}
        />
      ))}
    </div>
  );
}
```

## Performance Tips

### 1. Enable Caching

Recommendations are automatically cached in Redis for 1 hour. To clear cache:

```bash
curl -X DELETE "http://localhost:3000/api/v1/recommendations/cache" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Pre-compute Similarities

Run model training periodically (e.g., daily via cron):

```bash
# Add to crontab
0 2 * * * curl -X POST "http://localhost:3000/api/v1/recommendations/train" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### 3. Monitor Performance

Check recommendation quality:

```bash
curl -X POST "http://localhost:3000/api/v1/recommendations/evaluate" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"testSetSize": 100}'
```

## Common Issues

### Issue: No recommendations returned

**Solution**: Ensure users have interaction data in ClickHouse:

```sql
SELECT count(*) FROM user_behavior_events 
WHERE user_address = 'YOUR_USER_ID';
```

### Issue: Slow performance

**Solutions**:
1. Check Redis connection
2. Verify ClickHouse indexes
3. Reduce recommendation limit
4. Pre-compute similarities

### Issue: Low accuracy

**Solutions**:
1. Increase interaction data volume
2. Adjust similarity thresholds
3. Tune algorithm weights
4. Improve diversity factor

## Next Steps

1. **Integrate with Frontend**: Add recommendation widgets to your UI
2. **Monitor Metrics**: Track precision, recall, and user engagement
3. **Optimize Performance**: Pre-compute similarities and tune cache settings
4. **A/B Testing**: Compare different recommendation strategies
5. **Enhance Algorithms**: Add content-based filtering and deep learning models

## API Reference

See [RECOMMENDATION_ENGINE.md](./RECOMMENDATION_ENGINE.md) for complete API documentation.

## Support

- Documentation: [docs.knowton.io](https://docs.knowton.io)
- Issues: [GitHub Issues](https://github.com/knowton-platform/issues)
- Email: support@knowton.io
