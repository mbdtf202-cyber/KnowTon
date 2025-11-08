# AlertManager Quick Start Guide

## 🚀 Quick Deployment (5 Minutes)

### Prerequisites
- Kubernetes cluster running
- kubectl configured
- Notification channel URLs (Slack/Discord/Email)

### Step 1: Deploy AlertManager (2 minutes)

```bash
# Run automated deployment script
./k8s/dev/scripts/deploy-alertmanager.sh
```

The script will:
1. ✅ Check prerequisites
2. ✅ Create namespace
3. ✅ Configure secrets (interactive)
4. ✅ Deploy AlertManager
5. ✅ Deploy alert rules
6. ✅ Verify deployment
7. ✅ Setup port forwarding (optional)
8. ✅ Run tests (optional)

### Step 2: Configure Notification Channels (1 minute)

When prompted, provide your webhook URLs:

```
Slack Webhook URL: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
Discord Webhook URL: https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK
SMTP Host: smtp.gmail.com:587
SMTP From: alerts@knowton.io
SMTP Username: your-email@gmail.com
SMTP Password: ********
```

### Step 3: Verify Deployment (1 minute)

```bash
# Check AlertManager is running
kubectl get pods -n knowton-dev -l app=alertmanager

# Access AlertManager UI
kubectl port-forward -n knowton-dev svc/alertmanager-service 9093:9093

# Open in browser
open http://localhost:9093
```

### Step 4: Test Alerts (1 minute)

```bash
# Run test script
./k8s/dev/scripts/test-alertmanager.sh
```

This will:
- ✅ Check service health
- ✅ Verify configuration
- ✅ Send test alerts
- ✅ Verify notifications

## 📊 Verify Notifications

Check your notification channels:

### Slack
- Go to your Slack workspace
- Check channels: `#knowton-alerts`, `#knowton-critical`, `#knowton-warnings`
- You should see test alerts

### Discord
- Go to your Discord server
- Check the configured channel
- You should see test alerts

### Email
- Check your inbox
- Look for emails from `alerts@knowton.io`
- You should see test alert emails

## 🎯 Common Use Cases

### Send Manual Test Alert

```bash
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning",
      "service": "test"
    },
    "annotations": {
      "description": "This is a test alert"
    }
  }]'
```

### Silence an Alert

```bash
# Via UI
open http://localhost:9093/#/silences/new

# Via API
curl -X POST http://localhost:9093/api/v1/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [{
      "name": "alertname",
      "value": "HighCPUUsage"
    }],
    "startsAt": "2024-01-01T00:00:00Z",
    "endsAt": "2024-01-01T01:00:00Z",
    "comment": "Maintenance window"
  }'
```

### View Active Alerts

```bash
# Via API
curl http://localhost:9093/api/v1/alerts | jq

# Via Prometheus
curl http://localhost:9090/api/v1/alerts | jq
```

## 🔧 Configuration

### Update Notification Channels

```bash
# Update secrets
kubectl create secret generic alertmanager-secrets \
  --from-literal=SLACK_WEBHOOK_URL="$NEW_SLACK_URL" \
  --namespace=knowton-dev \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart AlertManager
kubectl rollout restart deployment/alertmanager -n knowton-dev
```

### Add New Alert Rule

1. Edit `k8s/dev/prometheus-alerts.yaml`
2. Add your rule:

```yaml
- alert: MyNewAlert
  expr: my_metric > 100
  for: 5m
  labels:
    severity: warning
  annotations:
    description: "My metric is too high"
```

3. Apply changes:

```bash
kubectl apply -f k8s/dev/prometheus-alerts.yaml
```

### Adjust Alert Thresholds

Edit alert rules and change thresholds:

```yaml
# Before
expr: cpu_usage > 80

# After
expr: cpu_usage > 90
```

## 📱 Notification Channels

### Slack Channels

| Channel | Purpose | Severity |
|---------|---------|----------|
| #knowton-alerts | All alerts | All |
| #knowton-critical | Critical alerts | Critical |
| #knowton-warnings | Warning alerts | Warning |
| #knowton-info | Info alerts | Info |
| #knowton-database | Database alerts | All |
| #knowton-security | Security alerts | All |
| #knowton-blockchain | Blockchain alerts | All |
| #knowton-performance | Performance alerts | Warning |
| #knowton-resources | Resource alerts | Warning |
| #knowton-business | Business metrics | Info |
| #knowton-data-sync | Data sync alerts | All |
| #knowton-audit | Audit alerts | All |

### Email Recipients

| Email | Purpose |
|-------|---------|
| ops@knowton.io | General operations |
| dba@knowton.io | Database issues |
| security@knowton.io | Security events |
| business@knowton.io | Business metrics |
| audit@knowton.io | Audit events |

## 🐛 Troubleshooting

### Alerts Not Firing

```bash
# Check Prometheus rules
kubectl logs -n knowton-dev -l app=prometheus | grep -i error

# Verify alert rules loaded
curl http://localhost:9090/api/v1/rules | jq '.data.groups[].rules[] | select(.type == "alerting")'
```

### Notifications Not Received

```bash
# Check AlertManager logs
kubectl logs -n knowton-dev -l app=alertmanager

# Test webhook manually
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test message"}'

# Check notification metrics
curl http://localhost:9093/metrics | grep alertmanager_notifications
```

### Configuration Errors

```bash
# Check configuration
kubectl get configmap alertmanager-config -n knowton-dev -o yaml

# Reload configuration
curl -X POST http://localhost:9093/-/reload

# Verify configuration
curl http://localhost:9093/api/v1/status | jq
```

## 📚 Resources

- **Full Setup Guide**: [ALERTMANAGER_SETUP_GUIDE.md](./ALERTMANAGER_SETUP_GUIDE.md)
- **Alert Rules**: [prometheus-alerts.yaml](./prometheus-alerts.yaml)
- **Configuration**: [alertmanager.yaml](./alertmanager.yaml)
- **Test Script**: [scripts/test-alertmanager.sh](./scripts/test-alertmanager.sh)

## 🎓 Next Steps

1. ✅ Review alert rules and adjust thresholds
2. ✅ Configure additional notification channels
3. ✅ Create runbooks for common alerts
4. ✅ Setup on-call rotation
5. ✅ Document incident response procedures
6. ✅ Schedule regular alert review meetings
7. ✅ Monitor alert fatigue and tune accordingly

## 💡 Tips

- **Start Conservative**: Begin with higher thresholds and lower them gradually
- **Avoid Alert Fatigue**: Too many alerts = ignored alerts
- **Use Silences**: Silence alerts during maintenance windows
- **Document Everything**: Add clear descriptions and runbook URLs
- **Test Regularly**: Run test alerts to verify notification channels
- **Review Metrics**: Monitor AlertManager metrics for issues
- **Tune Continuously**: Adjust thresholds based on actual system behavior

## 🆘 Support

Need help?
- Check logs: `kubectl logs -n knowton-dev -l app=alertmanager`
- Run tests: `./k8s/dev/scripts/test-alertmanager.sh`
- Review docs: `k8s/dev/ALERTMANAGER_SETUP_GUIDE.md`
- Contact: devops@knowton.io
