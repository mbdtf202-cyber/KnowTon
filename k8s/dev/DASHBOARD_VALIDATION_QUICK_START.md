# Grafana Dashboard Validation - Quick Start Guide

## 🚀 Quick Start

This guide will help you quickly validate and test the KnowTon Grafana dashboards.

## Prerequisites

- Prometheus running at `http://localhost:9090` (or set `PROMETHEUS_URL` environment variable)
- All KnowTon services deployed and running
- Metrics exporter service active

## 1. Quick Validation (Bash Script)

The fastest way to validate all dashboard queries:

```bash
cd k8s/dev/scripts
chmod +x test-dashboard-queries.sh
./test-dashboard-queries.sh
```

**Output**:
- ✅ Green checkmarks for working queries
- ⚠️ Yellow warnings for queries with no data
- ❌ Red errors for broken queries

**Example Output**:
```
🔍 Testing Grafana Dashboard Queries
Prometheus URL: http://localhost:9090

📊 Testing Service Health Dashboard
-----------------------------------
✅ Backend Service Status: OK (1 series)
✅ Analytics Service Status: OK (1 series)
⚠️  CPU Usage by Service: No data
✅ API Request Rate: OK (5 series)
```

## 2. Detailed Validation (TypeScript)

For detailed analysis with JSON output:

```bash
cd k8s/dev/scripts

# Install dependencies (first time only)
npm install axios

# Run validation
ts-node validate-grafana-dashboards.ts
```

**Output**:
- Detailed validation results
- JSON report saved to `validation-results.json`
- Summary statistics

## 3. Test Individual Queries

Test a specific query in Prometheus:

```bash
# Set Prometheus URL
export PROMETHEUS_URL="http://localhost:9090"

# Test a query
curl -G "${PROMETHEUS_URL}/api/v1/query" \
  --data-urlencode 'query=sum(knowton_total_nfts)' | jq
```

## 4. View Dashboards in Grafana

1. Access Grafana: `http://localhost:3000`
2. Default credentials: `admin` / `admin`
3. Navigate to Dashboards → Browse
4. Open any KnowTon dashboard

## 5. Common Issues

### Issue: "Connection refused" to Prometheus

**Solution**:
```bash
# Check if Prometheus is running
kubectl get pods -n knowton-dev | grep prometheus

# Port forward if needed
kubectl port-forward -n knowton-dev svc/prometheus-service 9090:9090
```

### Issue: "No data" for all queries

**Solution**:
```bash
# Check if services are exposing metrics
kubectl get pods -n knowton-dev
kubectl logs -n knowton-dev <pod-name> | grep metrics

# Verify Prometheus is scraping
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
```

### Issue: "Metric not found"

**Solution**:
```bash
# List all available metrics
curl http://localhost:9090/api/v1/label/__name__/values | jq '.data[] | select(startswith("knowton_"))'

# Check if metrics exporter is running
kubectl logs -n knowton-dev deployment/backend-service | grep "metrics exporter"
```

## 6. Dashboard Files

All dashboard JSON files are located in:
```
k8s/dev/grafana-dashboards/
├── service-health-dashboard.json
├── business-metrics-dashboard.json
├── knowton-technical-dashboard.json
└── knowton-business-dashboard.json
```

## 7. Key Metrics to Check

### Service Health
```promql
# Service availability
up{job="backend-service"}

# Request rate
sum(rate(http_requests_total{namespace="knowton-dev"}[5m])) by (service)

# Error rate
sum(rate(http_requests_total{namespace="knowton-dev",status=~"5.."}[5m])) by (service)
```

### Business Metrics
```promql
# Total NFTs
sum(knowton_total_nfts) or vector(0)

# Active users (24h)
sum(knowton_active_users_total{period="24h"}) or vector(0)

# Trading volume
sum(knowton_trading_volume_usd{period="24h"}) or vector(0)
```

## 8. Troubleshooting Commands

```bash
# Check Prometheus health
curl http://localhost:9090/-/healthy

# Check Prometheus configuration
curl http://localhost:9090/api/v1/status/config | jq

# Check scrape targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health != "up")'

# Check metric cardinality
curl http://localhost:9090/api/v1/query \
  --data-urlencode 'query=count by (__name__) ({__name__=~"knowton_.*"})' | jq
```

## 9. Next Steps

After validation:

1. **Review Results**: Check `validation-results.json` for details
2. **Fix Issues**: Address any queries with no data or errors
3. **Add Panels**: Review `ENHANCEMENT_NOTES.md` for missing panels
4. **Configure Alerts**: Set up alerting rules for critical metrics
5. **Document Changes**: Update this guide with any new findings

## 10. Getting Help

- **Full Documentation**: See `GRAFANA_DASHBOARD_VALIDATION.md`
- **Enhancement Guide**: See `grafana-dashboards/ENHANCEMENT_NOTES.md`
- **Prometheus Docs**: https://prometheus.io/docs/
- **Grafana Docs**: https://grafana.com/docs/

## Quick Reference

### Environment Variables
```bash
export PROMETHEUS_URL="http://localhost:9090"
export GRAFANA_URL="http://localhost:3000"
```

### Port Forwarding
```bash
# Prometheus
kubectl port-forward -n knowton-dev svc/prometheus-service 9090:9090

# Grafana
kubectl port-forward -n knowton-dev svc/grafana-service 3000:3000
```

### Useful Queries
```bash
# List all KnowTon metrics
curl http://localhost:9090/api/v1/label/__name__/values | \
  jq '.data[] | select(startswith("knowton_"))'

# Check metric labels
curl -G http://localhost:9090/api/v1/series \
  --data-urlencode 'match[]=knowton_nft_mints_total' | jq

# Query with time range
curl -G http://localhost:9090/api/v1/query_range \
  --data-urlencode 'query=sum(knowton_total_nfts)' \
  --data-urlencode 'start=2024-01-01T00:00:00Z' \
  --data-urlencode 'end=2024-01-02T00:00:00Z' \
  --data-urlencode 'step=1h' | jq
```

---

**Last Updated**: 2025-11-08
**Version**: 1.0
**Status**: ✅ Ready for Use
