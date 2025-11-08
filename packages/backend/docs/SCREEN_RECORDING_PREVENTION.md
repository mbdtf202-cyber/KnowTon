# Screen Recording Prevention

## Overview

The Screen Recording Prevention system implements comprehensive protection against unauthorized screen recording of premium content. It combines multiple detection methods, dynamic watermarking, and automated enforcement to protect creator content.

## Features

### 1. Dynamic Watermark Overlays
- **Moving watermarks** that change position during playback
- **User identification** embedded in watermark text
- **Session tracking** with unique session IDs
- **Customizable appearance** (opacity, size, color)
- **Automatic rotation** through predefined positions

### 2. Recording Detection
- **API interception**: Detects MediaRecorder and getDisplayMedia usage
- **Browser extension detection**: Identifies known recording extensions
- **Behavioral analysis**: Monitors suspicious user behavior patterns
- **Tool detection**: Recognizes known recording software signatures
- **DevTools detection**: Identifies when developer tools are open

### 3. Automated Enforcement
- **Attempt logging**: All detection events are logged for audit
- **Automatic banning**: Users exceeding attempt threshold are temporarily banned
- **Security alerts**: High-severity attempts trigger creator notifications
- **Ban management**: Automatic expiration and manual override capabilities

### 4. Analytics & Reporting
- **Prevention statistics**: Track attempts by method, severity, and user
- **User history**: View individual user's recording attempt history
- **Top offenders**: Identify users with multiple violations
- **Trend analysis**: Monitor prevention effectiveness over time

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│  - DynamicWatermarkOverlay Component                        │
│  - useScreenRecordingDetection Hook                         │
│  - ProtectedVideoPlayer Component                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   API Layer                                 │
│  - POST /watermark (generate config)                        │
│  - POST /log-attempt (log detection)                        │
│  - GET /ban-status/:contentId (check ban)                   │
│  - GET /stats (prevention statistics)                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                             │
│  - ScreenRecordingPreventionService                         │
│    - generateDynamicWatermark()                             │
│    - logRecordingAttempt()                                  │
│    - detectRecordingTool()                                  │
│    - isUserBanned()                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                            │
│  - watermark_sessions                                       │
│  - recording_attempts                                       │
│  - content_access_bans                                      │
│  - security_alerts                                          │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### watermark_sessions
```sql
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
CREATE INDEX idx_watermark_sessions_expires ON watermark_sessions(expires_at);
```

### recording_attempts
```sql
CREATE TABLE recording_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  content_id UUID NOT NULL REFERENCES contents(id),
  detection_method VARCHAR(50) NOT NULL, -- api, browser, behavior, tool
  tool_name VARCHAR(255),
  severity VARCHAR(20) NOT NULL, -- low, medium, high
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_info JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recording_attempts_user ON recording_attempts(user_id);
CREATE INDEX idx_recording_attempts_content ON recording_attempts(content_id);
CREATE INDEX idx_recording_attempts_timestamp ON recording_attempts(timestamp);
CREATE INDEX idx_recording_attempts_severity ON recording_attempts(severity);
```

### content_access_bans
```sql
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
CREATE INDEX idx_content_access_bans_content ON content_access_bans(content_id);
CREATE INDEX idx_content_access_bans_expires ON content_access_bans(expires_at);
```

### security_alerts
```sql
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
CREATE INDEX idx_security_alerts_content ON security_alerts(content_id);
CREATE INDEX idx_security_alerts_created ON security_alerts(created_at);
```

## Detection Methods

### 1. API Interception
Monitors browser APIs commonly used for screen recording:
- `MediaRecorder.start()` - Direct video recording
- `navigator.mediaDevices.getDisplayMedia()` - Screen capture

### 2. Browser Extension Detection
Checks for known recording extension indicators:
- Screencastify watermark elements
- Loom recording indicators
- Nimbus capture UI elements
- Generic screen recorder markers

### 3. Behavioral Analysis
Monitors user behavior patterns:
- Rapid screenshot attempts (Print Screen, Ctrl+Shift+S)
- Frequent tab switching (potential recording setup)
- Suspicious keyboard combinations
- Abnormal playback patterns

### 4. Tool Detection
Identifies known recording software:
- OBS Studio
- Camtasia
- Bandicam
- Fraps
- ScreenFlow
- Snagit
- QuickTime
- Zoom
- Loom

### 5. DevTools Detection
Monitors for open developer tools:
- Window size discrepancies
- Console access detection
- Debugger presence

## Configuration

### Environment Variables
```bash
# Ban settings
MAX_ATTEMPTS_BEFORE_BAN=5
BAN_DURATION_HOURS=24

# Watermark settings
WATERMARK_UPDATE_INTERVAL=5000  # milliseconds
WATERMARK_OPACITY=0.3
WATERMARK_FONT_SIZE=14

# Security settings
ENABLE_RECORDING_DETECTION=true
ENABLE_AUTO_BAN=true
ENABLE_SECURITY_ALERTS=true
```

### Service Configuration
```typescript
const service = new ScreenRecordingPreventionService();

// Customize detection sensitivity
service.MAX_ATTEMPTS_BEFORE_BAN = 3;  // More strict
service.BAN_DURATION_HOURS = 48;      // Longer ban

// Add custom recording tools
service.KNOWN_RECORDING_TOOLS.push('custom-recorder');
```

## Usage Examples

### Backend: Generate Watermark Config
```typescript
import { ScreenRecordingPreventionService } from './services/screen-recording-prevention.service';

const service = new ScreenRecordingPreventionService();

const config = await service.generateDynamicWatermark(
  userId,
  contentId,
  sessionId
);

// Returns:
// {
//   userId: 'user-123',
//   contentId: 'content-456',
//   sessionId: 'session-789',
//   text: 'user@exa | 2025-11-04T12:34 | abc123',
//   updateInterval: 5000,
//   positions: [{ x: 0, y: 0 }, { x: 25, y: 0 }, ...],
//   opacity: 0.3,
//   fontSize: 14,
//   color: '#FFFFFF'
// }
```

### Backend: Log Recording Attempt
```typescript
await service.logRecordingAttempt({
  userId: 'user-123',
  contentId: 'content-456',
  detectionMethod: 'api',
  toolName: 'MediaRecorder',
  severity: 'high',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  timestamp: new Date(),
});
```

### Frontend: Protected Video Player
```tsx
import { ProtectedVideoPlayer } from './components/ProtectedVideoPlayer';

function ContentPage() {
  return (
    <ProtectedVideoPlayer
      contentId="content-123"
      videoUrl="/api/v1/content/stream/content-123"
      userId="user-456"
      autoPlay={false}
      controls={true}
      onRecordingDetected={(method, tool) => {
        console.warn('Recording detected:', method, tool);
        // Show warning to user
      }}
    />
  );
}
```

### Frontend: Custom Detection Hook
```tsx
import { useScreenRecordingDetection } from './hooks/useScreenRecordingDetection';

function VideoPlayer({ contentId }) {
  useScreenRecordingDetection({
    contentId,
    enabled: true,
    onDetected: (method, toolName) => {
      alert(`Recording detected: ${method} - ${toolName}`);
    },
  });

  return <video src="..." />;
}
```

## API Reference

### POST /api/v1/screen-recording-prevention/watermark
Generate dynamic watermark configuration for a playback session.

**Request:**
```json
{
  "contentId": "content-123",
  "sessionId": "session-456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-789",
    "contentId": "content-123",
    "sessionId": "session-456",
    "text": "user@exa | 2025-11-04T12:34 | abc123",
    "updateInterval": 5000,
    "positions": [...],
    "opacity": 0.3,
    "fontSize": 14,
    "color": "#FFFFFF"
  }
}
```

### POST /api/v1/screen-recording-prevention/log-attempt
Log a recording attempt detection.

**Request:**
```json
{
  "contentId": "content-123",
  "detectionMethod": "api",
  "toolName": "MediaRecorder",
  "severity": "high",
  "deviceInfo": {}
}
```

**Response:**
```json
{
  "success": true,
  "message": "Recording attempt logged"
}
```

### GET /api/v1/screen-recording-prevention/ban-status/:contentId
Check if user is banned from accessing content.

**Response:**
```json
{
  "success": true,
  "data": {
    "isBanned": false
  }
}
```

### GET /api/v1/screen-recording-prevention/stats
Get prevention statistics.

**Query Parameters:**
- `contentId` (optional): Filter by content
- `startDate` (optional): Start date for range
- `endDate` (optional): End date for range

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAttempts": 150,
    "blockedAttempts": 12,
    "byMethod": {
      "api": 80,
      "browser": 40,
      "behavior": 30
    },
    "bySeverity": {
      "high": 90,
      "medium": 40,
      "low": 20
    },
    "topOffenders": [
      { "userId": "user-123", "attempts": 15 },
      { "userId": "user-456", "attempts": 10 }
    ]
  }
}
```

## Best Practices

### 1. Watermark Configuration
- Use short, identifiable text (user ID + timestamp)
- Update position frequently (every 3-5 seconds)
- Balance opacity for visibility vs. user experience
- Test on different screen sizes and resolutions

### 2. Detection Sensitivity
- Start with moderate sensitivity to avoid false positives
- Monitor statistics and adjust thresholds
- Consider content value when setting ban duration
- Provide clear warnings before banning

### 3. User Experience
- Show clear warnings when recording is detected
- Provide appeal process for false positives
- Display ban reason and expiration time
- Allow manual unban for legitimate cases

### 4. Performance
- Minimize detection overhead on playback
- Use efficient DOM queries for extension detection
- Batch logging requests to reduce API calls
- Clean up expired bans regularly

### 5. Security
- Encrypt watermark session data
- Rate limit detection API endpoints
- Monitor for detection bypass attempts
- Keep recording tool signatures updated

## Limitations

### Technical Limitations
- Cannot prevent hardware-based screen recording (external cameras)
- May not detect all recording software variants
- Browser API interception can be bypassed with modified browsers
- DevTools detection is not foolproof

### User Experience Trade-offs
- Watermarks may distract from content
- False positives can frustrate legitimate users
- Detection overhead may impact performance
- Bans may be too strict for some use cases

### Legal Considerations
- Recording prevention is not legally binding
- Users may have fair use rights in some jurisdictions
- Terms of service should clearly prohibit recording
- Consider DMCA and copyright law requirements

## Troubleshooting

### Watermark Not Appearing
1. Check if watermark config was generated successfully
2. Verify component is rendered with correct props
3. Check z-index and positioning styles
4. Ensure session is not expired

### Detection Not Working
1. Verify detection is enabled in configuration
2. Check browser console for errors
3. Test with known recording tools
4. Verify API endpoints are accessible

### False Positives
1. Review detection thresholds
2. Check for legitimate browser extensions
3. Analyze user behavior patterns
4. Adjust severity levels

### Performance Issues
1. Reduce watermark update frequency
2. Optimize detection intervals
3. Batch API requests
4. Use caching for ban status checks

## Monitoring

### Key Metrics
- Total recording attempts per day
- Detection method distribution
- Ban rate and duration
- False positive rate
- User complaints about restrictions

### Alerts
- High-severity attempts (immediate)
- Unusual spike in attempts (hourly)
- Ban threshold exceeded (daily)
- Detection system failures (immediate)

### Dashboards
- Real-time attempt monitoring
- Prevention effectiveness trends
- Top offenders list
- Content-specific statistics

## Future Enhancements

### Planned Features
- Machine learning-based behavior analysis
- Hardware fingerprinting for device tracking
- Blockchain-based violation records
- Integration with content delivery networks
- Mobile app support
- Advanced watermark techniques (invisible, forensic)

### Research Areas
- AI-powered recording detection
- Quantum-resistant watermarking
- Decentralized ban management
- Cross-platform detection coordination

## Support

For issues or questions:
- GitHub Issues: [repository]/issues
- Documentation: /docs/screen-recording-prevention
- Email: security@knowton.io
- Discord: #security-support

## License

Copyright © 2025 KnowTon Platform. All rights reserved.
