# Device Binding - Quick Start Guide

## Overview

Device binding limits users to 3 concurrent devices and provides device management capabilities.

## Quick Setup

### 1. Run Database Migration

```bash
cd packages/backend
npx prisma migrate dev --name add_device_binding
npx prisma generate
```

### 2. Start Backend Server

```bash
npm run dev
```

### 3. Test Device Registration

```bash
curl -X POST http://localhost:3001/api/v1/devices/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "deviceInfo": {
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      "ipAddress": "192.168.1.1",
      "platform": "Win32",
      "screenResolution": "1920x1080",
      "timezone": "America/New_York",
      "language": "en-US"
    }
  }'
```

## Frontend Integration

### 1. Add Device Management to User Settings

```typescript
// In your settings page
import { DeviceManagement } from '../components/DeviceManagement';

function SettingsPage() {
  const { user } = useAuth();
  
  return (
    <div>
      <h1>Account Settings</h1>
      <DeviceManagement userId={user.id} />
    </div>
  );
}
```

### 2. Auto-Register Device on Content Access

```typescript
import { useDeviceManagement } from '../hooks/useDeviceManagement';

function ContentPlayer({ contentId }) {
  const { user } = useAuth();
  const { registerDevice } = useDeviceManagement(user.id);
  
  useEffect(() => {
    // Auto-register device when accessing content
    registerDevice(contentId).catch(err => {
      if (err.message.includes('Device limit exceeded')) {
        // Show device management modal
        setShowDeviceModal(true);
      }
    });
  }, [contentId]);
  
  return <div>Content Player</div>;
}
```

### 3. Add Device Management Link to Navigation

```typescript
<nav>
  <Link to="/settings/devices">Manage Devices</Link>
</nav>
```

## Common Use Cases

### Check Device Limit Before Purchase

```typescript
const { statistics } = useDeviceManagement(userId);

if (!statistics?.canAddDevice) {
  alert('You have reached the maximum number of devices. Please revoke a device first.');
  return;
}

// Proceed with purchase
```

### Verify Device Before Streaming

```typescript
const { verifyDevice } = useDeviceManagement(userId);

const isAuthorized = await verifyDevice();
if (!isAuthorized) {
  // Try to register
  const result = await registerDevice();
  if (!result.success) {
    // Show error
  }
}
```

### Revoke Device on Logout

```typescript
function logout() {
  const { getDeviceInfo } = useDeviceManagement(userId);
  const deviceInfo = await getDeviceInfo();
  
  // Optionally revoke current device
  // await revokeDevice(deviceInfo.deviceId);
  
  // Logout
  auth.logout();
}
```

## Testing

### Test Device Limit

```bash
# Register 3 devices
for i in {1..3}; do
  curl -X POST http://localhost:3001/api/v1/devices/register \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\": \"test-user-id\",
      \"deviceInfo\": {
        \"userAgent\": \"Device-$i\",
        \"ipAddress\": \"192.168.1.$i\"
      }
    }"
done

# Try to register 4th device (should fail)
curl -X POST http://localhost:3001/api/v1/devices/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "deviceInfo": {
      "userAgent": "Device-4",
      "ipAddress": "192.168.1.4"
    }
  }'
```

### Test Device Revocation

```bash
# Get devices
curl http://localhost:3001/api/v1/devices/test-user-id

# Revoke a device
curl -X DELETE http://localhost:3001/api/v1/devices/test-user-id/DEVICE_ID

# Revoke all devices
curl -X DELETE http://localhost:3001/api/v1/devices/test-user-id/all
```

## Troubleshooting

### Device Not Recognized

**Problem**: User's device is not recognized after browser update.

**Solution**: Device fingerprints may change with major browser updates. User should:
1. Go to device management page
2. Revoke the old device
3. Access content again to register new device

### Device Limit Reached

**Problem**: User cannot access content due to device limit.

**Solution**: 
1. Direct user to device management page
2. Show list of registered devices
3. Allow user to revoke unused devices
4. Retry content access

### Fingerprint Collisions

**Problem**: Two different devices generate the same fingerprint.

**Solution**: This is rare but possible. If it happens:
1. Add more fingerprint characteristics (canvas, WebGL)
2. Use server-side IP tracking as additional factor
3. Implement device naming for user identification

## Best Practices

1. **Auto-Register**: Automatically register devices when users access content
2. **Clear Messaging**: Show clear error messages when device limit is reached
3. **Easy Management**: Provide easy access to device management UI
4. **Cleanup**: Periodically cleanup inactive devices (90+ days)
5. **Notifications**: Notify users when new devices are registered
6. **Security**: Log all device changes for audit purposes

## API Reference

See [DEVICE_BINDING.md](./DEVICE_BINDING.md) for complete API documentation.

## Support

For issues or questions:
- Check logs: `packages/backend/logs/`
- Review database: `npx prisma studio`
- Contact: support@knowton.io
