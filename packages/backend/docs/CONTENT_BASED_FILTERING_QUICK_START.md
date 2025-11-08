# Content-Based Filtering - Quick Start Guide

## Overview

Content-based filtering recommends content similar to what users have interacted with, based on content features like category, tags, file type, and AI fingerprint.

## Quick Test

```bash
# Run the test script
npx ts-node packages/backend/src/scripts/test-content-based-filtering.ts
```

## API Usage

### 1. Get Content-Based Recommendations

```bash
curl -X GET "http://localhost:3001/api/v1/recommendations/content-based?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Find Similar Content by Features

```bash
curl -X GET "http://localhost:3001/api/v1/recommendations/similar-content-features/CONTENT_ID?limit=10"
```

### 3. Get Hybrid Recommendations (Collaborative + Content-Based)

```bash
curl -X GET "http://localhost:3001/api/v1/recommendations?limit=20&useContentBased=true&contentBasedWeight=0.3" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Feature Weights

Content similarity is calculated using these feature weights:

- **Category**: 30% - Exact category match
- **Tags**: 35% - Tag overlap (cosine similarity)
- **File Type**: 15% - Media format match
- **Creator**: 10% - Same creator preference
- **Fingerprint**: 10% - AI fingerprint similarity

## Configuration

### Adjust Content-Based Weight

```typescript
// More content-based (50%)
const recs = await recommendationService.getRecommendations(userId, {
  useContentBased: true,
  contentBasedWeight: 0.5,
});

// Less content-based (10%)
const recs = await recommendationService.getRecommendations(userId, {
  useContentBased: true,
  contentBasedWeight: 0.1,
});

// Disable content-based
const recs = await recommendationService.getRecommendations(userId, {
  useContentBased: false,
});
```

## How It Works

1. **User Profile Building**: Analyzes user's interaction history to build a weighted profile of preferred categories, tags, and features

2. **Feature Extraction**: Extracts features from all published content (category, tags, file type, fingerprint, creator)

3. **Similarity Calculation**: Compares user profile with each content item using multi-dimensional similarity scoring

4. **Ranking**: Ranks content by similarity score and returns top recommendations

5. **Hybrid Combination**: Optionally combines with collaborative filtering for better results

## Example Response

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "contentId": "abc-123",
        "score": 0.85,
        "reason": "content-based: category, tags(3), file-type",
        "metadata": {
          "title": "Advanced Machine Learning",
          "category": "education",
          "creator": "0x..."
        }
      }
    ],
    "count": 10,
    "method": "content-based"
  }
}
```

## Benefits

✅ **Cold Start**: Works with minimal user history  
✅ **Diversity**: Discovers content across different creators  
✅ **Explainability**: Clear reasons for recommendations  
✅ **Serendipity**: Balances similar and new content  

## Monitoring

Key metrics to track:

- Recommendation diversity (category/tag distribution)
- Click-through rate
- Conversion rate
- User satisfaction scores

## Troubleshooting

**No recommendations returned?**
- Ensure user has interaction history
- Check if content has proper tags and metadata
- Verify AI fingerprints are generated

**Low similarity scores?**
- Add more tags to content
- Ensure categories are consistent
- Check fingerprint generation

**Slow performance?**
- Enable Redis caching
- Add database indexes
- Reduce limit parameter

## Next Steps

- Review full documentation: `CONTENT_BASED_FILTERING.md`
- Run evaluation: `POST /api/v1/recommendations/evaluate`
- A/B test different weights
- Monitor recommendation metrics

## Support

For detailed documentation, see:
- `packages/backend/docs/CONTENT_BASED_FILTERING.md`
- `packages/backend/docs/RECOMMENDATION_ENGINE.md`
