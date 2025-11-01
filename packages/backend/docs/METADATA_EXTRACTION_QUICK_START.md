# Metadata Extraction - Quick Start Guide

## Installation

### 1. Install System Dependencies

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y poppler-utils ffmpeg
```

**macOS:**
```bash
brew install poppler ffmpeg
```

**Docker (add to Dockerfile):**
```dockerfile
RUN apt-get update && \
    apt-get install -y poppler-utils ffmpeg && \
    rm -rf /var/lib/apt/lists/*
```

### 2. Install Node.js Dependencies

```bash
cd packages/backend
npm install
```

The `sharp` library will be installed automatically.

## Usage

### Automatic Metadata Extraction

Metadata extraction happens automatically when a file upload completes. No additional action is required from the client.

### Get Extracted Metadata

```typescript
// Frontend example
const response = await fetch(`/api/v1/upload/metadata/${uploadId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { metadata } = await response.json();

console.log('Duration:', metadata.duration);
console.log('Resolution:', metadata.resolution);
console.log('Codec:', metadata.codec);
```

### Display Thumbnail

```html
<!-- HTML -->
<img src="/api/v1/upload/thumbnails/abc123" alt="Thumbnail" />
```

```typescript
// React
<img 
  src={`/api/v1/upload/thumbnails/${uploadId}`} 
  alt="Thumbnail"
  onError={(e) => {
    e.currentTarget.src = '/placeholder.jpg';
  }}
/>
```

## Supported File Types

| Type | Metadata Extracted | Thumbnail |
|------|-------------------|-----------|
| PDF | Title, Author, Pages | ❌ |
| Video (MP4, MOV, AVI) | Duration, Resolution, Codec, Bitrate, FPS | ✅ |
| Audio (MP3, WAV) | Duration, Bitrate, Artist, Album, Genre | ❌ |
| Image (JPG, PNG, GIF) | Resolution | ✅ |

## Example Responses

### Video Metadata
```json
{
  "metadata": {
    "filename": "tutorial.mp4",
    "filetype": "video/mp4",
    "filesize": 52428800,
    "duration": 300,
    "resolution": {
      "width": 1920,
      "height": 1080
    },
    "codec": "h264",
    "bitrate": 5000000,
    "fps": 30,
    "thumbnailPath": "/uploads/thumbnails/abc123-thumb.jpg"
  }
}
```

### Audio Metadata
```json
{
  "metadata": {
    "filename": "song.mp3",
    "filetype": "audio/mpeg",
    "filesize": 8388608,
    "duration": 240,
    "bitrate": 320000,
    "codec": "mp3",
    "artist": "Artist Name",
    "album": "Album Name",
    "genre": "Rock"
  }
}
```

### PDF Metadata
```json
{
  "metadata": {
    "filename": "document.pdf",
    "filetype": "application/pdf",
    "filesize": 2097152,
    "title": "Research Paper",
    "author": "John Doe",
    "pages": 25
  }
}
```

## Testing

### Manual Testing

1. **Upload a video file:**
```bash
curl -X POST http://localhost:3000/api/v1/upload/files \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Upload-Length: 1000000" \
  -H "Upload-Metadata: filename dGVzdC5tcDQ=,filetype dmlkZW8vbXA0,userId dXNlcjEyMw=="
```

2. **Check metadata:**
```bash
curl http://localhost:3000/api/v1/upload/metadata/UPLOAD_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. **View thumbnail:**
```bash
curl http://localhost:3000/api/v1/upload/thumbnails/UPLOAD_ID \
  --output thumbnail.jpg
```

### Automated Testing

```bash
cd packages/backend
npm test -- metadata-extraction.test.ts
```

## Troubleshooting

### Issue: "pdfinfo: command not found"

**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get install poppler-utils

# macOS
brew install poppler
```

### Issue: "ffprobe: command not found"

**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg
```

### Issue: Thumbnail not generated

**Check:**
1. Verify ffmpeg is installed: `ffmpeg -version`
2. Check upload logs for errors
3. Ensure thumbnail directory exists and is writable
4. Verify file is a valid video/image format

### Issue: Metadata extraction slow

**Optimization tips:**
1. Use smaller video files for testing
2. Consider async processing with job queues
3. Cache extracted metadata
4. Use CDN for thumbnail delivery

## Integration with Frontend

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

export function useUploadMetadata(uploadId: string) {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        const response = await fetch(
          `/api/v1/upload/metadata/${uploadId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch metadata');
        }
        
        const data = await response.json();
        setMetadata(data.metadata);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (uploadId) {
      fetchMetadata();
    }
  }, [uploadId]);

  return { metadata, loading, error };
}
```

### Usage in Component

```typescript
function VideoPreview({ uploadId }) {
  const { metadata, loading, error } = useUploadMetadata(uploadId);

  if (loading) return <div>Loading metadata...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <img 
        src={`/api/v1/upload/thumbnails/${uploadId}`} 
        alt="Video thumbnail" 
      />
      <div>
        <p>Duration: {metadata.duration}s</p>
        <p>Resolution: {metadata.resolution.width}x{metadata.resolution.height}</p>
        <p>Codec: {metadata.codec}</p>
      </div>
    </div>
  );
}
```

## Next Steps

1. ✅ Metadata extraction implemented
2. ⏳ Integrate with AI fingerprinting (TASK-1.3)
3. ⏳ Upload to IPFS/S3 (future task)
4. ⏳ Content preview generation (TASK-1.7)

## Support

For issues or questions:
- Check the [full documentation](./METADATA_EXTRACTION.md)
- Review the [upload service code](../src/services/upload.service.ts)
- Check the [test files](../src/__tests__/services/metadata-extraction.test.ts)
