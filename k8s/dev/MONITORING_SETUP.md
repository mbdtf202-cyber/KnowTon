# KnowTon Platform Monitoring Setup

## Overview

This document describes the complete monitoring setup for the KnowTon platform, including Prometheus metrics, Grafana dashboards, and AlertManager configuration.

## Architecture

```
┌─────────────────┐
│  Applications   │
│  (Backend, AI,  │
│   Services)     │
└────────┬────────┘
         │ /metrics endpoint
         ▼
┌─────────────────┐
│   Prometheus    │◄──── Scrapes metrics every 15s
│   (Metrics DB)  │
└────────┬────────┘
         │
         ├──────────────┐
         │              │
         ▼              ▼
┌─────────────────┐  ┌──────────────┐
│    Grafana      │  │ AlertManager │
│  (Dashboards)   │  │  (Alerts)    │
└─────────────────┘  └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ Slack/Email  │
                     │ Notifications│
                     └──────────────┘
```

## Components

### 1. Prometheus

**Purpose**: Time-series database for metrics collection and storage

**Configuration**: `k8s/dev/prometheus.yaml`

**Key Features**:
- Scrapes metrics from all services every 15s
- Stores data for 30 days
- Evaluates alert rules every 15s
- Service discovery for Kubernetes pods

**Endpoints**:
- Web UI: `http://prometheus-service:9090`
- Metrics: `http://prometheus-service:9090/metrics`
- API: `http://prometheus-service:9090/api/v1/`

### 2. Grafana

**Purpose**: Visualization and dashboards for metrics

**Configuration**: `k8s/dev/grafana.yaml`

**Dashboards**:
1. **Service Health Dashboard** (`service-health-dashboard.json`)
   - Service uptime status
   - CPU and memory usage by service
   - API request rate and response times
   - Error rates
   - Database connections

2. **Business Metrics Dashboard** (`business-metrics-dashboard.json`)
   - NFT minting rate
   - Trading volume and revenue
   - Active users
   - Total NFTs and bonds
   - Total value locked (TVL)
   - Content distribution by type

3. **Technical Health Dashboard** (`knowton-technical-dashboard.json`)
   - System resource utilization
   - Request rates and latencies
   - Service availability
   - Database connection pools

4. **Business Dashboard** (`knowton-business-dashboard.json`)
   - Revenue streams
   - DeFi activity
   - Service request patterns
   - Content uploads by type

**Endpoints**:
- Web UI: `http://grafana-service:3000`
- Default credentials: `admin/admin` (change on first login)

### 3. AlertManager

**Purpose**: Alert routing and notification management

**Configuration**: `k8s/dev/alertmanager.yaml`

**Features**:
- Groups related alerts
- Deduplicates alerts
- Routes alerts based on severity
- Sends notifications to Slack/PagerDuty/Email

**Alert Severity Levels**:
- **Critical**: Immediate action required (service down, database failure)
- **Warning**: Attention needed (high resource usage, elevated error rates)
- **Info**: Informational (low activity, trends)

**Endpoints**:
- Web UI: `http://alertmanager-service:9093`

## Metrics Exported

### System Metrics (Default)
- `process_cpu_seconds_total`: CPU time consumed
- `process_resident_memory_bytes`: Memory usage
- `nodejs_heap_size_total_bytes`: Node.js heap size
- `nodejs_heap_size_used_bytes`: Node.js heap usage

### HTTP Metrics
- `http_requests_total`: Total HTTP requests (by method, route, status)
- `http_request_duration_seconds`: Request duration histogram
- `active_connections`: Current active connections

### Business Metrics
- `knowton_nft_mints_total`: Total NFTs minted (by category, creator)
- `knowton_total_nfts`: Total NFTs on platform
- `knowton_trading_volume_usd`: Trading volume in USD (by pair, timeframe)
- `knowton_royalty_revenue_usd`: Royalty revenue (by creator, NFT)
- `knowton_active_users_total`: Active users (by timeframe)
- `knowton_active_bonds_total`: Number of active IP bonds
- `knowton_total_value_locked_usd`: Total value locked
- `knowton_nfts_by_category`: NFTs by category

### AI Metrics
- `knowton_ai_processing_duration_seconds`: AI processing time
- `knowton_fingerprinting_total`: Fingerprinting operations
- `knowton_valuation_total`: Valuation operations
- `knowton_recommendation_total`: Recommendation requests

### Blockchain Metrics
- `knowton_gas_fees_total`: Gas fees spent (by operation, network)
- `knowton_transaction_errors_total`: Transaction errors

### Database Metrics
- `db_query_duration_seconds`: Database query duration
- `redis_cache_total`: Redis cache operations
- `kafka_messages_total`: Kafka messages

## Alert Rules

### Service Health Alerts

**ServiceDown**
- **Condition**: Service is unreachable for 2 minutes
- **Severity**: Critical
- **Action**: Immediate investigation required

**HighErrorRate**
- **Condition**: Error rate > 5% for 5 minutes
- **Severity**: Warning
- **Action**: Check logs and investigate cause

**HighResponseTime**
- **Condition**: P95 response time > 1 second for 10 minutes
- **Severity**: Warning
- **Action**: Performance investigation needed

### Resource Alerts

**HighCPUUsage**
- **Condition**: CPU usage > 80% for 10 minutes
- **Severity**: Warning
- **Action**: Consider scaling or optimization

**HighMemoryUsage**
- **Condition**: Memory usage > 85% for 10 minutes
- **Severity**: Warning
- **Action**: Check for memory leaks or scale up

**PodCrashLooping**
- **Condition**: Pod restarts detected in 15 minutes
- **Severity**: Critical
- **Action**: Check pod logs immediately

### Database Alerts

**PostgreSQLDown**
- **Condition**: PostgreSQL unreachable for 1 minute
- **Severity**: Critical
- **Action**: Immediate database recovery

**HighDatabaseConnections**
- **Condition**: > 80 active connections for 5 minutes
- **Severity**: Warning
- **Action**: Check for connection leaks

### Business Alerts

**LowNFTMintingRate**
- **Condition**: < 1 NFT minted per hour for 2 hours
- **Severity**: Warning
- **Action**: Check platform health and user activity

**NoActiveUsers**
- **Condition**: < 10 active users in 24h for 1 hour
- **Severity**: Warning
- **Action**: Investigate user experience issues

**HighTransactionFailureRate**
- **Condition**: Transaction failure rate > 10% for 10 minutes
- **Severity**: Warning
- **Action**: Check blockchain connectivity and gas prices

## Deployment

### 1. Deploy Prometheus

```bash
kubectl apply -f k8s/dev/prometheus.yaml
kubectl apply -f k8s/dev/prometheus-alerts.yaml
```

### 2. Deploy AlertManager

```bash
kubectl apply -f k8s/dev/alertmanager.yaml
```

### 3. Deploy Grafana

```bash
kubectl apply -f k8s/dev/grafana.yaml
```

### 4. Import Dashboards

Dashboards are automatically provisioned from ConfigMaps:
- Service Health Dashboard
- Business Metrics Dashboard
- Technical Health Dashboard
- Business Dashboard

### 5. Configure Slack Notifications

Edit `k8s/dev/alertmanager.yaml` and update:

```yaml
slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
```

Create Slack channels:
- `#knowton-alerts` - All alerts
- `#knowton-critical` - Critical alerts only
- `#knowton-warnings` - Warning alerts
- `#knowton-info` - Info alerts

## Accessing Dashboards

### Port Forwarding (Development)

```bash
# Prometheus
kubectl port-forward -n knowton-dev svc/prometheus-service 9090:9090

# Grafana
kubectl port-forward -n knowton-dev svc/grafana-service 3000:3000

# AlertManager
kubectl port-forward -n knowton-dev svc/alertmanager-service 9093:9093
```

Then access:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000
- AlertManager: http://localhost:9093

### Production Access

Configure Ingress rules in `k8s/dev/ingress.yaml`:

```yaml
- host: prometheus.knowton.io
  http:
    paths:
      - path: /
        backend:
          serviceName: prometheus-service
          servicePort: 9090

- host: grafana.knowton.io
  http:
    paths:
      - path: /
        backend:
          serviceName: grafana-service
          servicePort: 3000
```

## Metrics Exporter Service

The backend includes an automated metrics exporter that periodically updates business metrics:

**File**: `packages/backend/src/services/metrics-exporter.service.ts`

**Features**:
- Exports metrics every 30 seconds
- Aggregates data from database
- Updates Prometheus gauges and counters
- Handles errors gracefully

**Metrics Updated**:
- Total NFTs
- Active users (24h, 7d, 30d)
- Trading volume (24h, 7d, 30d)
- Royalty revenue
- Active bonds and TVL
- NFTs by category

## Querying Metrics

### PromQL Examples

**Average response time by service**:
```promql
avg(rate(http_request_duration_seconds_sum[5m])) by (service)
/ 
avg(rate(http_request_duration_seconds_count[5m])) by (service)
```

**Error rate percentage**:
```promql
sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
/
sum(rate(http_requests_total[5m])) by (service)
* 100
```

**Top 5 NFT categories**:
```promql
topk(5, knowton_nfts_by_category)
```

**24h trading volume**:
```promql
knowton_trading_volume_usd{timeframe="24h"}
```

## Troubleshooting

### Metrics Not Appearing

1. Check if service is exposing `/metrics` endpoint:
   ```bash
   kubectl exec -it <pod-name> -- curl localhost:3000/metrics
   ```

2. Verify Prometheus is scraping the target:
   - Go to Prometheus UI → Status → Targets
   - Check if target is "UP"

3. Check Prometheus logs:
   ```bash
   kubectl logs -n knowton-dev deployment/prometheus
   ```

### Alerts Not Firing

1. Check alert rules are loaded:
   - Go to Prometheus UI → Alerts
   - Verify rules are present

2. Check AlertManager configuration:
   ```bash
   kubectl logs -n knowton-dev deployment/alertmanager
   ```

3. Test alert manually:
   ```bash
   curl -X POST http://alertmanager-service:9093/api/v1/alerts \
     -H 'Content-Type: application/json' \
     -d '[{"labels":{"alertname":"TestAlert","severity":"warning"}}]'
   ```

### Dashboard Not Loading

1. Check Grafana logs:
   ```bash
   kubectl logs -n knowton-dev deployment/grafana
   ```

2. Verify Prometheus datasource:
   - Go to Grafana → Configuration → Data Sources
   - Test connection to Prometheus

3. Re-import dashboard:
   - Go to Grafana → Dashboards → Import
   - Upload dashboard JSON file

## Best Practices

1. **Set Appropriate Thresholds**: Adjust alert thresholds based on your baseline metrics
2. **Avoid Alert Fatigue**: Don't create too many alerts; focus on actionable ones
3. **Use Labels**: Add meaningful labels to metrics for better filtering
4. **Monitor the Monitors**: Set up alerts for Prometheus and Grafana themselves
5. **Regular Review**: Review and update dashboards and alerts regularly
6. **Document Runbooks**: Create runbooks for each alert type
7. **Test Alerts**: Regularly test alert notifications

## Maintenance

### Backup Prometheus Data

```bash
kubectl exec -n knowton-dev prometheus-0 -- tar czf /tmp/prometheus-backup.tar.gz /prometheus
kubectl cp knowton-dev/prometheus-0:/tmp/prometheus-backup.tar.gz ./prometheus-backup.tar.gz
```

### Backup Grafana Dashboards

Dashboards are stored in ConfigMaps and version controlled in Git.

### Update Alert Rules

1. Edit `k8s/dev/prometheus-alerts.yaml`
2. Apply changes:
   ```bash
   kubectl apply -f k8s/dev/prometheus-alerts.yaml
   ```
3. Reload Prometheus:
   ```bash
   kubectl exec -n knowton-dev prometheus-0 -- kill -HUP 1
   ```

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [AlertManager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
