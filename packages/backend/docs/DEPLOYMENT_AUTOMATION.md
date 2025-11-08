# Tenant Deployment Automation

## Overview

This document describes the automated deployment system for provisioning and managing white-label tenant instances on the KnowTon platform.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Deployment Automation                      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Provisioning │  │  Deployment  │  │  Monitoring  │    │
│  │   Scripts    │  │   Scripts    │  │   Service    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│         │                  │                  │            │
│         ▼                  ▼                  ▼            │
│  ┌──────────────────────────────────────────────────┐    │
│  │           Kubernetes Cluster                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    │
│  │  │ Tenant 1 │  │ Tenant 2 │  │ Tenant N │       │    │
│  │  │Namespace │  │Namespace │  │Namespace │       │    │
│  │  └──────────┘  └──────────┘  └──────────┘       │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Tenant Provisioning Script

**Location**: `packages/backend/src/scripts/provision-tenant.ts`

Automates the complete provisioning of a new tenant including:
- Database setup
- Configuration
- Initial data seeding
- Resource allocation
- Monitoring setup

**Usage**:
```bash
# Provision a new tenant
npm run provision "Acme Corp" acme enterprise admin@acme.com acme.knowton.com

# Deprovision a tenant
npm run deprovision <tenant-id>
```

**Features**:
- ✅ Automated tenant creation
- ✅ Admin user setup with temporary password
- ✅ API key generation (production & development)
- ✅ Branding configuration
- ✅ Feature flag setup based on plan
- ✅ Usage metrics initialization
- ✅ Welcome email generation

### 2. Kubernetes Deployment Script

**Location**: `packages/backend/src/scripts/deploy-tenant.sh`

Automates Kubernetes deployment for tenant instances:
- Namespace creation
- Resource quota configuration
- ConfigMap and Secret setup
- Service deployment
- Ingress configuration
- Monitoring setup

**Usage**:
```bash
# Deploy tenant to Kubernetes
./deploy-tenant.sh \
  --slug acme \
  --id abc-123-def-456 \
  --plan enterprise \
  --domain acme.knowton.com

# Dry run (preview without applying)
./deploy-tenant.sh \
  --slug acme \
  --id abc-123-def-456 \
  --plan professional \
  --dry-run
```

**Features**:
- ✅ Automated namespace creation
- ✅ Plan-based resource quotas
- ✅ Automatic SSL certificate provisioning
- ✅ Service deployment (backend + frontend)
- ✅ Ingress configuration
- ✅ Monitoring setup
- ✅ Health check validation

### 3. Tenant Monitoring Service

**Location**: `packages/backend/src/services/tenant-monitoring.service.ts`

Continuous monitoring of tenant health and performance:
- Health checks
- Usage tracking
- Alert management
- Performance metrics

**Features**:
- ✅ Database connectivity checks
- ✅ API health monitoring
- ✅ Storage usage tracking
- ✅ User limit monitoring
- ✅ Error rate tracking
- ✅ Automated alerting
- ✅ Multi-channel notifications (email, webhook, Slack)

## Deployment Plans

### Basic Plan
- **Max Users**: 10
- **Storage**: 10GB
- **Content Size**: 2GB per file
- **Rate Limit**: 100 req/min
- **CPU**: 2 cores
- **Memory**: 4GB
- **Features**: NFT, Bonds, Fractionalization

### Professional Plan
- **Max Users**: 100
- **Storage**: 100GB
- **Content Size**: 5GB per file
- **Rate Limit**: 500 req/min
- **CPU**: 8 cores
- **Memory**: 16GB
- **Features**: All Basic + Enterprise features

### Enterprise Plan
- **Max Users**: 1000
- **Storage**: 1TB
- **Content Size**: 10GB per file
- **Rate Limit**: 2000 req/min
- **CPU**: 32 cores
- **Memory**: 64GB
- **Features**: All features + Custom development

## Provisioning Workflow

### Step 1: Tenant Creation
```typescript
const result = await provisioner.provision({
  name: 'Acme Corporation',
  slug: 'acme',
  plan: 'enterprise',
  adminEmail: 'admin@acme.com',
  domain: 'acme.knowton.com',
  features: {
    enableNFT: true,
    enableBonds: true,
    enableFractionalization: true,
    enableEnterprise: true
  },
  branding: {
    companyName: 'Acme Corp',
    primaryColor: '#FF5733',
    secondaryColor: '#C70039'
  }
});
```

### Step 2: Kubernetes Deployment
```bash
./deploy-tenant.sh \
  --slug acme \
  --id ${result.tenant.id} \
  --plan enterprise \
  --domain acme.knowton.com
```

### Step 3: DNS Configuration
```bash
# Add CNAME record
acme.knowton.com → knowton.app

# Verify DNS
dig acme.knowton.com CNAME
```

### Step 4: Verification
```bash
# Check deployment status
kubectl get all -n knowton-tenant-acme

# Check health
curl https://acme.knowton.com/health

# Check API
curl https://acme.knowton.com/api/health
```

## Monitoring

### Health Checks

The monitoring service performs regular health checks:

```typescript
// Check single tenant
const health = await tenantMonitoringService.checkTenantHealth(tenantId);

// Check all tenants
const allHealth = await tenantMonitoringService.checkAllTenants();
```

**Health Status**:
- `healthy`: All checks passing
- `warning`: Some alerts triggered
- `critical`: Critical alerts triggered
- `down`: Service unavailable

### Alert Thresholds

Default alert thresholds:
- **User Limit**: 90% (warning), 95% (critical)
- **Storage Limit**: 85% (warning), 95% (critical)
- **API Rate Limit**: 80% (warning), 90% (critical)
- **Error Rate**: 5% (warning), 10% (critical)
- **Response Time**: 1000ms (warning), 2000ms (critical)

### Notification Channels

Alerts can be sent via:
- **Email**: Sent to tenant admin
- **Webhook**: HTTP POST to configured URL
- **Slack**: Posted to Slack channel

## API Endpoints

### Monitoring Endpoints

```bash
# Get current health status
GET /api/v1/monitoring/health
Headers: X-Tenant-Slug: acme

# Get health history
GET /api/v1/monitoring/health/history?startDate=2024-01-01&endDate=2024-12-31
Headers: X-Tenant-Slug: acme

# Get alerts
GET /api/v1/monitoring/alerts?resolved=false
Headers: X-Tenant-Slug: acme

# Resolve alert
POST /api/v1/monitoring/alerts/:id/resolve
Headers: X-Tenant-Slug: acme

# Get monitoring dashboard
GET /api/v1/monitoring/dashboard
Headers: X-Tenant-Slug: acme

# Check all tenants (admin only)
POST /api/v1/monitoring/check-all
```

## Automated Tasks

### Cron Jobs

Set up cron jobs for automated monitoring:

```bash
# Check all tenants every 5 minutes
*/5 * * * * cd /app && npm run monitor:check-all

# Generate daily reports
0 0 * * * cd /app && npm run monitor:daily-report

# Cleanup old logs (weekly)
0 0 * * 0 cd /app && npm run monitor:cleanup-logs
```

### Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: tenant-health-check
  namespace: knowton-dev
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: health-check
            image: knowton/backend:latest
            command:
            - npm
            - run
            - monitor:check-all
          restartPolicy: OnFailure
```

## Scaling

### Horizontal Scaling

Tenants automatically scale based on load:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: knowton-tenant-acme
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Vertical Scaling

Upgrade tenant plan to increase resources:

```bash
# Upgrade to enterprise plan
curl -X PUT https://api.knowton.com/api/v1/tenants/:id \
  -H "Content-Type: application/json" \
  -d '{"plan": "enterprise"}'

# Redeploy with new resources
./deploy-tenant.sh --slug acme --id :id --plan enterprise
```

## Backup & Recovery

### Automated Backups

Daily backups are automatically created:
- **Database**: Full backup at 2 AM UTC
- **Storage**: Incremental backup every 6 hours
- **Configuration**: Backed up on every change

### Recovery Procedure

```bash
# Restore from backup
npm run restore:tenant <tenant-id> <backup-date>

# Verify restoration
npm run verify:tenant <tenant-id>
```

## Security

### Secrets Management

All secrets are stored securely:
- **Kubernetes Secrets**: Encrypted at rest
- **Database Passwords**: Auto-generated, 32 characters
- **JWT Secrets**: Auto-generated, 64 characters
- **API Keys**: Hashed with SHA-256

### Network Security

- **TLS/SSL**: Automatic certificate provisioning
- **Network Policies**: Tenant isolation
- **IP Whitelisting**: Optional per tenant
- **Rate Limiting**: Per-tenant limits

## Troubleshooting

### Deployment Failures

```bash
# Check deployment status
kubectl get deployments -n knowton-tenant-acme

# Check pod logs
kubectl logs -n knowton-tenant-acme -l app=backend

# Describe pod for events
kubectl describe pod -n knowton-tenant-acme <pod-name>
```

### Health Check Failures

```bash
# Manual health check
curl https://acme.knowton.com/health

# Check monitoring logs
kubectl logs -n knowton-dev -l app=monitoring

# View alerts
curl https://api.knowton.com/api/v1/monitoring/alerts \
  -H "X-Tenant-Slug: acme"
```

### Performance Issues

```bash
# Check resource usage
kubectl top pods -n knowton-tenant-acme

# Check metrics
curl https://api.knowton.com/api/v1/monitoring/dashboard \
  -H "X-Tenant-Slug: acme"

# Scale up if needed
kubectl scale deployment backend -n knowton-tenant-acme --replicas=5
```

## Best Practices

1. **Always use dry-run first**: Test deployments before applying
2. **Monitor after deployment**: Check health for 24 hours
3. **Set up alerts**: Configure notification channels
4. **Regular backups**: Verify backup integrity weekly
5. **Document customizations**: Keep tenant-specific notes
6. **Test recovery**: Practice restore procedures quarterly
7. **Review metrics**: Analyze usage patterns monthly
8. **Update regularly**: Keep platform version current

## Support

For deployment automation support:
- **Documentation**: https://docs.knowton.app/deployment
- **Support Email**: devops@knowton.app
- **Slack Channel**: #deployment-automation

## Changelog

### Version 1.0.0 (2025-11-07)
- Initial release of deployment automation
- Tenant provisioning script
- Kubernetes deployment automation
- Monitoring service
- Health checks and alerting
- Multi-channel notifications
- Automated scaling
- Backup and recovery procedures
