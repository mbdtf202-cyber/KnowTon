# Video Preview - Quick Start Guide

## Prerequisites

1. **FFmpeg** must be installed:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install ffmpeg
   
   # macOS
   brew install ffmpeg
   
   # Verify
   ffmpeg -version
   ```

2. **Database migration** (add preview_views table):
   ```bash
   cd packages/backend
   npx prisma migrate dev --name add_preview_views
   ```

## Quick Setup

### 1. Upload a Video

```bash
curl -X POST http://localhost:3001/api/v1/upload/files \
  -H "Upload-Length: 10485760" \
  -H "Upload-Metadata: filename dGVzdC12aWRlby5tcDQ=,filetype dmlkZW8vbXA0,userId dXNlci0xMjM=" \
  -H "Tus-Resumable: 1.0.0"
```

### 2. Generate Preview (Automatic)

Preview is automatically generated when video upload completes. Check logs:

```bash
# Watch logs
tail -f logs/app.log | grep "preview"
```

### 3. Access Preview

```bash
# Stream preview
curl http://localhost:3001/api/v1/preview/video/UPLOAD_ID

# Get HLS manifest
curl http://localhost:3001/api/v1/preview/hls/UPLOAD_ID/playlist.m3u8
```

## Frontend Integration

### Simple HTML5 Player

```html
<!DOCTYPE html>
<html>
<head>
  <title>Video Preview</title>
</head>
<body>
  <h1>Video Preview</h1>
  <video id="video" controls width="800">
    <source src="http://localhost:3001/api/v1/preview/video/UPLOAD_ID" type="video/mp4">
  </video>
</body>
</html>
```

### HLS Player with hls.js

```html
<!DOCTYPE html>
<html>
<head>
  <title>HLS Video Preview</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
</head>
<body>
  <h1>HLS Video Preview</h1>
  <video id="video" controls width="800"></video>
  
  <script>
    const video = document.getElementById('video');
    const manifestUrl = 'http://localhost:3001/api/v1/preview/hls/UPLOAD_ID/playlist.m3u8';
    
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(manifestUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest loaded');
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = manifestUrl;
    }
  </script>
</body>
</html>
```

### React Component

```tsx
import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export const VideoPreview = ({ uploadId }: { uploadId: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const manifestUrl = `http://localhost:3001/api/v1/preview/hls/${uploadId}/playlist.m3u8`;
    
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(manifestUrl);
      hls.attachMedia(videoRef.current);
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = manifestUrl;
    }
  }, [uploadId]);

  return <video ref={videoRef} controls style={{ width: '100%', maxWidth: '800px' }} />;
};
```

## Manual Preview Generation

```typescript
import { VideoPreviewService } from './services/video-preview.service';

const videoPreviewService = new VideoPreviewService();

// Generate preview
const result = await videoPreviewService.generatePreview(
  'upload-123',
  '/path/to/video.mp4',
  'user-456',
  {
    duration: 180, // 3 minutes
    watermarkPosition: 'bottom-right',
    generateHLS: true,
  }
);

console.log('Preview URL:', videoPreviewService.getPreviewUrl('upload-123'));
console.log('HLS URL:', videoPreviewService.getHLSManifestUrl('upload-123'));
```

## Testing

```bash
# Run test script
cd packages/backend
tsx src/scripts/test-video-preview.ts
```

## Common Issues

### 1. FFmpeg Not Found

**Error**: `ffmpeg: command not found`

**Solution**:
```bash
# Install FFmpeg
sudo apt-get install ffmpeg  # Ubuntu/Debian
brew install ffmpeg          # macOS
```

### 2. Preview Not Generated

**Check**:
1. Video file exists in uploads directory
2. FFmpeg is installed and accessible
3. Sufficient disk space
4. Check logs for errors

### 3. HLS Playback Fails

**Check**:
1. Manifest file exists: `uploads/hls/UPLOAD_ID/playlist.m3u8`
2. Segment files exist: `uploads/hls/UPLOAD_ID/*.ts`
3. CORS headers are set correctly
4. Browser supports HLS or hls.js is loaded

## Directory Structure

```
uploads/
├── UPLOAD_ID                    # Original video file
├── previews/
│   └── UPLOAD_ID-preview.mp4   # Preview clip
├── hls/
│   └── UPLOAD_ID/
│       ├── playlist.m3u8       # Master playlist
│       ├── 360p.m3u8          # 360p playlist
│       ├── 360p_000.ts        # 360p segments
│       ├── 360p_001.ts
│       ├── 480p.m3u8          # 480p playlist
│       ├── 480p_000.ts        # 480p segments
│       ├── 480p_001.ts
│       ├── 720p.m3u8          # 720p playlist
│       ├── 720p_000.ts        # 720p segments
│       └── 720p_001.ts
└── thumbnails/
    └── UPLOAD_ID-thumb.jpg     # Thumbnail
```

## API Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/preview/generate` | POST | Generate preview |
| `/api/v1/preview/video/:id` | GET | Stream preview |
| `/api/v1/preview/hls/:id/playlist.m3u8` | GET | HLS manifest |
| `/api/v1/preview/hls/:id/:quality/:segment` | GET | HLS segment |
| `/api/v1/preview/analytics/:id` | GET | Preview analytics |
| `/api/v1/preview/:id` | DELETE | Delete preview |

## Next Steps

1. **Customize Watermark**: Modify watermark text and position
2. **Add Authentication**: Protect preview endpoints
3. **Track Analytics**: Monitor preview views
4. **Optimize Performance**: Adjust encoding settings
5. **Add DRM**: Integrate content protection

## Support

- Documentation: [VIDEO_PREVIEW.md](./VIDEO_PREVIEW.md)
- Issues: https://github.com/knowton/platform/issues
- Email: support@knowton.io
