# Digital Watermarking System

## Overview

The KnowTon platform implements a comprehensive digital watermarking system to protect content and track unauthorized distribution. The system supports both visible and invisible watermarks across multiple content types.

## Features

### 1. Visible Watermarks
- **Purpose**: Deter unauthorized use of preview content
- **Supported Formats**: Images, Videos, PDFs, Audio (audible)
- **Customization**:
  - Text content
  - Position (top-left, top-right, bottom-left, bottom-right, center)
  - Opacity (0.0-1.0)
  - Font size
  - Color

### 2. Invisible Watermarks
- **Purpose**: Track content leaks and identify sources
- **Supported Formats**: Images, Videos, PDFs, Audio
- **Embedded Data**:
  - User ID
  - Timestamp
  - Content ID
  - Encrypted payload

### 3. Watermark Extraction
- Extract embedded watermark data from content
- Verify authenticity and track distribution
- Support for forensic analysis

### 4. Persistence Testing
- Test watermark survival through compression
- Validate robustness against common transformations
- Quality assurance for watermark implementation

## Technical Implementation

### Image Watermarking

#### Visible Watermarks
- Uses **Sharp** library for image processing
- SVG-based text overlay
- Configurable positioning and styling
- Minimal quality degradation

#### Invisible Watermarks
- **LSB (Least Significant Bit) Steganography**
- Embeds data in the least significant bits of pixel values
- Imperceptible to human eye
- Survives moderate compression

```typescript
// Example: Apply visible watermark to image
const result = await watermarkService.applyWatermark(
  'content-123',
  '/path/to/image.jpg',
  'image/jpeg',
  {
    type: 'visible',
    text: 'PREVIEW - USER123',
    position: 'bottom-right',
    opacity: 0.7,
    fontSize: 32,
    color: '#FFFFFF',
  }
);
```

### Video Watermarking

#### Visible Watermarks
- Uses **FFmpeg** for video processing
- Dynamic text overlay using drawtext filter
- Configurable position and styling
- Maintains video quality

#### Invisible Watermarks
- Embeds data in video metadata
- Optional: LSB embedding in video frames
- Survives re-encoding with same codec

```typescript
// Example: Apply invisible watermark to video
const result = await watermarkService.applyWatermark(
  'content-456',
  '/path/to/video.mp4',
  'video/mp4',
  {
    type: 'invisible',
    userId: 'user-789',
  }
);
```

### PDF Watermarking

#### Visible Watermarks
- Text overlay on each page
- Diagonal or corner positioning
- Configurable opacity

#### Invisible Watermarks
- Embedded in PDF metadata
- Custom properties for tracking
- Survives PDF manipulation

### Audio Watermarking

#### Audible Watermarks
- Text-to-speech announcements
- Periodic insertion at intervals
- Low volume to minimize disruption

#### Inaudible Watermarks
- Embedded in audio metadata
- Optional: Spread spectrum techniques
- Survives format conversion

## API Reference

### Apply Watermark

**Endpoint**: `POST /api/v1/watermark/apply`

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/watermark/apply \
  -F "file=@/path/to/content.jpg" \
  -F "contentId=content-123" \
  -F "type=visible" \
  -F "text=PREVIEW" \
  -F "userId=user-456" \
  -F "position=bottom-right" \
  -F "opacity=0.7" \
  -F "fontSize=24" \
  -F "color=#FFFFFF"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "watermarkedPath": "/uploads/watermarked/content-123-visible-content.jpg",
    "watermarkType": "visible",
    "fileSize": 1234567,
    "processingTime": 1523,
    "downloadUrl": "/api/v1/watermark/download/content-123"
  }
}
```

### Extract Watermark

**Endpoint**: `POST /api/v1/watermark/extract`

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/watermark/extract \
  -F "file=@/path/to/watermarked-content.jpg"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "found": true,
    "userId": "user-456",
    "timestamp": "2024-01-15T10:30:00Z",
    "contentId": "content-123",
    "confidence": 0.95
  }
}
```

### Test Watermark Persistence

**Endpoint**: `POST /api/v1/watermark/test-persistence`

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/watermark/test-persistence \
  -F "file=@/path/to/watermarked-content.jpg"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "original": {
      "found": true,
      "userId": "user-456",
      "confidence": 0.95
    },
    "afterCompression": {
      "found": true,
      "userId": "user-456",
      "confidence": 0.87
    },
    "persistent": true
  }
}
```

### Batch Watermarking

**Endpoint**: `POST /api/v1/watermark/batch`

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/watermark/batch \
  -F "files=@/path/to/file1.jpg" \
  -F "files=@/path/to/file2.jpg" \
  -F "files=@/path/to/file3.jpg" \
  -F "type=visible" \
  -F "text=PREVIEW" \
  -F "position=center" \
  -F "opacity=0.5"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 3,
    "successful": 3,
    "failed": 0,
    "results": [
      {
        "success": true,
        "contentId": "batch-1234567890-0",
        "originalName": "file1.jpg",
        "watermarkedPath": "/uploads/watermarked/...",
        "fileSize": 1234567,
        "processingTime": 1523
      },
      // ... more results
    ]
  }
}
```

### Download Watermarked Content

**Endpoint**: `GET /api/v1/watermark/download/:contentId`

**Query Parameters**:
- `type` (optional): `visible` or `invisible` (default: `visible`)

**Request**:
```bash
curl -O http://localhost:3000/api/v1/watermark/download/content-123?type=visible
```

## Integration with Preview Services

The watermarking service integrates seamlessly with existing preview services:

### Video Preview Integration
```typescript
import { VideoPreviewService } from './video-preview.service';
import { WatermarkService } from './watermark.service';

const videoPreviewService = new VideoPreviewService();
const watermarkService = new WatermarkService();

// Generate preview with watermark
const preview = await videoPreviewService.generatePreview(
  uploadId,
  videoPath,
  userId,
  {
    duration: 180,
    watermarkText: userId,
    watermarkPosition: 'bottom-right',
  }
);

// Apply additional invisible watermark for tracking
const watermarked = await watermarkService.applyWatermark(
  uploadId,
  preview.previewPath,
  'video/mp4',
  {
    type: 'invisible',
    userId: userId,
  }
);
```

### PDF Preview Integration
```typescript
import { PDFPreviewService } from './pdf-preview.service';
import { WatermarkService } from './watermark.service';

const pdfPreviewService = new PDFPreviewService();
const watermarkService = new WatermarkService();

// Generate preview with visible watermark
const preview = await pdfPreviewService.generatePreview(
  uploadId,
  pdfPath,
  userId,
  {
    previewPercentage: 10,
    watermarkText: userId,
    watermarkOpacity: 0.3,
  }
);

// Apply invisible watermark for tracking
const watermarked = await watermarkService.applyWatermark(
  uploadId,
  preview.previewPath,
  'application/pdf',
  {
    type: 'invisible',
    userId: userId,
  }
);
```

## Security Considerations

### Watermark Data Encryption
- All embedded watermark data is encrypted using AES-256
- Secret key stored in environment variables
- Prevents tampering with watermark data

### User ID Embedding
- User IDs are embedded in encrypted form
- Allows tracking of content leaks
- Forensic analysis capabilities

### Watermark Robustness
- LSB watermarks survive moderate compression
- Metadata watermarks survive format conversion
- Multiple watermarking techniques for redundancy

## Performance Optimization

### Processing Time
- Image watermarking: < 2 seconds
- Video watermarking: < 30 seconds (for 3-minute preview)
- PDF watermarking: < 5 seconds
- Audio watermarking: < 10 seconds

### Quality Impact
- Visible watermarks: Minimal quality degradation
- Invisible watermarks: < 1% file size increase
- No perceptible quality loss for end users

### Batch Processing
- Supports up to 50 files per batch
- Parallel processing for improved throughput
- Progress tracking for long-running operations

## Testing

### Run Tests
```bash
npm run test:watermark
# or
tsx src/scripts/test-watermark.ts
```

### Test Coverage
- Visible watermark application
- Invisible watermark application
- Watermark extraction
- Persistence through compression
- Batch watermarking
- Error handling

## Monitoring and Analytics

### Metrics Tracked
- Watermark applications per content type
- Processing time statistics
- Extraction success rate
- Persistence test results

### Logging
- All watermark operations logged
- User ID and content ID tracked
- Error conditions captured
- Performance metrics recorded

## Compliance

### REQ-1.6.3: Watermarking
✅ Visible watermarks for preview content  
✅ Invisible watermarks with user ID embedding  
✅ Watermark extraction for tracking  
✅ Watermark persistence through compression  
✅ Batch watermark processing  

## Future Enhancements

### Planned Features
1. **Advanced Steganography**: Implement spread spectrum techniques for audio
2. **Blockchain Integration**: Store watermark hashes on-chain for verification
3. **AI-Based Detection**: Use machine learning for watermark extraction
4. **Real-time Processing**: WebSocket-based progress updates
5. **Cloud Processing**: Offload heavy processing to cloud services

### Performance Improvements
1. **GPU Acceleration**: Use GPU for image/video processing
2. **Distributed Processing**: Implement job queue for batch operations
3. **Caching**: Cache watermark templates for faster processing
4. **Compression**: Optimize watermarked file sizes

## Troubleshooting

### Common Issues

#### Watermark Not Visible
- Check opacity setting (should be > 0.3 for visibility)
- Verify font size is appropriate for content dimensions
- Ensure color contrasts with background

#### Watermark Not Extractable
- Verify file hasn't been heavily compressed
- Check if correct extraction method is used
- Ensure watermark was applied with same secret key

#### Processing Timeout
- Reduce file size before watermarking
- Use batch processing for multiple files
- Check FFmpeg installation for video/audio

### Debug Mode
Enable debug logging:
```bash
export LOG_LEVEL=debug
export WATERMARK_DEBUG=true
```

## Support

For issues or questions:
- GitHub Issues: [knowton/issues](https://github.com/knowton/issues)
- Email: support@knowton.io
- Documentation: [docs.knowton.io](https://docs.knowton.io)
