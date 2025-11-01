# Batch Upload System

## Overview

The batch upload system allows users to upload multiple files simultaneously with parallel processing, individual file status tracking, and comprehensive error handling.

## Features

### 1. Multiple File Selection
- Support for up to 50 files per batch
- Drag-and-drop interface
- File browser selection
- Individual file size limit: 2GB
- Supported formats: PDF, DOCX, MP4, MP3, WAV, EPUB, ZIP, JPG, PNG, GIF

### 2. Parallel Upload Processing
- Configurable parallel upload limit (default: 3 concurrent uploads)
- Automatic queue management
- Efficient resource utilization
- Progress tracking for each file

### 3. Per-File Status Tracking
- Individual file progress (0-100%)
- Status indicators:
  - `pending`: Waiting to start
  - `uploading`: Currently uploading
  - `paused`: Upload paused by user
  - `completed`: Upload successful
  - `error`: Upload failed
  - `cancelled`: Upload cancelled by user

### 4. Error Handling and Retry
- Automatic retry on network errors (configurable delays)
- Manual retry for failed uploads
- Detailed error messages per file
- Partial batch success handling

## Architecture

### Frontend Components

#### `useBatchUpload` Hook
Custom React hook that manages batch upload state and operations.

**Key Features:**
- File queue management
- Parallel upload control
- Progress tracking
- Error handling

**API:**
```typescript
interface UseBatchUploadReturn {
  files: BatchFileItem[];
  addFiles: (files: File[]) => void;
  removeFile: (fileId: string) => void;
  updateFileMetadata: (fileId: string, metadata: Partial<Metadata>) => void;
  startUpload: (userId: string) => void;
  pauseFile: (fileId: string) => void;
  resumeFile: (fileId: string) => void;
  retryFile: (fileId: string, userId: string) => void;
  cancelFile: (fileId: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  progress: BatchUploadProgress;
  isUploading: boolean;
}
```

#### `BatchUpload` Component
React component providing the batch upload UI.

**Features:**
- Drag-and-drop zone
- File list with individual controls
- Overall progress indicator
- Metadata editing per file
- Batch actions (start, clear, etc.)

### Backend Endpoints

#### POST `/api/v1/upload/batch/status`
Get status for multiple uploads.

**Request:**
```json
{
  "uploadIds": ["upload-1", "upload-2", "upload-3"]
}
```

**Response:**
```json
{
  "statuses": [
    {
      "id": "upload-1",
      "filename": "file1.pdf",
      "status": "completed",
      "progress": 100,
      "filesize": 1048576,
      "uploadOffset": 1048576
    }
  ]
}
```

#### DELETE `/api/v1/upload/batch`
Delete multiple uploads.

**Request:**
```json
{
  "uploadIds": ["upload-1", "upload-2"]
}
```

**Response:**
```json
{
  "results": [
    { "uploadId": "upload-1", "success": true },
    { "uploadId": "upload-2", "success": false, "error": "Upload not found" }
  ]
}
```

## Usage

### Basic Usage

```typescript
import { BatchUpload } from '../components/BatchUpload';

function MyComponent() {
  const handleComplete = (uploadIds: string[]) => {
    console.log('Uploads completed:', uploadIds);
  };

  const handleError = (errors: Array<{ filename: string; error: string }>) => {
    console.error('Upload errors:', errors);
  };

  return (
    <BatchUpload
      userId="user-123"
      onUploadComplete={handleComplete}
      onUploadError={handleError}
    />
  );
}
```

### Advanced Usage with Custom Hook

```typescript
import { useBatchUpload } from '../hooks/useBatchUpload';

function CustomUploadComponent() {
  const {
    files,
    addFiles,
    startUpload,
    progress,
    isUploading,
  } = useBatchUpload();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    addFiles(selectedFiles);
  };

  return (
    <div>
      <input type="file" multiple onChange={handleFileSelect} />
      <button onClick={() => startUpload('user-123')} disabled={isUploading}>
        Upload {files.length} files
      </button>
      <div>Progress: {progress.overallProgress}%</div>
    </div>
  );
}
```

## Configuration

### Frontend Configuration

```typescript
// Maximum files per batch
const MAX_FILES = 50;

// Maximum file size (2GB)
const MAX_SIZE = 2 * 1024 * 1024 * 1024;

// Maximum parallel uploads
const MAX_PARALLEL_UPLOADS = 3;

// Retry delays (milliseconds)
const RETRY_DELAYS = [0, 3000, 5000, 10000];

// Chunk size for uploads (5MB)
const CHUNK_SIZE = 5 * 1024 * 1024;
```

### Backend Configuration

```typescript
// Upload directory
process.env.UPLOAD_DIR = './uploads';

// Maximum batch size for status/delete operations
const MAX_BATCH_SIZE = 50;
```

## Performance Considerations

### Parallel Upload Optimization

The system uses a queue-based approach to manage parallel uploads:

1. **Queue Management**: Files are added to a queue when upload starts
2. **Concurrency Control**: Maximum 3 uploads run simultaneously
3. **Automatic Processing**: When an upload completes, the next file in queue starts automatically
4. **Resource Efficiency**: Prevents overwhelming the network or server

### Memory Management

- Files are processed in chunks (5MB default)
- Completed uploads are removed from memory
- Failed uploads can be retried without re-reading the file

### Network Optimization

- Automatic retry with exponential backoff
- Resumable uploads using tus protocol
- Chunk-based transfer for reliability

## Error Handling

### Client-Side Errors

1. **File Size Validation**: Files exceeding 2GB are rejected
2. **File Count Validation**: Maximum 50 files per batch
3. **File Type Validation**: Only allowed file types accepted
4. **Network Errors**: Automatic retry with configurable delays

### Server-Side Errors

1. **Upload Creation Errors**: Logged and returned to client
2. **File System Errors**: Handled gracefully with error messages
3. **Database Errors**: Transaction rollback and error reporting

### Error Recovery

- **Manual Retry**: Users can retry failed uploads
- **Partial Success**: Batch can complete with some failures
- **Error Details**: Specific error messages for each file

## Testing

### Unit Tests

Run unit tests for batch upload functionality:

```bash
cd packages/backend
npm test -- batch-upload.test.ts
```

### Integration Tests

Run integration tests:

```bash
cd packages/backend
npm run test:batch-upload
```

This will:
1. Create test files of various sizes
2. Upload them in batches with different parallelism
3. Verify status tracking
4. Test batch operations
5. Clean up test files

### Manual Testing

1. Navigate to `/upload` page
2. Click "Batch Upload" tab
3. Select or drag multiple files
4. Fill in metadata for each file
5. Click "Start Upload"
6. Monitor individual file progress
7. Test pause/resume/retry/cancel operations

## Best Practices

### For Users

1. **Prepare Metadata**: Fill in titles before starting upload
2. **Monitor Progress**: Watch for failed uploads and retry
3. **Network Stability**: Use stable connection for large batches
4. **File Organization**: Group related files in batches

### For Developers

1. **Chunk Size**: Adjust based on network conditions
2. **Parallel Limit**: Balance between speed and resource usage
3. **Error Handling**: Provide clear error messages
4. **Progress Updates**: Update UI frequently for better UX
5. **Memory Management**: Clean up completed uploads

## Troubleshooting

### Common Issues

#### Upload Stuck at 0%
- **Cause**: Network connectivity issue
- **Solution**: Check network connection, retry upload

#### Upload Fails Immediately
- **Cause**: File size or type validation failure
- **Solution**: Check file meets requirements (< 2GB, allowed type)

#### Some Files Upload, Others Fail
- **Cause**: Individual file issues or network interruption
- **Solution**: Use retry button for failed files

#### Slow Upload Speed
- **Cause**: Network bandwidth or server load
- **Solution**: Reduce parallel upload count, check network speed

### Debug Mode

Enable debug logging:

```typescript
// In browser console
localStorage.setItem('debug', 'batch-upload:*');
```

## Future Enhancements

1. **Resume Across Sessions**: Save upload state to localStorage
2. **Bandwidth Throttling**: Limit upload speed to prevent network saturation
3. **Priority Queue**: Allow users to prioritize certain files
4. **Folder Upload**: Support uploading entire folder structures
5. **Cloud Storage Integration**: Direct upload to S3/IPFS
6. **Progress Notifications**: Desktop notifications for completion
7. **Upload Scheduling**: Schedule uploads for specific times
8. **Compression**: Automatic compression before upload

## API Reference

See [API Documentation](./API_REFERENCE.md) for complete endpoint details.

## Related Documentation

- [Resumable Upload](./RESUMABLE_UPLOAD.md)
- [Upload Service](./UPLOAD_QUICK_START.md)
- [File Validation](./FILE_VALIDATION.md)
