# Device Binding Implementation

## Overview

The Device Binding feature implements REQ-1.6.1 (Token-Based Access Control) by providing:
- Device fingerprinting based on browser/device characteristics
- Limit of 3 concurrent devices per user
- Device management UI for users to view and revoke devices
- Automatic device registration and verification
- Device revocation functionality

## Architecture

### Components

1. **DeviceFingerprintService** (`device-fingerprint.service.ts`)
   - Generates unique device fingerprints from browser characteristics
   - Parses user agent strings to extract browser and OS information
   - Calculates confidence scores for fingerprint uniqueness
   - Creates human-readable device names

2. **DeviceManagementService** (`device-management.service.ts`)
   - Manages device registration and tracking
   - Enforces 3-device limit per user
   - Handles device revocation
   - Provides device statistics and cleanup

3. **ContentAccessControlService** (updated)
   - Integrates device verification into content access flow
   - Automatically registers new devices when accessing content
   - Enforces device limits before granting access

4. **API Routes** (`device-management.routes.ts`)
   - RESTful endpoints for device management
   - Device registration, listing, revocation

5. **Frontend Components**
   - `useDeviceManagement` hook for device operations
   - `DeviceManagement` component for UI
   - `DeviceManagementPage` for standalone page

### Database Schema

```prisma
model UserDevice {
  id              String    @id @default(uuid())
  userId          String
  deviceId        String // Generated device fingerprint ID
  deviceName      String // Human-readable device name
  deviceInfo      Json // Full device information
  fingerprintHash String // SHA-256 hash of device characteristics
  isActive        Boolean   @default(true)
  lastUsedAt      DateTime  @default(now())
  firstSeenAt     DateTime  @default(now())
  revokedAt       DateTime?
  accessCount     Int       @default(0)
  metadata        Json?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([userId, deviceId])
  @@index([userId])
  @@index([deviceId])
  @@index([isActive])
  @@index([lastUsedAt])
  @@map("user_devices")
}
```

## Device Fingerprinting

### Fingerprint Components

The device fingerprint is generated from:
1. **User Agent** (always available) - 20% weight
2. **Browser** (name and version) - 15% weight
3. **Operating System** (name and version) - 15% weight
4. **Screen Resolution** (highly unique) - 25% weight
5. **Timezone** (moderately unique) - 15% weight
6. **Language** - 10% weight

### Fingerprint Generation

```typescript
const fingerprintData = {
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  browser: 'Chrome',
  browserVersion: '120',
  os: 'Windows',
  osVersion: '10',
  screenResolution: '1920x1080',
  timezone: 'America/New_York',
  language: 'en-US',
};

// Hash the data
const fingerprintHash = crypto
  .createHash('sha256')
  .update(JSON.stringify(fingerprintData))
  .digest('hex');

// Generate short device ID (first 16 chars)
const deviceId = fingerprintHash.substring(0, 16);
```

### Confidence Score

The confidence score (0-1) indicates how unique the fingerprint is:
- **0.8-1.0**: High confidence (all characteristics available)
- **0.6-0.8**: Medium confidence (most characteristics available)
- **0.0-0.6**: Low confidence (limited characteristics)

## API Endpoints

### Register Device
```http
POST /api/v1/devices/register
Content-Type: application/json

{
  "userId": "user-uuid",
  "deviceInfo": {
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.1",
    "platform": "Win32",
    "screenResolution": "1920x1080",
    "timezone": "America/New_York",
    "language": "en-US"
  },
  "contentId": "content-uuid" // optional
}
```

**Response:**
```json
{
  "success": true,
  "device": {
    "id": "device-uuid",
    "userId": "user-uuid",
    "deviceId": "a1b2c3d4e5f6g7h8",
    "deviceName": "Chrome on Windows (desktop)",
    "isActive": true,
    "lastUsedAt": "2024-01-15T10:30:00Z",
    "firstSeenAt": "2024-01-15T10:30:00Z",
    "accessCount": 1
  }
}
```

**Error (Device Limit Exceeded):**
```json
{
  "success": false,
  "limitExceeded": true,
  "message": "Maximum 3 devices allowed. Please revoke a device first."
}
```

### Get User Devices
```http
GET /api/v1/devices/:userId
```

**Response:**
```json
{
  "success": true,
  "devices": [
    {
      "id": "device-uuid-1",
      "deviceId": "a1b2c3d4e5f6g7h8",
      "deviceName": "Chrome on Windows (desktop)",
      "isActive": true,
      "lastUsedAt": "2024-01-15T10:30:00Z",
      "accessCount": 42
    },
    {
      "id": "device-uuid-2",
      "deviceId": "i9j8k7l6m5n4o3p2",
      "deviceName": "Safari on iOS (mobile)",
      "isActive": true,
      "lastUsedAt": "2024-01-14T15:20:00Z",
      "accessCount": 15
    }
  ],
  "count": 2
}
```

### Get Device Statistics
```http
GET /api/v1/devices/:userId/statistics
```

**Response:**
```json
{
  "success": true,
  "statistics": {
    "totalDevices": 3,
    "activeDevices": 2,
    "revokedDevices": 1,
    "maxDevices": 3,
    "canAddDevice": true
  }
}
```

### Revoke Device
```http
DELETE /api/v1/devices/:userId/:deviceId
```

**Response:**
```json
{
  "success": true,
  "message": "Device revoked successfully"
}
```

### Revoke All Devices
```http
DELETE /api/v1/devices/:userId/all
```

**Response:**
```json
{
  "success": true,
  "message": "2 device(s) revoked successfully",
  "count": 2
}
```

### Verify Device
```http
POST /api/v1/devices/verify
Content-Type: application/json

{
  "userId": "user-uuid",
  "deviceInfo": {
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.1"
  }
}
```

**Response:**
```json
{
  "success": true,
  "authorized": true
}
```

### Cleanup Inactive Devices
```http
POST /api/v1/devices/:userId/cleanup
```

**Response:**
```json
{
  "success": true,
  "message": "1 inactive device(s) cleaned up",
  "count": 1
}
```

## Frontend Usage

### Using the Hook

```typescript
import { useDeviceManagement } from '../hooks/useDeviceManagement';

function MyComponent() {
  const {
    devices,
    statistics,
    loading,
    error,
    registerDevice,
    revokeDevice,
    verifyDevice,
  } = useDeviceManagement(userId);

  // Register current device
  const handleRegister = async () => {
    try {
      const result = await registerDevice();
      console.log('Device registered:', result);
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  // Revoke a device
  const handleRevoke = async (deviceId: string) => {
    try {
      await revokeDevice(deviceId);
      console.log('Device revoked');
    } catch (err) {
      console.error('Revocation failed:', err);
    }
  };

  return (
    <div>
      <h2>Devices: {statistics?.activeDevices} / {statistics?.maxDevices}</h2>
      {devices.map(device => (
        <div key={device.id}>
          {device.deviceName}
          <button onClick={() => handleRevoke(device.deviceId)}>
            Revoke
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Using the Component

```typescript
import { DeviceManagement } from '../components/DeviceManagement';

function SettingsPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1>Settings</h1>
      <DeviceManagement userId={user.id} />
    </div>
  );
}
```

## Integration with Content Access

The device binding is automatically integrated into the content access flow:

```typescript
// When accessing content
const accessResult = await contentAccessControlService.verifyContentAccess(
  userId,
  contentId,
  accessToken,
  deviceInfo // Device info from client
);

if (!accessResult.granted) {
  if (accessResult.deviceLimit) {
    // Show device limit error
    // Prompt user to revoke a device
  } else {
    // Show other error
  }
}
```

## Security Considerations

1. **Fingerprint Stability**: Device fingerprints may change if:
   - Browser is updated (major version)
   - Screen resolution changes
   - OS is updated
   - User clears browser data

2. **Privacy**: Device fingerprinting is done with user consent and:
   - No personally identifiable information is stored
   - Only technical characteristics are used
   - Users can view and manage their devices

3. **Bypass Prevention**:
   - Device IDs are hashed and cannot be easily spoofed
   - Server-side validation of all device operations
   - Rate limiting on device registration
   - Audit logging of device changes

4. **Token Revocation**: When a device is revoked:
   - All access tokens for that device are invalidated
   - Active sessions are terminated
   - User must re-authenticate on that device

## Limitations

1. **Browser Fingerprinting**: Not 100% unique, but sufficient for most use cases
2. **Incognito Mode**: May generate different fingerprints
3. **VPN/Proxy**: IP address changes don't affect fingerprint
4. **Browser Extensions**: May affect fingerprint stability

## Future Enhancements

1. **Enhanced Fingerprinting**: Add canvas fingerprinting, WebGL fingerprinting
2. **Device Naming**: Allow users to name their devices
3. **Device Notifications**: Notify users when new devices are added
4. **Suspicious Activity**: Detect and alert on unusual device patterns
5. **Geolocation**: Track device locations for security
6. **Device Types**: Better detection of device types (phone, tablet, desktop)

## Testing

### Unit Tests

```bash
# Test device fingerprinting
npm test -- device-fingerprint.service.test.ts

# Test device management
npm test -- device-management.service.test.ts
```

### Integration Tests

```bash
# Test device registration flow
npm test -- device-registration.integration.test.ts

# Test device limit enforcement
npm test -- device-limit.integration.test.ts
```

### Manual Testing

1. Register 3 devices from different browsers
2. Try to register a 4th device (should fail)
3. Revoke one device
4. Register a new device (should succeed)
5. Revoke all devices
6. Verify access is denied on all devices

## Monitoring

### Metrics to Track

- Device registration rate
- Device revocation rate
- Device limit exceeded errors
- Average devices per user
- Device fingerprint confidence scores
- Inactive device cleanup rate

### Alerts

- High device registration rate (potential abuse)
- High device limit exceeded rate (user friction)
- Low fingerprint confidence scores (fingerprinting issues)

## Compliance

This implementation complies with:
- **REQ-1.6.1**: Token-Based Access Control
  - ✅ Device binding (max 3 devices)
  - ✅ Concurrent limit (1 device streaming)
  - ✅ Access logging
  - ✅ Anomaly detection (basic)

## References

- [Device Fingerprinting Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas)
- [Browser Fingerprinting](https://en.wikipedia.org/wiki/Device_fingerprint)
- [Privacy Considerations](https://www.w3.org/TR/fingerprinting-guidance/)
