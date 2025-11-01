# Similarity Detection API - Quick Start Guide

## Overview

This guide will help you quickly get started with the Similarity Detection API for content fingerprinting and plagiarism detection.

## Prerequisites

- Backend service running on `http://localhost:3000`
- Oracle Adapter service running on `http://localhost:8001`
- Valid JWT authentication token

## Quick Setup

### 1. Start Services

```bash
# Start Oracle Adapter (Python service)
cd packages/oracle-adapter
python -m uvicorn src.main:app --host 0.0.0.0 --port 8001

# Start Backend (Node.js service)
cd packages/backend
npm run dev
```

### 2. Verify Services

```bash
# Check Oracle Adapter
curl http://localhost:8001/health

# Check Backend Similarity Service
curl http://localhost:3000/api/v1/similarity/health
```

Expected responses:
```json
{
  "status": "healthy",
  "service": "similarity",
  "oracle_adapter": "connected"
}
```

## Basic Usage

### 1. Generate Fingerprint

```bash
curl -X POST http://localhost:3000/api/v1/similarity/fingerprint \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content_url": "https://example.com/image.jpg",
    "content_type": "image"
  }'
```

### 2. Search for Similar Content

```bash
curl -X POST http://localhost:3000/api/v1/similarity/search \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content_url": "https://example.com/image.jpg",
    "content_type": "image",
    "threshold": 0.85,
    "limit": 10,
    "offset": 0
  }'
```

### 3. Detect Plagiarism

```bash
curl -X POST http://localhost:3000/api/v1/similarity/detect-plagiarism \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content_url": "https://example.com/image.jpg",
    "content_type": "image"
  }'
```

## Integration Example

### Upload with Plagiarism Check

```typescript
import axios from 'axios';

async function uploadWithPlagiarismCheck(file: File, token: string) {
  // 1. Upload file
  const formData = new FormData();
  formData.append('file', file);
  
  const uploadResponse = await axios.post(
    'http://localhost:3000/api/v1/upload/files',
    formData,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  
  const fileUrl = uploadResponse.data.file_url;
  
  // 2. Check for plagiarism
  const plagiarismResponse = await axios.post(
    'http://localhost:3000/api/v1/similarity/detect-plagiarism',
    {
      content_url: fileUrl,
      content_type: 'image'
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const result = plagiarismResponse.data;
  
  if (result.is_plagiarism) {
    console.warn('⚠️ Potential plagiarism detected!');
    console.warn(`Confidence: ${result.confidence * 100}%`);
    console.warn(`Similar content: ${result.similar_content.length} items`);
    
    // Handle plagiarism (reject upload, notify user, etc.)
    return {
      success: false,
      reason: 'plagiarism_detected',
      details: result
    };
  }
  
  console.log('✅ Content is original');
  return {
    success: true,
    uploadId: uploadResponse.data.id,
    fileUrl
  };
}
```

## Testing

### Run Integration Tests

```bash
cd packages/backend
npm run test:similarity-integration
```

### Run Unit Tests

```bash
cd packages/backend
npm test -- similarity.test.ts
```

## Common Use Cases

### Use Case 1: Content Upload Validation

```typescript
// Automatically check for plagiarism during upload
async function validateUpload(contentUrl: string, contentType: string) {
  const result = await fetch('/api/v1/similarity/detect-plagiarism', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content_url: contentUrl, content_type: contentType })
  });
  
  const data = await result.json();
  
  if (data.is_plagiarism) {
    throw new Error(`Plagiarism detected with ${data.confidence * 100}% confidence`);
  }
  
  return true;
}
```

### Use Case 2: Find Related Content

```typescript
// Find similar content for recommendations
async function findRelatedContent(contentUrl: string, contentType: string) {
  const result = await fetch('/api/v1/similarity/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content_url: contentUrl,
      content_type: contentType,
      threshold: 0.7, // Lower threshold for recommendations
      limit: 5
    })
  });
  
  const data = await result.json();
  return data.results;
}
```

### Use Case 3: Duplicate Detection

```typescript
// Check if content already exists
async function checkDuplicate(contentUrl: string, contentType: string) {
  const result = await fetch('/api/v1/similarity/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content_url: contentUrl,
      content_type: contentType,
      threshold: 0.95, // High threshold for duplicates
      limit: 1
    })
  });
  
  const data = await result.json();
  return data.total_results > 0;
}
```

## Configuration

### Environment Variables

```bash
# Backend (.env)
ORACLE_ADAPTER_URL=http://localhost:8001

# Oracle Adapter (.env)
HOST=0.0.0.0
PORT=8001
MAX_WORKERS=4
```

### Adjust Thresholds

```typescript
// Similarity thresholds for different use cases
const THRESHOLDS = {
  PLAGIARISM: 0.95,      // Very high similarity
  DUPLICATE: 0.90,       // High similarity
  SIMILAR: 0.85,         // Default similarity
  RELATED: 0.70,         // Related content
  RECOMMENDATION: 0.60   // Loose matching
};
```

## Troubleshooting

### Issue: "Oracle adapter is not responding"

**Solution**:
```bash
# Check if service is running
curl http://localhost:8001/health

# Restart service
cd packages/oracle-adapter
python -m uvicorn src.main:app --reload --port 8001
```

### Issue: Slow processing (> 30 seconds)

**Solution**:
- Check GPU availability: `nvidia-smi`
- Reduce content size/resolution
- Enable caching in requests

### Issue: No similar content found

**Solution**:
- Lower the threshold (try 0.7-0.8)
- Ensure content has been fingerprinted
- Check content type matches

## Performance Tips

1. **Use Caching**: Fingerprints are cached for 1 hour
2. **Batch Processing**: Process multiple files in parallel
3. **Appropriate Thresholds**: Use higher thresholds for faster searches
4. **Pagination**: Use reasonable page sizes (10-20 items)

## Next Steps

1. Read the [Full API Documentation](./SIMILARITY_DETECTION_API.md)
2. Integrate with your upload workflow
3. Implement frontend UI components
4. Set up automated plagiarism scanning

## Support

- Documentation: `packages/backend/docs/SIMILARITY_DETECTION_API.md`
- Tests: `packages/backend/src/__tests__/services/similarity.test.ts`
- Integration Tests: `packages/backend/src/scripts/test-similarity-integration.ts`
