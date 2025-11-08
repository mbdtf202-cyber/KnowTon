# Deployment Automation - Quick Start Guide

## Overview

This guide will help you quickly provision and deploy a new tenant on the KnowTon platform using automated scripts.

## Prerequisites

- Node.js 18+ installed
- kubectl configured with cluster access
- PostgreSQL database running
- Docker images built and available

## Quick Start

### 1. Provision a New Tenant (5 minutes)

```bash
cd packages/backend

# Install dependencies
npm install

# Run database migrations
npx prisma migrate deploy

# Provision tenant
npm run provision "Acme Corporation" acme enterprise admin@acme.com acme.knowton.com
```

**Output**:
```
🚀 Starting tenant provisioning for: Acme Corporation
   Slug: acme
   Plan: enterprise
   Domain: acme.knowton.com

📦 Step 1: Creating tenant...
   ✅ Tenant created: abc-123-def-456

⚙️  Step 2: Configuring tenant features...
   ✅ Tenant configured

🎨 Step 3: Setting up branding...
   ✅ Branding configured

👤 Step 4: Creating admin user...
   ✅ Admin user created: admin@acme.com

🔑 Step 5: Generating API keys...
   ✅ API keys generated: 2 keys

📊 Step 6: Setting up monitoring...
   ✅ Monitoring configured

📈 Step 7: Initializing usage metrics...
   ✅ Metrics initialized

📧 Step 8: Sending welcome email...
   ✅ Welcome email sent

✨ Tenant provisioning completed successfully!

📋 Provisioning Summary:
═══════════════════════════════════════════
Tenant ID: abc-123-def-456
Tenant Slug: acme
Plan: enterprise

Admin Access:
  Email: admin@acme.com
  Password: Xy9#mK2$pL5@qR8!

API Keys:
  Production API Key:
    Key: kt_abc123...
    Secret: secret_xyz789...
  Development API Key:
    Key: kt_def456...
    Secret: secret_uvw012...

Access URLs:
  Web: https://acme.knowton.com
  API: https://api.acme.knowton.com
  Dashboard: https://admin.knowton.com/tenants/abc-123-def-456
═══════════════════════════════════════════
```

### 2. Deploy to Kubernetes (3 minutes)

```bash
cd packages/backend/src/scripts

# Make script executable
chmod +x deploy-tenant.sh

# Deploy tenant
./deploy-tenant.sh \
  --slug acme \
  --id abc-123-def-456 \
  --plan enterprise \
  --domain acme.knowton.com
```

**Output**:
```
ℹ Starting tenant deployment
  Tenant: acme
  ID: abc-123-def-456
  Plan: enterprise
  Domain: acme.knowton.com
  Namespace: knowton-tenant-acme

ℹ Step 1: Creating Kubernetes namespace...
✓ Namespace created: knowton-tenant-acme

ℹ Step 2: Setting resource quotas...
✓ Resource quotas configured

ℹ Step 3: Creating tenant configuration...
✓ ConfigMap created

ℹ Step 4: Creating tenant secrets...
✓ Secrets created

ℹ Step 5: Deploying backend service...
✓ Backend service deployed

ℹ Step 6: Deploying frontend service...
✓ Frontend service deployed

ℹ Step 7: Configuring ingress...
✓ Ingress configured for acme.knowton.com

ℹ Step 8: Setting up monitoring...
✓ Monitoring configured

ℹ Step 9: Waiting for deployment to be ready...
✓ All deployments are ready

✓ Tenant deployment completed successfully!

═══════════════════════════════════════════════════════════
  Tenant: acme
  Namespace: knowton-tenant-acme
  URL: https://acme.knowton.com
  Plan: enterprise
═══════════════════════════════════════════════════════════

Next steps:
  1. Verify deployment: kubectl get all -n knowton-tenant-acme
  2. Check logs: kubectl logs -n knowton-tenant-acme -l app=backend
  3. Access application: https://acme.knowton.com
```

### 3. Configure DNS (2 minutes)

Add a CNAME record in your DNS provider:

```
Type: CNAME
Name: acme.knowton.com
Value: knowton.app
TTL: 300
```

Verify DNS propagation:
```bash
dig acme.knowton.com CNAME
```

### 4. Verify Deployment (1 minute)

```bash
# Check Kubernetes resources
kubectl get all -n knowton-tenant-acme

# Check health endpoint
curl https://acme.knowton.com/health

# Check API endpoint
curl https://acme.knowton.com/api/health
```

## Monitoring

### Check Tenant Health

```bash
# Via API
curl https://api.knowton.com/api/v1/monitoring/health \
  -H "X-Tenant-Slug: acme"

# Via script
npm run monitor:check-all
```

### View Monitoring Dashboard

```bash
curl https://api.knowton.com/api/v1/monitoring/dashboard \
  -H "X-Tenant-Slug: acme"
```

### Setup Automated Monitoring

Add to crontab:
```bash
# Check all tenants every 5 minutes
*/5 * * * * cd /app/packages/backend && npm run monitor:check-all

# Generate daily report at midnight
0 0 * * * cd /app/packages/backend && npm run monitor:daily-report

# Cleanup old logs weekly
0 0 * * 0 cd /app/packages/backend && npm run monitor:cleanup
```

## Common Tasks

### Update Tenant Configuration

```bash
curl -X PUT https://api.knowton.com/api/v1/tenants/abc-123-def-456/config \
  -H "Content-Type: application/json" \
  -d '{
    "maxUsers": 200,
    "maxStorage": 2199023255552,
    "rateLimitPerMin": 3000
  }'
```

### Upgrade Tenant Plan

```bash
curl -X PUT https://api.knowton.com/api/v1/tenants/abc-123-def-456 \
  -H "Content-Type: application/json" \
  -d '{"plan": "enterprise"}'

# Redeploy with new resources
./deploy-tenant.sh --slug acme --id abc-123-def-456 --plan enterprise
```

### Scale Tenant Resources

```bash
# Scale backend replicas
kubectl scale deployment backend -n knowton-tenant-acme --replicas=5

# Scale frontend replicas
kubectl scale deployment frontend -n knowton-tenant-acme --replicas=3
```

### View Tenant Logs

```bash
# Backend logs
kubectl logs -n knowton-tenant-acme -l app=backend --tail=100 -f

# Frontend logs
kubectl logs -n knowton-tenant-acme -l app=frontend --tail=100 -f
```

### Suspend Tenant

```bash
curl -X POST https://api.knowton.com/api/v1/tenants/abc-123-def-456/suspend \
  -H "Content-Type: application/json" \
  -d '{"reason": "Payment overdue"}'
```

### Activate Tenant

```bash
curl -X POST https://api.knowton.com/api/v1/tenants/abc-123-def-456/activate
```

### Deprovision Tenant

```bash
# Deprovision (archives data and deletes tenant)
npm run deprovision abc-123-def-456

# Delete Kubernetes resources
kubectl delete namespace knowton-tenant-acme
```

## Troubleshooting

### Deployment Stuck

```bash
# Check pod status
kubectl get pods -n knowton-tenant-acme

# Describe pod for events
kubectl describe pod -n knowton-tenant-acme <pod-name>

# Check logs
kubectl logs -n knowton-tenant-acme <pod-name>
```

### Health Check Failing

```bash
# Check service endpoints
kubectl get endpoints -n knowton-tenant-acme

# Test internal connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never \
  -n knowton-tenant-acme -- curl http://backend-service/health
```

### DNS Not Resolving

```bash
# Check DNS propagation
dig acme.knowton.com

# Check ingress
kubectl get ingress -n knowton-tenant-acme

# Check certificate
kubectl get certificate -n knowton-tenant-acme
```

### High Resource Usage

```bash
# Check resource usage
kubectl top pods -n knowton-tenant-acme

# Check resource quotas
kubectl describe resourcequota -n knowton-tenant-acme

# Scale up if needed
kubectl scale deployment backend -n knowton-tenant-acme --replicas=5
```

## Best Practices

1. **Always test in staging first**: Use `--dry-run` flag
2. **Monitor after deployment**: Check health for 24 hours
3. **Set up alerts**: Configure notification channels immediately
4. **Document customizations**: Keep notes on tenant-specific configs
5. **Regular backups**: Verify backup integrity weekly
6. **Review metrics**: Analyze usage patterns monthly

## Next Steps

- [Full Deployment Automation Guide](./DEPLOYMENT_AUTOMATION.md)
- [Multi-Tenancy Documentation](./MULTI_TENANCY.md)
- [Custom Branding Guide](./CUSTOM_BRANDING.md)
- [API Customization Guide](./API_CUSTOMIZATION.md)

## Support

Need help?
- **Documentation**: https://docs.knowton.app
- **Support Email**: devops@knowton.app
- **Slack**: #deployment-automation

## Changelog

### Version 1.0.0 (2025-11-07)
- Initial release
- Automated provisioning
- Kubernetes deployment
- Health monitoring
- Quick start guide
