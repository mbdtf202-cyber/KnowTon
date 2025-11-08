# AlertManager Setup and Configuration Guide

## Overview

This guide covers the complete setup and configuration of AlertManager for the KnowTon platform, including notification channels, alert routing, and testing procedures.

## Architecture

```
┌─────────────┐
│ Prometheus  │
│  (Metrics)  │
└──────┬──────┘
       │ Alert Rules
       ▼
┌─────────────────┐
│  AlertManager   │
│   (Routing)     │
└────────┬────────┘
         │
    ┌────┴────┬────────┬─────────┬──────────┐
    ▼         ▼        ▼         ▼          ▼
┌───────┐ ┌──────┐ ┌──────┐ ┌─────────┐ ┌──────┐
│ Slack │ │Email │ │Discord│ │PagerDuty│ │Webhook│
└───────┘ └──────┘ └──────┘ └─────────┘ └──────┘
```

## Features

### ✅ Implemented Features

1. **Multi-Channel Notifications**
   - Slack integration with multiple channels
   - Email notifications (SMTP)
   - Discord webhooks
   - PagerDuty integration (optional)
   - Custom webhook support

2. **Intelligent Alert Routing**
   - Severity-based routing (critical, warning, info)
   - Category-based routing (database, security, blockchain, etc.)
   - Component-based routing (data-sync, audit, etc.)
   - Service-specific routing

3. **Alert Inhibition Rules**
   - Prevent alert spam
   - Suppress lower severity alerts when higher severity fires
   - Service-down inhibition
   - Database-down inhibition

4. **Custom Templates**
   - Slack message templates
   - Email HTML templates
   - Discord message templates
   - PagerDuty payload templates

5. **Alert Management**
   - Alert grouping
   - Alert silencing
   - Alert acknowledgment
   - Auto-resolution

## Quick Start

### 1. Configure Notification Channels

#### Slack Setup

1. Create a Slack app at https://api.slack.com/apps
2. Enable Incoming Webhooks
3. Create webhooks for each channel:
   - `#knowton-alerts` (default)
   - `#knowton-critical` (critical alerts)
   - `#knowton-warnings` (warnings)
   - `#knowton-info` (info alerts)
   - `#knowton-database` (database alerts)
   - `#knowton-security` (security alerts)
   - `#knowton-blockchain` (blockchain alerts)
   - `#knowton-performance` (performance alerts)
   - `#knowton-resources` (resource alerts)
   - `#knowton-business` (business metrics)
   - `#knowton-data-sync` (data sync alerts)
   - `#knowton-audit` (audit alerts)

4. Copy webhook URLs

#### Discord Setup

1. Go to your Discord server settings
2. Navigate to Integrations → Webhooks
3. Create a new webhook
4. Copy the webhook URL

#### Email Setup (Gmail Example)

1. Enable 2-factor authentication on your Gmail account
2. Generate an app password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. Use the app password in SMTP configuration

#### PagerDuty Setup (Optional)

1. Create a PagerDuty account
2. Create a new service
3. Add Prometheus integration
4. Copy the integration key

### 2. Create Secrets

Create a file `alertmanager-secrets.env` with your actual values:

```bash
# Slack
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

# Discord
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com:587"
SMTP_FROM="alerts@knowton.io"
SMTP_USERNAME="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"

# Email Recipients
ALERT_EMAIL_TO="ops@knowton.io,devops@knowton.io"
DBA_EMAIL="dba@knowton.io"
SECURITY_EMAIL="security@knowton.io"
BUSINESS_EMAIL="business@knowton.io"
AUDIT_EMAIL="audit@knowton.io,compliance@knowton.io"

# PagerDuty (optional)
PAGERDUTY_SERVICE_KEY="your-pagerduty-integration-key"
```

Create the Kubernetes secret:

```bash
kubectl create secret generic alertmanager-secrets \
  --from-env-file=alertmanager-secrets.env \
  --namespace=knowton-dev
```

Or create from individual values:

```bash
kubectl create secret generic alertmanager-secrets \
  --from-literal=SLACK_WEBHOOK_URL="$SLACK_WEBHOOK_URL" \
  --from-literal=DISCORD_WEBHOOK_URL="$DISCORD_WEBHOOK_URL" \
  --from-literal=SMTP_HOST="$SMTP_HOST" \
  --from-literal=SMTP_FROM="$SMTP_FROM" \
  --from-literal=SMTP_USERNAME="$SMTP_USERNAME" \
  --from-literal=SMTP_PASSWORD="$SMTP_PASSWORD" \
  --from-literal=ALERT_EMAIL_TO="$ALERT_EMAIL_TO" \
  --from-literal=DBA_EMAIL="$DBA_EMAIL" \
  --from-literal=SECURITY_EMAIL="$SECURITY_EMAIL" \
  --from-literal=BUSINESS_EMAIL="$BUSINESS_EMAIL" \
  --from-literal=AUDIT_EMAIL="$AUDIT_EMAIL" \
  --namespace=knowton-dev
```

### 3. Deploy AlertManager

```bash
# Create namespace if not exists
kubectl create namespace knowton-dev

# Apply templates ConfigMap
kubectl apply -f k8s/dev/alertmanager-templates.yaml

# Apply AlertManager configuration and deployment
kubectl apply -f k8s/dev/alertmanager.yaml

# Verify deployment
kubectl get pods -n knowton-dev -l app=alertmanager
kubectl logs -n knowton-dev -l app=alertmanager
```

### 4. Configure Prometheus

Update Prometheus configuration to use AlertManager:

```yaml
# In prometheus.yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager-service:9093
```

Apply alert rules:

```bash
kubectl apply -f k8s/dev/prometheus-alerts.yaml
kubectl apply -f k8s/dev/data-sync-alerts.yaml
kubectl apply -f k8s/dev/audit-alerts.yaml
```

### 5. Test AlertManager

```bash
# Port forward AlertManager
kubectl port-forward -n knowton-dev svc/alertmanager-service 9093:9093 &

# Port forward Prometheus
kubectl port-forward -n knowton-dev svc/prometheus-service 9090:9090 &

# Run test script
./k8s/dev/scripts/test-alertmanager.sh
```

## Alert Routing Configuration

### Severity Levels

- **Critical**: Immediate action required, multiple notification channels
- **Warning**: Attention needed, Slack + Email
- **Info**: Informational, Slack only

### Alert Categories

- **availability**: Service up/down status
- **errors**: Error rates and failures
- **performance**: Response times and throughput
- **resources**: CPU, memory, disk usage
- **stability**: Pod restarts and crashes
- **database**: Database health and connections
- **cache**: Redis and caching issues
- **business**: Business metrics and KPIs
- **transactions**: Blockchain transactions
- **ai**: AI service performance
- **blockchain**: Blockchain connectivity
- **data_sync**: Data synchronization
- **security**: Security events
- **audit**: Audit log events

### Routing Examples

#### Critical Database Alert
```
Severity: critical
Category: database
→ Receivers: database-critical, critical-alerts
→ Channels: #knowton-database, #knowton-critical, Email (DBA)
```

#### Warning Performance Alert
```
Severity: warning
Category: performance
→ Receiver: performance-warnings
→ Channels: #knowton-performance
```

#### Info Business Metric
```
Severity: info
Category: business
→ Receiver: business-alerts
→ Channels: #knowton-business, Email (Business team)
```

## Alert Inhibition

AlertManager automatically suppresses redundant alerts:

1. **Severity Inhibition**: Warning alerts are suppressed when critical alerts fire
2. **Service Down Inhibition**: Service-specific alerts are suppressed when service is down
3. **Database Down Inhibition**: Connection alerts are suppressed when database is down
4. **Data Sync Inhibition**: Sync lag alerts are suppressed when sync service is down

## Alert Silencing

### Via AlertManager UI

1. Access AlertManager UI: http://alertmanager:9093
2. Click on an alert
3. Click "Silence"
4. Set duration and comment
5. Click "Create"

### Via API

```bash
curl -X POST http://alertmanager:9093/api/v1/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [
      {
        "name": "alertname",
        "value": "HighCPUUsage",
        "isRegex": false
      }
    ],
    "startsAt": "2024-01-01T00:00:00Z",
    "endsAt": "2024-01-01T01:00:00Z",
    "createdBy": "admin",
    "comment": "Planned maintenance"
  }'
```

### Via amtool

```bash
# Install amtool
go install github.com/prometheus/alertmanager/cmd/amtool@latest

# Create silence
amtool silence add \
  --alertmanager.url=http://alertmanager:9093 \
  --author="admin" \
  --comment="Planned maintenance" \
  --duration=1h \
  alertname="HighCPUUsage"

# List silences
amtool silence query --alertmanager.url=http://alertmanager:9093

# Expire silence
amtool silence expire <silence-id> --alertmanager.url=http://alertmanager:9093
```

## Notification Templates

### Slack Template Customization

Edit `k8s/dev/alertmanager-templates.yaml`:

```yaml
{{ define "slack.custom.text" }}
*Alert:* {{ .Labels.alertname }}
*Service:* {{ .Labels.service }}
*Description:* {{ .Annotations.description }}
{{ end }}
```

### Email Template Customization

```yaml
{{ define "email.custom.html" }}
<html>
  <body>
    <h1>{{ .Labels.alertname }}</h1>
    <p>{{ .Annotations.description }}</p>
  </body>
</html>
{{ end }}
```

## Monitoring AlertManager

### Metrics

AlertManager exposes metrics at `/metrics`:

```bash
curl http://alertmanager:9093/metrics
```

Key metrics:
- `alertmanager_alerts`: Number of active alerts
- `alertmanager_notifications_total`: Total notifications sent
- `alertmanager_notifications_failed_total`: Failed notifications
- `alertmanager_silences`: Number of active silences

### Health Checks

```bash
# Liveness
curl http://alertmanager:9093/-/healthy

# Readiness
curl http://alertmanager:9093/-/ready

# Status
curl http://alertmanager:9093/api/v1/status
```

## Troubleshooting

### Alerts Not Firing

1. Check Prometheus rules:
   ```bash
   curl http://prometheus:9090/api/v1/rules | jq '.data.groups[].rules[] | select(.type == "alerting")'
   ```

2. Check alert state:
   ```bash
   curl http://prometheus:9090/api/v1/alerts
   ```

3. Verify AlertManager configuration:
   ```bash
   curl http://alertmanager:9093/api/v1/status
   ```

### Notifications Not Received

1. Check AlertManager logs:
   ```bash
   kubectl logs -n knowton-dev -l app=alertmanager
   ```

2. Verify webhook URLs:
   ```bash
   kubectl get secret alertmanager-secrets -n knowton-dev -o jsonpath='{.data.SLACK_WEBHOOK_URL}' | base64 -d
   ```

3. Test webhook manually:
   ```bash
   curl -X POST "$SLACK_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{"text": "Test message"}'
   ```

4. Check notification metrics:
   ```bash
   curl http://alertmanager:9093/metrics | grep alertmanager_notifications
   ```

### Configuration Errors

1. Validate configuration:
   ```bash
   amtool check-config k8s/dev/alertmanager.yaml
   ```

2. Reload configuration:
   ```bash
   curl -X POST http://alertmanager:9093/-/reload
   ```

3. Check configuration in UI:
   - Go to http://alertmanager:9093/#/status
   - Review "Config" tab

## Best Practices

### 1. Alert Threshold Tuning

- Start with conservative thresholds
- Monitor false positive rate
- Adjust based on actual system behavior
- Document threshold rationale

### 2. Alert Grouping

- Group related alerts together
- Use appropriate `group_by` labels
- Set reasonable `group_wait` and `group_interval`

### 3. Notification Channels

- Use different channels for different severities
- Avoid notification fatigue
- Set appropriate repeat intervals
- Use silences during maintenance

### 4. Alert Documentation

- Add clear descriptions to all alerts
- Include runbook URLs
- Document expected values and thresholds
- Provide troubleshooting steps

### 5. Testing

- Test alerts regularly
- Verify all notification channels
- Practice incident response
- Update on-call procedures

## Alert Runbooks

Create runbooks for common alerts:

### ServiceDown

**Severity**: Critical

**Description**: Service is not responding

**Investigation Steps**:
1. Check pod status: `kubectl get pods -n knowton-dev`
2. Check pod logs: `kubectl logs -n knowton-dev <pod-name>`
3. Check events: `kubectl get events -n knowton-dev`
4. Check resource usage: `kubectl top pods -n knowton-dev`

**Resolution**:
1. Restart pod if crashed
2. Scale up if resource constrained
3. Check configuration if misconfigured
4. Investigate application errors

### HighErrorRate

**Severity**: Warning

**Description**: Service error rate above threshold

**Investigation Steps**:
1. Check error logs
2. Review recent deployments
3. Check dependencies
4. Analyze error patterns

**Resolution**:
1. Rollback if recent deployment
2. Fix application bugs
3. Scale resources if needed
4. Update error handling

## Integration Examples

### Slack App

Create a Slack app with interactive buttons:

```yaml
slack_configs:
  - channel: '#knowton-critical'
    actions:
      - type: button
        text: 'Acknowledge'
        url: 'http://alertmanager:9093'
      - type: button
        text: 'Silence 1h'
        url: 'http://alertmanager:9093/#/silences/new'
      - type: button
        text: 'View Grafana'
        url: 'http://grafana:3000'
```

### PagerDuty Escalation

```yaml
pagerduty_configs:
  - service_key: 'primary-oncall-key'
    severity: 'critical'
    details:
      firing: '{{ .Alerts.Firing | len }}'
      resolved: '{{ .Alerts.Resolved | len }}'
```

### Custom Webhook

```yaml
webhook_configs:
  - url: 'http://custom-handler:8080/alerts'
    send_resolved: true
    http_config:
      bearer_token: 'secret-token'
```

## Maintenance

### Regular Tasks

- **Daily**: Review active alerts
- **Weekly**: Check notification metrics
- **Monthly**: Review and tune thresholds
- **Quarterly**: Update runbooks

### Backup

Backup AlertManager data:

```bash
kubectl exec -n knowton-dev alertmanager-0 -- tar czf - /alertmanager > alertmanager-backup.tar.gz
```

Restore:

```bash
kubectl exec -n knowton-dev alertmanager-0 -- tar xzf - -C / < alertmanager-backup.tar.gz
```

## Resources

- [AlertManager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Alert Rule Best Practices](https://prometheus.io/docs/practices/alerting/)
- [Notification Template Reference](https://prometheus.io/docs/alerting/latest/notifications/)
- [amtool Documentation](https://github.com/prometheus/alertmanager#amtool)

## Support

For issues or questions:
- Check logs: `kubectl logs -n knowton-dev -l app=alertmanager`
- Review metrics: http://alertmanager:9093/metrics
- Test configuration: `./k8s/dev/scripts/test-alertmanager.sh`
- Contact DevOps team: devops@knowton.io
