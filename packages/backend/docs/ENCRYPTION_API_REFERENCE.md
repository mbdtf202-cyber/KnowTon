# Content Encryption API Reference

Quick reference for the Content Encryption API endpoints.

## Base URL

```
http://localhost:3000/api/v1/content-encryption
```

## Authentication

All endpoints require JWT authentication:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### 1. Encrypt Content

Encrypt a content file.

**Endpoint**: `POST /encrypt`

**Request Body**:
```json
{
  "contentId": "string (required)",
  "inputPath": "string (required)",
  "deleteOriginal": "boolean (optional, default: false)"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "encryptedContentId": "uuid",
  "contentId": "uuid",
  "encryptionTime": 1234,
  "originalSize": 104857600,
  "encryptedSize": 104857616,
  "overhead": "0.0015%"
}
```

**Errors**:
- `401`: Unauthorized
- `403`: Permission denied
- `400`: Content already encrypted
- `500`: Encryption failed

---

### 2. Decrypt Content

Decrypt and download a content file.

**Endpoint**: `POST /decrypt`

**Request Body**:
```json
{
  "contentId": "string (required)",
  "accessToken": "string (optional)"
}
```

**Response** (200 OK):
- Binary file download

**Errors**:
- `401`: Unauthorized
- `403`: Access denied
- `404`: Content not found
- `500`: Decryption failed

---

### 3. Stream Encrypted Content

Stream encrypted content with on-the-fly decryption.

**Endpoint**: `GET /stream/:contentId`

**Query Parameters**:
- `accessToken`: string (optional)

**Headers**:
- `Range`: bytes=start-end (optional, for range requests)

**Response** (200 OK or 206 Partial Content):
- Streaming binary data

**Errors**:
- `401`: Unauthorized
- `403`: Access denied
- `404`: Content not found
- `500`: Streaming failed

---

### 4. Get Encryption Status

Check if content is encrypted and get metadata.

**Endpoint**: `GET /status/:contentId`

**Response** (200 OK):
```json
{
  "encrypted": true,
  "contentId": "uuid",
  "encryptedContentId": "uuid",
  "algorithm": "aes-256-cbc",
  "originalSize": "104857600",
  "encryptedSize": "104857616",
  "encryptionTime": 1234,
  "isSegmented": false,
  "segmentCount": 1,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Errors**:
- `401`: Unauthorized
- `500`: Failed to get status

---

### 5. Get Access Logs

View access logs for a content (creator/admin only).

**Endpoint**: `GET /access-logs/:contentId`

**Query Parameters**:
- `limit`: number (optional, default: 50)
- `offset`: number (optional, default: 0)

**Response** (200 OK):
```json
{
  "logs": [
    {
      "id": "uuid",
      "contentId": "uuid",
      "userId": "uuid",
      "accessType": "stream",
      "deviceId": "device-fingerprint",
      "ipAddress": "1.2.3.4",
      "userAgent": "Mozilla/5.0...",
      "accessGranted": true,
      "denialReason": null,
      "duration": 120,
      "bytesServed": "1048576",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

**Errors**:
- `401`: Unauthorized
- `403`: Permission denied
- `500`: Failed to get logs

---

## Access Control

### Device Binding

- Maximum 3 devices per user per content
- Tracked over 30-day rolling window
- Device identified by fingerprint

### Concurrent Access

- Maximum 1 concurrent stream per user per content
- Tracked over 5-minute window
- Prevents account sharing

### Access Tokens

- Valid for 24 hours
- Tied to specific content and user
- Can be refreshed before expiration
- Automatically revoked on refund

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid JWT |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Content not found |
| 500 | Internal Server Error |

---

## Rate Limits

- 100 requests per minute per user
- 1000 requests per hour per user

---

## Examples

### cURL Examples

#### Encrypt Content
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

#### Decrypt Content
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

#### Stream Content
```bash
curl -X GET "http://localhost:3000/api/v1/content-encryption/stream/content-uuid?accessToken=xxx" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Range: bytes=0-1048575" \
  --output video-chunk.mp4
```

#### Check Status
```bash
curl -X GET http://localhost:3000/api/v1/content-encryption/status/content-uuid \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Access Logs
```bash
curl -X GET "http://localhost:3000/api/v1/content-encryption/access-logs/content-uuid?limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript/TypeScript Examples

#### Encrypt Content
```typescript
const response = await fetch('http://localhost:3000/api/v1/content-encryption/encrypt', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    contentId: 'content-uuid',
    inputPath: '/uploads/video.mp4',
    deleteOriginal: false,
  }),
});

const result = await response.json();
console.log('Encrypted:', result);
```

#### Decrypt Content
```typescript
const response = await fetch('http://localhost:3000/api/v1/content-encryption/decrypt', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    contentId: 'content-uuid',
    accessToken: 'access-token',
  }),
});

const blob = await response.blob();
const url = URL.createObjectURL(blob);
// Use url for download or display
```

#### Stream Content
```typescript
const response = await fetch(
  `http://localhost:3000/api/v1/content-encryption/stream/content-uuid?accessToken=xxx`,
  {
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Range': 'bytes=0-1048575',
    },
  }
);

const blob = await response.blob();
const url = URL.createObjectURL(blob);
// Use url for video player
```

---

## SDK Usage

### Using Encryption Service Directly

```typescript
import { EncryptionService } from './services/encryption.service';

const encryptionService = new EncryptionService();

// Encrypt a file
const result = await encryptionService.encryptFile(
  '/uploads/video.mp4',
  '/uploads/encrypted/video.enc'
);

// Decrypt a file
const decrypted = await encryptionService.decryptFile(
  '/uploads/encrypted/video.enc',
  '/uploads/temp/video.mp4',
  {
    keyId: result.keyId,
    iv: result.iv,
    algorithm: result.algorithm,
  }
);
```

### Using Access Control Service

```typescript
import { ContentAccessControlService } from './services/content-access-control.service';

const accessControl = new ContentAccessControlService();

// Generate access token
const token = await accessControl.generateAccessToken(
  'user-uuid',
  'content-uuid',
  'device-fingerprint'
);

// Verify access
const hasAccess = await accessControl.verifyContentAccess(
  'user-uuid',
  'content-uuid',
  token
);

if (hasAccess.granted) {
  // Allow access
} else {
  console.log('Access denied:', hasAccess.reason);
}
```

---

## Support

For issues or questions:
- Documentation: [CONTENT_ENCRYPTION.md](./CONTENT_ENCRYPTION.md)
- Quick Start: [CONTENT_ENCRYPTION_QUICK_START.md](./CONTENT_ENCRYPTION_QUICK_START.md)
- Email: dev@knowton.io
