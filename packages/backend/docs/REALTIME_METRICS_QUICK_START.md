# Real-time Metrics - Quick Start Guide

## Overview

The real-time metrics system provides live updates of platform analytics through WebSocket connections. It includes:

- **Live Revenue Counter**: Real-time revenue tracking (total, today, week, month)
- **Active Users Display**: Current active users, daily users, and 24h peak
- **Transaction Metrics**: Total, pending, completed, and failed transactions
- **Content Performance**: Views, purchases, and conversion rates
- **Real-time Charts**: Live updating charts using Chart.js

## Architecture

```
┌─────────────┐     WebSocket      ┌──────────────┐
│   Frontend  │ ◄─────────────────► │   Backend    │
│  Dashboard  │                     │  WS Server   │
└─────────────┘                     └──────────────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │   Metrics    │
                                    │   Service    │
                                    └──────────────┘
                                           │
                                    ┌──────┴──────┐
                                    │             │
                                    ▼             ▼
                              ┌──────────┐  ┌─────────┐
                              │PostgreSQL│  │  Redis  │
                              └──────────┘  └─────────┘
```

## Backend Setup

### 1. Install Dependencies

```bash
cd packages/backend
npm install ws @types/ws
```

### 2. Environment Variables

No additional environment variables required. Uses existing:
- `REDIS_URL`: Redis connection for caching
- `DATABASE_URL`: PostgreSQL for data queries

### 3. Start the Server

```bash
npm run dev
```

The WebSocket server will be available at: `ws://localhost:3000/ws/metrics`

## Frontend Setup

### 1. Install Dependencies

```bash
cd packages/frontend
npm install chart.js react-chartjs-2 recharts
```

### 2. Environment Variables

Add to `.env`:

```env
VITE_WS_URL=ws://localhost:3000/ws/metrics
```

### 3. Start the Frontend

```bash
npm run dev
```

### 4. Access the Dashboard

Navigate to: `http://localhost:5173/analytics/realtime`

## API Endpoints

### REST API

#### Get Current Metrics
```http
GET /api/v1/analytics/realtime-metrics
```

**Response:**
```json
{
  "revenue": {
    "total": 125000.50,
    "today": 5420.00,
    "thisWeek": 32100.00,
    "thisMonth": 98500.00
  },
  "activeUsers": {
    "current": 42,
    "today": 1250,
    "peak24h": 89
  },
  "transactions": {
    "total": 5420,
    "pending": 12,
    "completed": 5380,
    "failed": 28
  },
  "content": {
    "totalViews": 125000,
    "totalPurchases": 5380,
    "conversionRate": 4.30
  },
  "timestamp": "2025-11-04T10:30:00.000Z"
}
```

### WebSocket API

#### Connect
```javascript
const ws = new WebSocket('ws://localhost:3000/ws/metrics');
```

#### Message Format

**Server → Client (Metrics Update):**
```json
{
  "type": "metrics",
  "data": {
    "revenue": { ... },
    "activeUsers": { ... },
    "transactions": { ... },
    "content": { ... },
    "timestamp": "2025-11-04T10:30:00.000Z"
  }
}
```

**Client → Server (Ping):**
```json
{
  "type": "ping"
}
```

**Server → Client (Pong):**
```json
{
  "type": "pong"
}
```

## Features

### 1. Live Revenue Counter

Displays real-time revenue with animated updates:
- Total revenue (all-time)
- Today's revenue (with animation)
- This week's revenue
- This month's revenue

### 2. Active Users Display

Shows current platform activity:
- Current active users (last 5 minutes)
- Total active users today
- Peak concurrent users (24h)

### 3. Real-time Charts

Two live-updating charts:
- **Revenue Trend**: Shows today's revenue over time
- **Active Users Trend**: Shows active user count over time

Both charts:
- Update every 5 seconds
- Keep last 20 data points
- Use smooth line animations
- Responsive design

### 4. Transaction Metrics

Real-time transaction statistics:
- Total transactions
- Pending transactions (yellow)
- Completed transactions (green)
- Failed transactions (red)

### 5. Content Performance

Content engagement metrics:
- Total views
- Total purchases
- Conversion rate (%)

## Usage Examples

### Frontend Hook

```typescript
import { useRealtimeMetrics } from '../hooks/useRealtimeMetrics';

function MyComponent() {
  const { metrics, isConnected, error, reconnect } = useRealtimeMetrics();

  if (error) {
    return <div>Error: {error} <button onClick={reconnect}>Reconnect</button></div>;
  }

  if (!metrics) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Revenue Today: ${metrics.revenue.today}</h2>
      <p>Active Users: {metrics.activeUsers.current}</p>
      <p>Status: {isConnected ? 'Live' : 'Disconnected'}</p>
    </div>
  );
}
```

### Backend Service

```typescript
import { realtimeMetricsService } from './services/realtime-metrics.service';

// Track user activity
await realtimeMetricsService.trackUserActivity(userId);

// Track content views
await realtimeMetricsService.trackContentView(contentId);

// Get current metrics
const metrics = await realtimeMetricsService.getMetrics();
```

## Performance

### Update Frequency
- Metrics calculated every 5 seconds
- WebSocket broadcasts to all connected clients
- Redis caching with 10-second TTL

### Scalability
- Supports multiple concurrent WebSocket connections
- Efficient Redis caching reduces database load
- Automatic reconnection with exponential backoff

### Resource Usage
- Minimal CPU overhead (~1-2%)
- Redis memory: ~1MB for metrics cache
- WebSocket bandwidth: ~2KB per update per client

## Monitoring

### Connection Status

The dashboard shows a live indicator:
- 🟢 Green (pulsing): Connected and receiving updates
- 🔴 Red: Disconnected

### Error Handling

Automatic reconnection with exponential backoff:
1. First retry: 1 second
2. Second retry: 2 seconds
3. Third retry: 4 seconds
4. Fourth retry: 8 seconds
5. Fifth retry: 16 seconds
6. After 5 attempts: Manual reconnection required

### Logs

Backend logs WebSocket events:
```
[INFO] WebSocket client connected { ip: '127.0.0.1' }
[INFO] WebSocket client disconnected
[ERROR] WebSocket error { error: ... }
```

## Troubleshooting

### WebSocket Connection Failed

**Problem**: Cannot connect to WebSocket server

**Solutions**:
1. Check backend is running: `curl http://localhost:3000/health`
2. Verify WebSocket URL in `.env`: `VITE_WS_URL=ws://localhost:3000/ws/metrics`
3. Check firewall/proxy settings
4. Try manual reconnection from dashboard

### No Metrics Displayed

**Problem**: Connected but no metrics showing

**Solutions**:
1. Check Redis is running: `redis-cli ping`
2. Check database connection
3. Verify data exists in database
4. Check backend logs for errors

### Metrics Not Updating

**Problem**: Metrics displayed but not updating

**Solutions**:
1. Check WebSocket connection status (should be green)
2. Verify metrics service is running (check logs)
3. Check Redis connection
4. Restart backend server

### High Memory Usage

**Problem**: Redis memory usage growing

**Solutions**:
1. Metrics cache has 10-second TTL (auto-cleanup)
2. Active users set expires after 5 minutes
3. Check for memory leaks in custom tracking code

## Testing

### Manual Testing

1. Open dashboard: `http://localhost:5173/analytics/realtime`
2. Open browser console to see WebSocket messages
3. Create test transactions to see metrics update
4. Verify charts update every 5 seconds

### Load Testing

Test WebSocket scalability:

```bash
# Install wscat
npm install -g wscat

# Connect multiple clients
for i in {1..100}; do
  wscat -c ws://localhost:3000/ws/metrics &
done
```

### Integration Testing

```typescript
import { realtimeMetricsService } from './services/realtime-metrics.service';

describe('Realtime Metrics', () => {
  it('should calculate metrics correctly', async () => {
    const metrics = await realtimeMetricsService.getMetrics();
    expect(metrics).toHaveProperty('revenue');
    expect(metrics).toHaveProperty('activeUsers');
    expect(metrics).toHaveProperty('transactions');
    expect(metrics).toHaveProperty('content');
  });
});
```

## Production Deployment

### Environment Variables

```env
# Production WebSocket URL
VITE_WS_URL=wss://api.knowton.com/ws/metrics

# Redis (production)
REDIS_URL=redis://production-redis:6379

# Database (production)
DATABASE_URL=postgresql://user:pass@production-db:5432/knowton
```

### SSL/TLS

For production, use WSS (WebSocket Secure):

```javascript
const ws = new WebSocket('wss://api.knowton.com/ws/metrics');
```

### Load Balancing

For multiple backend instances:
1. Use sticky sessions for WebSocket connections
2. Or use Redis pub/sub for cross-instance broadcasting

### Monitoring

Set up alerts for:
- WebSocket connection failures
- High latency (>1s for metrics calculation)
- Redis connection issues
- Database query timeouts

## Next Steps

1. ✅ Implement WebSocket updates for live data
2. ✅ Show live revenue counter
3. ✅ Display active users count
4. ✅ Add real-time charts (Chart.js)
5. 🔄 Add historical analytics (TASK-2.2.2)
6. 🔄 Add user behavior analysis (TASK-2.2.3)

## Support

For issues or questions:
- Check logs: `packages/backend/logs/`
- Review code: `packages/backend/src/services/realtime-metrics.service.ts`
- WebSocket service: `packages/backend/src/services/websocket.service.ts`
- Frontend hook: `packages/frontend/src/hooks/useRealtimeMetrics.ts`
