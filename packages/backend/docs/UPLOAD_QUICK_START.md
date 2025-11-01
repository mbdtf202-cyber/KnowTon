# Resumable Upload - Quick Start Guide

## Setup

### 1. Install Dependencies

```bash
cd packages/backend
npm install

cd ../frontend
npm install
```

### 2. Run Database Migration

```bash
cd packages/backend
npx prisma migrate dev
```

### 3. Configure Environment

Create or update `.env` file:

```env
# Backend
DATABASE_URL=postgresql://user:password@localhost:5432/knowton
UPLOAD_DIR=./uploads
JWT_SECRET=your-secret-key

# Frontend
VITE_API_URL=http://localhost:3001
```

### 4. Start Services

```bash
# Terminal 1 - Backend
cd packages/backend
npm run dev

# Terminal 2 - Frontend
cd packages/frontend
npm run dev
```

## Usage

### Backend API

#### Start Upload
```bash
# Create upload with tus protocol
curl -X POST http://localhost:3001/api/v1/upload/files \
  -H "Upload-Length: 1048576" \
  -H "Upload-Metadata: filename dGVzdC5wZGY=,filetype YXBwbGljYXRpb24vcGRm,userId dXNlci0xMjM=" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Check Upload Status
```bash
curl http://localhost:3001/api/v1/upload/status/UPLOAD_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### List Uploads
```bash
curl http://localhost:3001/api/v1/upload/list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Frontend Component

```tsx
import { ResumableUpload } from './components/ResumableUpload';

function MyPage() {
  const handleComplete = (uploadId: string) => {
    console.log('Upload completed:', uploadId);
  };

  return (
    <ResumableUpload
      userId="user-123"
      onUploadComplete={handleComplete}
      onUploadError={(error) => console.error(error)}
    />
  );
}
```

### Custom Hook

```tsx
import { useResumableUpload } from './hooks/useResumableUpload';

function MyComponent() {
  const { upload, pause, resume, progress } = useResumableUpload();

  const handleUpload = (file: File) => {
    upload(file, {
      userId: 'user-123',
      title: 'My File',
      category: 'document',
    });
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
      <div>Progress: {progress.percentage}%</div>
      <button onClick={pause}>Pause</button>
      <button onClick={resume}>Resume</button>
    </div>
  );
}
```

## Testing

### Run Integration Tests

```bash
cd packages/backend
npx tsx src/scripts/test-upload-integration.ts
```

Expected output:
```
✅ All integration tests passed!
```

### Test with Large File

```bash
# Create 1GB test file
dd if=/dev/zero of=test-1gb.bin bs=1M count=1024

# Upload via frontend UI at http://localhost:5173/upload
```

## Troubleshooting

### Upload Fails Immediately
- Check file size (max 2GB)
- Verify file type is supported
- Ensure user is authenticated
- Check server disk space

### Cannot Resume Upload
- Verify upload ID is valid
- Check authentication token
- Ensure server has upload data
- Check upload hasn't expired

### Progress Not Updating
- Check network connectivity
- Verify WebSocket connection
- Check browser console for errors
- Ensure tus server is running

## Supported File Types

- Documents: PDF, DOCX, EPUB
- Videos: MP4, MOV, AVI
- Audio: MP3, WAV
- Images: JPG, PNG, GIF
- Archives: ZIP

## Limits

- Maximum file size: 2GB
- Chunk size: 5MB
- Retry attempts: 5 (with exponential backoff)

## Next Steps

1. Integrate with content processing pipeline
2. Add thumbnail generation
3. Implement metadata extraction
4. Configure cloud storage (S3/IPFS)

## Resources

- [Full Documentation](./RESUMABLE_UPLOAD.md)
- [Implementation Summary](./TASK_1.2.1_IMPLEMENTATION_SUMMARY.md)
- [Tus Protocol](https://tus.io/protocols/resumable-upload.html)
