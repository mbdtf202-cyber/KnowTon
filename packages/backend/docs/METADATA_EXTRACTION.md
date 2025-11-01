# Metadata Extraction Implementation

## Overview

This document describes the automatic metadata extraction feature implemented for the KnowTon platform. The system automatically extracts metadata from uploaded files and generates thumbnails for visual content.

## Features

### 1. PDF Metadata Extraction
- **Title**: Extracted from PDF metadata
- **Author**: Extracted from PDF metadata
- **Pages**: Total number of pages in the document

**Implementation**: Uses `pdfinfo` command (from poppler-utils) with fallback to basic PDF structure parsing.

### 2. Video Metadata Extraction
- **Duration**: Video length in seconds
- **Resolution**: Width and height in pixels
- **Codec**: Video codec name (e.g., h264, vp9)
- **Bitrate**: Video bitrate in bits per second
- **FPS**: Frames per second
- **Thumbnail**: Automatically generated from frame at 1 second

**Implementation**: Uses `ffprobe` for metadata extraction and `ffmpeg` for thumbnail generation.

### 3. Audio Metadata Extraction
- **Duration**: Audio length in seconds
- **Bitrate**: Audio bitrate in bits per second
- **Artist**: Artist name from ID3 tags
- **Album**: Album name from ID3 tags
- **Genre**: Genre from ID3 tags
- **Title**: Track title from ID3 tags
- **Codec**: Audio codec name (e.g., mp3, aac)

**Implementation**: Uses `ffprobe` for metadata extraction.

### 4. Image Metadata Extraction
- **Resolution**: Width and height in pixels
- **Thumbnail**: Automatically generated (320px max dimension)

**Implementation**: Uses `sharp` library for metadata extraction and thumbnail generation.

## System Requirements

### Required System Tools

1. **poppler-utils** (for PDF processing)
   ```bash
   # Ubuntu/Debian
   sudo apt-get install poppler-utils
   
   # macOS
   brew install poppler
   ```

2. **ffmpeg** (for video/audio processing)
   ```bash
   # Ubuntu/Debian
   sudo apt-get install ffmpeg
   
   # macOS
   brew install ffmpeg
   ```

### Node.js Dependencies

- `sharp`: Image processing library (automatically installed)

## API Endpoints

### 1. Get Extracted Metadata

```http
GET /api/v1/upload/metadata/:uploadId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "metadata": {
    "filename": "example.mp4",
    "filetype": "video/mp4",
    "filesize": 10485760,
    "duration": 120,
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

### 2. Get Thumbnail

```http
GET /api/v1/upload/thumbnails/:uploadId
```

**Response:** JPEG image file

## Database Schema

The extracted metadata is stored in the `Upload` model's `metadata` field as JSON:

```typescript
{
  // Original upload metadata
  filename: string;
  filetype: string;
  userId: string;
  
  // Extracted metadata
  extracted: {
    filename: string;
    filetype: string;
    filesize: number;
    
    // PDF specific
    title?: string;
    author?: string;
    pages?: number;
    
    // Video specific
    duration?: number;
    resolution?: { width: number; height: number };
    codec?: string;
    bitrate?: number;
    fps?: number;
    
    // Audio specific
    artist?: string;
    album?: string;
    genre?: string;
    
    // Thumbnail
    thumbnailPath?: string;
  }
}
```

## Processing Flow

1. **Upload Completion**: When a file upload completes via tus.io
2. **Status Update**: Upload status changes to "processing"
3. **Metadata Extraction**: System extracts metadata based on file type
4. **Thumbnail Generation**: For video/image files, thumbnail is generated
5. **Database Update**: Extracted metadata is saved to database
6. **Status Update**: Upload status changes to "completed"

## Error Handling

- If system tools (pdfinfo, ffmpeg) are not available, the service logs a warning and continues without that specific metadata
- If thumbnail generation fails, the error is logged but doesn't fail the entire upload
- All errors are captured and stored in the upload record's `error` field

## Performance Considerations

### Thumbnail Generation
- Video thumbnails: 320px width, extracted from 1-second mark
- Image thumbnails: 320px max dimension, maintains aspect ratio
- JPEG quality: 80% for optimal size/quality balance

### Processing Time
- PDF metadata: < 1 second
- Video metadata: 1-3 seconds (depends on file size)
- Audio metadata: < 1 second
- Thumbnail generation: 1-2 seconds

## Testing

Run the test suite:

```bash
cd packages/backend
npm test -- metadata-extraction.test.ts
```

## Future Enhancements

1. **Content Analysis**: Integrate with AI services for content classification
2. **OCR**: Extract text from images and PDFs
3. **Scene Detection**: Identify key scenes in videos for better thumbnails
4. **Audio Fingerprinting**: Generate audio fingerprints for copyright detection
5. **Batch Processing**: Process multiple files in parallel
6. **Cloud Storage**: Upload thumbnails to S3/CDN automatically

## Troubleshooting

### pdfinfo not found
```bash
# Install poppler-utils
sudo apt-get install poppler-utils  # Ubuntu/Debian
brew install poppler                 # macOS
```

### ffmpeg/ffprobe not found
```bash
# Install ffmpeg
sudo apt-get install ffmpeg  # Ubuntu/Debian
brew install ffmpeg          # macOS
```

### Sharp installation issues
```bash
# Rebuild sharp
npm rebuild sharp
```

## Related Tasks

- **TASK-1.2.1**: Resumable upload implementation
- **TASK-1.2.2**: Batch upload system
- **TASK-1.3.1**: AI fingerprint generation (future integration)

## References

- [poppler-utils documentation](https://poppler.freedesktop.org/)
- [FFmpeg documentation](https://ffmpeg.org/documentation.html)
- [Sharp documentation](https://sharp.pixelplumbing.com/)
