# Vault Integration Quick Start

## Prerequisites

- Kubernetes cluster running
- kubectl configured
- Node.js and npm installed

## Step 1: Deploy Vault

```bash
# Deploy Vault to Kubernetes
kubectl apply -f k8s/dev/vault-deployment.yaml

# Wait for Vault to be ready
kubectl wait --for=condition=ready pod -l app=vault -n vault --timeout=120s

# Check Vault status
kubectl get pods -n vault
```

## Step 2: Initialize Vault (First Time Only)

```bash
# Port forward to access Vault
kubectl port-forward svc/vault 8200:8200 -n vault &

# Set environment variables
export VAULT_ADDR='http://localhost:8200'
export VAULT_TOKEN='knowton-dev-token'

# Vault is running in dev mode, so it's already initialized
# In production, you would run: vault operator init
```

## Step 3: Migrate Secrets to Vault

```bash
cd packages/backend

# Make sure your .env file has all required secrets
cp .env.example .env
# Edit .env with your actual secrets

# Run migration script
npm run tsx src/scripts/migrate-secrets-to-vault.ts migrate

# Verify migration
npm run tsx src/scripts/migrate-secrets-to-vault.ts verify
```

## Step 4: Configure Audit Logging

```bash
# Enable audit logging
npm run tsx src/scripts/configure-vault-audit.ts
```

## Step 5: Update Service Configuration

The services are already configured to use Vault. Just ensure these environment variables are set:

```bash
# .env
VAULT_ADDR=http://vault:8200
VAULT_TOKEN=knowton-dev-token
```

## Step 6: Test Integration

```bash
# Start the backend service
npm run dev

# The service will automatically:
# 1. Connect to Vault
# 2. Retrieve secrets
# 3. Cache them for 5 minutes
# 4. Use them for authentication and other operations
```

## Step 7: Enable Secret Rotation (Optional)

Add to your service initialization:

```typescript
import { getSecretRotationService } from './services/secret-rotation.service';

// Start rotation scheduler (checks every 24 hours)
const rotationService = getSecretRotationService();
rotationService.startRotationScheduler(24);
```

## Verify Everything Works

### Test 1: Check Vault Health

```bash
curl http://localhost:8200/v1/sys/health
```

Expected output:
```json
{
  "initialized": true,
  "sealed": false,
  "standby": false
}
```

### Test 2: Read a Secret

```bash
curl -H "X-Vault-Token: knowton-dev-token" \
  http://localhost:8200/v1/knowton/data/backend/jwt
```

### Test 3: Service Authentication

```bash
# Test wallet authentication (uses JWT secret from Vault)
curl -X POST http://localhost:3000/api/auth/wallet \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x...",
    "message": "Sign in to KnowTon...",
    "signature": "0x..."
  }'
```

## Common Commands

### List all secrets

```bash
npm run tsx src/scripts/migrate-secrets-to-vault.ts list
```

### Manually rotate a secret

```bash
# Create a rotation script
cat > src/scripts/rotate-secret.ts << 'EOF'
import { getSecretRotationService } from '../services/secret-rotation.service';

const path = process.argv[2];
if (!path) {
  console.error('Usage: tsx rotate-secret.ts <secret-path>');
  process.exit(1);
}

(async () => {
  const service = getSecretRotationService();
  const result = await service.manualRotation(path);
  console.log(result);
})();
EOF

# Rotate JWT secret
npm run tsx src/scripts/rotate-secret.ts backend/jwt
```

### View audit logs

```bash
kubectl exec -it vault-0 -n vault -- tail -f /vault/logs/audit.log
```

### Clear secret cache

```typescript
import { getVaultClient } from './services/vault-client.service';

const vaultClient = getVaultClient();
vaultClient.clearCache();
```

## Troubleshooting

### "Connection refused" error

```bash
# Check if Vault is running
kubectl get pods -n vault

# Check if port-forward is active
ps aux | grep "port-forward"

# Restart port-forward
kubectl port-forward svc/vault 8200:8200 -n vault
```

### "Permission denied" error

```bash
# Check your token
echo $VAULT_TOKEN

# Verify token has correct permissions
curl -H "X-Vault-Token: $VAULT_TOKEN" \
  http://localhost:8200/v1/auth/token/lookup-self
```

### Secrets not found

```bash
# Re-run migration
npm run tsx src/scripts/migrate-secrets-to-vault.ts migrate

# Verify secrets exist
npm run tsx src/scripts/migrate-secrets-to-vault.ts verify
```

## Next Steps

1. **Production Setup**: Configure Vault in HA mode with proper unsealing
2. **Dynamic Credentials**: Set up dynamic database credentials
3. **Monitoring**: Configure Prometheus metrics and Grafana dashboards
4. **Backup**: Set up automated Vault backups
5. **Disaster Recovery**: Document and test recovery procedures

## Security Reminders

- ⚠️ Never commit Vault tokens to git
- ⚠️ Store unseal keys securely (use a password manager)
- ⚠️ Enable audit logging in production
- ⚠️ Rotate secrets regularly
- ⚠️ Use short-lived tokens
- ⚠️ Follow principle of least privilege

## Resources

- [Full Integration Guide](./VAULT_INTEGRATION.md)
- [Vault Documentation](https://www.vaultproject.io/docs)
- [Kubernetes Integration](https://www.vaultproject.io/docs/platform/k8s)
