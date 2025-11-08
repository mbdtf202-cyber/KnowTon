# HashiCorp Vault Integration Guide

## Overview

This document describes the integration of HashiCorp Vault into the KnowTon platform for secure secret management. Vault provides centralized secret storage, dynamic credential generation, secret rotation, and comprehensive audit logging.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     KnowTon Microservices                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Backend  │  │  Oracle  │  │ Bonding  │  │   Auth   │   │
│  │ Service  │  │ Adapter  │  │ Service  │  │ Service  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │             │          │
│       └─────────────┴──────────────┴─────────────┘          │
│                          │                                   │
│                   Vault Client                               │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   HashiCorp Vault      │
              │                        │
              │  ┌──────────────────┐  │
              │  │  KV Secrets v2   │  │
              │  │  - backend/*     │  │
              │  │  - blockchain/*  │  │
              │  │  - api/*         │  │
              │  │  - oracle/*      │  │
              │  └──────────────────┘  │
              │                        │
              │  ┌──────────────────┐  │
              │  │ Dynamic Secrets  │  │
              │  │  - database      │  │
              │  └──────────────────┘  │
              │                        │
              │  ┌──────────────────┐  │
              │  │  Audit Logging   │  │
              │  │  - file          │  │
              │  │  - syslog        │  │
              │  └──────────────────┘  │
              └────────────────────────┘
```

## Features Implemented

### 1. Vault Client Service

**Location**: `src/services/vault-client.service.ts`

**Features**:
- KV v2 secret engine integration
- Secret caching (5-minute TTL)
- Database credential management
- Blockchain private key retrieval
- API key management
- JWT secret retrieval
- Health checks and status monitoring

**Usage**:
```typescript
import { getVaultClient } from './services/vault-client.service';

const vaultClient = getVaultClient();

// Get a secret
const secret = await vaultClient.getSecret('backend/jwt');

// Get database credentials
const dbCreds = await vaultClient.getDatabaseCredentials();

// Get blockchain private key
const privateKey = await vaultClient.getBlockchainPrivateKey('arbitrum');

// Get API key
const apiKey = await vaultClient.getAPIKey('pinata');
```

### 2. Secret Rotation Service

**Location**: `src/services/secret-rotation.service.ts`

**Features**:
- Automatic secret rotation based on configurable intervals
- Manual rotation triggers
- Rotation status tracking
- Secure random generation for new secrets

**Rotation Schedule**:
- JWT secrets: 90 days (auto-rotate)
- Database passwords: 30 days (manual)
- API keys: 180 days (manual)
- Blockchain keys: 365 days (manual only)

**Usage**:
```typescript
import { getSecretRotationService } from './services/secret-rotation.service';

const rotationService = getSecretRotationService();

// Start automatic rotation scheduler (checks every 24 hours)
rotationService.startRotationScheduler(24);

// Manually rotate a secret
await rotationService.manualRotation('backend/jwt');

// Get rotation status
const status = await rotationService.getRotationStatus();
```

### 3. Secret Migration Tool

**Location**: `src/scripts/migrate-secrets-to-vault.ts`

**Features**:
- Migrate secrets from environment variables to Vault
- Verify migrated secrets
- List all secrets in Vault

**Usage**:
```bash
# Migrate all secrets
tsx src/scripts/migrate-secrets-to-vault.ts migrate

# Verify migration
tsx src/scripts/migrate-secrets-to-vault.ts verify

# List all secrets
tsx src/scripts/migrate-secrets-to-vault.ts list
```

### 4. Audit Logging Configuration

**Location**: `src/scripts/configure-vault-audit.ts`

**Features**:
- Enable file-based audit logging
- Enable syslog audit logging
- Configure audit policies
- Test audit logging

**Usage**:
```bash
tsx src/scripts/configure-vault-audit.ts
```

## Secret Organization

Secrets are organized in Vault using the following structure:

```
knowton/
├── backend/
│   ├── database          # PostgreSQL credentials
│   ├── redis             # Redis credentials
│   ├── jwt               # JWT secrets
│   └── encryption        # Encryption keys
├── blockchain/
│   ├── arbitrum          # Arbitrum network credentials
│   └── contracts         # Smart contract addresses
├── api/
│   ├── pinata            # IPFS service credentials
│   ├── openai            # OpenAI API keys
│   ├── stripe            # Payment gateway credentials
│   ├── alipay            # Alipay credentials
│   ├── wechat            # WeChat Pay credentials
│   ├── paypal            # PayPal credentials
│   └── email             # Email service credentials
├── oracle/
│   ├── chainlink         # Chainlink oracle config
│   └── ai                # AI model API keys
└── ai/
    └── huggingface       # HuggingFace tokens
```

## Integration with Services

### Auth Service

The auth service has been updated to retrieve JWT secrets from Vault:

```typescript
// Before
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// After
const jwtSecret = await getJWTSecret();
```

All JWT operations (sign, verify, refresh) now use Vault-managed secrets with automatic caching.

### Database Connections

Database credentials can be retrieved from Vault:

```typescript
const dbCreds = await vaultClient.getDatabaseCredentials();
const connectionString = dbCreds.url;
```

### Blockchain Operations

Private keys are securely retrieved from Vault:

```typescript
const privateKey = await vaultClient.getBlockchainPrivateKey('arbitrum');
const wallet = new ethers.Wallet(privateKey, provider);
```

## Dynamic Database Credentials

Vault can generate dynamic database credentials that automatically rotate:

### Setup

1. Enable database secrets engine:
```bash
vault secrets enable database
```

2. Configure PostgreSQL connection:
```bash
vault write database/config/postgres \
  plugin_name=postgresql-database-plugin \
  allowed_roles="knowton-backend" \
  connection_url="postgresql://{{username}}:{{password}}@postgres:5432/knowton" \
  username="vault" \
  password="vault-password"
```

3. Create role:
```bash
vault write database/roles/knowton-backend \
  db_name=postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

### Usage

```typescript
const creds = await vaultClient.getDatabaseCredentials('postgres');
// Returns: { username: 'v-knowton-backend-abc123', password: '...', url: '...' }
```

## Secret Rotation

### Automatic Rotation

The secret rotation service automatically rotates secrets based on configured intervals:

```typescript
// Start the rotation scheduler
rotationService.startRotationScheduler(24); // Check every 24 hours
```

### Manual Rotation

For critical secrets that require manual rotation:

```bash
# Rotate JWT secret
tsx src/scripts/rotate-secret.ts backend/jwt

# Rotate database password
tsx src/scripts/rotate-secret.ts backend/database
```

### Post-Rotation Actions

After rotating certain secrets, additional actions may be required:

1. **JWT Secret**: Existing tokens will become invalid. Consider implementing a grace period.
2. **Database Password**: Update connection pools and restart services.
3. **API Keys**: Update external service configurations.
4. **Blockchain Keys**: Transfer funds to new wallet address.

## Audit Logging

### Log Location

Audit logs are written to `/vault/logs/audit.log` in JSON format.

### Log Format

```json
{
  "time": "2024-01-01T12:00:00.000Z",
  "type": "request",
  "auth": {
    "client_token": "hmac-sha256:...",
    "policies": ["default", "knowton-backend"]
  },
  "request": {
    "operation": "read",
    "path": "knowton/data/backend/jwt",
    "remote_address": "10.0.0.1"
  }
}
```

### Monitoring

```bash
# Tail logs in real-time
kubectl exec -it vault-0 -n vault -- tail -f /vault/logs/audit.log

# Search for failed operations
kubectl exec -it vault-0 -n vault -- grep '"error"' /vault/logs/audit.log

# Count operations by path
kubectl exec -it vault-0 -n vault -- cat /vault/logs/audit.log | \
  jq -r '.request.path' | sort | uniq -c
```

### Alerts

Configure alerts for:
- Failed authentication attempts (> 5 in 5 minutes)
- Unauthorized access attempts
- Secret deletions
- Policy changes
- Unusual access patterns

## Security Best Practices

### 1. Token Management

- Use short-lived tokens (TTL < 24 hours)
- Implement token renewal before expiration
- Revoke tokens immediately when no longer needed

### 2. Access Control

- Follow principle of least privilege
- Use separate policies for each service
- Regularly review and audit policies

### 3. Secret Rotation

- Rotate secrets regularly (see rotation schedule)
- Test rotation procedures in staging first
- Have rollback procedures ready

### 4. Audit Logging

- Enable all audit devices
- Forward logs to centralized logging system
- Set up real-time alerts for suspicious activities
- Retain logs for compliance requirements (90+ days)

### 5. High Availability

- Run Vault in HA mode (3+ nodes)
- Use Consul or etcd for storage backend
- Implement automated unsealing
- Regular backups of Vault data

## Deployment

### Development

```bash
# Deploy Vault in dev mode
kubectl apply -f k8s/dev/vault-deployment.yaml

# Initialize and configure
kubectl exec -it vault-0 -n vault -- vault operator init
kubectl exec -it vault-0 -n vault -- vault operator unseal

# Migrate secrets
tsx src/scripts/migrate-secrets-to-vault.ts migrate

# Configure audit logging
tsx src/scripts/configure-vault-audit.ts
```

### Production

```bash
# Deploy Vault in HA mode
kubectl apply -f k8s/prod/vault.yaml

# Initialize (save unseal keys securely!)
kubectl exec -it vault-0 -n vault -- vault operator init -key-shares=5 -key-threshold=3

# Unseal all nodes
for i in 0 1 2; do
  kubectl exec -it vault-$i -n vault -- vault operator unseal <key1>
  kubectl exec -it vault-$i -n vault -- vault operator unseal <key2>
  kubectl exec -it vault-$i -n vault -- vault operator unseal <key3>
done

# Enable auto-unseal with cloud KMS (recommended)
# AWS KMS, GCP KMS, or Azure Key Vault
```

## Troubleshooting

### Vault is sealed

```bash
# Check status
kubectl exec -it vault-0 -n vault -- vault status

# Unseal
kubectl exec -it vault-0 -n vault -- vault operator unseal <unseal-key>
```

### Cannot connect to Vault

```bash
# Check Vault service
kubectl get svc vault -n vault

# Check Vault pods
kubectl get pods -n vault

# Check logs
kubectl logs vault-0 -n vault
```

### Secret not found

```bash
# List secrets
vault kv list knowton/backend

# Check secret exists
vault kv get knowton/backend/jwt

# Verify path is correct (include 'data' for KV v2)
# Correct: /v1/knowton/data/backend/jwt
# Wrong: /v1/knowton/backend/jwt
```

### Permission denied

```bash
# Check current token capabilities
vault token capabilities knowton/data/backend/jwt

# Check policy
vault policy read knowton-backend

# Update policy if needed
vault policy write knowton-backend policy.hcl
```

## Performance Optimization

### Caching

The Vault client implements a 5-minute cache for secrets:

```typescript
// Uses cache
const secret = await vaultClient.getSecret('backend/jwt', true);

// Bypasses cache
const secret = await vaultClient.getSecret('backend/jwt', false);
```

### Connection Pooling

Reuse the Vault client instance:

```typescript
// Good - singleton pattern
const vaultClient = getVaultClient();

// Bad - creates new instance
const vaultClient = new VaultClientService();
```

### Batch Operations

Retrieve multiple secrets in parallel:

```typescript
const [jwtSecret, dbCreds, apiKey] = await Promise.all([
  vaultClient.getJWTSecret(),
  vaultClient.getDatabaseCredentials(),
  vaultClient.getAPIKey('pinata'),
]);
```

## Monitoring and Metrics

### Health Checks

```typescript
const isHealthy = await vaultClient.healthCheck();
const status = await vaultClient.getStatus();
```

### Metrics

Expose Vault metrics to Prometheus:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'vault'
    static_configs:
      - targets: ['vault:8200']
    metrics_path: '/v1/sys/metrics'
    params:
      format: ['prometheus']
```

### Grafana Dashboard

Import the Vault dashboard (ID: 12904) for monitoring:
- Secret operations per second
- Token usage
- Audit log volume
- Error rates

## Migration Checklist

- [ ] Deploy Vault to Kubernetes
- [ ] Initialize and unseal Vault
- [ ] Enable KV v2 secrets engine
- [ ] Create policies for each service
- [ ] Migrate secrets from environment variables
- [ ] Update services to use Vault client
- [ ] Configure audit logging
- [ ] Set up secret rotation
- [ ] Configure monitoring and alerts
- [ ] Test failover and recovery
- [ ] Document unseal keys securely
- [ ] Remove secrets from .env files
- [ ] Update deployment documentation

## References

- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [Vault API Reference](https://www.vaultproject.io/api-docs)
- [Vault Best Practices](https://learn.hashicorp.com/tutorials/vault/production-hardening)
- [Kubernetes Integration](https://www.vaultproject.io/docs/platform/k8s)
