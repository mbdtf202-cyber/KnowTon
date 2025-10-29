# KnowTon Platform Monitoring Setup

This document describes the monitoring infrastructure for the KnowTon platform using Prometheus and Grafana.

## Overview

The monitoring stack consists of:
- **Prometheus**: Metrics collection and storage
- **Grafana**: Metrics visualization and dashboards

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                        │
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │  Prometheus  │◄─────│   Services   │                    │
│  │              │      │  (metrics)   │                    │
│  │  - Scraping  │      └──────────────┘                    │
│  │  - Storage   │                                           │
│  │  - Alerting  │      ┌──────────────┐                    │
│  └──────┬───────┘      │  Kubernetes  │                    │
│         │              │     API      │                    │
│         │              └──────────────┘                    │
│         │                                                   │
│         │ (Datasource)                                      │
│         ▼                                                   │
│  ┌──────────────┐                                          │
│  │   Grafana    │                                          │
│  │              │                                          │
│  │  - Dashboards│                                          │
│  │  - Alerts    │                                          │
│  │  - Users     │                                          │
│  └──────────────┘                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Components

### Prometheus

**Purpose**: Time-series database for metrics collection and storage

**Features**:
- Service discovery for Kubernetes pods and services
- Automatic scraping of metrics endpoints
- 30-day data retention
- Alert rule evaluation
- PromQL query language

**Configuration**:
- Config file: `prometheus.yaml` ConfigMap
- Storage: 20Gi PersistentVolume
- Scrape interval: 15 seconds
- Retention: 30 days

**Monitored Services**:
- Backend Service (Node.js)
- Analytics Service (Python)
- Oracle Adapter Service (Python)
- Bonding Service (Go)
- PostgreSQL
- Redis
- MongoDB
- ClickHouse
- Kafka
- Elasticsearch
- Kubernetes API Server
- Kubernetes Nodes
- Kubernetes Pods

### Grafana

**Purpose**: Visualization and dashboarding platform

**Features**:
- Pre-configured Prometheus datasource
- Default KnowTon overview dashboard
- User authentication
- Dashboard provisioning
- Plugin support

**Configuration**:
- Config file: `grafana.ini` ConfigMap
- Storage: 10Gi PersistentVolume
- Default credentials: admin / admin123
- Pre-installed plugins: clock-panel, simple-json-datasource, piechart-panel

## Deployment

### Prerequisites

- Kubernetes cluster (Minikube, Kind, or cloud provider)
- kubectl configured
- knowton-dev namespace

### Deploy Monitoring Stack

```bash
# Deploy Prometheus and Grafana
./scripts/deploy-monitoring.sh

# Or manually:
kubectl apply -f k8s/dev/prometheus.yaml
kubectl apply -f k8s/dev/grafana.yaml
```

### Verify Deployment

```bash
# Check Prometheus
kubectl get pods -n knowton-dev -l app=prometheus
kubectl get svc -n knowton-dev -l app=prometheus

# Check Grafana
kubectl get pods -n knowton-dev -l app=grafana
kubectl get svc -n knowton-dev -l app=grafana
```

## Access

### Prometheus

```bash
# Port-forward to access Prometheus UI
kubectl port-forward -n knowton-dev svc/prometheus-service 9090:9090

# Open in browser
open http://localhost:9090
```

**Prometheus UI Features**:
- Query metrics using PromQL
- View targets and service discovery
- Check alert rules
- Explore metrics

### Grafana

```bash
# Port-forward to access Grafana UI
kubectl port-forward -n knowton-dev svc/grafana-service 3000:3000

# Open in browser
open http://localhost:3000
```

**Default Credentials**:
- Username: `admin`
- Password: `admin123`

**First Login**:
1. Login with default credentials
2. Change password (recommended)
3. Navigate to Dashboards → Browse
4. Open "KnowTon Platform Overview" dashboard

## Metrics Collection

### Application Metrics

To expose metrics from your application, add Prometheus client library:

**Node.js (Backend Service)**:
```javascript
const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

**Python (Analytics/Oracle Services)**:
```python
from prometheus_client import Counter, Histogram, generate_latest

# Define metrics
request_count = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
request_duration = Histogram('http_request_duration_seconds', 'HTTP request duration')

# Expose metrics endpoint
@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

**Go (Bonding Service)**:
```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    requestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "grpc_requests_total",
            Help: "Total number of gRPC requests",
        },
        []string{"method", "status"},
    )
)

func init() {
    prometheus.MustRegister(requestsTotal)
}

// Expose metrics
http.Handle("/metrics", promhttp.Handler())
```

### Pod Annotations

To enable automatic scraping, add annotations to your pod spec:

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "3000"
    prometheus.io/path: "/metrics"
```

## Dashboards

### Default Dashboard

The deployment includes a default "KnowTon Platform Overview" dashboard with:
- Service health status
- CPU usage
- Memory usage
- API request rate
- Database connections
- Error rate

### Import Additional Dashboards

1. Go to Grafana UI
2. Click "+" → "Import"
3. Enter dashboard ID or upload JSON
4. Select Prometheus datasource

**Recommended Dashboards**:
- Node Exporter Full: 1860
- Kubernetes Cluster Monitoring: 7249
- PostgreSQL Database: 9628
- Redis Dashboard: 11835
- MongoDB Overview: 2583

### Create Custom Dashboards

1. Click "+" → "Dashboard"
2. Add Panel
3. Select Prometheus datasource
4. Write PromQL query
5. Configure visualization
6. Save dashboard

## Alert Rules

### Pre-configured Alerts

The deployment includes these alert rules:

1. **HighCPUUsage**: CPU > 80% for 5 minutes
2. **HighMemoryUsage**: Memory > 85% for 5 minutes
3. **ServiceDown**: Service unavailable for 2 minutes
4. **HighAPIErrorRate**: Error rate > 5% for 5 minutes
5. **DatabaseConnectionIssues**: Cannot connect to database

### Add Custom Alerts

Edit the `prometheus-config` ConfigMap:

```yaml
- alert: CustomAlert
  expr: your_metric > threshold
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Alert summary"
    description: "Alert description"
```

Apply changes:
```bash
kubectl apply -f k8s/dev/prometheus.yaml
kubectl rollout restart deployment/prometheus -n knowton-dev
```

## Troubleshooting

### Prometheus Not Scraping Targets

1. Check service discovery:
```bash
kubectl port-forward -n knowton-dev svc/prometheus-service 9090:9090
# Open http://localhost:9090/targets
```

2. Verify pod annotations
3. Check network policies
4. Review Prometheus logs:
```bash
kubectl logs -n knowton-dev -l app=prometheus
```

### Grafana Cannot Connect to Prometheus

1. Check datasource configuration in Grafana
2. Verify Prometheus service is running:
```bash
kubectl get svc prometheus-service -n knowton-dev
```

3. Test connectivity from Grafana pod:
```bash
kubectl exec -n knowton-dev -it <grafana-pod> -- wget -O- http://prometheus-service:9090/api/v1/status/config
```

### High Memory Usage

If Prometheus uses too much memory:

1. Reduce retention time:
```yaml
args:
  - '--storage.tsdb.retention.time=15d'  # Reduce from 30d
```

2. Reduce scrape frequency:
```yaml
global:
  scrape_interval: 30s  # Increase from 15s
```

3. Increase memory limits:
```yaml
resources:
  limits:
    memory: "4Gi"  # Increase from 2Gi
```

## Maintenance

### Backup Prometheus Data

```bash
# Create backup
kubectl exec -n knowton-dev <prometheus-pod> -- tar czf /tmp/prometheus-backup.tar.gz /prometheus

# Copy to local
kubectl cp knowton-dev/<prometheus-pod>:/tmp/prometheus-backup.tar.gz ./prometheus-backup.tar.gz
```

### Backup Grafana Dashboards

```bash
# Export all dashboards via API
curl -u admin:admin123 http://localhost:3000/api/search | jq -r '.[] | .uid' | \
  xargs -I {} curl -u admin:admin123 http://localhost:3000/api/dashboards/uid/{} > dashboards-backup.json
```

### Update Prometheus

```bash
# Update image version in prometheus.yaml
# Then apply:
kubectl apply -f k8s/dev/prometheus.yaml
kubectl rollout restart deployment/prometheus -n knowton-dev
```

### Update Grafana

```bash
# Update image version in grafana.yaml
# Then apply:
kubectl apply -f k8s/dev/grafana.yaml
kubectl rollout restart deployment/grafana -n knowton-dev
```

## Performance Tuning

### Prometheus

- **Scrape interval**: Balance between data granularity and resource usage
- **Retention time**: Longer retention requires more storage
- **Memory**: Prometheus keeps recent data in memory for fast queries
- **Storage**: Use SSD for better performance

### Grafana

- **Query timeout**: Increase for complex queries
- **Cache**: Enable query result caching
- **Concurrent queries**: Limit to prevent overload

## Security

### Prometheus

- RBAC configured for Kubernetes API access
- No authentication by default (internal service)
- Use network policies to restrict access

### Grafana

- Change default admin password immediately
- Enable HTTPS in production
- Configure OAuth/LDAP for user authentication
- Use Grafana's built-in RBAC for user permissions

## Monitoring Best Practices

1. **Label Consistency**: Use consistent label names across services
2. **Metric Naming**: Follow Prometheus naming conventions
3. **Cardinality**: Avoid high-cardinality labels (e.g., user IDs)
4. **Aggregation**: Pre-aggregate metrics when possible
5. **Alerting**: Set meaningful thresholds and avoid alert fatigue
6. **Documentation**: Document custom metrics and dashboards

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)

## Support

For issues or questions:
1. Check logs: `kubectl logs -n knowton-dev -l app=prometheus` or `kubectl logs -n knowton-dev -l app=grafana`
2. Review this documentation
3. Consult Prometheus/Grafana documentation
4. Contact the DevOps team
