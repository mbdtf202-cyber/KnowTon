# Grafana Dashboard Validation Guide

## Overview

This document describes the validation process for KnowTon Grafana dashboards and provides guidance on verifying that all metrics are correctly configured and returning data.

## Dashboard Inventory

### 1. Service Health Dashboard (`service-health-dashboard.json`)

**Purpose**: Monitor the health and performance of all microservices

**Key Panels**:
- Service status indicators (Backend, Analytics, Oracle Adapter, Bonding Service)
- CPU usage by service
- Memory usage by service
- API request rate
- API response time (P95, P99)
- Error rate by service (4xx, 5xx)
- Database connections (PostgreSQL, Redis, MongoDB)

**Metrics Used**:
- `up{job="<service-name>"}` - Service availability
- `container_cpu_usage_seconds_total` - CPU usage
- `container_memory_working_set_bytes` - Memory usage
- `http_requests_total` - Request counts
- `http_request_duration_seconds_bucket` - Response time histograms
- `pg_stat_database_numbackends` - PostgreSQL connections
- `redis_connected_clients` - Redis connections
- `mongodb_connections` - MongoDB connections

### 2. Business Metrics Dashboard (`business-metrics-dashboard.json`)

**Purpose**: Track business KPIs and platform usage

**Key Panels**:
- NFT minting rate
- Trading volume and royalty revenue
- Active users (24h)
- Total NFTs minted
- Active IP bonds
- Total value locked (TVL)
- NFTs by category
- AI processing latency

**Metrics Used**:
- `knowton_nft_mints_total` - NFT minting events
- `knowton_trading_volume_usd` - Trading volume
- `knowton_active_users_total` - Active user count
- `knowton_total_nfts` - Total NFT count
- `knowton_active_bonds_total` - Active bond count
- `knowton_total_value_locked_usd` - TVL
- `knowton_ai_processing_duration_seconds_bucket` - AI processing time

### 3. Technical Health Dashboard (`knowton-technical-dashboard.json`)

**Purpose**: Monitor technical infrastructure and system resources

**Key Panels**:
- Service health status (all services)
- CPU usage (node-level)
- Memory usage (node-level)
- Request rate by service
- Response time percentiles (P50, P95)
- Service availability (non-5xx rate)
- Database connections

**Metrics Used**:
- `up{job=~"knowton-.*"}` - Service health
- `node_cpu_seconds_total` - Node CPU metrics
- `node_memory_MemAvailable_bytes` - Node memory metrics
- `http_requests_total` - HTTP request metrics
- `http_request_duration_seconds_bucket` - Response time histograms

### 4. Business Dashboard (`knowton-business-dashboard.json`)

**Purpose**: High-level business metrics and KPIs

**Key Panels**:
- NFT minting rate (5m window)
- Total revenue (USD)
- Active users
- Marketplace transactions
- Revenue streams (royalties, trading)
- Content distribution by type
- DeFi activity (staking, governance, bonds)
- Service request rate

**Metrics Used**:
- `knowton_nft_minted_total` - NFT mints
- `knowton_total_revenue_usd` - Revenue
- `knowton_marketplace_transactions_total` - Transactions
- `knowton_royalty_payments_total` - Royalty payments
- `knowton_content_uploads_total` - Content uploads
- `knowton_staking_pools_active` - Staking activity
- `knowton_service_requests_total` - Service requests

## Validation Process

### Prerequisites

1. **Prometheus Running**: Ensure Prometheus is accessible at `http://localhost:9090` (or set `PROMETHEUS_URL`)
2. **Services Deployed**: All KnowTon services should be running and exposing metrics
3. **Metrics Exporter Active**: The metrics exporter service should be collecting business metrics

### Validation Steps

#### Step 1: Run Automated Validation Script

```bash
cd k8s/dev/scripts
chmod +x test-dashboard-queries.sh
./test-dashboard-queries.sh
```

This script will:
- Test all Prometheus queries from each dashboard
- Report which queries return data
- Identify queries with no data or errors
- Provide a summary of results

#### Step 2: Manual Query Testing

Access Prometheus UI at `http://localhost:9090` and test individual queries:

**Test Service Availability**:
```promql
up{job="backend-service"}
```
Expected: Returns 1 if service is up, 0 if down

**Test Business Metrics**:
```promql
sum(knowton_total_nfts) or vector(0)
```
Expected: Returns total NFT count (may be 0 initially)

**Test Request Metrics**:
```promql
sum(rate(http_requests_total{namespace="knowton-dev"}[5m])) by (service)
```
Expected: Returns request rate per service

#### Step 3: Verify in Grafana

1. Access Grafana at `http://localhost:3000`
2. Navigate to each dashboard
3. Check that panels are displaying data
4. Verify time ranges work correctly (1h, 6h, 24h, 7d)
5. Test dashboard refresh rates

### Common Issues and Solutions

#### Issue: "No data" for service metrics

**Cause**: Services not exposing metrics endpoint or Prometheus not scraping

**Solution**:
1. Check service has `/metrics` endpoint
2. Verify Prometheus scrape config includes the service
3. Check Prometheus targets page: `http://localhost:9090/targets`

#### Issue: "No data" for business metrics

**Cause**: Metrics exporter service not running or no activity yet

**Solution**:
1. Verify metrics exporter service is running
2. Check metrics are being recorded: `curl http://localhost:3000/metrics`
3. Generate some activity (mint NFT, create transaction)
4. Wait for metrics collection interval (30 seconds)

#### Issue: Query returns error

**Cause**: Invalid PromQL syntax or missing labels

**Solution**:
1. Test query in Prometheus UI
2. Check metric exists: `{__name__=~"knowton_.*"}`
3. Verify label names match actual metrics
4. Use `or vector(0)` to handle missing metrics gracefully

#### Issue: High cardinality warnings

**Cause**: Too many unique label combinations

**Solution**:
1. Review label usage in metrics
2. Avoid high-cardinality labels (user IDs, timestamps)
3. Use aggregation in queries: `sum by (service)`

## Metric Naming Conventions

All KnowTon metrics follow these conventions:

- **Prefix**: `knowton_` for all custom metrics
- **Type Suffix**:
  - `_total` for counters (e.g., `knowton_nft_mints_total`)
  - `_seconds` for durations (e.g., `knowton_ai_processing_duration_seconds`)
  - `_bytes` for sizes (e.g., `knowton_storage_used_bytes`)
  - `_usd` for monetary values (e.g., `knowton_trading_volume_usd`)
- **Labels**: Use snake_case (e.g., `content_type`, `service_name`)

## Query Best Practices

### Use Rate for Counters

```promql
# Good: Calculate rate for counter metrics
rate(knowton_nft_mints_total[5m])

# Bad: Use counter directly
knowton_nft_mints_total
```

### Aggregate High-Cardinality Metrics

```promql
# Good: Aggregate by service
sum by (service) (rate(http_requests_total[5m]))

# Bad: Too many series
rate(http_requests_total[5m])
```

### Handle Missing Metrics

```promql
# Good: Provide default value
sum(knowton_total_nfts) or vector(0)

# Bad: Query fails if metric doesn't exist
sum(knowton_total_nfts)
```

### Use Appropriate Time Windows

```promql
# Good: 5m for rate calculations
rate(http_requests_total[5m])

# Bad: Too short, noisy data
rate(http_requests_total[30s])

# Bad: Too long, delayed detection
rate(http_requests_total[1h])
```

## Testing Different Time Ranges

Dashboards should work correctly across different time ranges:

- **Last 5 minutes**: Real-time monitoring
- **Last 1 hour**: Recent activity
- **Last 6 hours**: Short-term trends
- **Last 24 hours**: Daily patterns
- **Last 7 days**: Weekly trends
- **Last 30 days**: Monthly analysis

Test each dashboard with different time ranges to ensure:
- Queries complete in reasonable time (< 5 seconds)
- Data is displayed correctly
- No timeout errors
- Appropriate granularity for the time range

## Performance Optimization

### Query Optimization Tips

1. **Use Recording Rules** for expensive queries:
```yaml
# prometheus-rules.yml
groups:
  - name: knowton_recording_rules
    interval: 30s
    rules:
      - record: knowton:http_requests:rate5m
        expr: sum by (service) (rate(http_requests_total[5m]))
```

2. **Limit Time Series** with label filters:
```promql
# Good: Filter early
sum(rate(http_requests_total{namespace="knowton-dev"}[5m]))

# Bad: Filter after aggregation
sum(rate(http_requests_total[5m])) {namespace="knowton-dev"}
```

3. **Use Appropriate Functions**:
- `rate()` for counters
- `irate()` for instant rate (volatile)
- `increase()` for total increase
- `avg_over_time()` for smoothing

## Alerting Integration

Dashboards can be linked to alerts defined in `prometheus-alerts.yaml`:

```yaml
groups:
  - name: knowton_business_alerts
    rules:
      - alert: LowNFTMintingRate
        expr: rate(knowton_nft_mints_total[5m]) < 0.01
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "NFT minting rate is low"
          description: "Less than 1 NFT minted per 100 seconds"
```

## Maintenance

### Regular Tasks

1. **Weekly**: Review dashboard performance and query times
2. **Monthly**: Check for unused panels or metrics
3. **Quarterly**: Update dashboards based on new features
4. **As Needed**: Add new metrics for new services

### Dashboard Updates

When updating dashboards:

1. Test queries in Prometheus first
2. Update JSON files in `k8s/dev/grafana-dashboards/`
3. Run validation script
4. Deploy to Grafana
5. Verify in UI
6. Document changes in this file

### Version Control

- All dashboard JSON files are version controlled
- Use meaningful commit messages
- Tag releases with dashboard versions
- Keep backup of working dashboards

## Troubleshooting

### Debug Checklist

- [ ] Prometheus is running and accessible
- [ ] Services are exposing `/metrics` endpoints
- [ ] Prometheus is scraping all targets successfully
- [ ] Metrics exporter service is running
- [ ] Grafana can connect to Prometheus
- [ ] Dashboard JSON is valid
- [ ] Queries are syntactically correct
- [ ] Time range is appropriate
- [ ] No high-cardinality issues

### Useful Commands

**Check Prometheus targets**:
```bash
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
```

**List all metrics**:
```bash
curl http://localhost:9090/api/v1/label/__name__/values | jq '.data[] | select(startswith("knowton_"))'
```

**Test a query**:
```bash
curl -G http://localhost:9090/api/v1/query \
  --data-urlencode 'query=sum(knowton_total_nfts)' | jq
```

**Check metric cardinality**:
```bash
curl http://localhost:9090/api/v1/query \
  --data-urlencode 'query=count by (__name__) ({__name__=~"knowton_.*"})' | jq
```

## References

- [Prometheus Query Documentation](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
- [Prometheus Naming Conventions](https://prometheus.io/docs/practices/naming/)

## Support

For issues or questions:
1. Check this documentation
2. Review Prometheus logs: `kubectl logs -n knowton-dev prometheus-xxx`
3. Review Grafana logs: `kubectl logs -n knowton-dev grafana-xxx`
4. Check service metrics endpoints
5. Contact DevOps team
