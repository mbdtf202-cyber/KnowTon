# Recommendation API - Quick Start Guide

## Overview

This guide will help you quickly integrate the Recommendation API into your application.

**Performance**: < 200ms response time (p95)  
**Caching**: Redis-based with automatic fallback  
**Requirements**: REQ-1.7.2

---

## Quick Integration

### 1. Get Personalized Recommendations

```typescript
// Frontend example
import { useEffect, useState } from 'react';

function RecommendationsWidget() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const response = await fetch('/api/v1/recommendations?limit=10', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const { data } = await response.json();
        setRecommendations(data.recommendations);
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
        // Fallback to popular content
        fetchFallbackRecommendations();
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, []);

  if (loading) return <div>Loading recommendations...</div>;

  return (
    <div className="recommendations">
      <h2>Recommended for You</h2>
      {recommendations.map(rec => (
        <ContentCard 
          key={rec.contentId} 
          contentId={rec.contentId}
          score={rec.score}
          reason={rec.reason}
          metadata={rec.metadata}
        />
      ))}
    </div>
  );
}
```

---

## API Endpoints Summary

### Main Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/recommendations` | GET | Yes | Get personalized recommendations |
| `/api/v1/recommendations/fallback` | GET | Yes | Get fallback recommendations |
| `/api/v1/recommendations/performance` | GET | Admin | Get performance metrics |

### Query Parameters

```typescript
interface RecommendationOptions {
  limit?: number;              // Default: 20
  minScore?: number;           // Default: 0.1
  excludeViewed?: boolean;     // Default: true
  excludePurchased?: boolean;  // Default: true
  diversityFactor?: number;    // Default: 0.3
  useContentBased?: boolean;   // Default: true
  contentBasedWeight?: number; // Default: 0.3
}
```

---

## Common Use Cases

### 1. Homepage Recommendations

```typescript
// Get diverse recommendations for homepage
const response = await fetch(
  '/api/v1/recommendations?limit=15&diversityFactor=0.5',
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

### 2. Similar Content Widget

```typescript
// Show similar content on detail page
const response = await fetch(
  `/api/v1/recommendations/similar-content/${contentId}?limit=5`
);
```

### 3. Explore Page

```typescript
// Get more recommendations with lower diversity
const response = await fetch(
  '/api/v1/recommendations?limit=30&diversityFactor=0.2',
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

---

## Error Handling

```typescript
async function getRecommendations() {
  try {
    const response = await fetch('/api/v1/recommendations', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const { data } = await response.json();
    return data.recommendations;
  } catch (error) {
    console.error('Recommendations failed:', error);
    
    // Fallback to popular content
    return getFallbackRecommendations();
  }
}

async function getFallbackRecommendations() {
  const response = await fetch('/api/v1/recommendations/fallback', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const { data } = await response.json();
  return data.recommendations;
}
```

---

## Performance Monitoring

### Check API Performance (Admin)

```typescript
async function checkPerformance() {
  const response = await fetch('/api/v1/recommendations/performance', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  const { data, meta } = await response.json();
  
  console.log(`Status: ${meta.status}`);
  console.log(`Average Response Time: ${data.averageResponseTime}ms`);
  console.log(`P95: ${data.p95}ms`);
  console.log(`Cache Hit Rate: ${data.cacheHitRate}%`);
  console.log(`Fallback Rate: ${data.fallbackRate}%`);

  // Alert if performance is degraded
  if (meta.status === 'degraded') {
    alert('Recommendation API performance is degraded!');
  }
}
```

---

## Caching Best Practices

### 1. Client-Side Caching

```typescript
// Cache recommendations for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class RecommendationCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  async get(userId: string, options: any) {
    const key = `${userId}:${JSON.stringify(options)}`;
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    // Fetch from API
    const data = await fetchRecommendations(userId, options);
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  clear(userId?: string) {
    if (userId) {
      // Clear specific user cache
      for (const key of this.cache.keys()) {
        if (key.startsWith(userId)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }
}
```

### 2. Clear Cache After Interactions

```typescript
// Clear cache after user purchases content
async function purchaseContent(contentId: string) {
  await api.post('/api/v1/purchases', { contentId });
  
  // Clear recommendation cache
  await fetch('/api/v1/recommendations/cache', {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  // Refresh recommendations
  await fetchRecommendations();
}
```

---

## Testing

### 1. Test Recommendations

```bash
# Get recommendations
curl -X GET "http://localhost:3000/api/v1/recommendations?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get fallback recommendations
curl -X GET "http://localhost:3000/api/v1/recommendations/fallback?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get similar content
curl -X GET "http://localhost:3000/api/v1/recommendations/similar-content/CONTENT_ID?limit=5"
```

### 2. Test Performance (Admin)

```bash
# Get performance metrics
curl -X GET "http://localhost:3000/api/v1/recommendations/performance" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Clear cache
curl -X DELETE "http://localhost:3000/api/v1/recommendations/cache" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## React Hook Example

```typescript
// useRecommendations.ts
import { useState, useEffect } from 'react';

interface UseRecommendationsOptions {
  limit?: number;
  diversityFactor?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useRecommendations(options: UseRecommendationsOptions = {}) {
  const {
    limit = 20,
    diversityFactor = 0.3,
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes
  } = options;

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/recommendations?limit=${limit}&diversityFactor=${diversityFactor}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const { data } = await response.json();
      setRecommendations(data.recommendations);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      
      // Try fallback
      try {
        const fallbackResponse = await fetch('/api/v1/recommendations/fallback', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const { data } = await fallbackResponse.json();
        setRecommendations(data.recommendations);
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();

    if (autoRefresh) {
      const interval = setInterval(fetchRecommendations, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [limit, diversityFactor, autoRefresh, refreshInterval]);

  return {
    recommendations,
    loading,
    error,
    refresh: fetchRecommendations,
  };
}

// Usage
function HomePage() {
  const { recommendations, loading, error, refresh } = useRecommendations({
    limit: 15,
    diversityFactor: 0.5,
    autoRefresh: true,
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <h1>Recommended for You</h1>
      <button onClick={refresh}>Refresh</button>
      <RecommendationGrid recommendations={recommendations} />
    </div>
  );
}
```

---

## Performance Tips

### 1. Optimize Request Frequency
- Don't fetch on every page load
- Use client-side caching
- Refresh only when needed (after interactions)

### 2. Use Appropriate Limits
- Homepage: 10-15 items
- Explore: 30-50 items
- Similar items: 5-10 items

### 3. Monitor Performance
- Check `/performance` endpoint regularly
- Set up alerts for degraded performance
- Clear cache if stale

### 4. Handle Errors Gracefully
- Always implement fallback
- Show cached data while refreshing
- Provide manual refresh option

---

## Troubleshooting

### Slow Response Times

```typescript
// Check performance metrics
const metrics = await fetch('/api/v1/recommendations/performance', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
}).then(r => r.json());

if (metrics.data.p95 > 200) {
  console.warn('Performance degraded!');
  console.log('Cache hit rate:', metrics.data.cacheHitRate);
  console.log('Fallback rate:', metrics.data.fallbackRate);
  
  // Clear cache to force refresh
  await fetch('/api/v1/recommendations/cache', {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
}
```

### Empty Recommendations

```typescript
// Check if user has interaction history
const recommendations = await getRecommendations();

if (recommendations.length === 0) {
  // Show popular content instead
  const fallback = await getFallbackRecommendations();
  return fallback;
}
```

---

## Next Steps

1. **Integrate into your app**: Use the React hook or API directly
2. **Monitor performance**: Check `/performance` endpoint regularly
3. **Optimize caching**: Implement client-side caching
4. **A/B test**: Use `/ab-test` endpoint to compare algorithms
5. **Evaluate accuracy**: Use `/evaluate` endpoint to measure performance

---

## Support

- **Documentation**: `/docs/RECOMMENDATION_API.md`
- **Performance Logs**: Check console for `[PERFORMANCE]` logs
- **Metrics**: `/api/v1/recommendations/performance`
- **Contact**: dev@knowton.io
