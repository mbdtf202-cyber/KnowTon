# File Validation Enhancement

## Overview

The File Validation Enhancement implements comprehensive file validation for uploaded content, including:

1. **Enhanced file type validation** beyond MIME types using magic number detection
2. **File size limit checks** (2GB maximum)
3. **Malware scanning integration** using ClamAV
4. **Content integrity verification** with SHA-256 checksums

This feature addresses **REQ-1.1.2** from the requirements specification.

## Features

### 1. File Size Validation

- Maximum file size: **2GB** (configurable)
- Rejects empty files
- Provides human-readable error messages

```typescript
const result = await fileValidationService.validateFile(filePath, mimeType, {
  maxSize: 2 * 1024 * 1024 * 1024, // 2GB
});
```

### 2. MIME Type Validation

Allowed file types:
- **Documents**: PDF, DOCX
- **Videos**: MP4, MOV, AVI
- **Audio**: MP3, WAV
- **Images**: JPEG, PNG, GIF
- **Archives**: EPUB, ZIP

### 3. Magic Number Detection

The service validates files using magic numbers (file signatures) to detect:
- File type spoofing (e.g., executable disguised as PDF)
- Corrupted files
- Mismatched file extensions

#### Supported Magic Numbers

| File Type | Magic Number (Hex) | Offset |
|-----------|-------------------|--------|
| PDF | `25 50 44 46` (%PDF) | 0 |
| PNG | `89 50 4E 47 0D 0A 1A 0A` | 0 |
| JPEG | `FF D8 FF E0/E1/E2` | 0 |
| MP4 | `00 00 00 18/1C/20 66 74 79 70` | 0 |
| MP3 | `49 44 33` (ID3) or `FF FB/F3/F2` | 0 |
| ZIP/DOCX/EPUB | `50 4B 03 04` (PK) | 0 |

### 4. Checksum Generation

- Algorithm: **SHA-256**
- Used for content integrity verification
- Stored in database for future verification

```typescript
// Generate checksum
const checksum = await fileValidationService.generateChecksum(filePath);

// Verify checksum
const isValid = await fileValidationService.verifyChecksum(filePath, expectedChecksum);
```

### 5. Malware Scanning

- Integration with **ClamAV** antivirus
- Gracefully handles ClamAV unavailability
- Detects and reports threats
- Automatically deletes infected files

#### ClamAV Installation

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install clamav clamav-daemon
sudo freshclam  # Update virus definitions
```

**macOS:**
```bash
brew install clamav
freshclam  # Update virus definitions
```

**Docker:**
```dockerfile
RUN apt-get update && \
    apt-get install -y clamav clamav-daemon && \
    freshclam
```

## API Endpoints

### 1. Automatic Validation on Upload

File validation is automatically triggered when an upload completes:

```
POST /api/v1/upload/files
```

The upload goes through these stages:
1. `uploading` - File is being uploaded
2. `validating` - File validation in progress
3. `processing` - Metadata extraction
4. `completed` - Upload successful
5. `failed` - Validation or processing failed

### 2. Manual Validation

Manually trigger validation for an existing upload:

```
POST /api/v1/upload/validate/:uploadId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "uploadId": "abc123",
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": [],
    "fileType": "application/pdf",
    "fileSize": 1048576,
    "checksum": "a1b2c3d4...",
    "malwareScanResult": {
      "isClean": true
    }
  }
}
```

### 3. Verify Checksum

Verify file integrity using checksum:

```
POST /api/v1/upload/verify-checksum/:uploadId
Authorization: Bearer <token>
Content-Type: application/json

{
  "checksum": "a1b2c3d4..."
}
```

**Response:**
```json
{
  "uploadId": "abc123",
  "isValid": true,
  "providedChecksum": "a1b2c3d4...",
  "storedChecksum": "a1b2c3d4..."
}
```

## Database Schema

The `Upload` model includes validation metadata:

```prisma
model Upload {
  id            String    @id
  userId        String
  filename      String
  filetype      String
  filesize      BigInt
  fileHash      String?   // SHA-256 checksum
  uploadOffset  BigInt    @default(0)
  status        String    @default("uploading")
  error         String?
  metadata      Json?     // Includes validation results
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  completedAt   DateTime?
}
```

### Validation Metadata Structure

```json
{
  "validation": {
    "fileType": "application/pdf",
    "checksum": "a1b2c3d4...",
    "malwareScan": {
      "isClean": true,
      "threats": []
    },
    "warnings": [],
    "validatedAt": "2024-01-15T10:30:00Z"
  }
}
```

## Usage Examples

### Basic Validation

```typescript
import { FileValidationService } from './services/file-validation.service';

const service = new FileValidationService();

const result = await service.validateFile(
  '/path/to/file.pdf',
  'application/pdf',
  {
    maxSize: 2 * 1024 * 1024 * 1024,
    checkMagicNumbers: true,
    scanMalware: true,
    generateChecksum: true,
  }
);

if (!result.isValid) {
  console.error('Validation failed:', result.errors);
} else {
  console.log('File is valid:', result.checksum);
}
```

### Batch Validation

```typescript
const files = [
  { path: '/path/to/file1.pdf', mimeType: 'application/pdf' },
  { path: '/path/to/file2.mp4', mimeType: 'video/mp4' },
];

const results = await service.validateFiles(files, {
  scanMalware: true,
});

results.forEach(({ path, result }) => {
  console.log(`${path}: ${result.isValid ? 'Valid' : 'Invalid'}`);
});
```

### Checksum Verification

```typescript
// Generate checksum during upload
const checksum = await service.generateChecksum(filePath);

// Later, verify file integrity
const isValid = await service.verifyChecksum(filePath, checksum);

if (!isValid) {
  console.error('File has been modified or corrupted');
}
```

## Error Handling

### Validation Errors

The service returns detailed error information:

```typescript
{
  isValid: false,
  errors: [
    "File size (3.5 GB) exceeds maximum limit of 2 GB",
    "File type mismatch: declared as application/pdf, but detected as image/png",
    "File failed malware scan"
  ],
  warnings: [
    "Could not detect file type from magic numbers"
  ]
}
```

### Common Error Scenarios

1. **File Too Large**
   - Error: "File size exceeds maximum limit"
   - Action: File is rejected, user notified

2. **Type Mismatch**
   - Error: "File type mismatch: declared as X, but detected as Y"
   - Action: File is rejected to prevent spoofing

3. **Malware Detected**
   - Error: "File failed malware scan"
   - Action: File is deleted, user notified

4. **Empty File**
   - Error: "File is empty"
   - Action: File is rejected

5. **Disallowed Type**
   - Error: "File type X is not allowed"
   - Action: File is rejected

## Security Considerations

### 1. File Type Spoofing Prevention

Magic number validation prevents attackers from:
- Renaming executables as PDFs
- Uploading malicious files with fake extensions
- Bypassing MIME type checks

### 2. Malware Protection

ClamAV integration provides:
- Real-time virus scanning
- Regular signature updates
- Protection against known threats

### 3. Content Integrity

SHA-256 checksums ensure:
- Files are not corrupted during upload
- Files are not modified after upload
- Tamper detection

### 4. Size Limits

2GB limit prevents:
- Denial of service attacks
- Storage exhaustion
- Resource abuse

## Performance Considerations

### Validation Performance

| Operation | Time (avg) | Notes |
|-----------|-----------|-------|
| Size check | <1ms | Instant |
| MIME validation | <1ms | Instant |
| Magic number check | <10ms | Reads first 32 bytes |
| Checksum generation | ~100ms/GB | Depends on file size |
| Malware scan | ~500ms/GB | Depends on ClamAV config |

### Optimization Tips

1. **Parallel Processing**: Validate multiple files concurrently
2. **Skip Malware Scan**: For trusted sources, disable malware scanning
3. **Checksum Caching**: Cache checksums to avoid regeneration
4. **Async Validation**: Perform validation asynchronously after upload

## Testing

Run the test suite:

```bash
cd packages/backend
npm test -- file-validation.test.ts
```

### Test Coverage

- ✅ File size validation
- ✅ MIME type validation
- ✅ Magic number detection
- ✅ Checksum generation and verification
- ✅ Batch validation
- ✅ Error handling
- ✅ Malware scanning (when ClamAV available)

## Migration Guide

### Database Migration

Run Prisma migration to add the Upload model:

```bash
cd packages/backend
npx prisma migrate dev --name add-upload-model
npx prisma generate
```

### Existing Uploads

For existing uploads without validation:

```typescript
// Re-validate existing uploads
const uploads = await prisma.upload.findMany({
  where: { status: 'completed', fileHash: null }
});

for (const upload of uploads) {
  const filePath = path.join(uploadDir, upload.id);
  const result = await fileValidationService.validateFile(
    filePath,
    upload.filetype
  );
  
  if (result.isValid) {
    await prisma.upload.update({
      where: { id: upload.id },
      data: { fileHash: result.checksum }
    });
  }
}
```

## Monitoring

### Metrics to Track

1. **Validation Success Rate**: % of files passing validation
2. **Rejection Reasons**: Distribution of validation errors
3. **Malware Detection Rate**: # of infected files detected
4. **Validation Time**: Average time per file
5. **File Size Distribution**: Track upload sizes

### Logging

All validation events are logged:

```typescript
logger.info('File validation completed', {
  filePath,
  isValid: result.isValid,
  fileSize: result.fileSize,
  checksum: result.checksum,
  errors: result.errors,
  warnings: result.warnings,
});
```

## Future Enhancements

1. **Advanced Malware Detection**: Integrate with cloud-based scanners (VirusTotal)
2. **Content Analysis**: Deep content inspection for policy violations
3. **Format Validation**: Validate file structure (e.g., valid PDF structure)
4. **Quarantine System**: Isolate suspicious files for manual review
5. **Machine Learning**: Detect anomalous files using ML models

## Support

For issues or questions:
- Check logs: `packages/backend/error.log`
- Review test cases: `packages/backend/src/__tests__/services/file-validation.test.ts`
- Contact: dev@knowton.io

## References

- [File Signatures (Magic Numbers)](https://en.wikipedia.org/wiki/List_of_file_signatures)
- [ClamAV Documentation](https://docs.clamav.net/)
- [SHA-256 Specification](https://en.wikipedia.org/wiki/SHA-2)
- [MIME Types](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types)
