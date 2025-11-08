# Content Encryption - Quick Start Guide

## Overview

This guide will help you quickly set up and use the Content Encryption system for the KnowTon platform.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- AWS account (optional, for production KMS)

## Setup

### 1. Install Dependencies

```bash
cd packages/backend
npm install
```

### 2. Configure Environment

Create or update `.env` file:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/knowton"

# For Production (AWS KMS)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_KMS_KEY_ID=arn:aws:kms:us-east-1:123456789:key/xxx

# For Development (Local Keys)
LOCAL_MASTER_KEY=your_64_char_hex_key_here

# Upload Directory
UPLOAD_DIR=./uploads
```

### 3. Generate Local Master Key (Development Only)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output to `LOCAL_MASTER_KEY` in `.env`.

### 4. Run Database Migration

```bash
npx prisma migrate dev --name add_encryption_tables
npx prisma generate
```

### 5. Register Routes

Add to `packages/backend/src/app.ts`:

```typescript
import contentEncryptionRoutes from './routes/content-encryption.routes';

// ... other imports

app.use('/api/v1/content-encryption', contentEncryptionRoutes);
```

## Usage Examples

### Example 1: Encrypt a Content File

```typescript
import { EncryptionService } from './services/encryption.service';

const encryptionService = new EncryptionService();

// Encrypt a file
const result = await encryptionService.encryptFile(
  '/uploads/original-video.mp4',
  '/uploads/encrypted/video.enc'
);

console.log('Encrypted:', result);
// {
//   encryptedPath: '/uploads/encrypted/video.enc',
//   keyId: 'abc123...',
//   iv: 'def456...',
//   algorithm: 'aes-256-cbc',
//   originalSize: 104857600,
//   encryptedSize: 104857616,
//   encryptionTime: 1234
// }
```

### Example 2: Decrypt a Content File

```typescript
import { EncryptionService } from './services/encryption.service';

const encryptionService = new EncryptionService();

// Decrypt a file
const result = await encryptionService.decryptFile(
  '/uploads/encrypted/video.enc',
  '/uploads/temp/video.mp4',
  {
    keyId: 'abc123...',
    iv: 'def456...',
    algorithm: 'aes-256-cbc'
  }
);

console.log('Decrypted:', result);
// {
//   decryptedPath: '/uploads/temp/video.mp4',
//   originalSize: 104857600,
//   decryptionTime: 1200
// }
```

### Example 3: Generate Access Token

```typescript
import { ContentAccessControlService } from './services/content-access-control.service';

const accessControl = new ContentAccessControlService();

// Generate access token for a user
const token = await accessControl.generateAccessToken(
  'user-uuid',
  'content-uuid',
  'device-fingerprint'
);

console.log('Access Token:', token);
// '32-byte-hex-token...'
```

### Example 4: Verify Access

```typescript
import { ContentAccessControlService } from './services/content-access-control.service';

const accessControl = new ContentAccessControlService();

// Verify user has access
const result = await accessControl.verifyContentAccess(
  'user-uuid',
  'content-uuid',
  'access-token'
);

console.log('Access Result:', result);
// {
//   granted: true
// }
```

## API Examples

### Encrypt Content via API

```bash
curl -X POST http://localhost:3000/api/v1/content-encryption/encrypt \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "content-uuid",
    "inputPath": "/uploads/video.mp4",
    "deleteOriginal": false
  }'
```

### Decrypt Content via API

```bash
curl -X POST http://localhost:3000/api/v1/content-encryption/decrypt \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "content-uuid",
    "accessToken": "access-token"
  }' \
  --output decrypted-video.mp4
```

### Stream Encrypted Content

```bash
curl -X GET "http://localhost:3000/api/v1/content-encryption/stream/content-uuid?accessToken=xxx" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Range: bytes=0-1048575" \
  --output video-chunk.mp4
```

### Check Encryption Status

```bash
curl -X GET http://localhost:3000/api/v1/content-encryption/status/content-uuid \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Testing

### Run Performance Tests

```bash
cd packages/backend
npm run test:encryption-performance
```

Expected output:
```
================================================================================
Content Encryption Performance Test
================================================================================

Test directory: /path/to/test-encryption
Using KMS: Local Keys

Testing with 1.00 MB file...
  Generating test file...
  Encrypting...
  Decrypting...
  Verifying...
  ✓ Encryption time: 52ms
  ✓ Decryption time: 48ms
  ✓ Encryption throughput: 19.23 MB/s
  ✓ Decryption throughput: 20.83 MB/s
  ✓ Overhead: 0.0015%
  ✓ Verification: PASSED

...

================================================================================
Performance Summary
================================================================================

File Size | Encrypt Time | Decrypt Time | Encrypt MB/s | Decrypt MB/s | Overhead %
------------------------------------------------------------------------------------------
     1 MB |         52ms |         48ms |        19.23 |        20.83 |     0.0015
    10 MB |        450ms |        420ms |        22.22 |        23.81 |     0.0015
    50 MB |       2100ms |       2000ms |        23.81 |        25.00 |     0.0015
   100 MB |       4200ms |       4000ms |        23.81 |        25.00 |     0.0015
   500 MB |      21000ms |      20000ms |        23.81 |        25.00 |     0.0015

Maximum overhead: 0.0015%
Average overhead: 0.0015%

✓ REQUIREMENT MET: Encryption overhead < 10%

Average encryption throughput: 22.58 MB/s
Average decryption throughput: 24.09 MB/s

================================================================================
Test completed successfully!
================================================================================
```

## Integration with Upload Service

To automatically encrypt content after upload:

```typescript
// In upload.service.ts

import { EncryptionService } from './encryption.service';

const encryptionService = new EncryptionService();

// After upload completes
async function handleUploadFinish(uploadId: string, filePath: string) {
  // ... existing validation code ...

  // Encrypt the file
  const encryptedPath = `${filePath}.enc`;
  const encryptResult = await encryptionService.encryptFile(
    filePath,
    encryptedPath
  );

  // Store encryption metadata
  await prisma.encryptedContent.create({
    data: {
      contentId: uploadId,
      encryptedPath,
      originalPath: filePath,
      keyId: encryptResult.keyId,
      iv: encryptResult.iv,
      algorithm: encryptResult.algorithm,
      originalSize: BigInt(encryptResult.originalSize),
      encryptedSize: BigInt(encryptResult.encryptedSize),
      encryptionTime: encryptResult.encryptionTime,
    },
  });

  // Optionally delete original
  if (process.env.DELETE_ORIGINAL_AFTER_ENCRYPTION === 'true') {
    fs.unlinkSync(filePath);
  }
}
```

## Common Issues

### Issue: "Local master key not initialized"

**Solution**: Set `LOCAL_MASTER_KEY` in `.env` file.

```bash
# Generate key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
LOCAL_MASTER_KEY=your_generated_key
```

### Issue: "AWS KMS AccessDeniedException"

**Solution**: Check IAM permissions for your AWS user/role.

Required permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:GenerateDataKey",
        "kms:Decrypt"
      ],
      "Resource": "arn:aws:kms:region:account:key/key-id"
    }
  ]
}
```

### Issue: "Encrypted file not found"

**Solution**: Ensure the encrypted file path is correct and the file exists.

```bash
# Check if file exists
ls -la /uploads/encrypted/

# Check database record
psql -d knowton -c "SELECT * FROM encrypted_contents WHERE content_id = 'your-content-id';"
```

### Issue: "Access denied"

**Solution**: Verify the user has purchased the content and has a valid access token.

```bash
# Check purchase
psql -d knowton -c "SELECT * FROM purchases WHERE user_id = 'user-id' AND content_id = 'content-id';"

# Generate new access token
curl -X POST http://localhost:3000/api/v1/purchases/purchase-id/access-token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Next Steps

1. **Production Setup**: Configure AWS KMS for production
2. **Monitoring**: Set up CloudWatch alarms for KMS usage
3. **Key Rotation**: Implement automated key rotation
4. **Performance Tuning**: Optimize chunk sizes for your use case
5. **Integration**: Integrate with CDN for encrypted content delivery

## Resources

- [Full Documentation](./CONTENT_ENCRYPTION.md)
- [API Reference](./CONTENT_ENCRYPTION.md#api-usage)
- [Security Best Practices](./CONTENT_ENCRYPTION.md#security-considerations)
- [AWS KMS Documentation](https://docs.aws.amazon.com/kms/)

## Support

For help:
- Check logs: `packages/backend/logs/`
- Review database: `encrypted_contents`, `encryption_keys`, `content_access_logs`
- Contact: dev@knowton.io
