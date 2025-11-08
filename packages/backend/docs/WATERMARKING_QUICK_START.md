# Watermarking Quick Start Guide

## Overview

This guide will help you quickly integrate watermarking into your content workflow.

## Prerequisites

- Node.js 18+
- FFmpeg installed (for video/audio watermarking)
- Sharp library (already included in dependencies)

## Installation

The watermarking service is already included in the backend. No additional installation required.

## Basic Usage

### 1. Apply Visible Watermark to Image

```typescript
import { WatermarkService } from './services/watermark.service';

const watermarkService = new WatermarkService();

const result = await watermarkService.applyWatermark(
  'content-123',
  '/path/to/image.jpg',
  'image/jpeg',
  {
    type: 'visible',
    text: 'PREVIEW',
    position: 'bottom-right',
    opacity: 0.7,
    fontSize: 32,
    color: '#FFFFFF',
  }
);

console.log('Watermarked file:', result.watermarkedPath);
```

### 2. Apply Invisible Watermark for Tracking

```typescript
const result = await watermarkService.applyWatermark(
  'content-456',
  '/path/to/image.jpg',
  'image/jpeg',
  {
    type: 'invisible',
    userId: 'user-789',
  }
);

console.log('Watermarked file:', result.watermarkedPath);
```

### 3. Extract Watermark

```typescript
const extraction = await watermarkService.extractWatermark(
  '/path/to/watermarked-image.jpg',
  'image/jpeg'
);

if (extraction.found) {
  console.log('User ID:', extraction.userId);
  console.log('Timestamp:', extraction.timestamp);
  console.log('Confidence:', extraction.confidence);
}
```

### 4. Test Watermark Persistence

```typescript
const persistence = await watermarkService.testWatermarkPersistence(
  '/path/to/watermarked-image.jpg',
  'image/jpeg'
);

console.log('Persistent:', persistence.persistent);
console.log('Original found:', persistence.original.found);
console.log('After compression found:', persistence.afterCompression.found);
```

## API Usage

### Apply Watermark via API

```bash
curl -X POST http://localhost:3000/api/v1/watermark/apply \
  -F "file=@image.jpg" \
  -F "contentId=content-123" \
  -F "type=visible" \
  -F "text=PREVIEW" \
  -F "position=bottom-right" \
  -F "opacity=0.7"
```

### Extract Watermark via API

```bash
curl -X POST http://localhost:3000/api/v1/watermark/extract \
  -F "file=@watermarked-image.jpg"
```

### Download Watermarked Content

```bash
curl -O http://localhost:3000/api/v1/watermark/download/content-123
```

## Integration with Preview Services

### Video Preview with Watermark

```typescript
import { VideoPreviewService } from './services/video-preview.service';
import { WatermarkService } from './services/watermark.service';

const videoPreviewService = new VideoPreviewService();
const watermarkService = new WatermarkService();

// Generate preview (already includes visible watermark)
const preview = await videoPreviewService.generatePreview(
  'upload-123',
  '/path/to/video.mp4',
  'user-456',
  {
    duration: 180,
    watermarkText: 'user-456',
    watermarkPosition: 'bottom-right',
  }
);

// Add invisible watermark for tracking
const tracked = await watermarkService.applyWatermark(
  'upload-123',
  preview.previewPath,
  'video/mp4',
  {
    type: 'invisible',
    userId: 'user-456',
  }
);
```

### PDF Preview with Watermark

```typescript
import { PDFPreviewService } from './services/pdf-preview.service';
import { WatermarkService } from './services/watermark.service';

const pdfPreviewService = new PDFPreviewService();
const watermarkService = new WatermarkService();

// Generate preview with visible watermark
const preview = await pdfPreviewService.generatePreview(
  'upload-789',
  '/path/to/document.pdf',
  'user-456',
  {
    previewPercentage: 10,
    watermarkText: 'user-456',
    watermarkOpacity: 0.3,
  }
);

// Add invisible watermark
const tracked = await watermarkService.applyWatermark(
  'upload-789',
  preview.previewPath,
  'application/pdf',
  {
    type: 'invisible',
    userId: 'user-456',
  }
);
```

## Configuration

### Environment Variables

```bash
# Watermark secret key for encryption
WATERMARK_SECRET_KEY=your-secret-key-here

# Upload directory
UPLOAD_DIR=/path/to/uploads

# Enable debug logging
WATERMARK_DEBUG=true
```

### Watermark Options

```typescript
interface WatermarkOptions {
  type: 'visible' | 'invisible';
  text?: string;                    // Text for visible watermark
  userId?: string;                  // User ID for invisible watermark
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number;                 // 0.0-1.0
  fontSize?: number;                // Font size in pixels
  color?: string;                   // Hex color code
}
```

## Testing

### Run Test Script

```bash
npm run test:watermark
# or
tsx src/scripts/test-watermark.ts
```

### Expected Output

```
=== Watermarking Service Test ===

Test 1: Visible watermark on image
  Visible watermark applied: {
    watermarkedPath: '/uploads/watermarked/test-visible-image-visible-test-image.png',
    fileSize: 123456,
    processingTime: 1234
  }
✓ Test 1 passed

Test 2: Invisible watermark on image
  Invisible watermark applied: {
    watermarkedPath: '/uploads/watermarked/test-invisible-image-invisible-test-image.png',
    fileSize: 123789,
    processingTime: 1567
  }
✓ Test 2 passed

Test 3: Watermark extraction
  Watermark extraction result: {
    found: true,
    userId: 'user-67890',
    confidence: 0.95
  }
✓ Test 3 passed

Test 4: Watermark persistence through compression
  Watermark persistence result: {
    originalFound: true,
    afterCompressionFound: true,
    persistent: true
  }
✓ Test 4 passed

Test 5: Batch watermarking
  Batch watermarking results: {
    totalProcessed: 3,
    totalSize: 370000,
    avgProcessingTime: 1456
  }
✓ Test 5 passed

=== All tests passed! ===
```

## Common Use Cases

### 1. Preview Content Protection

```typescript
// Apply visible watermark to preview
const preview = await watermarkService.applyWatermark(
  contentId,
  previewPath,
  contentType,
  {
    type: 'visible',
    text: `PREVIEW - ${userId}`,
    position: 'center',
    opacity: 0.5,
  }
);
```

### 2. Content Leak Tracking

```typescript
// Apply invisible watermark for tracking
const tracked = await watermarkService.applyWatermark(
  contentId,
  contentPath,
  contentType,
  {
    type: 'invisible',
    userId: userId,
  }
);

// Later, extract watermark from leaked content
const extraction = await watermarkService.extractWatermark(
  leakedContentPath,
  contentType
);

if (extraction.found) {
  console.log('Content leaked by user:', extraction.userId);
}
```

### 3. Batch Processing

```typescript
// Watermark multiple files
const files = ['file1.jpg', 'file2.jpg', 'file3.jpg'];

const results = await Promise.all(
  files.map((file, index) =>
    watermarkService.applyWatermark(
      `batch-${index}`,
      file,
      'image/jpeg',
      {
        type: 'visible',
        text: 'PREVIEW',
        position: 'bottom-right',
      }
    )
  )
);

console.log(`Processed ${results.length} files`);
```

## Troubleshooting

### Issue: Watermark not visible

**Solution**: Increase opacity and font size
```typescript
{
  opacity: 0.8,  // Increase from default 0.5
  fontSize: 48,  // Increase from default 24
}
```

### Issue: Watermark extraction fails

**Solution**: Ensure file hasn't been heavily compressed
```typescript
// Test persistence before relying on extraction
const persistence = await watermarkService.testWatermarkPersistence(
  watermarkedPath,
  contentType
);

if (!persistence.persistent) {
  console.warn('Watermark may not survive compression');
}
```

### Issue: Processing timeout

**Solution**: Process files in smaller batches
```typescript
// Instead of processing 50 files at once
const batchSize = 10;
for (let i = 0; i < files.length; i += batchSize) {
  const batch = files.slice(i, i + batchSize);
  await processBatch(batch);
}
```

## Performance Tips

1. **Use appropriate file sizes**: Compress large files before watermarking
2. **Batch processing**: Process multiple files in parallel
3. **Cache results**: Store watermarked files for reuse
4. **Async processing**: Use job queues for long-running operations

## Next Steps

- Read the full [Watermarking Documentation](./WATERMARKING.md)
- Explore [API Reference](./WATERMARKING.md#api-reference)
- Check [Integration Examples](./WATERMARKING.md#integration-with-preview-services)
- Review [Security Considerations](./WATERMARKING.md#security-considerations)

## Support

For questions or issues:
- GitHub: [knowton/issues](https://github.com/knowton/issues)
- Email: support@knowton.io
- Docs: [docs.knowton.io](https://docs.knowton.io)
