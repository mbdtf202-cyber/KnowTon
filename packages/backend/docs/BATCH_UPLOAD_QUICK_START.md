# Batch Upload Quick Start Guide

## For Users

### How to Use Batch Upload

1. **Navigate to Upload Page**
   - Go to `/upload` in your browser
   - Click the "Batch Upload" tab

2. **Add Files**
   - **Option A**: Drag and drop files into the drop zone
   - **Option B**: Click the drop zone to open file browser
   - Select up to 50 files (max 2GB each)

3. **Edit Metadata**
   - Each file shows an editable title field (required)
   - Add optional description
   - Select category from dropdown

4. **Start Upload**
   - Click "Start Upload" button
   - Watch overall progress bar
   - Monitor individual file progress

5. **Manage Uploads**
   - **Pause**: Click pause button on individual file
   - **Resume**: Click resume on paused file
   - **Retry**: Click retry on failed file
   - **Cancel**: Click cancel to stop upload
   - **Remove**: Click remove to delete from list

6. **Complete**
   - Wait for all uploads to complete
   - Click "Clear Completed" to remove finished files
   - Upload more files or navigate away

## For Developers

### Basic Integration

```typescript
import { BatchUpload } from '@/components/BatchUpload';

function MyPage() {
  const handleComplete = (uploadIds: string[]) => {
    console.log('Completed uploads:', uploadIds);
    // Process completed uploads
  };

  const handleError = (errors) => {
    console.error('Failed uploads:', errors);
    // Handle errors
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

### Using the Hook Directly

```typescript
import { useBatchUpload } from '@/hooks/useBatchUpload';

function CustomUpload() {
  const {
    files,
    addFiles,
    startUpload,
    progress,
    isUploading,
  } = useBatchUpload();

  return (
    <div>
      <input
        type="file"
        multiple
        onChange={(e) => addFiles(Array.from(e.target.files || []))}
      />
      <button
        onClick={() => startUpload('user-123')}
        disabled={isUploading}
      >
        Upload {files.length} files
      </button>
      <div>
        Progress: {progress.completedFiles}/{progress.totalFiles}
        ({progress.overallProgress}%)
      </div>
    </div>
  );
}
```

### Backend API Usage

#### Get Batch Status

```bash
curl -X POST http://localhost:3001/api/v1/upload/batch/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "uploadIds": ["upload-1", "upload-2", "upload-3"]
  }'
```

#### Delete Batch

```bash
curl -X DELETE http://localhost:3001/api/v1/upload/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "uploadIds": ["upload-1", "upload-2"]
  }'
```

## Configuration

### Adjust Parallel Upload Limit

Edit `packages/frontend/src/hooks/useBatchUpload.ts`:

```typescript
const MAX_PARALLEL_UPLOADS = 5; // Change from 3 to 5
```

### Adjust Maximum Files

```typescript
const MAX_FILES = 100; // Change from 50 to 100
```

### Adjust Chunk Size

```typescript
const CHUNK_SIZE = 10 * 1024 * 1024; // Change from 5MB to 10MB
```

## Troubleshooting

### Uploads Not Starting

**Problem**: Click "Start Upload" but nothing happens

**Solutions**:
- Ensure all files have titles
- Check browser console for errors
- Verify authentication token is valid

### Slow Upload Speed

**Problem**: Uploads taking too long

**Solutions**:
- Reduce parallel upload count
- Check network connection speed
- Reduce chunk size for unstable connections

### Files Failing

**Problem**: Some files show error status

**Solutions**:
- Check file size (must be < 2GB)
- Verify file type is supported
- Click "Retry" button
- Check server logs for errors

### Memory Issues

**Problem**: Browser becomes slow with many files

**Solutions**:
- Upload in smaller batches
- Clear completed files regularly
- Close other browser tabs

## Best Practices

### For Users

1. **Prepare Files**: Organize files before uploading
2. **Check Sizes**: Ensure files are under 2GB
3. **Stable Connection**: Use reliable network
4. **Monitor Progress**: Watch for failed uploads
5. **Clear Completed**: Remove finished uploads

### For Developers

1. **Error Handling**: Always implement error callbacks
2. **Progress Updates**: Show clear progress indicators
3. **User Feedback**: Provide status messages
4. **Validation**: Validate files before upload
5. **Cleanup**: Clear completed uploads

## Performance Tips

### Optimize Upload Speed

1. **Parallel Uploads**: Use 3-5 concurrent uploads
2. **Chunk Size**: 5-10MB works best
3. **Network**: Use wired connection when possible
4. **File Preparation**: Compress large files

### Reduce Memory Usage

1. **Batch Size**: Upload 10-20 files at a time
2. **Clear Completed**: Remove finished uploads
3. **File Size**: Keep files under 500MB when possible
4. **Browser**: Use modern browser with good memory management

## Common Use Cases

### Upload Photo Album

```typescript
// Select all photos from folder
const photos = await selectFiles({ accept: 'image/*', multiple: true });
addFiles(photos);

// Set category for all
photos.forEach(photo => {
  updateFileMetadata(photo.id, { category: 'art' });
});

startUpload(userId);
```

### Upload Course Materials

```typescript
// Upload PDFs and videos
const materials = await selectFiles({
  accept: '.pdf,.mp4',
  multiple: true
});

addFiles(materials);

// Set category
materials.forEach(file => {
  updateFileMetadata(file.id, {
    category: 'education',
    description: 'Course material'
  });
});

startUpload(userId);
```

### Upload Music Collection

```typescript
// Upload audio files
const tracks = await selectFiles({
  accept: 'audio/*',
  multiple: true
});

addFiles(tracks);

// Set metadata from file names
tracks.forEach(track => {
  const title = track.name.replace(/\.[^/.]+$/, '');
  updateFileMetadata(track.id, {
    title,
    category: 'music'
  });
});

startUpload(userId);
```

## Testing

### Manual Testing Checklist

- [ ] Select multiple files via browser
- [ ] Drag and drop multiple files
- [ ] Edit metadata for each file
- [ ] Start batch upload
- [ ] Pause individual upload
- [ ] Resume paused upload
- [ ] Retry failed upload
- [ ] Cancel active upload
- [ ] Remove file from list
- [ ] Clear completed files
- [ ] Clear all files

### Automated Testing

```bash
# Run unit tests
cd packages/backend
npm test -- batch-upload.test.ts

# Run integration tests
npm run test:batch-upload
```

## Support

### Documentation
- [Full Documentation](./BATCH_UPLOAD.md)
- [API Reference](./API_REFERENCE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

### Getting Help
- Check browser console for errors
- Review server logs
- Check network tab in DevTools
- Contact support with error details

## Next Steps

After mastering batch upload:
1. Explore resumable upload features
2. Learn about upload progress tracking
3. Understand content processing pipeline
4. Integrate with IPFS storage
