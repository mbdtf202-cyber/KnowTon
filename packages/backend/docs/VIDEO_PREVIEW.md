# Video Preview System

## Overview

The Video Preview System automatically generates preview clips for uploaded videos with watermarks and HLS streaming support. This allows users to preview content before purchasing while protecting the creator's intellectual property.

## Features

### 1. Preview Clip Generation
- **Duration**: First 3 minutes of video (configurable)
- **Watermark**: User ID overlay to prevent unauthorized sharing
- **Quality**: Optimized for web streaming
- **Format**: MP4 with H.264 codec

### 2. Watermark Protection
- **Position**: Configurable (top-left, top-right, bottom-left, bottom-right, center)
- **Style**: Semi-transparent background with white text
- **Content**: User ID or custom text
- **Size**: Automatically scaled based on video resolution

### 3. HLS Streaming
- **Multi-quality**: 360p, 480p, 720p
- **Adaptive**: Automatic quality switching based on bandwidth
- **Segments**: 6-second segments for smooth playback
- **Format**: VOD (Video on Demand) playlist

### 4. Analytics Tracking
- **View Count**: Total preview views
- **Unique Viewers**: Distinct users who viewed
- **Watch Duration**: Average time spent watching
- **Quality Distribution**: Views by quality level

## API Endpoints

### Generate Preview

```http
POST /api/v1/preview/generate
Content-Type: application/json

{
  "uploadId": "upload-123",
  "duration": 180,
  "watermarkPosition": "bottom-right",
  "generateHLS": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadId": "upload-123",
    "previewUrl": "/api/v1/preview/video/upload-123",
    "hlsManifestUrl": "/api/v1/preview/hls/upload-123/playlist.m3u8",
    "duration": 180,
    "fileSize": 5242880,
    "resolution": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

### Stream Preview

```http
GET /api/v1/preview/video/:uploadId
Range: bytes=0-1023
```

**Response:**
- Status: 206 Partial Content (for range requests)
- Status: 200 OK (for full file)
- Content-Type: video/mp4
- Supports HTTP range requests for seeking

### Get HLS Manifest

```http
GET /api/v1/preview/hls/:uploadId/playlist.m3u8
```

**Response:**
```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480
480p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p.m3u8
```

### Get HLS Segment

```http
GET /api/v1/preview/hls/:uploadId/:quality/:segment
```

Example: `/api/v1/preview/hls/upload-123/720p/720p_001.ts`

### Get Preview Analytics

```http
GET /api/v1/preview/analytics/:uploadId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalViews": 150,
    "uniqueViewers": 75,
    "avgWatchDuration": 120.5,
    "viewsByQuality": {
      "360p": 30,
      "480p": 60,
      "720p": 60
    }
  }
}
```

### Delete Preview

```http
DELETE /api/v1/preview/:uploadId
```

**Response:**
```json
{
  "success": true,
  "message": "Preview deleted successfully"
}
```

## Integration

### Automatic Generation

Preview generation is automatically triggered when a video is uploaded:

```typescript
// In upload.service.ts
if (upload.filetype.startsWith('video/')) {
  await videoPreviewService.generatePreview(
    uploadId,
    filePath,
    userId,
    {
      duration: 180,
      watermarkPosition: 'bottom-right',
      generateHLS: true,
    }
  );
}
```

### Manual Generation

You can also manually generate previews:

```typescript
import { VideoPreviewService } from './services/video-preview.service';

const videoPreviewService = new VideoPreviewService();

const result = await videoPreviewService.generatePreview(
  uploadId,
  videoPath,
  userId,
  {
    duration: 180,
    watermarkText: 'user@example.com',
    watermarkPosition: 'center',
    generateHLS: true,
  }
);
```

## Frontend Integration

### HTML5 Video Player

```html
<video controls>
  <source src="/api/v1/preview/video/upload-123" type="video/mp4">
  Your browser does not support the video tag.
</video>
```

### HLS.js Integration

```javascript
import Hls from 'hls.js';

const video = document.getElementById('video');
const manifestUrl = '/api/v1/preview/hls/upload-123/playlist.m3u8';

if (Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource(manifestUrl);
  hls.attachMedia(video);
  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    video.play();
  });
} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
  // Native HLS support (Safari)
  video.src = manifestUrl;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
}
```

### React Component

```tsx
import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface VideoPreviewProps {
  uploadId: string;
  useHLS?: boolean;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ 
  uploadId, 
  useHLS = true 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (useHLS) {
      const manifestUrl = `/api/v1/preview/hls/${uploadId}/playlist.m3u8`;
      
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(manifestUrl);
        hls.attachMedia(videoRef.current);
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = manifestUrl;
      }
    } else {
      videoRef.current.src = `/api/v1/preview/video/${uploadId}`;
    }
  }, [uploadId, useHLS]);

  return (
    <video 
      ref={videoRef} 
      controls 
      style={{ width: '100%', maxWidth: '800px' }}
    />
  );
};
```

## Configuration

### Environment Variables

```bash
# Upload directory (where videos and previews are stored)
UPLOAD_DIR=/path/to/uploads

# Preview duration (seconds)
PREVIEW_DURATION=180

# Watermark position
WATERMARK_POSITION=bottom-right
```

### Service Configuration

```typescript
const videoPreviewService = new VideoPreviewService();

// Custom configuration
const result = await videoPreviewService.generatePreview(
  uploadId,
  videoPath,
  userId,
  {
    duration: 300, // 5 minutes
    watermarkText: 'PREVIEW - Not for distribution',
    watermarkPosition: 'center',
    generateHLS: true,
  }
);
```

## Performance

### Preview Generation Time

- **Small videos** (<100MB): ~10-20 seconds
- **Medium videos** (100-500MB): ~30-60 seconds
- **Large videos** (>500MB): ~60-120 seconds

### HLS Generation Time

- **Additional time**: ~20-40 seconds for multi-quality encoding
- **Parallel processing**: Qualities are generated in parallel

### Storage Requirements

- **Preview file**: ~10-20% of original video size
- **HLS segments**: ~30-40% of preview file size (all qualities combined)
- **Example**: 1GB video → 100MB preview → 30-40MB HLS files

## Security

### Watermark Protection

- Watermark is embedded in video frames (cannot be removed without re-encoding)
- User ID is visible to track unauthorized sharing
- Semi-transparent background ensures readability

### Access Control

- Preview URLs require authentication (optional)
- Rate limiting prevents abuse
- Analytics track suspicious viewing patterns

### DRM Integration

For enhanced protection, integrate with DRM systems:

```typescript
// Future enhancement
const result = await videoPreviewService.generatePreview(
  uploadId,
  videoPath,
  userId,
  {
    duration: 180,
    watermarkPosition: 'bottom-right',
    generateHLS: true,
    drm: {
      enabled: true,
      provider: 'widevine',
      licenseUrl: 'https://license.example.com',
    },
  }
);
```

## Troubleshooting

### FFmpeg Not Found

```bash
# Install FFmpeg
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Verify installation
ffmpeg -version
```

### Preview Generation Fails

1. Check FFmpeg installation
2. Verify video file is not corrupted
3. Check disk space
4. Review logs for specific errors

### HLS Playback Issues

1. Verify manifest file exists
2. Check CORS headers
3. Ensure segments are accessible
4. Test with different players

## Database Schema

### preview_views Table

```sql
CREATE TABLE preview_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  viewed_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
);

CREATE INDEX idx_preview_views_upload ON preview_views(upload_id);
CREATE INDEX idx_preview_views_user ON preview_views(user_id);
CREATE INDEX idx_preview_views_viewed_at ON preview_views(viewed_at);
```

## Testing

Run the test suite:

```bash
npm run test:video-preview
```

Or manually:

```bash
tsx src/scripts/test-video-preview.ts
```

## Requirements Met

✅ **REQ-1.1.4**: Content Preview & Trial
- Generate preview clips (first 3 minutes) ✓
- Add watermark overlay with user ID ✓
- Implement HLS streaming for previews ✓
- Track preview views in analytics ✓

## Future Enhancements

1. **Dynamic Watermarking**: Change watermark position during playback
2. **DRM Integration**: Add Widevine/FairPlay support
3. **AI Highlights**: Generate preview from most interesting parts
4. **Thumbnail Generation**: Multiple thumbnails at different timestamps
5. **Preview Customization**: Allow creators to choose preview segments
6. **Download Prevention**: Enhanced client-side protection
7. **Quality Auto-Selection**: Based on user's bandwidth
8. **Preview Expiration**: Time-limited preview access

## Support

For issues or questions:
- GitHub Issues: https://github.com/knowton/platform/issues
- Documentation: https://docs.knowton.io/video-preview
- Email: support@knowton.io
