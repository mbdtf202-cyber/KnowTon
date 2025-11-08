# Anomaly Detection - Quick Start Guide

## 🚀 Getting Started

### 1. Start the Detection Service

The anomaly detection service starts automatically with the backend server. To manually control it:

```typescript
import { anomalyDetectionService } from './services/anomaly-detection.service';

// Start detection
await anomalyDetectionService.startDetection();

// Stop detection
anomalyDetectionService.stopDetection();
```

### 2. View Active Anomalies

**Frontend:**

```typescript
import { AnomalyDetectionDashboard } from './components/AnomalyDetectionDashboard';

function App() {
  return <AnomalyDetectionDashboard />;
}
```

**API:**

```bash
curl http://localhost:3001/api/v1/analytics/anomaly-detection/active
```

### 3. Configure Detection

Update detection settings for a metric:

```bash
curl -X PUT http://localhost:3001/api/v1/analytics/anomaly-detection/config \
  -H "Content-Type: application/json" \
  -d '{
    "metric": "revenue",
    "enabled": true,
    "sensitivity": 8,
    "algorithms": ["zscore", "iqr", "mad"],
    "thresholds": {
      "min": 0
    },
    "alertChannels": ["email", "slack"]
  }'
```

## 📊 Common Use Cases

### Monitor Revenue Anomalies

```typescript
const { activeAnomalies } = useAnomalyDetection();

const revenueAnomalies = activeAnomalies.filter(
  alert => alert.anomaly.metric === 'revenue'
);
```

### Get High Severity Alerts

```typescript
const { fetchActiveAnomalies } = useAnomalyDetection();

await fetchActiveAnomalies({ severity: 'high' });
```

### Investigate an Anomaly

```typescript
const { investigateAnomaly } = useAnomalyDetection();

const investigation = await investigateAnomaly(alertId);
console.log('Historical data:', investigation.context.historicalData);
console.log('Similar anomalies:', investigation.context.similarAnomalies);
```

### Acknowledge and Resolve

```typescript
const { acknowledgeAnomaly, resolveAnomaly } = useAnomalyDetection();

// Acknowledge
await acknowledgeAnomaly(alertId, 'john@example.com');

// Resolve with notes
await resolveAnomaly(alertId, 'Fixed by restarting the service');
```

## 🔧 Configuration Examples

### High Sensitivity (More Alerts)

```json
{
  "metric": "error_rate",
  "enabled": true,
  "sensitivity": 9,
  "algorithms": ["zscore", "iqr", "mad"],
  "thresholds": {
    "max": 5
  },
  "alertChannels": ["email", "slack", "webhook"]
}
```

### Low Sensitivity (Fewer Alerts)

```json
{
  "metric": "response_time",
  "enabled": true,
  "sensitivity": 3,
  "algorithms": ["zscore"],
  "thresholds": {
    "max": 2000
  },
  "alertChannels": ["slack"]
}
```

### Balanced Configuration

```json
{
  "metric": "active_users",
  "enabled": true,
  "sensitivity": 6,
  "algorithms": ["zscore", "iqr"],
  "thresholds": {
    "min": 0
  },
  "alertChannels": ["email"]
}
```

## 📈 Monitoring Metrics

### Default Monitored Metrics

1. **Revenue** - Total platform revenue
2. **Active Users** - Currently active users
3. **Transactions** - Transaction count
4. **Error Rate** - System error percentage
5. **Response Time** - API response time

### Add Custom Metrics

To monitor custom metrics, update the configuration:

```typescript
await anomalyDetectionService.updateDetectionConfig({
  metric: 'custom_metric_name',
  enabled: true,
  sensitivity: 7,
  algorithms: ['zscore', 'iqr'],
  alertChannels: ['email'],
});
```

## 🔔 Alert Channels

### Email Alerts

Configure email settings in `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
ALERT_EMAIL_TO=alerts@yourcompany.com
```

### Slack Alerts

Configure Slack webhook in `.env`:

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Custom Webhooks

Configure custom webhook in `.env`:

```env
ANOMALY_WEBHOOK_URL=https://your-api.com/webhooks/anomaly
```

## 📊 Dashboard Integration

### Add to Analytics Page

```typescript
import { AnomalyDetectionDashboard } from '../components/AnomalyDetectionDashboard';

function AnalyticsPage() {
  return (
    <div>
      <h1>Analytics Dashboard</h1>
      <AnomalyDetectionDashboard />
    </div>
  );
}
```

### Real-time Updates

The dashboard automatically refreshes every minute. For real-time updates via WebSocket:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('anomaly-detected', (alert) => {
  console.log('New anomaly:', alert);
  // Update UI
});
```

## 🧪 Testing

### Run Test Script

```bash
cd packages/backend
npm run test:anomaly-detection
```

### Manual Testing

1. Generate test anomaly:
```bash
# Simulate spike in revenue
curl -X POST http://localhost:3001/api/v1/test/generate-anomaly \
  -H "Content-Type: application/json" \
  -d '{"metric": "revenue", "type": "spike", "magnitude": 200}'
```

2. Check for detection:
```bash
curl http://localhost:3001/api/v1/analytics/anomaly-detection/active
```

## 📝 Best Practices

1. **Start with default settings** - Adjust based on your needs
2. **Monitor false positive rate** - Tune sensitivity accordingly
3. **Use multiple algorithms** - Better accuracy
4. **Set appropriate thresholds** - For critical metrics
5. **Document resolutions** - Help future investigations
6. **Review statistics regularly** - Identify patterns

## 🐛 Troubleshooting

### No Anomalies Detected

- Check if detection service is running
- Verify metrics are being collected
- Increase sensitivity
- Check Redis connection

### Too Many False Positives

- Decrease sensitivity
- Use more robust algorithms (IQR, MAD)
- Adjust thresholds
- Increase historical data window

### Alerts Not Received

- Check alert channel configuration
- Verify email/Slack credentials
- Check alert cooldown period
- Review logs for errors

## 📚 Next Steps

- Read full documentation: [ANOMALY_DETECTION.md](./ANOMALY_DETECTION.md)
- Explore investigation tools
- Set up custom metrics
- Configure alert routing
- Integrate with incident management

## 🆘 Support

- GitHub Issues: [Report a bug](https://github.com/yourorg/knowton/issues)
- Documentation: [Full docs](./ANOMALY_DETECTION.md)
- Email: support@yourcompany.com
