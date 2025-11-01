# File Validation - Quick Start Guide

## Overview

This guide helps you quickly set up and use the file validation enhancement feature.

## Setup (5 minutes)

### 1. Install Dependencies

All required dependencies are already in `package.json`. Just ensure they're installed:

```bash
cd packages/backend
npm install
```

### 2. Update Database Schema

Add the Upload model to your database:

```bash
npx prisma migrate dev --name add-upload-model
npx prisma generate
```

### 3. (Optional) Install ClamAV

For malware scanning, install ClamAV:

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install clamav clamav-daemon
sudo freshclam
```

**macOS:**
```bash
brew install clamav
freshclam
```

**Skip if not needed**: The system works without ClamAV (malware scanning will be skipped).

## Usage

### Automatic Validation

File validation happens automatically when uploads complete. No code changes needed!

```typescript
// Upload service automatically validates files
// Status flow: uploading → validating → processing → completed
```

### Manual Validation

Validate a specific file:

```bash
curl -X POST http://localhost:3001/api/v1/upload/validate/:uploadId \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Verify Checksum

Check file integrity:

```bash
curl -X POST http://localhost:3001/api/v1/upload/verify-checksum/:uploadId \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"checksum": "abc123..."}'
```

## Testing

Run the test suite:

```bash
npm test -- file-validation.test.ts
```

## Configuration

### Environment Variables

Add to `.env`:

```env
# Upload directory
UPLOAD_DIR=./uploads

# Maximum file size (bytes)
MAX_UPLOAD_SIZE=2147483648  # 2GB
```

### Customize Allowed File Types

Edit `packages/backend/src/services/file-validation.service.ts`:

```typescript
private readonly ALLOWED_MIME_TYPES = [
  'application/pdf',
  'video/mp4',
  // Add more types here
];
```

## Validation Results

### Success Response

```json
{
  "isValid": true,
  "errors": [],
  "warnings": [],
  "fileType": "application/pdf",
  "fileSize": 1048576,
  "checksum": "a1b2c3d4e5f6...",
  "malwareScanResult": {
    "isClean": true
  }
}
```

### Failure Response

```json
{
  "isValid": false,
  "errors": [
    "File size (3.5 GB) exceeds maximum limit of 2 GB",
    "File type mismatch: declared as application/pdf, but detected as image/png"
  ],
  "warnings": []
}
```

## Common Issues

### Issue: "ClamAV not available"

**Solution**: Either install ClamAV or disable malware scanning:

```typescript
const result = await service.validateFile(filePath, mimeType, {
  scanMalware: false,
});
```

### Issue: "File type mismatch"

**Cause**: File extension doesn't match actual file content.

**Solution**: Ensure files have correct extensions and aren't renamed executables.

### Issue: "File size exceeds limit"

**Solution**: Increase `MAX_UPLOAD_SIZE` or compress the file.

## Next Steps

1. ✅ **Setup Complete**: File validation is now active
2. 📊 **Monitor**: Check logs for validation events
3. 🔒 **Security**: Review rejected files regularly
4. 📈 **Optimize**: Adjust settings based on usage patterns

## Quick Reference

| Feature | Endpoint | Method |
|---------|----------|--------|
| Auto validation | `/api/v1/upload/files` | POST |
| Manual validation | `/api/v1/upload/validate/:id` | POST |
| Verify checksum | `/api/v1/upload/verify-checksum/:id` | POST |
| Get upload status | `/api/v1/upload/status/:id` | GET |

## Support

- 📖 Full docs: `FILE_VALIDATION.md`
- 🧪 Tests: `src/__tests__/services/file-validation.test.ts`
- 📝 Logs: `error.log` and `combined.log`

## Success Metrics

After implementation, you should see:
- ✅ 100% of uploads validated
- ✅ File type spoofing prevented
- ✅ Malware detection active (if ClamAV installed)
- ✅ Content integrity verified with checksums
- ✅ 2GB size limit enforced

**Implementation Time**: ~5 minutes  
**Testing Time**: ~2 minutes  
**Total Time**: ~7 minutes

🎉 **You're all set!** File validation is now protecting your platform.
