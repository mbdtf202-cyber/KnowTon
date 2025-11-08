# Anomaly Detection System

## Overview

The Anomaly Detection System provides real-time monitoring and alerting for unusual patterns in platform metrics. It uses multiple statistical algorithms to detect anomalies with high accuracy and low false positive rates.

## Features

### 1. Multi-Algorithm Detection

The system implements four different anomaly detection algorithms:

- **Z-Score Detection**: Statistical method based on standard deviations
- **IQR (Interquartile Range)**: Robust to outliers, uses quartiles
- **MAD (Median Absolute Deviation)**: Highly robust statistical method
- **Isolation Forest**: Machine learning-inspired approach

### 2. Anomaly Types

The system can detect various types of anomalies:

- **Spike**: Sudden increase in metric value
- **Drop**: Sudden decrease in metric value
- **Outlier**: Value significantly different from normal
- **Threshold Breach**: Value exceeds configured limits
- **Trend Change**: Significant change in trend direction
- **Pattern Break**: Deviation from expected patterns

### 3. Severity Levels

Anomalies are classified into four severity levels:

- **Critical**: Requires immediate attention (>95% deviation)
- **High**: Significant issue (50-95% deviation)
- **Medium**: Notable deviation (20-50% deviation)
- **Low**: Minor deviation (<20% deviation)

### 4. Automated Alerts

The system supports multiple alert channels:

- Email notifications
- Slack webhooks
- Custom webhooks
- Real-time WebSocket updates

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Anomaly Detection Service              │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Z-Score    │  │     IQR      │  │     MAD      │ │
│  │  Detection   │  │  Detection   │  │  Detection   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐                   │
│  │  Isolation   │  │  Threshold   │                   │
│  │   Forest     │  │   Checker    │                   │
│  └──────────────┘  └──────────────┘                   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │           Alert Management System               │  │
│  │  - Email  - Slack  - Webhook  - WebSocket      │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    Data Sources                         │
│  - ClickHouse  - PostgreSQL  - Redis  - Metrics API    │
└─────────────────────────────────────────────────────────┘
```

## API Endpoints

### Get Active Anomalies

```http
GET /api/v1/analytics/anomaly-detection/active
Query Parameters:
  - metric: string (optional)
  - severity: string (optional)
  - type: string (optional)
```

### Get Anomaly History

```http
GET /api/v1/analytics/anomaly-detection/history
Query Parameters:
  - startDate: ISO date (required)
  - endDate: ISO date (required)
  - metric: string (optional)
  - severity: string (optional)
  - type: string (optional)
```

### Get Statistics

```http
GET /api/v1/analytics/anomaly-detection/statistics
Query Parameters:
  - startDate: ISO date (required)
  - endDate: ISO date (required)
```

### Investigate Anomaly

```http
GET /api/v1/analytics/anomaly-detection/:alertId/investigate
```

### Acknowledge Anomaly

```http
POST /api/v1/analytics/anomaly-detection/:alertId/acknowledge
Body:
  {
    "acknowledgedBy": "user-id"
  }
```

### Resolve Anomaly

```http
POST /api/v1/analytics/anomaly-detection/:alertId/resolve
Body:
  {
    "notes": "Resolution description"
  }
```

### Update Configuration

```http
PUT /api/v1/analytics/anomaly-detection/config
Body:
  {
    "metric": "revenue",
    "enabled": true,
    "sensitivity": 7,
    "algorithms": ["zscore", "iqr", "mad"],
    "thresholds": {
      "min": 0,
      "max": 10000
    },
    "alertChannels": ["email", "slack"]
  }
```

## Configuration

### Detection Configuration

Each metric can be configured with:

```typescript
{
  metric: string;              // Metric name
  enabled: boolean;            // Enable/disable detection
  sensitivity: number;         // 1-10, higher = more sensitive
  algorithms: string[];        // Detection algorithms to use
  thresholds?: {              // Optional hard limits
    min?: number;
    max?: number;
  };
  alertChannels: string[];    // Alert delivery channels
}
```

### Default Configurations

The system comes with pre-configured detection for:

- **Revenue**: High sensitivity (7), all algorithms
- **Active Users**: Medium sensitivity (6), Z-Score + IQR
- **Transactions**: High sensitivity (7), Z-Score + MAD
- **Error Rate**: Very high sensitivity (9), all algorithms
- **Response Time**: High sensitivity (8), Z-Score + IQR

## Usage Examples

### Frontend Integration

```typescript
import { useAnomalyDetection } from '../hooks/useAnomalyDetection';

function AnomalyDashboard() {
  const {
    activeAnomalies,
    statistics,
    fetchActiveAnomalies,
    acknowledgeAnomaly,
    resolveAnomaly,
  } = useAnomalyDetection();

  useEffect(() => {
    fetchActiveAnomalies();
  }, []);

  return (
    <div>
      {activeAnomalies.map(alert => (
        <AnomalyCard
          key={alert.id}
          alert={alert}
          onAcknowledge={() => acknowledgeAnomaly(alert.id, 'user-123')}
          onResolve={() => resolveAnomaly(alert.id, 'Fixed the issue')}
        />
      ))}
    </div>
  );
}
```

### Backend Service

```typescript
import { anomalyDetectionService } from './services/anomaly-detection.service';

// Start detection
await anomalyDetectionService.startDetection();

// Listen for anomalies
anomalyDetectionService.on('anomaly-detected', (alert) => {
  console.log('Anomaly detected:', alert);
  // Send notifications, trigger workflows, etc.
});

// Get active anomalies
const anomalies = await anomalyDetectionService.getActiveAnomalies({
  severity: 'high',
});

// Investigate an anomaly
const investigation = await anomalyDetectionService.investigateAnomaly(alertId);
```

## Algorithm Details

### Z-Score Detection

Detects anomalies based on standard deviations from the mean:

```
z = (x - μ) / σ
```

- Threshold: 1.5 to 3 (based on sensitivity)
- Best for: Normally distributed data
- Pros: Simple, fast, well-understood
- Cons: Sensitive to outliers in historical data

### IQR Detection

Uses interquartile range for robust detection:

```
Lower Bound = Q1 - k * IQR
Upper Bound = Q3 + k * IQR
```

- Multiplier (k): 1.5 to 3 (based on sensitivity)
- Best for: Skewed distributions
- Pros: Robust to outliers
- Cons: Less sensitive to gradual changes

### MAD Detection

Median Absolute Deviation for highly robust detection:

```
MAD = median(|x - median(x)|)
Modified Z-Score = 0.6745 * (x - median) / MAD
```

- Threshold: 2.5 to 3.5 (based on sensitivity)
- Best for: Data with extreme outliers
- Pros: Very robust
- Cons: Computationally more expensive

### Isolation Forest

Simplified isolation-based detection:

```
Isolation Score = distance / (3 * stddev)
```

- Threshold: 0.4 to 0.7 (based on sensitivity)
- Best for: Complex patterns
- Pros: Detects novel anomalies
- Cons: Requires more data

## Performance

- Detection interval: 60 seconds
- Alert cooldown: 15 minutes (prevents spam)
- Cache duration: 5 minutes (active anomalies)
- Historical data: 30 days for analysis

## Best Practices

1. **Start with default configurations** and adjust based on false positive rates
2. **Use multiple algorithms** for better accuracy
3. **Set appropriate thresholds** for critical metrics
4. **Acknowledge anomalies** to track investigation progress
5. **Add resolution notes** for future reference
6. **Monitor alert frequency** to tune sensitivity

## Troubleshooting

### High False Positive Rate

- Decrease sensitivity (lower number)
- Use more robust algorithms (IQR, MAD)
- Increase threshold values
- Add more historical data

### Missing Anomalies

- Increase sensitivity (higher number)
- Use more algorithms
- Decrease threshold values
- Check if metric is being tracked

### Performance Issues

- Reduce detection frequency
- Limit number of metrics
- Optimize historical data queries
- Use caching effectively

## Future Enhancements

- Machine learning-based detection
- Seasonal pattern recognition
- Correlation analysis between metrics
- Predictive anomaly detection
- Custom algorithm plugins
- Advanced visualization tools

## Support

For issues or questions:
- Check logs: `packages/backend/logs/`
- Review metrics: Redis keys `anomaly:*`
- Test detection: `npm run test:anomaly-detection`
