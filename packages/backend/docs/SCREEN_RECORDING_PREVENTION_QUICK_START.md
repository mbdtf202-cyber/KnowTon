# Screen Recording Prevention - Quick Start Guide

## Overview

This guide will help you quickly integrate screen recording prevention into your content playback system.

## Prerequisites

- Node.js 16+ and npm/yarn
- PostgreSQL database
- React frontend application
- Express backend application

## Installation

### 1. Database Setup

Run the following SQL to create required tables:

```sql
-- Watermark sessions
CREATE TABLE watermark_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  content_id UUID NOT NULL REFERENCES contents(id),
  session_id VARCHAR(255) NOT NULL,
  watermark_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  UNIQUE(session_id)
);

CREATE INDEX idx_watermark_sessions_user ON watermark_sessions(user_id);
CREATE INDEX idx_watermark_sessions_content ON watermark_sessions(content_id);

-- Recording attempts
CREATE TABLE recording_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  content_id UUID NOT NULL REFERENCES contents(id),
  detection_method VARCHAR(50) NOT NULL,
  tool_name VARCHAR(255),
  severity VARCHAR(20) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_info JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recording_attempts_user ON recording_attempts(user_id);
CREATE INDEX idx_recording_attempts_content ON recording_attempts(content_id);

-- Access bans
CREATE TABLE content_access_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  content_id UUID NOT NULL REFERENCES contents(id),
  reason TEXT NOT NULL,
  banned_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  UNIQUE(user_id, content_id)
);

CREATE INDEX idx_content_access_bans_user ON content_access_bans(user_id);
CREATE INDEX idx_content_access_bans_expires ON content_access_bans(expires_at);

-- Security alerts
CREATE TABLE security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id),
  content_id UUID NOT NULL REFERENCES contents(id),
  user_id UUID NOT NULL REFERENCES users(id),
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_security_alerts_creator ON security_alerts(creator_id);
```

### 2. Backend Setup

The service and routes are already integrated. No additional setup needed.

### 3. Frontend Setup

Import the components in your video player:

```tsx
import { ProtectedVideoPlayer } from './components/ProtectedVideoPlayer';
```

## Basic Usage

### Simple Protected Video Player

```tsx
import React from 'react';
import { ProtectedVideoPlayer } from './components/ProtectedVideoPlayer';

function ContentPage({ contentId, videoUrl, userId }) {
  return (
    <div className="container mx-auto p-4">
      <h1>Protected Content</h1>
      <ProtectedVideoPlayer
        contentId={contentId}
        videoUrl={videoUrl}
        userId={userId}
        autoPlay={false}
        controls={true}
      />
    </div>
  );
}

export default ContentPage;
```

### Custom Video Player with Detection

```tsx
import React, { useRef } from 'react';
import { DynamicWatermarkOverlay } from './components/DynamicWatermarkOverlay';
import { useScreenRecordingDetection } from './hooks/useScreenRecordingDetection';

function CustomVideoPlayer({ contentId, videoUrl, watermarkConfig }) {
  const videoRef = useRef(null);

  // Enable recording detection
  useScreenRecordingDetection({
    contentId,
    enabled: true,
    onDetected: (method, toolName) => {
      console.warn('Recording detected:', method, toolName);
      alert('Screen recording is not allowed for this content.');
    },
  });

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        controlsList="nodownload"
        disablePictureInPicture
        className="w-full"
      />
      
      {watermarkConfig && (
        <DynamicWatermarkOverlay
          text={watermarkConfig.text}
          updateInterval={watermarkConfig.updateInterval}
          positions={watermarkConfig.positions}
          opacity={watermarkConfig.opacity}
          fontSize={watermarkConfig.fontSize}
          color={watermarkConfig.color}
          enabled={true}
        />
      )}
    </div>
  );
}
```

## API Integration

### Generate Watermark Config

```typescript
// Frontend
const response = await fetch('/api/v1/screen-recording-prevention/watermark', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    contentId: 'content-123',
    sessionId: 'session-456',
  }),
});

const { data } = await response.json();
// Use data.text, data.positions, etc.
```

### Check Ban Status

```typescript
const response = await fetch(
  `/api/v1/screen-recording-prevention/ban-status/${contentId}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
);

const { data } = await response.json();
if (data.isBanned) {
  // Show ban message
}
```

### Log Recording Attempt (Manual)

```typescript
await fetch('/api/v1/screen-recording-prevention/log-attempt', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    contentId: 'content-123',
    detectionMethod: 'tool',
    toolName: 'OBS Studio',
    severity: 'high',
  }),
});
```

## Testing

### Run Test Script

```bash
cd packages/backend
npm run test:screen-recording-prevention
```

### Manual Testing

1. **Test Watermark Display:**
   - Open protected video player
   - Verify watermark appears and moves
   - Check watermark text contains user ID

2. **Test Recording Detection:**
   - Open browser DevTools (should be detected)
   - Try using MediaRecorder API
   - Install a recording extension

3. **Test Ban System:**
   - Trigger 5 recording attempts
   - Verify user gets banned
   - Check ban expires after 24 hours

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Screen Recording Prevention
MAX_ATTEMPTS_BEFORE_BAN=5
BAN_DURATION_HOURS=24
WATERMARK_UPDATE_INTERVAL=5000
WATERMARK_OPACITY=0.3
ENABLE_RECORDING_DETECTION=true
```

### Customize Detection

```typescript
// Backend: services/screen-recording-prevention.service.ts
export class ScreenRecordingPreventionService {
  // Adjust these values
  private readonly MAX_ATTEMPTS_BEFORE_BAN = 5;
  private readonly BAN_DURATION_HOURS = 24;
  
  // Add custom recording tools
  private readonly KNOWN_RECORDING_TOOLS = [
    'obs',
    'camtasia',
    'your-custom-tool',
    // ...
  ];
}
```

## Common Issues

### Watermark Not Showing

**Problem:** Watermark overlay doesn't appear

**Solution:**
1. Check if watermark config was fetched successfully
2. Verify component props are passed correctly
3. Check CSS z-index (should be 9999)
4. Ensure parent container has `position: relative`

### Detection Not Working

**Problem:** Recording attempts not detected

**Solution:**
1. Check browser console for errors
2. Verify API endpoints are accessible
3. Ensure authentication token is valid
4. Test with known recording tools

### False Positives

**Problem:** Legitimate users getting banned

**Solution:**
1. Increase `MAX_ATTEMPTS_BEFORE_BAN`
2. Adjust detection sensitivity
3. Review detection methods
4. Implement appeal process

## Next Steps

1. **Customize Watermark Appearance:**
   - Adjust opacity, size, and color
   - Add custom positioning logic
   - Implement fade-in/fade-out effects

2. **Enhance Detection:**
   - Add custom recording tool signatures
   - Implement ML-based behavior analysis
   - Integrate with CDN for edge detection

3. **Improve User Experience:**
   - Add warning messages before banning
   - Implement grace period for first-time offenders
   - Create appeal process UI

4. **Monitor and Analyze:**
   - Set up dashboards for prevention stats
   - Create alerts for high-severity attempts
   - Analyze effectiveness and adjust

## Support

- **Documentation:** `/docs/SCREEN_RECORDING_PREVENTION.md`
- **API Reference:** `/docs/SCREEN_RECORDING_PREVENTION.md#api-reference`
- **Issues:** GitHub Issues
- **Email:** security@knowton.io

## Additional Resources

- [Full Documentation](./SCREEN_RECORDING_PREVENTION.md)
- [API Reference](./SCREEN_RECORDING_PREVENTION.md#api-reference)
- [Best Practices](./SCREEN_RECORDING_PREVENTION.md#best-practices)
- [Troubleshooting Guide](./SCREEN_RECORDING_PREVENTION.md#troubleshooting)
