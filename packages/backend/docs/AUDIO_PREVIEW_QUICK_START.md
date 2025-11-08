# Audio Preview - Quick Start Guide

## 🚀 Quick Start

Get audio preview working in 5 minutes!

## Prerequisites

```bash
# Install FFmpeg (required)
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Install espeak (optional, for TTS watermarks)
# Ubuntu/Debian
sudo apt-get install espeak

# macOS
brew install espeak
```

## 1. Backend Setup

### Register Routes

Add to `src/app.ts`:

```typescript
import audioPreviewRoutes from './routes/audio-preview.routes';

// Register routes
app.use('/api/v1/audio-preview', audioPreviewRoutes);
```

### Create Database Table

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
```

## 2. Generate Preview

### API Request

```bash
curl -X POST http://localhost:3001/api/v1/audio-preview/generate \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "your-upload-id",
    "duration": 30,
    "watermarkInterval": 10
  }'
```

### Response

```json
{
  "success": true,
  "data": {
    "uploadId": "your-upload-id",
    "previewUrl": "/api/v1/audio-preview/your-upload-id",
    "duration": 30,
    "fileSize": 480000,
    "bitrate": 128000
  }
}
```

## 3. Frontend Integration

### Basic Usage

```tsx
import { AudioPreview } from '../components/AudioPreview';

function MyPage() {
  return (
    <AudioPreview 
      uploadId="your-upload-id"
      title="My Audio Track"
    />
  );
}
```

### With Hook

```tsx
import { useAudioPreview } from '../hooks/useAudioPreview';
import { AudioPreview } from '../components/AudioPreview';

function UploadPage() {
  const { generatePreview, isGenerating } = useAudioPreview();
  const [uploadId, setUploadId] = useState('');

  const handleGenerate = async () => {
    const result = await generatePreview('your-upload-id');
    if (result) {
      setUploadId(result.uploadId);
    }
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={isGenerating}>
        Generate Preview
      </button>
      {uploadId && <AudioPreview uploadId={uploadId} />}
    </div>
  );
}
```

## 4. Test It

### Test Script

```bash
# Run test script
tsx src/scripts/test-audio-preview.ts
```

### Manual Test

1. Upload an audio file
2. Generate preview: `POST /api/v1/audio-preview/generate`
3. Play preview: `GET /api/v1/audio-preview/:uploadId`
4. Check analytics: `GET /api/v1/audio-preview/analytics/:uploadId`

## 5. Configuration

### Environment Variables

```bash
# .env
UPLOAD_DIR=./uploads
PREVIEW_DURATION=30
WATERMARK_INTERVAL=10
WATERMARK_VOLUME=0.3
```

## Common Issues

### FFmpeg Not Found
```bash
# Verify installation
ffmpeg -version

# If not found, install it
sudo apt-get install ffmpeg  # Ubuntu/Debian
brew install ffmpeg          # macOS
```

### Espeak Not Found (Optional)
```bash
# System will fallback to beep tone
# To enable TTS watermarks:
sudo apt-get install espeak  # Ubuntu/Debian
brew install espeak          # macOS
```

### Preview Not Playing
- Check file exists: `ls uploads/previews/`
- Verify CORS headers
- Check browser console for errors

## Features

✅ 30-second preview clips  
✅ Audio watermark protection  
✅ Custom audio player with controls  
✅ Analytics tracking  
✅ HTTP range request support  
✅ Responsive design  

## Next Steps

- Read full documentation: [AUDIO_PREVIEW.md](./AUDIO_PREVIEW.md)
- Customize watermark settings
- Integrate with upload flow
- Add analytics dashboard
- Implement DRM (optional)

## Support

Need help? Check:
- Full docs: `AUDIO_PREVIEW.md`
- Test script: `src/scripts/test-audio-preview.ts`
- GitHub Issues: https://github.com/knowton/platform/issues
