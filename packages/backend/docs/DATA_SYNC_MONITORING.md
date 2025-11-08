# Data Sync Monitoring Guide

## Overview

The Data Sync Service (CDC - Change Data Capture) provides comprehensive monitoring capabilities to ensure data consistency across PostgreSQL, Elasticsearch, and ClickHouse. This guide covers health checks, metrics, alerts, and troubleshooting.

## Architecture

```
┌─────────────┐
│ PostgreSQL  │
└──────┬──────┘
       │ CDC Polling
       ▼
┌─────────────────┐
│  CDC Service    │◄──── Health Checks
│  (Monitoring)   │◄──── Prometheus Metrics
└────┬────┬───────┘
     │    │
     │    └──────────┐
     ▼               ▼
┌──────────┐   ┌──────────────┐
│  Kafka   │   │ ClickHouse   │
└──────────┘   │ Elasticsearch│
               └──────────────┘
```

## Health Check Endpoints

### 1. Health Status (`/api/v1/data-sync/health`)

Returns comprehensive health status of all sync components.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-08T10:30:00.000Z",
  "services": {
    "kafka": true,
    "clickhouse": true,
    "elasticsearch": true,
    "postgres": true
  },
  "metrics": {
    "syncLag": 2.5,
    "errorRate": 0.001,
    "throughput": 15.3
  }
}
```

**Status Values:**
- `healthy`: All services operational, metrics within thresholds
- `degraded`: Some services down or metrics elevated
- `unhealthy`: Critical services down or metrics critical

### 2. Readiness Probe (`/api/v1/data-sync/ready`)

Kubernetes readiness probe endpoint. Returns 200 if service is ready to accept traffic.

**Response:**
```json
{
  "ready": true,
  "message": "Service is ready"
}
```

### 3. Liveness Probe (`/api/v1/data-sync/live`)

Kubernetes liveness probe endpoint. Returns 200 if service is alive.

**Response:**
```json
{
  "alive": true,
  "message": "Service is alive"
}
```

### 4. Data Consistency Check (`/api/v1/data-sync/consistency`)

Validates data consistency across all systems.

**Response:**
```json
{
  "timestamp": "2025-11-08T10:30:00.000Z",
  "consistent": true,
  "issues": []
}
```

**With Issues:**
```json
{
  "timestamp": "2025-11-08T10:30:00.000Z",
  "consistent": false,
  "issues": [
    {
      "table": "User",
      "issue": "Count mismatch between PostgreSQL and Elasticsearch",
      "count": 5
    }
  ]
}
```

## Prometheus Metrics

### Sync Events

**`cdc_sync_events_total`** - Total number of CDC sync events processed
- Labels: `table`, `operation`, `status`
- Type: Counter

```promql
# Total successful syncs
sum(cdc_sync_events_total{status="success"})

# Success rate by table
rate(cdc_sync_events_total{status="success"}[5m]) / 
rate(cdc_sync_events_total[5m])
```

### Sync Errors

**`cdc_sync_errors_total`** - Total number of CDC sync errors
- Labels: `table`, `error_type`
- Type: Counter

```promql
# Error rate
rate(cdc_sync_errors_total[5m])

# Errors by type
sum by (error_type) (cdc_sync_errors_total)
```

### Sync Latency

**`cdc_sync_latency_seconds`** - Latency of CDC sync operations
- Labels: `table`, `operation`
- Type: Histogram
- Buckets: 0.001, 0.01, 0.1, 0.5, 1, 2, 5

```promql
# Average latency
rate(cdc_sync_latency_seconds_sum[5m]) / 
rate(cdc_sync_latency_seconds_count[5m])

# 95th percentile latency
histogram_quantile(0.95, 
  rate(cdc_sync_latency_seconds_bucket[5m]))
```

### Sync Lag

**`cdc_sync_lag_seconds`** - Sync lag in seconds for each table
- Labels: `table`
- Type: Gauge

```promql
# Maximum lag across all tables
max(cdc_sync_lag_seconds)

# Lag by table
cdc_sync_lag_seconds{table="Content"}
```

### Kafka Metrics

**`cdc_kafka_messages_published_total`** - Total messages published to Kafka
- Labels: `topic`
- Type: Counter

```promql
# Kafka publish rate
rate(cdc_kafka_messages_published_total[5m])
```

### ClickHouse Metrics

**`cdc_clickhouse_writes_total`** - Total writes to ClickHouse
- Labels: `table`, `status`
- Type: Counter

```promql
# ClickHouse write success rate
rate(cdc_clickhouse_writes_total{status="success"}[5m]) /
rate(cdc_clickhouse_writes_total[5m])
```

### Elasticsearch Metrics

**`cdc_elasticsearch_writes_total`** - Total writes to Elasticsearch
- Labels: `index`, `status`
- Type: Counter

```promql
# Elasticsearch write success rate
rate(cdc_elasticsearch_writes_total{status="success"}[5m]) /
rate(cdc_elasticsearch_writes_total[5m])
```

## Alert Rules

### High Sync Lag (Warning)
- **Condition**: `cdc_sync_lag_seconds > 60`
- **Duration**: 5 minutes
- **Severity**: Warning
- **Action**: Investigate sync performance

### Critical Sync Lag (Critical)
- **Condition**: `cdc_sync_lag_seconds > 300`
- **Duration**: 2 minutes
- **Severity**: Critical
- **Action**: Immediate investigation required

### High Error Rate (Warning)
- **Condition**: Error rate > 5%
- **Duration**: 5 minutes
- **Severity**: Warning
- **Action**: Check error logs

### Critical Error Rate (Critical)
- **Condition**: Error rate > 20%
- **Duration**: 2 minutes
- **Severity**: Critical
- **Action**: Immediate intervention required

### Service Down (Critical)
- **Condition**: Service unreachable
- **Duration**: 1 minute
- **Severity**: Critical
- **Action**: Restart service

## Data Consistency Validation

### Manual Validation

Run the validation script:

```bash
cd packages/backend
npm run validate:consistency
```

### Automated Validation

Set up a cron job or Kubernetes CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: data-consistency-check
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: validator
            image: ghcr.io/knowton/backend:latest
            command: ["npm", "run", "validate:consistency"]
```

### Validation Report

Reports are saved to `packages/backend/reports/` with timestamp:

```json
{
  "timestamp": "2025-11-08T10:30:00.000Z",
  "overallStatus": "PASS",
  "checks": [
    {
      "name": "CDC Service Health",
      "status": "PASS",
      "details": "Service status: healthy, Sync lag: 2.50s"
    },
    {
      "name": "Data Consistency",
      "status": "PASS",
      "details": "All data is consistent across systems"
    }
  ],
  "summary": {
    "totalChecks": 5,
    "passed": 5,
    "failed": 0,
    "warnings": 0
  }
}
```

## Troubleshooting

### High Sync Lag

**Symptoms:**
- `cdc_sync_lag_seconds` > 60
- Delayed data updates in Elasticsearch/ClickHouse

**Possible Causes:**
1. High database load
2. Network latency
3. Slow Elasticsearch/ClickHouse writes
4. Insufficient resources

**Solutions:**
1. Scale up CDC service replicas
2. Optimize database queries
3. Increase polling interval
4. Add more Elasticsearch/ClickHouse nodes

### High Error Rate

**Symptoms:**
- `cdc_sync_errors_total` increasing rapidly
- Failed writes to target systems

**Possible Causes:**
1. Target system unavailable
2. Schema mismatch
3. Data validation errors
4. Network issues

**Solutions:**
1. Check target system health
2. Verify schema compatibility
3. Review error logs for specific failures
4. Check network connectivity

### Data Inconsistency

**Symptoms:**
- Consistency check reports mismatches
- Different record counts across systems

**Possible Causes:**
1. Sync failures not retried
2. Manual data modifications
3. System downtime during sync
4. Race conditions

**Solutions:**
1. Run full resync for affected tables
2. Review audit logs for manual changes
3. Implement retry logic
4. Add transaction isolation

### Service Unhealthy

**Symptoms:**
- Health check returns `unhealthy`
- No sync events processed

**Possible Causes:**
1. Database connection lost
2. Kafka unavailable
3. Service crashed
4. Configuration error

**Solutions:**
1. Check database connectivity
2. Verify Kafka cluster health
3. Review service logs
4. Validate configuration

## Performance Tuning

### Polling Interval

Adjust polling frequency in `cdc-sync.service.ts`:

```typescript
// Default: 5 seconds
this.pollingInterval = setInterval(async () => {
  await this.pollChanges();
}, 5000);  // Increase for lower load, decrease for lower latency
```

### Batch Size

Optimize batch processing:

```typescript
const users = await prisma.user.findMany({
  where: { updatedAt: { gt: lastSync } },
  take: 100,  // Adjust batch size
  orderBy: { updatedAt: 'asc' },
});
```

### Resource Allocation

Kubernetes resource requests/limits:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "500m"
```

## Monitoring Dashboard

### Grafana Dashboard

Import the data sync dashboard from `k8s/dev/grafana-dashboards/data-sync-dashboard.json`

**Panels:**
1. Sync Lag by Table
2. Error Rate
3. Throughput (events/s)
4. Latency Percentiles
5. Service Health Status
6. Kafka Publish Rate
7. ClickHouse Write Success Rate
8. Elasticsearch Write Success Rate

### Key Metrics to Monitor

1. **Sync Lag**: Should be < 10s under normal load
2. **Error Rate**: Should be < 1%
3. **Throughput**: Varies by load, monitor trends
4. **Latency**: p95 should be < 1s
5. **Service Health**: Should be "healthy"

## Best Practices

1. **Monitor Continuously**: Set up alerts for all critical metrics
2. **Regular Validation**: Run consistency checks daily
3. **Capacity Planning**: Monitor trends and scale proactively
4. **Error Handling**: Implement retry logic with exponential backoff
5. **Logging**: Enable structured logging for debugging
6. **Testing**: Test sync behavior under load
7. **Documentation**: Keep runbooks updated
8. **Backup**: Regular backups of all data stores

## API Examples

### Check Health

```bash
curl http://localhost:3000/api/v1/data-sync/health
```

### Get Metrics

```bash
curl http://localhost:3000/api/v1/data-sync/metrics
```

### Validate Consistency

```bash
curl http://localhost:3000/api/v1/data-sync/consistency
```

### Kubernetes Probes

```bash
# Readiness
kubectl exec -it <pod-name> -- curl localhost:3000/api/v1/data-sync/ready

# Liveness
kubectl exec -it <pod-name> -- curl localhost:3000/api/v1/data-sync/live
```

## Support

For issues or questions:
- Check logs: `kubectl logs -f deployment/data-sync-service`
- Review metrics: Grafana dashboard
- Run validation: `npm run validate:consistency`
- Contact: devops@knowton.io
