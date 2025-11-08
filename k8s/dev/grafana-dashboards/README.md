# KnowTon Grafana Dashboards

## Overview

This directory contains all Grafana dashboard configurations for the KnowTon platform. These dashboards provide comprehensive monitoring of service health, business metrics, and technical infrastructure.

## Dashboard Inventory

### 1. Service Health Dashboard
**File**: `service-health-dashboard.json`
**UID**: `knowton-service-health`

Monitors the operational health of all microservices:
- Service availability status
- CPU and memory usage
- API request rates and response times
- Error rates (4xx, 5xx)
- Database connections

**Use Case**: Real-time service monitoring, incident detection, performance troubleshooting

### 2. Business Metrics Dashboard
**File**: `business-metrics-dashboard.json`
**UID**: `knowton-business`

Tracks key business KPIs:
- NFT minting rate
- Trading volume and revenue
- Active users
- Total NFTs and bonds
- Total value locked (TVL)
- Content distribution by category
- AI processing performance

**Use Case**: Business analytics, growth tracking, revenue monitoring

### 3. Technical Health Dashboard
**File**: `knowton-technical-dashboard.json`
**UID**: `knowton-technical`

Provides infrastructure-level monitoring:
- Node-level CPU and memory
- Service request rates
- Response time percentiles
- Service availability metrics
- Database connection pools

**Use Case**: Infrastructure monitoring, capacity planning, performance optimization

### 4. Business Dashboard
**File**: `knowton-business-dashboard.json`
**UID**: `knowton-business`

High-level business overview:
- Platform growth metrics
- Revenue streams
- User engagement
- Content distribution
- DeFi activity
- Service utilization

**Use Case**: Executive dashboards, business reporting, trend analysis

## Quick Start

### Import Dashboards to Grafana

1. **Via Grafana UI**:
   - Navigate to Dashboards → Import
   - Upload JSON file or paste JSON content
   - Select Prometheus data source
   - Click Import

2. **Via API**:
   ```bash
   curl -X POST http://localhost:3000/api/dashboards/db \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <api-key>" \
     -d @service-health-dashboard.json
   ```

3. **Via ConfigMap** (Kubernetes):
   ```bash
   kubectl create configmap grafana-dashboards \
     --from-file=k8s/dev/grafana-dashboards/ \
     -n knowton-dev
   ```

### Validate Dashboards

```bash
# Quick validation
cd ../scripts
./test-dashboard-queries.sh

# Detailed validation
ts-node validate-grafana-dashboards.ts
```

## Dashboard Structure

Each dashboard follows this structure:

```json
{
  "title": "Dashboard Title",
  "uid": "unique-id",
  "panels": [
    {
      "id": 1,
      "title": "Panel Title",
      "type": "graph|stat|gauge|table",
      "targets": [
        {
          "expr": "prometheus_query",
          "legendFormat": "{{label}}",
          "refId": "A"
        }
      ]
    }
  ],
  "refresh": "10s|30s|1m",
  "time": {
    "from": "now-1h",
    "to": "now"
  }
}
```

## Metrics Reference

### Custom KnowTon Metrics

All custom metrics use the `knowton_` prefix:

**Counters** (use with `rate()`):
- `knowton_nft_mints_total{category, creator}`
- `knowton_royalty_payments_total{beneficiary}`
- `knowton_content_uploads_total{content_type}`
- `knowton_marketplace_transactions_total{type}`

**Gauges** (use directly):
- `knowton_active_users_total{period}`
- `knowton_total_nfts`
- `knowton_active_bonds_total`
- `knowton_total_value_locked_usd`

**Histograms** (use with `histogram_quantile()`):
- `knowton_ai_processing_duration_seconds_bucket{service, operation, le}`
- `knowton_database_query_duration_seconds_bucket{operation, table, le}`

### Standard Metrics

**Kubernetes**:
- `container_cpu_usage_seconds_total`
- `container_memory_working_set_bytes`
- `up` (service availability)

**HTTP**:
- `http_requests_total{method, route, status}`
- `http_request_duration_seconds_bucket{method, route, le}`

**Databases**:
- `pg_stat_database_numbackends` (PostgreSQL)
- `redis_connected_clients` (Redis)
- `mongodb_connections` (MongoDB)

## Query Examples

### Service Availability
```promql
up{job="backend-service"}
```

### Request Rate
```promql
sum(rate(http_requests_total{namespace="knowton-dev"}[5m])) by (service)
```

### Error Rate
```promql
sum(rate(http_requests_total{namespace="knowton-dev",status=~"5.."}[5m])) by (service)
```

### Response Time (P95)
```promql
histogram_quantile(0.95, 
  sum(rate(http_request_duration_seconds_bucket{namespace="knowton-dev"}[5m])) 
  by (service, le)
)
```

### Active Users
```promql
sum(knowton_active_users_total{period="24h"}) or vector(0)
```

### Trading Volume
```promql
sum(knowton_trading_volume_usd{period="24h"}) or vector(0)
```

## Customization

### Adding New Panels

1. **In Grafana UI**:
   - Open dashboard
   - Click "Add panel"
   - Configure query and visualization
   - Save dashboard
   - Export JSON

2. **Manually**:
   - Edit JSON file
   - Add panel object to `panels` array
   - Increment panel IDs
   - Validate JSON syntax

### Modifying Queries

1. Test query in Prometheus first
2. Update `expr` field in panel target
3. Adjust `legendFormat` if needed
4. Update panel title and description
5. Validate in Grafana

### Changing Refresh Rate

```json
{
  "refresh": "10s",  // Options: 5s, 10s, 30s, 1m, 5m, 15m, 30m, 1h
  "time": {
    "from": "now-1h",
    "to": "now"
  }
}
```

## Best Practices

### Query Optimization

1. **Use rate() for counters**:
   ```promql
   rate(knowton_nft_mints_total[5m])
   ```

2. **Aggregate high-cardinality metrics**:
   ```promql
   sum by (service) (rate(http_requests_total[5m]))
   ```

3. **Handle missing metrics**:
   ```promql
   sum(knowton_total_nfts) or vector(0)
   ```

4. **Use appropriate time windows**:
   - 5m for rate calculations
   - 1h for trends
   - 24h for daily patterns

### Dashboard Design

1. **Organize logically**: Group related panels
2. **Use consistent colors**: Red for errors, green for success
3. **Add descriptions**: Help users understand metrics
4. **Set thresholds**: Visual indicators for problems
5. **Test time ranges**: Ensure queries work across ranges

### Performance

1. **Limit time series**: Use label filters
2. **Avoid wildcards**: Be specific with label matchers
3. **Use recording rules**: For expensive queries
4. **Set appropriate refresh**: Balance freshness vs load

## Troubleshooting

### Dashboard Not Loading

1. Check Grafana logs:
   ```bash
   kubectl logs -n knowton-dev deployment/grafana
   ```

2. Verify Prometheus connection:
   ```bash
   curl http://localhost:9090/-/healthy
   ```

3. Check dashboard JSON syntax:
   ```bash
   jq . service-health-dashboard.json
   ```

### No Data in Panels

1. Test query in Prometheus:
   ```bash
   curl -G http://localhost:9090/api/v1/query \
     --data-urlencode 'query=sum(knowton_total_nfts)'
   ```

2. Check if metric exists:
   ```bash
   curl http://localhost:9090/api/v1/label/__name__/values | \
     jq '.data[] | select(startswith("knowton_"))'
   ```

3. Verify services are exposing metrics:
   ```bash
   kubectl get pods -n knowton-dev
   kubectl logs -n knowton-dev <pod-name> | grep metrics
   ```

### Slow Queries

1. Check query complexity
2. Add label filters early
3. Use recording rules
4. Reduce time range
5. Increase scrape interval

## Maintenance

### Regular Tasks

- **Weekly**: Review dashboard performance
- **Monthly**: Update queries for new features
- **Quarterly**: Archive unused dashboards
- **As Needed**: Add panels for new metrics

### Version Control

1. Export dashboard from Grafana
2. Save JSON to this directory
3. Commit with descriptive message
4. Tag releases

### Backup

```bash
# Backup all dashboards
mkdir -p backups/$(date +%Y%m%d)
cp *.json backups/$(date +%Y%m%d)/

# Restore from backup
cp backups/20250108/*.json .
```

## Documentation

- **Validation Guide**: `../GRAFANA_DASHBOARD_VALIDATION.md`
- **Quick Start**: `../DASHBOARD_VALIDATION_QUICK_START.md`
- **Enhancement Notes**: `ENHANCEMENT_NOTES.md`
- **Task Completion**: `../TASK_15.3_COMPLETION.md`

## Support

For issues or questions:
1. Check validation guide
2. Review Prometheus/Grafana logs
3. Test queries in Prometheus UI
4. Contact DevOps team

## Contributing

When adding or modifying dashboards:

1. Test queries in Prometheus
2. Validate JSON syntax
3. Run validation scripts
4. Update documentation
5. Create pull request

## License

These dashboards are part of the KnowTon platform and follow the project license.

---

**Last Updated**: 2025-11-08
**Version**: 1.0
**Status**: ✅ Production Ready
