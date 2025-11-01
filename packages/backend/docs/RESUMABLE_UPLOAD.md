# Resumable Upload Implementation

## Overview

This document describes the implementation of resumable file uploads using the tus.io protocol. The system supports large file uploads (up to 2GB) with pause/resume functionality and automatic retry on network errors.

## Architecture

### Backend Components

1. **UploadService** (`src/services/upload.service.ts`)
   - Manages tus server instance
   - Handles upload lifecycle events
   - Tracks upload progress in database
   - Validates file types and sizes
   - Generates file hashes for integrity verification

2. **Upload Routes** (`src/routes/upload.routes.ts`)
   - `GET /api/v1/upload/status/:uploadId` - Get upload status
   - `GET /api/v1/upload/list` - List user uploads
   - `DELETE /api/v1/upload/:uploadId` - Delete upload
   - `POST/PATCH/HEAD /api/v1/upload/files/*` - Tus protocol endpoints

3. **Database Model** (Prisma Schema)
   ```prisma
   model Upload {
     id           String    @id
     userId       String
     filename     String
     filetype     String
     filesize     BigInt
     uploadOffset BigInt    @default(0)
     status       String    @default("uploading")
     fileHash     String?
     metadata     Json?
     error        String?
     createdAt    DateTime  @default(now())
     updatedAt    DateTime  @updatedAt
     completedAt  DateTime?
   }
   ```

### Frontend Components

1. **useResumableUpload Hook** (`src/hooks/useResumableUpload.ts`)
   - Manages tus-js-client instance
   - Tracks upload progress
   - Provides pause/resume/cancel controls
   - Handles errors and retries

2. **ResumableUpload Component** (`src/components/ResumableUpload.tsx`)
   - File selection UI
   - Metadata input form
   - Progress bar with percentage
   - Pause/Resume/Cancel buttons
   - Error display

3. **UploadPage** (`src/pages/UploadPage.tsx`)
   - Full upload interface
   - Upload history
   - Feature highlights

## Features

### 1. Resumable Uploads
- Uploads can be paused and resumed at any time
- Progress is saved on the server
- Network interruptions are handled automatically

### 2. Large File Support
- Maximum file size: 2GB
- Chunked transfer (5MB chunks)
- Efficient memory usage

### 3. File Type Validation
Supported formats:
- Documents: PDF, DOCX, EPUB
- Videos: MP4, MOV, AVI
- Audio: MP3, WAV
- Images: JPG, PNG, GIF
- Archives: ZIP

### 4. Progress Tracking
- Real-time progress updates
- Bytes uploaded / total bytes
- Percentage completion
- Upload speed (future enhancement)

### 5. Error Handling
- Automatic retry with exponential backoff
- Retry delays: 0s, 3s, 5s, 10s, 20s
- User-friendly error messages
- Failed upload recovery

### 6. Security
- Authentication required for uploads
- User-specific upload access
- File type validation
- Size limit enforcement

## Usage

### Backend Setup

1. Install dependencies:
```bash
cd packages/backend
npm install
```

2. Run database migration:
```bash
npx prisma migrate dev
```

3. Set environment variables:
```env
UPLOAD_DIR=/path/to/uploads
DATABASE_URL=postgresql://...
```

4. Start server:
```bash
npm run dev
```

### Frontend Setup

1. Install dependencies:
```bash
cd packages/frontend
npm install
```

2. Set API URL:
```env
VITE_API_URL=http://localhost:3001
```

3. Import and use component:
```tsx
import { ResumableUpload } from './components/ResumableUpload';

function MyPage() {
  return (
    <ResumableUpload
      userId={currentUser.id}
      onUploadComplete={(uploadId) => {
        console.log('Upload completed:', uploadId);
      }}
      onUploadError={(error) => {
        console.error('Upload failed:', error);
      }}
    />
  );
}
```

## API Reference

### Get Upload Status

```http
GET /api/v1/upload/status/:uploadId
Authorization: Bearer <token>
```

Response:
```json
{
  "id": "1234567890-abcdef",
  "filename": "video.mp4",
  "filetype": "video/mp4",
  "filesize": 1073741824,
  "uploadOffset": 536870912,
  "status": "uploading",
  "progress": 50,
  "createdAt": "2024-01-01T00:00:00Z",
  "completedAt": null,
  "error": null
}
```

### List User Uploads

```http
GET /api/v1/upload/list?limit=50
Authorization: Bearer <token>
```

Response:
```json
{
  "uploads": [
    {
      "id": "1234567890-abcdef",
      "filename": "video.mp4",
      "filetype": "video/mp4",
      "filesize": 1073741824,
      "status": "completed",
      "progress": 100,
      "createdAt": "2024-01-01T00:00:00Z",
      "completedAt": "2024-01-01T00:10:00Z"
    }
  ]
}
```

### Delete Upload

```http
DELETE /api/v1/upload/:uploadId
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true
}
```

### Tus Protocol Endpoints

The tus protocol uses the following HTTP methods:

- `POST /api/v1/upload/files` - Create new upload
- `PATCH /api/v1/upload/files/:id` - Upload chunk
- `HEAD /api/v1/upload/files/:id` - Get upload offset
- `DELETE /api/v1/upload/files/:id` - Terminate upload

## Testing

### Run Backend Tests

```bash
cd packages/backend
npm test src/__tests__/services/upload.test.ts
```

### Manual Testing

1. Start backend server
2. Start frontend dev server
3. Navigate to `/upload` page
4. Select a large file (>100MB recommended)
5. Start upload
6. Test pause/resume functionality
7. Test network interruption recovery
8. Verify upload completion

### Test with Large Files

Create a test file:
```bash
# Create 1GB test file
dd if=/dev/zero of=test-1gb.bin bs=1M count=1024

# Create 2GB test file (maximum)
dd if=/dev/zero of=test-2gb.bin bs=1M count=2048
```

## Performance Considerations

### Chunk Size
- Default: 5MB chunks
- Larger chunks = fewer HTTP requests
- Smaller chunks = better progress granularity
- Adjust based on network conditions

### Storage
- Uploads stored in `UPLOAD_DIR` (default: `./uploads`)
- Ensure sufficient disk space
- Consider cleanup policy for abandoned uploads

### Database
- Upload records indexed by userId and status
- Consider archiving completed uploads after processing
- Monitor database size growth

### Scalability
- Tus server is stateless (uses file storage)
- Can scale horizontally with shared storage (NFS, S3)
- Consider using Redis for upload metadata in production

## Future Enhancements

1. **Batch Upload**
   - Upload multiple files simultaneously
   - Parallel upload processing
   - Batch progress tracking

2. **Metadata Extraction**
   - Automatic extraction of file metadata
   - Thumbnail generation for videos/images
   - Duration detection for audio/video

3. **Cloud Storage Integration**
   - Direct upload to S3/IPFS
   - Multipart upload for S3
   - CDN integration

4. **Advanced Features**
   - Upload speed calculation
   - Time remaining estimation
   - Bandwidth throttling
   - Upload scheduling

5. **Mobile Support**
   - React Native implementation
   - Background upload support
   - Cellular data warnings

## Troubleshooting

### Upload Fails Immediately

Check:
- File size within 2GB limit
- File type is supported
- User is authenticated
- Server has disk space

### Upload Stalls

Check:
- Network connectivity
- Server logs for errors
- Browser console for errors
- Firewall/proxy settings

### Cannot Resume Upload

Check:
- Upload ID is valid
- Upload not expired/deleted
- Server still has upload data
- Authentication token valid

### High Memory Usage

Check:
- Chunk size configuration
- Number of concurrent uploads
- Server resources
- Memory leak in event handlers

## References

- [tus.io Protocol](https://tus.io/protocols/resumable-upload.html)
- [tus-node-server](https://github.com/tus/tus-node-server)
- [tus-js-client](https://github.com/tus/tus-js-client)
- [REQ-1.1.2: Professional Content Upload System](../../.kiro/specs/knowton-v2-enhanced/requirements.md)
