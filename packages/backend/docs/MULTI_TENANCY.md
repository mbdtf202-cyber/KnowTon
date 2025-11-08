## Multi-Tenancy Implementation

This document describes the multi-tenancy architecture implemented in the KnowTon platform.

## Overview

The multi-tenancy system allows multiple organizations (tenants) to use the platform with complete data isolation, custom configurations, and independent branding.

## Architecture

### Database Schema

#### Tenant Model
- **id**: Unique identifier
- **name**: Display name
- **slug**: URL-friendly identifier (e.g., "acme")
- **domain**: Custom domain (optional, e.g., "acme.knowton.com")
- **status**: active, suspended, inactive
- **plan**: basic, professional, enterprise
- **maxUsers**: Maximum number of users allowed
- **maxStorage**: Maximum storage in bytes
- **customBranding**: Custom branding configuration
- **features**: Feature flags
- **metadata**: Additional metadata

#### TenantConfig Model
- **Branding**: Logo, colors, custom CSS
- **Features**: Enable/disable NFT, Bonds, Fractionalization, Enterprise features
- **Limits**: Content size, upload rate, rate limiting
- **Payment**: Stripe account, payment methods
- **Notifications**: Email settings, webhook URL
- **Security**: Allowed domains, IP whitelist

#### TenantApiKey Model
- API keys for programmatic access
- Permissions-based access control
- Expiration and usage tracking

#### TenantUsageMetric Model
- Daily usage tracking
- Active users, storage, bandwidth, API calls
- Content creation and revenue metrics

### Tenant Resolution

Tenants are resolved in the following order:

1. **Custom Domain**: `acme.knowton.com` → tenant with domain "acme.knowton.com"
2. **Subdomain**: `acme.platform.com` → tenant with slug "acme"
3. **X-Tenant-ID Header**: `X-Tenant-ID: uuid` → tenant by ID
4. **X-Tenant-Slug Header**: `X-Tenant-Slug: acme` → tenant by slug
5. **API Key**: `X-API-Key: kt_xxx` → tenant associated with API key

### Middleware

#### `resolveTenant`
Resolves the tenant from the request and attaches it to `req.tenant`.

```typescript
app.use(resolveTenant);
```

#### `requireTenant`
Ensures a tenant is resolved before proceeding.

```typescript
router.get('/protected', requireTenant, handler);
```

#### `enforceTenantIsolation`
Ensures queries are scoped to the current tenant.

```typescript
router.get('/data', enforceTenantIsolation, handler);
```

#### `checkTenantFeature`
Checks if a feature is enabled for the tenant.

```typescript
router.post('/nft', checkTenantFeature('NFT'), handler);
```

#### `checkTenantPlan`
Checks if the tenant has the required plan.

```typescript
router.post('/enterprise', checkTenantPlan(['professional', 'enterprise']), handler);
```

## API Endpoints

### Tenant Management

#### Create Tenant
```http
POST /api/v1/tenants
Content-Type: application/json

{
  "name": "Acme Corporation",
  "slug": "acme",
  "domain": "acme.knowton.com",
  "plan": "enterprise",
  "maxUsers": 100,
  "maxStorage": 107374182400
}
```

#### Get Tenant
```http
GET /api/v1/tenants/:id
```

#### Get Tenant by Slug
```http
GET /api/v1/tenants/slug/:slug
```

#### List Tenants
```http
GET /api/v1/tenants?status=active&plan=enterprise&search=acme&page=1&limit=20
```

#### Update Tenant
```http
PUT /api/v1/tenants/:id
Content-Type: application/json

{
  "name": "Acme Corp",
  "maxUsers": 200
}
```

#### Update Tenant Configuration
```http
PUT /api/v1/tenants/:id/config
Content-Type: application/json

{
  "logoUrl": "https://cdn.example.com/logo.png",
  "primaryColor": "#FF5733",
  "enableNFT": true,
  "enableBonds": true,
  "maxContentSize": 5368709120,
  "rateLimitPerMin": 200
}
```

#### Suspend Tenant
```http
POST /api/v1/tenants/:id/suspend
Content-Type: application/json

{
  "reason": "Payment overdue"
}
```

#### Activate Tenant
```http
POST /api/v1/tenants/:id/activate
```

#### Delete Tenant
```http
DELETE /api/v1/tenants/:id
```

### API Key Management

#### Create API Key
```http
POST /api/v1/tenants/:id/api-keys
Content-Type: application/json

{
  "name": "Production API Key",
  "permissions": ["read:content", "write:content", "read:users"],
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "key": "kt_abc123...",
    "secret": "secret_xyz789...",
    "name": "Production API Key",
    "permissions": ["read:content", "write:content", "read:users"]
  },
  "message": "API key created. Save the secret securely - it will not be shown again."
}
```

#### List API Keys
```http
GET /api/v1/tenants/:id/api-keys
```

#### Revoke API Key
```http
DELETE /api/v1/tenants/:id/api-keys/:keyId
```

### Usage and Limits

#### Get Tenant Usage
```http
GET /api/v1/tenants/:id/usage?startDate=2024-01-01&endDate=2024-12-31
```

#### Check Tenant Limits
```http
GET /api/v1/tenants/:id/limits
```

Response:
```json
{
  "success": true,
  "data": {
    "users": {
      "current": 45,
      "limit": 100,
      "limitReached": false
    },
    "storage": {
      "current": 53687091200,
      "limit": 107374182400,
      "limitReached": false
    }
  }
}
```

### Current Tenant

#### Get Current Tenant Info
```http
GET /api/v1/tenants/current/info
X-Tenant-Slug: acme
```

## Usage Examples

### Frontend Integration

```typescript
// Configure API client with tenant
const api = axios.create({
  baseURL: 'https://api.knowton.com',
  headers: {
    'X-Tenant-Slug': 'acme'
  }
});

// Or use custom domain
const api = axios.create({
  baseURL: 'https://acme.knowton.com/api'
});
```

### Backend Service Integration

```typescript
import { resolveTenant, requireTenant } from './middleware/tenant.middleware';

// Apply to all routes
app.use(resolveTenant);

// Require tenant for specific routes
router.get('/protected', requireTenant, async (req, res) => {
  const tenantId = req.tenant.id;
  
  // Query data scoped to tenant
  const contents = await prisma.content.findMany({
    where: { tenantId }
  });
  
  res.json({ contents });
});
```

### Data Isolation

```typescript
// Always scope queries to tenant
const createContent = async (req, res) => {
  const content = await prisma.content.create({
    data: {
      ...req.body,
      tenantId: req.tenant.id // Ensure tenant isolation
    }
  });
  
  res.json({ content });
};

// Filter by tenant
const listContents = async (req, res) => {
  const contents = await prisma.content.findMany({
    where: {
      tenantId: req.tenant.id // Only return tenant's data
    }
  });
  
  res.json({ contents });
};
```

## Security Considerations

### Data Isolation
- All queries MUST include `tenantId` filter
- Use middleware to enforce tenant context
- Validate tenant access in all operations

### API Keys
- API keys are hashed using SHA-256
- Secrets are only shown once during creation
- Keys can be revoked at any time
- Track last usage for security auditing

### Rate Limiting
- Per-tenant rate limits configured in `TenantConfig`
- Default: 100 requests per minute
- Can be customized per tenant plan

### IP Whitelisting
- Optional IP whitelist per tenant
- Configured in `TenantConfig.ipWhitelist`
- Enforced at middleware level

## Migration Guide

### Existing Data
For existing installations, run the migration:

```bash
cd packages/backend
npx prisma migrate dev --name add_multi_tenancy
```

### Create Default Tenant
```typescript
const defaultTenant = await prisma.tenant.create({
  data: {
    name: 'Default Tenant',
    slug: 'default',
    plan: 'enterprise',
    maxUsers: 1000,
    maxStorage: 1099511627776, // 1TB
    tenantConfig: {
      create: {
        enableNFT: true,
        enableBonds: true,
        enableFractionalization: true,
        enableEnterprise: true
      }
    }
  }
});

// Assign existing users to default tenant
await prisma.user.updateMany({
  where: { tenantId: null },
  data: { tenantId: defaultTenant.id }
});

// Assign existing contents to default tenant
await prisma.content.updateMany({
  where: { tenantId: null },
  data: { tenantId: defaultTenant.id }
});
```

## Testing

### Create Test Tenant
```bash
curl -X POST http://localhost:3000/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Tenant",
    "slug": "test",
    "plan": "basic"
  }'
```

### Test Tenant Resolution
```bash
# By slug
curl http://localhost:3000/api/v1/tenants/current/info \
  -H "X-Tenant-Slug: test"

# By ID
curl http://localhost:3000/api/v1/tenants/current/info \
  -H "X-Tenant-ID: uuid"

# By API key
curl http://localhost:3000/api/v1/tenants/current/info \
  -H "X-API-Key: kt_abc123..."
```

## Monitoring

### Usage Metrics
Track daily usage per tenant:
- Active users
- Storage used
- Bandwidth consumed
- API calls
- Content created
- Revenue generated

### Alerts
Set up alerts for:
- Approaching user limits
- Approaching storage limits
- High API usage
- Suspended tenants
- Expired API keys

## Best Practices

1. **Always use tenant context**: Never query data without tenant filter
2. **Validate tenant access**: Check tenant status before operations
3. **Respect limits**: Enforce user and storage limits
4. **Audit access**: Log all tenant operations
5. **Secure API keys**: Never expose secrets in logs or responses
6. **Test isolation**: Verify data isolation between tenants
7. **Monitor usage**: Track metrics and set up alerts
8. **Document customizations**: Keep tenant-specific configurations documented

## Troubleshooting

### Tenant Not Found
- Check domain/subdomain configuration
- Verify tenant status is "active"
- Ensure headers are set correctly

### Data Isolation Issues
- Verify all queries include `tenantId` filter
- Check middleware is applied correctly
- Review audit logs for cross-tenant access

### API Key Issues
- Verify key is active and not expired
- Check permissions match required operations
- Ensure secret is correct (case-sensitive)

### Limit Exceeded
- Check current usage vs limits
- Consider upgrading tenant plan
- Review usage metrics for anomalies
