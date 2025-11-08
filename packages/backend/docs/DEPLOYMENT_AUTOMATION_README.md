# Deployment Automation

Automated tenant provisioning, deployment, and monitoring for the KnowTon white-label platform.

## Quick Links

- [Quick Start Guide](./DEPLOYMENT_AUTOMATION_QUICK_START.md) - Get started in 10 minutes
- [Full Documentation](./DEPLOYMENT_AUTOMATION.md) - Complete reference guide
- [Implementation Summary](./TASK_3.2.4_IMPLEMENTATION_SUMMARY.md) - Technical details

## Overview

The deployment automation system provides:

- **Automated Provisioning**: One-command tenant creation with full configuration
- **Kubernetes Deployment**: Automated service deployment with resource management
- **24/7 Monitoring**: Real-time health checks with alerting and notifications

## Quick Start

### 1. Provision a Tenant (30 seconds)

```bash
npm run provision "Acme Corp" acme enterprise admin@acme.com acme.knowton.com
```

### 2. Deploy to Kubernetes (3 minutes)

```bash
./deploy-tenant.sh --slug acme --id <tenant-id> --plan enterprise --domain acme.knowton.com
```

### 3. Monitor Health

```bash
npm run monitor:check-all
```

## Features

### Tenant Provisioning
- ✅ Automated tenant creation
- ✅ Plan-based resource allocation
- ✅ Secure credential generation
- ✅ API key management
- ✅ Branding configuration
- ✅ Feature flag setup

### Kubernetes Deployment
- ✅ Namespace isolation
- ✅ Resource quotas
- ✅ Service deployment
- ✅ Ingress configuration
- ✅ SSL certificates
- ✅ Auto-scaling

### Monitoring & Alerting
- ✅ Real-time health checks
- ✅ Usage tracking
- ✅ Performance metrics
- ✅ Alert management
- ✅ Multi-channel notifications
- ✅ Automated reporting

## Plans & Resources

| Plan | CPU | Memory | Storage | Users | Rate Limit |
|------|-----|--------|---------|-------|------------|
| Basic | 2 cores | 4GB | 10GB | 10 | 100/min |
| Professional | 8 cores | 16GB | 100GB | 100 | 500/min |
| Enterprise | 32 cores | 64GB | 1TB | 1000 | 2000/min |

## Commands

### Provisioning
```bash
# Provision tenant
npm run provision <name> <slug> <plan> <email> [domain]

# Deprovision tenant
npm run deprovision <tenant-id>
```

### Deployment
```bash
# Deploy tenant
./deploy-tenant.sh --slug <slug> --id <id> --plan <plan> [--domain <domain>]

# Dry run
./deploy-tenant.sh --slug <slug> --id <id> --plan <plan> --dry-run
```

### Monitoring
```bash
# Check all tenants
npm run monitor:check-all

# Generate daily report
npm run monitor:daily-report

# Cleanup old logs
npm run monitor:cleanup
```

## API Endpoints

```bash
# Get health status
GET /api/v1/monitoring/health

# Get alerts
GET /api/v1/monitoring/alerts

# Get dashboard
GET /api/v1/monitoring/dashboard
```

## Monitoring Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| User Limit | 90% | 95% |
| Storage | 85% | 95% |
| Error Rate | 5% | 10% |
| Response Time | 1000ms | 2000ms |

## Automated Tasks

- **Health Checks**: Every 5 minutes
- **Daily Reports**: Midnight UTC
- **Log Cleanup**: Weekly (Sundays)

## Architecture

```
┌─────────────────────────────────────────┐
│         Provisioning Script             │
│  - Tenant creation                      │
│  - Configuration                        │
│  - API keys                             │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│       Deployment Script                 │
│  - Kubernetes resources                 │
│  - Service deployment                   │
│  - Ingress configuration                │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│       Monitoring Service                │
│  - Health checks                        │
│  - Alerts                               │
│  - Notifications                        │
└─────────────────────────────────────────┘
```

## Security

- Secure password generation
- API key hashing (SHA-256)
- Kubernetes secrets
- Network isolation
- TLS/SSL certificates
- Rate limiting

## Documentation

- **Quick Start**: [DEPLOYMENT_AUTOMATION_QUICK_START.md](./DEPLOYMENT_AUTOMATION_QUICK_START.md)
- **Full Guide**: [DEPLOYMENT_AUTOMATION.md](./DEPLOYMENT_AUTOMATION.md)
- **Implementation**: [TASK_3.2.4_IMPLEMENTATION_SUMMARY.md](./TASK_3.2.4_IMPLEMENTATION_SUMMARY.md)
- **Completion Note**: [TASK_3.2.4_COMPLETION_NOTE.md](./TASK_3.2.4_COMPLETION_NOTE.md)

## Support

- **Email**: devops@knowton.app
- **Docs**: https://docs.knowton.app/deployment
- **Slack**: #deployment-automation

## License

Copyright © 2025 KnowTon Platform
