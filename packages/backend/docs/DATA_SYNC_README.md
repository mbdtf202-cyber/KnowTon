# Data Sync Service - Complete Guide

## 📖 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Features](#features)
5. [API Reference](#api-reference)
6. [Monitoring](#monitoring)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

## Overview

The Data Sync Service (CDC - Change Data Capture) ensures data consistency across PostgreSQL, Elasticsearch, and ClickHouse by continuously monitoring database changes and synchronizing them to target systems.

### Key Features

- ✅ Real-time change data capture
- ✅ Multi-target synchronization (Elasticsearch, ClickHouse)
- ✅ Comprehensive health monitoring
- ✅ Prometheus metrics export
- ✅ Automated alerting
- ✅ Data consistency validation
- ✅ Kubernetes-ready deployment

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Kafka 3.0+
- ClickHouse 22+
- Elasticsearch 8+
- Redis 7+

### Installation

```bash
cd packages/backend
npm install
```

### Configuration

Set environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/knowton

# Kafka
KAFKA_BROKERS=localhost:9092

# ClickHouse
CLICKHOUSE_HOST=http://localhost:8123
CLICKHOUSE_DATABASE=knowton
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# Redis
REDIS_URL=redis://localhost:6379
```

### Start Service

```bash
npm run dev
```

### Verify Health

```bash
curl http://localhost:3000/api/v1/data-sync/health
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL                            │
│              (Source of Truth)                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ CDC Polling (5s interval)
                     ▼
┌─────────────────────────────────────────────────────────┐
│              CDC Sync Service                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Change Detection & Processing                   │   │
│  │  - User changes                                  │   │
│  │  - Content changes                               │   │
│  │  - NFT changes                                   │   │
│  │  - Transaction changes                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Monitoring & Metrics                            │   │
│  │  - Health checks                                 │   │
│  │  - Prometheus metrics                            │   │
│  │  - Consistency validation                        │   │
│  └─────────────────────────────────────────────────┘   │
└────┬──────────────────┬──────────────────┬──────────────┘
     │                  │                  │
     │                  │                  │
     ▼                  ▼                  ▼
┌──────────┐    ┌──────────────┐   ┌──────────────┐
│  Kafka   │    │ Elasticsearch│   │  ClickHouse  │
│ (Events) │    │  (Search)    │   │ (Analytics)  │
└──────────┘    └──────────────┘   └──────────────┘
```

## Features

### 1. Change Data Capture

**Supported Tables:**
- User
- Creator
- Content
- NFT
- Transaction
- RoyaltyPayment

**Sync Targets:**
- Elasticsearch (for search)
- ClickHouse (for analytics)
- Kafka (for event streaming)

### 2. Health Monitoring

**Endpoints:**
- `/api/v1/data-sync/health` - Comprehensive health status
- `/api/v1/data-sync/ready` - Readiness probe
- `/api/v1/data-sync/live` - Liveness probe
- `/api/v1/data-sync/consistency` - Data consistency check

**Health Checks:**
- Kafka connectivity
- ClickHouse connectivity
- Elasticsearch connectivity
- PostgreSQL connectivity

### 3. Prometheus Metrics

**Available Metrics:**
- `cdc_sync_events_total` - Total sync events
- `cdc_sync_errors_total` - Total errors
- `cdc_sync_latency_seconds` - Operation latency
- `cdc_sync_lag_seconds` - Sync lag per table
- `cdc_kafka_messages_published_total` - Kafka publishes
- `cdc_clickhouse_writes_total` - ClickHouse writes
- `cdc_elasticsearch_writes_total` - Elasticsearch writes

### 4. Alerting

**Alert Rules:**
- High sync lag (> 60s)
- Critical sync lag (> 300s)
- High error rate (> 5%)
- Critical error rate (> 20%)
- Service down
- Low throughput
- Target system failures

### 5. Data Consistency Validation

**Validation Script:**
```bash
npm run validate:consistency
```

**Checks:**
- Record count consistency
- Cross-system validation
- Sync lag validation
- Error rate validation

## API Reference

### Health Status

**GET** `/api/v1/data-sync/health`

Returns comprehensive health status.

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

### Readiness Probe

**GET** `/api/v1/data-sync/ready`

Kubernetes readiness probe.

**Response:**
```json
{
  "ready": true,
  "message": "Service is ready"
}
```

### Liveness Probe

**GET** `/api/v1/data-sync/live`

Kubernetes liveness probe.

**Response:**
```json
{
  "alive": true,
  "message": "Service is alive"
}
```

### Prometheus Metrics

**GET** `/api/v1/data-sync/metrics`

Returns Prometheus metrics in text format.

**Response:**
```
# HELP cdc_sync_events_total Total number of CDC sync events processed
# TYPE cdc_sync_events_total counter
cdc_sync_events_total{table="User",operation="INSERT",status="success"} 1234

# HELP cdc_sync_lag_seconds Sync lag in seconds for each table
# TYPE cdc_sync_lag_seconds gauge
cdc_sync_lag_seconds{table="User"} 2.5
```

### Data Consistency

**GET** `/api/v1/data-sync/consistency`

Validates data consistency across systems.

**Response:**
```json
{
  "timestamp": "2025-11-08T10:30:00.000Z",
  "consistent": true,
  "issues": []
}
```

## Monitoring

### Grafana Dashboard

Import dashboard: `k8s/dev/grafana-dashboards/data-sync-dashboard.json`

**Key Panels:**
1. Sync Lag by Table
2. Error Rate
3. Throughput
4. Latency Percentiles
5. Service Health
6. Write Success Rates

### Prometheus Queries

**Sync Lag:**
```promql
max(cdc_sync_lag_seconds)
```

**Error Rate:**
```promql
rate(cdc_sync_errors_total[5m]) / rate(cdc_sync_events_total[5m])
```

**Throughput:**
```promql
rate(cdc_sync_events_total{status="success"}[5m])
```

**Latency (p95):**
```promql
histogram_quantile(0.95, rate(cdc_sync_latency_seconds_bucket[5m]))
```

### Alerts

Configure AlertManager with rules from `k8s/dev/data-sync-alerts.yaml`

**Critical Alerts:**
- Service down
- Critical sync lag
- Critical error rate
- Data consistency issues

**Warning Alerts:**
- High sync lag
- High error rate
- Low throughput
- Target system failures

## Deployment

### Docker

```bash
docker build -t knowton/data-sync:latest .
docker run -p 3000:3000 knowton/data-sync:latest
```

### Kubernetes

```bash
# Deploy service
kubectl apply -f k8s/dev/data-sync-deployment.yaml

# Deploy alerts
kubectl apply -f k8s/dev/data-sync-alerts.yaml

# Check status
kubectl get pods -l app=data-sync-service

# View logs
kubectl logs -f deployment/data-sync-service
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `KAFKA_BROKERS` | Yes | localhost:9092 | Kafka broker list |
| `CLICKHOUSE_HOST` | Yes | http://localhost:8123 | ClickHouse host |
| `CLICKHOUSE_DATABASE` | No | knowton | ClickHouse database |
| `CLICKHOUSE_USER` | No | default | ClickHouse user |
| `CLICKHOUSE_PASSWORD` | No | - | ClickHouse password |
| `ELASTICSEARCH_URL` | Yes | http://localhost:9200 | Elasticsearch URL |
| `REDIS_URL` | Yes | redis://localhost:6379 | Redis URL |
| `CDC_POLLING_INTERVAL` | No | 5000 | Polling interval (ms) |
| `CDC_BATCH_SIZE` | No | 100 | Batch size |

## Troubleshooting

### High Sync Lag

**Symptoms:**
- Sync lag > 60 seconds
- Delayed data updates

**Solutions:**
1. Check database load
2. Increase polling interval
3. Scale up replicas
4. Optimize queries

**Commands:**
```bash
# Check lag
curl localhost:3000/api/v1/data-sync/health | jq .metrics.syncLag

# Check database
psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

### High Error Rate

**Symptoms:**
- Error rate > 5%
- Failed writes

**Solutions:**
1. Check target system health
2. Review error logs
3. Verify schema compatibility
4. Check network connectivity

**Commands:**
```bash
# Check errors
curl localhost:3000/api/v1/data-sync/metrics | grep cdc_sync_errors_total

# View logs
kubectl logs -f deployment/data-sync-service | grep ERROR
```

### Data Inconsistency

**Symptoms:**
- Mismatched record counts
- Missing data

**Solutions:**
1. Run consistency validation
2. Check sync logs
3. Verify target system health
4. Run manual resync

**Commands:**
```bash
# Validate consistency
npm run validate:consistency

# Check specific table
curl localhost:3000/api/v1/data-sync/consistency | jq '.issues[] | select(.table=="User")'
```

### Service Unhealthy

**Symptoms:**
- Health check fails
- No sync events

**Solutions:**
1. Check service logs
2. Verify dependencies
3. Restart service
4. Check configuration

**Commands:**
```bash
# Check health
curl localhost:3000/api/v1/data-sync/health

# Restart service
kubectl rollout restart deployment/data-sync-service

# Check logs
kubectl logs -f deployment/data-sync-service
```

## Documentation

- **Complete Guide**: [DATA_SYNC_MONITORING.md](./DATA_SYNC_MONITORING.md)
- **Quick Start**: [DATA_SYNC_MONITORING_QUICK_START.md](./DATA_SYNC_MONITORING_QUICK_START.md)
- **Implementation**: [TASK_13.8_COMPLETION.md](./TASK_13.8_COMPLETION.md)
- **Summary**: [DATA_SYNC_MONITORING_SUMMARY.md](./DATA_SYNC_MONITORING_SUMMARY.md)

## Support

- **Health Check**: http://localhost:3000/api/v1/data-sync/health
- **Metrics**: http://localhost:3000/api/v1/data-sync/metrics
- **Validation**: `npm run validate:consistency`
- **Logs**: `kubectl logs -f deployment/data-sync-service`

---

**Version**: 1.0.0
**Last Updated**: 2025-11-08
**Status**: Production Ready ✅
