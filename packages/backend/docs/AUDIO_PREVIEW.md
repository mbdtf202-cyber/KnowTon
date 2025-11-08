# Audio Preview System

## Overview

The Audio Preview System automatically generates preview clips for uploaded audio files with audio watermarks. This allows users to preview content before purchasing while protecting the creator's intellectual property through embedded audio watermarks.

## Features

### 1. Preview Clip Generation
- **Duration**: First 30 seconds of audio (configurable)
- **Watermark**: Audio watermark overlay at regular intervals
- **Quality**: Optimized MP3 format (128kbps)
- **Format**: MP3 with consistent bitrate

### 2. Audio Watermark Protection
- **Type**: Text-to-speech or beep tone watermark
- **Interval**: Configurable (default: every 10 seconds)
- **Volume**: Adjustable (default: 30% of main audio)
- **Content**: User ID or custom text
- **Method**: Mixed into audio stream (cannot be easily removed)

### 3. Streaming Support
- **HTTP Range Requests**: Supports seeking in audio player
- **Progressive Download**: Start playing before full download
- **Format**: MP3 for universal compatibility

### 4. Analytics Tracking
- **Play Count**: Total preview plays
- **Unique Listeners**: Distinct users who listened
- **Listen Duration**: Average time spent listening

## API Endpoints

### Generate Preview

```http
POST /api/v1/audio-preview/generate
Content-Type: application/json

{
  "uploadId": "upload-123",
  "duration": 30,
  "watermarkInterval": 10,
  "watermarkVolume": 0.3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadId": "upload-123",
    "previewUrl": "/api/v1/audio-preview/upload-123",
    "duration": 30,
    "fileSize": 480000,
    "bitrate": 128000,
    "sampleRate": 44100,
    "channels": 2
  }
}
```

### Stream Preview

```http
GET /api/v1/audio-preview/:uploadId
Range: bytes=0-1023
```

**Response:**
- Status: 206 Partial Content (for range requests)
- Status: 200 OK (for full file)
- Content-Type: audio/mpeg
- Supports HTTP range requests for seeking

### Get Preview Analytics

```http
GET /api/v1/audio-preview/analytics/:uploadId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPlays": 150,
    "uniqueListeners": 75,
    "avgListenDuration": 25.5
  }
}
```

### Delete Preview

```http
DELETE /api/v1/audio-preview/:uploadId
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

Preview generation is automatically triggered when audio is uploaded:

```typescript
// In upload.service.ts
if (upload.filetype.startsWith('audio/')) {
  await audioPreviewService.generatePreview(
    uploadId,
    filePath,
    userId,
    {
      duration: 30,
      watermarkInterval: 10,
      watermarkVolume: 0.3,
    }
  );
}
```

### Manual Generation

You can also manually generate previews:

```typescript
import { AudioPreviewService } from './services/audio-preview.service';

const audioPreviewService = new AudioPreviewService();

const result = await audioPreviewService.generatePreview(
  uploadId,
  audioPath,
  userId,
  {
    duration: 30,
    watermarkText: 'user@example.com',
    watermarkInterval: 10,
    watermarkVolume: 0.3,
  }
);
```

## Frontend Integration

### HTML5 Audio Player

```html
<audio controls>
  <source src="/api/v1/audio-preview/upload-123" type="audio/mpeg">
  Your browser does not support the audio tag.
</audio>
```

### React Component

```tsx
import React from 'react';
import { AudioPreview } from '../components/AudioPreview';

export const ContentPage: React.FC = () => {
  return (
    <div>
      <h1>Audio Content</h1>
      <AudioPreview 
        uploadId="upload-123"
        title="My Audio Track"
        onPlayStart={() => console.log('Started playing')}
        onPlayEnd={() => console.log('Finished playing')}
      />
    </div>
  );
};
```

### Using the Hook

```tsx
import React, { useEffect, useState } from 'react';
import { useAudioPreview } from '../hooks/useAudioPreview';
import { AudioPreview } from '../components/AudioPreview';

export const UploadPage: React.FC = () => {
  const { generatePreview, isGenerating, error } = useAudioPreview();
  const [previewReady, setPreviewReady] = useState(false);
  const [uploadId, setUploadId] = useState<string>('');

  const handleUploadComplete = async (id: string) => {
    setUploadId(id);
    const result = await generatePreview(id, {
      duration: 30,
      watermarkInterval: 10,
    });
    
    if (result) {
      setPreviewReady(true);
    }
  };

  return (
    <div>
      {isGenerating && <p>Generating preview...</p>}
      {error && <p>Error: {error}</p>}
      {previewReady && <AudioPreview uploadId={uploadId} />}
    </div>
  );
};
```

## Configuration

### Environment Variables

```bash
# Upload directory (where audio and previews are stored)
UPLOAD_DIR=/path/to/uploads

# Preview duration (seconds)
PREVIEW_DURATION=30

# Watermark interval (seconds)
WATERMARK_INTERVAL=10

# Watermark volume (0.0-1.0)
WATERMARK_VOLUME=0.3
```

### Service Configuration

```typescript
const audioPreviewService = new AudioPreviewService();

// Custom configuration
const result = await audioPreviewService.generatePreview(
  uploadId,
  audioPath,
  userId,
  {
    duration: 45, // 45 seconds
    watermarkText: 'PREVIEW - Not for distribution',
    watermarkInterval: 15, // Every 15 seconds
    watermarkVolume: 0.4, // 40% volume
  }
);
```

## Performance

### Preview Generation Time

- **Small audio** (<10MB): ~5-10 seconds
- **Medium audio** (10-50MB): ~10-20 seconds
- **Large audio** (>50MB): ~20-40 seconds

### Storage Requirements

- **Preview file**: ~10-15% of original audio size
- **Example**: 50MB audio → 5-7MB preview

## Security

### Audio Watermark Protection

- Watermark is mixed into audio stream (cannot be removed without degrading quality)
- User ID is spoken/embedded to track unauthorized sharing
- Multiple watermarks throughout preview make removal difficult

### Access Control

- Preview URLs can require authentication (optional)
- Rate limiting prevents abuse
- Analytics track suspicious listening patterns

### Watermark Types

1. **Text-to-Speech (TTS)**: Uses espeak to generate spoken watermark
   - More effective deterrent
   - Clearly audible
   - Requires espeak installation

2. **Beep Tone (Fallback)**: Simple sine wave tone
   - Always available
   - Less intrusive
   - Still provides protection

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

### Espeak Not Found (Optional)

```bash
# Install espeak for TTS watermarks
# Ubuntu/Debian
sudo apt-get install espeak

# macOS
brew install espeak

# Note: System will fallback to beep tone if espeak is not available
```

### Preview Generation Fails

1. Check FFmpeg installation
2. Verify audio file is not corrupted
3. Check disk space
4. Review logs for specific errors

### Audio Playback Issues

1. Verify preview file exists
2. Check CORS headers
3. Ensure file is accessible
4. Test with different browsers

## Database Schema

### preview_plays Table

```sql
CREATE TABLE preview_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  played_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
);

CREATE INDEX idx_preview_plays_upload ON preview_plays(upload_id);
CREATE INDEX idx_preview_plays_user ON preview_plays(user_id);
CREATE INDEX idx_preview_plays_played_at ON preview_plays(played_at);
```

## Testing

Run the test suite:

```bash
npm run test:audio-preview
```

Or manually:

```bash
tsx src/scripts/test-audio-preview.ts
```

## Requirements Met

✅ **REQ-1.1.4**: Content Preview & Trial
- Generate preview clips (first 30 seconds) ✓
- Add audio watermark ✓
- Implement audio player with controls ✓
- Track preview plays in analytics ✓

## Comparison with Video Preview

| Feature | Video Preview | Audio Preview |
|---------|--------------|---------------|
| Duration | 3 minutes | 30 seconds |
| Watermark Type | Visual overlay | Audio mixing |
| Streaming | HLS multi-quality | HTTP range requests |
| File Size | Larger | Smaller |
| Generation Time | Longer | Faster |
| Protection Level | High | Medium-High |

## Future Enhancements

1. **Advanced Watermarking**: Steganographic watermarks (inaudible)
2. **Dynamic Watermarking**: Change watermark frequency during playback
3. **DRM Integration**: Add encrypted audio streaming
4. **Waveform Visualization**: Display audio waveform in player
5. **Preview Customization**: Allow creators to choose preview segments
6. **Download Prevention**: Enhanced client-side protection
7. **Quality Selection**: Multiple bitrate options
8. **Playlist Support**: Preview multiple tracks in sequence

## Support

For issues or questions:
- GitHub Issues: https://github.com/knowton/platform/issues
- Documentation: https://docs.knowton.io/audio-preview
- Email: support@knowton.io
