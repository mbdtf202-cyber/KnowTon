# KnowTon AlertManager Configuration

Complete alerting solution for the KnowTon platform with multi-channel notifications, intelligent routing, and automated testing.

## 📚 Quick Links

- **[Quick Start Guide](../ALERTMANAGER_QUICK_START.md)** - Get started in 5 minutes
- **[Setup Guide](../ALERTMANAGER_SETUP_GUIDE.md)** - Comprehensive configuration guide
- **[Implementation Summary](../ALERTMANAGER_IMPLEMENTATION_SUMMARY.md)** - What was delivered
- **[Completion Report](../TASK_15.6_COMPLETION.md)** - Task completion details

## 🚀 Quick Start

```bash
# Deploy AlertManager
./k8s/dev/scripts/deploy-alertmanager.sh

# Test alerts
./k8s/dev/scripts/test-alertmanager.sh

# Access UI
kubectl port-forward -n knowton-dev svc/alertmanager-service 9093:9093
open http://localhost:9093
```

## 📁 File Structure

```
k8s/dev/
├── alertmanager.yaml                    # Main configuration
├── alertmanager-templates.yaml          # Notification templates
├── alertmanager-secrets.yaml            # Secrets template
├── prometheus-alerts.yaml               # Prometheus alert rules
├── data-sync-alerts.yaml               # Data sync alert rules
├── audit-alerts.yaml                   # Audit alert rules
├── scripts/
│   ├── deploy-alertmanager.sh          # Deployment script
│   └── test-alertmanager.sh            # Testing script
└── alerting/
    └── README.md                        # This file
```

## 🎯 Features

### Notification Channels
- ✅ Slack (12 channels)
- ✅ Email (SMTP)
- ✅ Discord
- ✅ PagerDuty (optional)

### Alert Routing
- ✅ Severity-based (critical, warning, info)
- ✅ Category-based (database, security, blockchain, etc.)
- ✅ Component-based (data-sync, audit, etc.)

### Alert Management
- ✅ Alert grouping
- ✅ Alert silencing
- ✅ Alert inhibition
- ✅ Auto-resolution

## 📊 Alert Categories

| Category | Channel | Recipients |
|----------|---------|------------|
| Critical | Slack + Email + Discord + PagerDuty | All teams |
| Database | #knowton-database | DBA team |
| Security | #knowton-security | Security team |
| Blockchain | #knowton-blockchain | Blockchain team |
| Performance | #knowton-performance | DevOps team |
| Business | #knowton-business | Business team |
| Data Sync | #knowton-data-sync | Data team |
| Audit | #knowton-audit | Audit team |

## 🧪 Testing

```bash
# Run full test suite
./k8s/dev/scripts/test-alertmanager.sh

# Send test alert
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {"alertname": "TestAlert", "severity": "warning"},
    "annotations": {"description": "Test alert"}
  }]'

# Check active alerts
curl http://localhost:9093/api/v1/alerts | jq

# Create silence
curl -X POST http://localhost:9093/api/v1/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [{"name": "alertname", "value": "TestAlert"}],
    "startsAt": "2024-01-01T00:00:00Z",
    "endsAt": "2024-01-01T01:00:00Z",
    "comment": "Test silence"
  }'
```

## 🔧 Configuration

### Update Notification Channels

```bash
# Update Slack webhook
kubectl create secret generic alertmanager-secrets \
  --from-literal=SLACK_WEBHOOK_URL="$NEW_SLACK_URL" \
  --namespace=knowton-dev \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart AlertManager
kubectl rollout restart deployment/alertmanager -n knowton-dev
```

### Add New Alert Rule

Edit `prometheus-alerts.yaml`:

```yaml
- alert: MyNewAlert
  expr: my_metric > 100
  for: 5m
  labels:
    severity: warning
    category: custom
  annotations:
    summary: "My metric is too high"
    description: "My metric value is {{ $value }}"
```

Apply changes:

```bash
kubectl apply -f k8s/dev/prometheus-alerts.yaml
```

## 📈 Monitoring

### AlertManager Metrics

```bash
# View metrics
curl http://localhost:9093/metrics

# Key metrics:
# - alertmanager_alerts
# - alertmanager_notifications_total
# - alertmanager_notifications_failed_total
# - alertmanager_silences
```

### Health Checks

```bash
# Liveness
curl http://localhost:9093/-/healthy

# Readiness
curl http://localhost:9093/-/ready

# Status
curl http://localhost:9093/api/v1/status | jq
```

## 🐛 Troubleshooting

### Alerts Not Firing

```bash
# Check Prometheus rules
curl http://localhost:9090/api/v1/rules | jq

# Check AlertManager logs
kubectl logs -n knowton-dev -l app=alertmanager -f
```

### Notifications Not Received

```bash
# Check notification metrics
curl http://localhost:9093/metrics | grep alertmanager_notifications

# Test webhook manually
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test message"}'

# Check AlertManager logs
kubectl logs -n knowton-dev -l app=alertmanager | grep -i error
```

### Configuration Errors

```bash
# Validate configuration
kubectl get configmap alertmanager-config -n knowton-dev -o yaml

# Reload configuration
curl -X POST http://localhost:9093/-/reload

# Check status
curl http://localhost:9093/api/v1/status | jq
```

## 📚 Documentation

### Guides
- [Quick Start Guide](../ALERTMANAGER_QUICK_START.md) - 5-minute setup
- [Setup Guide](../ALERTMANAGER_SETUP_GUIDE.md) - Comprehensive guide
- [Implementation Summary](../ALERTMANAGER_IMPLEMENTATION_SUMMARY.md) - Features delivered
- [Completion Report](../TASK_15.6_COMPLETION.md) - Task details

### Configuration Files
- [alertmanager.yaml](../alertmanager.yaml) - Main configuration
- [alertmanager-templates.yaml](../alertmanager-templates.yaml) - Templates
- [prometheus-alerts.yaml](../prometheus-alerts.yaml) - Alert rules
- [data-sync-alerts.yaml](../data-sync-alerts.yaml) - Data sync rules
- [audit-alerts.yaml](../audit-alerts.yaml) - Audit rules

### Scripts
- [deploy-alertmanager.sh](../scripts/deploy-alertmanager.sh) - Deployment
- [test-alertmanager.sh](../scripts/test-alertmanager.sh) - Testing

## 🎓 Best Practices

1. **Start Conservative**: Begin with higher thresholds and lower them gradually
2. **Avoid Alert Fatigue**: Too many alerts = ignored alerts
3. **Use Silences**: Silence alerts during maintenance windows
4. **Document Everything**: Add clear descriptions and runbook URLs
5. **Test Regularly**: Run test alerts to verify notification channels
6. **Monitor Metrics**: Track AlertManager metrics for issues
7. **Tune Continuously**: Adjust thresholds based on actual system behavior

## 📞 Support

- **Documentation**: k8s/dev/ALERTMANAGER_SETUP_GUIDE.md
- **Test Script**: ./k8s/dev/scripts/test-alertmanager.sh
- **Logs**: `kubectl logs -n knowton-dev -l app=alertmanager`
- **Contact**: devops@knowton.io

## 🔄 Maintenance

### Regular Tasks
- **Daily**: Review active alerts
- **Weekly**: Check notification metrics
- **Monthly**: Review and tune thresholds
- **Quarterly**: Update runbooks and documentation

### Backup

```bash
# Backup AlertManager data
kubectl exec -n knowton-dev alertmanager-0 -- \
  tar czf - /alertmanager > alertmanager-backup.tar.gz

# Restore
kubectl exec -n knowton-dev alertmanager-0 -- \
  tar xzf - -C / < alertmanager-backup.tar.gz
```

## ✅ Status

**Deployment**: ✅ Complete  
**Testing**: ✅ Verified  
**Documentation**: ✅ Complete  
**Production Ready**: ✅ Yes

---

**Last Updated**: 2024-01-XX  
**Version**: 1.0.0  
**Status**: Production Ready
