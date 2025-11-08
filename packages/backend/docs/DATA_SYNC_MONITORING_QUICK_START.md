# Data Sync Monitoring - Quick Start Guide

## 🚀 Quick Setup

### 1. Start the Service

The CDC Sync Service starts automatically with the backend:

```bash
cd packages/backend
npm run dev
```

### 2. Verify Health

```bash
curl http://localhost:3000/api/v1/data-sync/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "kafka": true,
    "clickhouse": true,
    "elasticsearch": true,
    "postgres": true
  }
}
```

### 3. Check Metrics

```bash
curl http://localhost:3000/api/v1/data-sync/metrics
```

## 📊 Key Endpoints

| Endpoint | Purpose | Status Codes |
|----------|---------|--------------|
| `/api/v1/data-sync/health` | Comprehensive health status | 200, 503 |
| `/api/v1/data-sync/ready` | Kubernetes readiness probe | 200, 503 |
| `/api/v1/data-sync/live` | Kubernetes liveness probe | 200, 503 |
| `/api/v1/data-sync/metrics` | Prometheus metrics | 200 |
| `/api/v1/data-sync/consistency` | Data consistency check | 200 |

## 🔍 Quick Checks

### Check Sync Lag

```bash
curl -s http://localhost:3000/api/v1/data-sync/metrics | grep cdc_sync_lag_seconds
```

### Check Error Rate

```bash
curl -s http://localhost:3000/api/v1/data-sync/metrics | grep cdc_sync_errors_total
```

### Validate Data Consistency

```bash
npm run validate:consistency
```

## 🎯 Common Metrics

### Sync Events
```promql
# Total successful syncs
sum(cdc_sync_events_total{status="success"})

# Events per second
rate(cdc_sync_events_total[5m])
```

### Sync Lag
```promql
# Maximum lag
max(cdc_sync_lag_seconds)

# Lag by table
cdc_sync_lag_seconds{table="Content"}
```

### Error Rate
```promql
# Overall error rate
rate(cdc_sync_errors_total[5m]) / rate(cdc_sync_events_total[5m])
```

## 🚨 Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Sync Lag | > 60s | > 300s |
| Error Rate | > 5% | > 20% |
| Service Down | - | > 1min |

## 🛠️ Troubleshooting

### Service Not Starting

```bash
# Check logs
npm run dev 2>&1 | grep -i error

# Verify dependencies
docker ps | grep -E "kafka|clickhouse|elasticsearch|postgres"
```

### High Sync Lag

```bash
# Check database load
psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check ClickHouse
curl http://localhost:8123/ping

# Check Elasticsearch
curl http://localhost:9200/_cluster/health
```

### Data Inconsistency

```bash
# Run validation
npm run validate:consistency

# Check specific table
psql -c "SELECT COUNT(*) FROM users;"
curl -X GET "localhost:9200/knowton-users/_count"
```

## 📈 Grafana Dashboard

1. Import dashboard: `k8s/dev/grafana-dashboards/data-sync-dashboard.json`
2. Access: http://localhost:3000/grafana
3. Navigate to: Dashboards → Data Sync Monitoring

## 🔧 Configuration

### Environment Variables

```bash
# Polling interval (milliseconds)
CDC_POLLING_INTERVAL=5000

# Batch size
CDC_BATCH_SIZE=100

# Enable debug logging
DEBUG=cdc:*
```

### Kubernetes Deployment

```bash
# Deploy
kubectl apply -f k8s/dev/data-sync-deployment.yaml

# Check status
kubectl get pods -l app=data-sync-service

# View logs
kubectl logs -f deployment/data-sync-service
```

## 📝 Quick Commands

```bash
# Health check
curl localhost:3000/api/v1/data-sync/health | jq

# Metrics
curl localhost:3000/api/v1/data-sync/metrics

# Consistency check
curl localhost:3000/api/v1/data-sync/consistency | jq

# Validate (script)
npm run validate:consistency

# Watch metrics
watch -n 5 'curl -s localhost:3000/api/v1/data-sync/health | jq .metrics'
```

## 🎓 Next Steps

1. Review full documentation: [DATA_SYNC_MONITORING.md](./DATA_SYNC_MONITORING.md)
2. Set up Prometheus alerts: `k8s/dev/data-sync-alerts.yaml`
3. Configure Grafana dashboard
4. Schedule consistency validation cron job
5. Set up PagerDuty/Slack notifications

## 📞 Support

- Documentation: `packages/backend/docs/DATA_SYNC_MONITORING.md`
- Logs: `kubectl logs -f deployment/data-sync-service`
- Metrics: http://localhost:3000/api/v1/data-sync/metrics
- Health: http://localhost:3000/api/v1/data-sync/health
