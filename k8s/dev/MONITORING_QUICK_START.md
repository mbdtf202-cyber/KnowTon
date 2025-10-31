# KnowTon Monitoring Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Deploy Monitoring Stack

```bash
# Deploy all monitoring components
kubectl apply -f k8s/dev/prometheus.yaml
kubectl apply -f k8s/dev/prometheus-alerts.yaml
kubectl apply -f k8s/dev/alertmanager.yaml
kubectl apply -f k8s/dev/grafana.yaml
```

### 2. Verify Deployment

```bash
# Check if all pods are running
kubectl get pods -n knowton-dev | grep -E "prometheus|grafana|alertmanager"

# Or use the validation script
./scripts/validate-monitoring.sh
```

### 3. Access Dashboards

```bash
# Terminal 1: Prometheus
kubectl port-forward -n knowton-dev svc/prometheus-service 9090:9090

# Terminal 2: Grafana
kubectl port-forward -n knowton-dev svc/grafana-service 3000:3000

# Terminal 3: AlertManager
kubectl port-forward -n knowton-dev svc/alertmanager-service 9093:9093
```

Then open in browser:
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **AlertManager**: http://localhost:9093

## 📊 Available Dashboards

### 1. Service Health Dashboard
**What it shows**: Real-time service status, CPU/memory usage, API performance
**Use when**: Monitoring system health, investigating performance issues

### 2. Business Metrics Dashboard
**What it shows**: NFT minting, trading volume, revenue, active users
**Use when**: Tracking business KPIs, analyzing platform growth

### 3. Technical Health Dashboard
**What it shows**: System resources, request rates, database connections
**Use when**: Technical troubleshooting, capacity planning

### 4. Business Dashboard
**What it shows**: Revenue streams, DeFi activity, content distribution
**Use when**: Business analysis, stakeholder reporting

## 🔔 Alert Severity Levels

| Severity | Meaning | Action Required | Examples |
|----------|---------|-----------------|----------|
| **Critical** | Service down or major issue | Immediate action | ServiceDown, DatabaseDown |
| **Warning** | Degraded performance | Investigate soon | HighCPU, HighErrorRate |
| **Info** | Informational | Monitor | LowActivity, Trends |

## 🔍 Common Queries

### Check Service Health
```promql
up{job=~"knowton-.*"}
```

### API Error Rate
```promql
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100
```

### Active Users (24h)
```promql
knowton_active_users_total{timeframe="24h"}
```

### Trading Volume (24h)
```promql
knowton_trading_volume_usd{timeframe="24h"}
```

### NFT Minting Rate
```promql
rate(knowton_nft_mints_total[1h])
```

## 🛠️ Troubleshooting

### No Metrics Showing

1. Check if backend is running:
   ```bash
   kubectl get pods -n knowton-dev | grep backend
   ```

2. Verify metrics endpoint:
   ```bash
   kubectl port-forward -n knowton-dev svc/backend-service 3000:3000
   curl http://localhost:3000/metrics | grep knowton_
   ```

3. Check Prometheus targets:
   - Go to Prometheus UI → Status → Targets
   - Ensure backend-service is "UP"

### Alerts Not Firing

1. Check alert rules are loaded:
   - Go to Prometheus UI → Alerts
   - Verify rules are present

2. Check AlertManager logs:
   ```bash
   kubectl logs -n knowton-dev deployment/alertmanager
   ```

### Dashboard Shows "No Data"

1. Wait 1-2 minutes for metrics to populate
2. Check Prometheus datasource in Grafana:
   - Configuration → Data Sources → Prometheus
   - Click "Test" button
3. Verify time range in dashboard (top right)

## 📧 Configure Slack Notifications

1. Create Slack webhook:
   - Go to https://api.slack.com/apps
   - Create new app → Incoming Webhooks
   - Copy webhook URL

2. Update AlertManager config:
   ```bash
   # Edit the file
   vim k8s/dev/alertmanager.yaml
   
   # Find and replace:
   slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
   ```

3. Apply changes:
   ```bash
   kubectl apply -f k8s/dev/alertmanager.yaml
   kubectl rollout restart -n knowton-dev deployment/alertmanager
   ```

4. Test notification:
   ```bash
   kubectl port-forward -n knowton-dev svc/alertmanager-service 9093:9093
   
   curl -X POST http://localhost:9093/api/v1/alerts \
     -H 'Content-Type: application/json' \
     -d '[{
       "labels": {
         "alertname": "TestAlert",
         "severity": "warning",
         "service": "test"
       },
       "annotations": {
         "summary": "Test Alert",
         "description": "This is a test alert"
       }
     }]'
   ```

## 📈 Key Metrics to Watch

### System Health
- ✅ All services UP
- ✅ CPU < 80%
- ✅ Memory < 85%
- ✅ Error rate < 5%
- ✅ Response time < 1s (p95)

### Business Health
- ✅ Active users > 10 (24h)
- ✅ NFT minting rate > 1/hour
- ✅ Trading volume > $1000 (24h)
- ✅ Transaction success rate > 90%

### Database Health
- ✅ PostgreSQL connections < 80
- ✅ Redis/MongoDB UP
- ✅ Query latency < 100ms (p95)

## 🎯 Next Steps

1. **Customize Thresholds**: Adjust alert thresholds based on your baseline
2. **Add Custom Dashboards**: Create dashboards for specific use cases
3. **Set Up PagerDuty**: Configure PagerDuty for critical alerts
4. **Enable Email Alerts**: Configure email notifications
5. **Review Regularly**: Weekly review of metrics and alerts

## 📚 Additional Resources

- **Full Documentation**: `k8s/dev/MONITORING_SETUP.md`
- **Implementation Summary**: `MONITORING_IMPLEMENTATION_SUMMARY.md`
- **Validation Script**: `scripts/validate-monitoring.sh`
- **Prometheus Docs**: https://prometheus.io/docs/
- **Grafana Docs**: https://grafana.com/docs/

## 🆘 Getting Help

If you encounter issues:

1. Run validation script: `./scripts/validate-monitoring.sh`
2. Check pod logs: `kubectl logs -n knowton-dev <pod-name>`
3. Review full documentation: `k8s/dev/MONITORING_SETUP.md`
4. Check Prometheus targets: http://localhost:9090/targets
5. Verify Grafana datasource: http://localhost:3000/datasources

---

**Last Updated**: October 31, 2025
**Version**: 1.0
**Status**: Production Ready ✅
