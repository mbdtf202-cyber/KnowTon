# Multi-Tenancy Quick Start Guide

Get started with multi-tenancy in 5 minutes.

## Prerequisites

- PostgreSQL database running
- Backend server configured
- Prisma CLI installed

## Step 1: Run Migration

```bash
cd packages/backend
npx prisma migrate dev --name add_multi_tenancy
npx prisma generate
```

## Step 2: Create Your First Tenant

```bash
curl -X POST http://localhost:3000/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Company",
    "slug": "mycompany",
    "plan": "professional",
    "maxUsers": 50,
    "maxStorage": 53687091200
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "tenant-uuid",
    "name": "My Company",
    "slug": "mycompany",
    "status": "active",
    "plan": "professional",
    "tenantConfig": {
      "enableNFT": true,
      "enableBonds": true,
      "maxContentSize": 2147483648,
      "rateLimitPerMin": 100
    }
  }
}
```

## Step 3: Configure Tenant Branding

```bash
curl -X PUT http://localhost:3000/api/v1/tenants/tenant-uuid/config \
  -H "Content-Type: application/json" \
  -d '{
    "logoUrl": "https://mycompany.com/logo.png",
    "primaryColor": "#007bff",
    "secondaryColor": "#6c757d",
    "enableNFT": true,
    "enableBonds": true,
    "enableFractionalization": true,
    "maxContentSize": 5368709120,
    "rateLimitPerMin": 200
  }'
```

## Step 4: Create API Key

```bash
curl -X POST http://localhost:3000/api/v1/tenants/tenant-uuid/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Key",
    "permissions": ["read:content", "write:content", "read:users"]
  }'
```

**Important**: Save the `secret` from the response - it won't be shown again!

## Step 5: Use Tenant Context

### Option A: Using Subdomain/Domain

```typescript
// Frontend configuration
const api = axios.create({
  baseURL: 'https://mycompany.knowton.com/api'
});
```

### Option B: Using Headers

```typescript
// Frontend configuration
const api = axios.create({
  baseURL: 'https://api.knowton.com',
  headers: {
    'X-Tenant-Slug': 'mycompany'
  }
});
```

### Option C: Using API Key

```typescript
// Backend service integration
const api = axios.create({
  baseURL: 'https://api.knowton.com',
  headers: {
    'X-API-Key': 'kt_your_api_key_here'
  }
});
```

## Step 6: Test Tenant Isolation

Create content for your tenant:

```bash
curl -X POST http://localhost:3000/api/v1/content \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: mycompany" \
  -d '{
    "title": "My First Content",
    "description": "This belongs to mycompany tenant",
    "category": "education"
  }'
```

Verify isolation - this should only return mycompany's content:

```bash
curl http://localhost:3000/api/v1/content \
  -H "X-Tenant-Slug: mycompany"
```

## Step 7: Monitor Usage

Check tenant limits:

```bash
curl http://localhost:3000/api/v1/tenants/tenant-uuid/limits
```

View usage metrics:

```bash
curl http://localhost:3000/api/v1/tenants/tenant-uuid/usage
```

## Common Operations

### Update Tenant Plan

```bash
curl -X PUT http://localhost:3000/api/v1/tenants/tenant-uuid \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "enterprise",
    "maxUsers": 200,
    "maxStorage": 107374182400
  }'
```

### Suspend Tenant

```bash
curl -X POST http://localhost:3000/api/v1/tenants/tenant-uuid/suspend \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Payment overdue"
  }'
```

### Activate Tenant

```bash
curl -X POST http://localhost:3000/api/v1/tenants/tenant-uuid/activate
```

### List All Tenants

```bash
curl http://localhost:3000/api/v1/tenants?status=active&page=1&limit=20
```

## Integration Examples

### Express Middleware

```typescript
import { resolveTenant, requireTenant } from './middleware/tenant.middleware';

// Apply to all routes
app.use(resolveTenant);

// Protect specific routes
router.get('/protected', requireTenant, (req, res) => {
  res.json({
    tenant: req.tenant,
    message: 'You are authenticated with a tenant'
  });
});
```

### Database Queries

```typescript
// Always scope to tenant
const getContents = async (req, res) => {
  const contents = await prisma.content.findMany({
    where: {
      tenantId: req.tenant.id // Tenant isolation
    }
  });
  
  res.json({ contents });
};

// Create with tenant
const createContent = async (req, res) => {
  const content = await prisma.content.create({
    data: {
      ...req.body,
      tenantId: req.tenant.id // Associate with tenant
    }
  });
  
  res.json({ content });
};
```

### Feature Checks

```typescript
import { checkTenantFeature } from './middleware/tenant.middleware';

// Require NFT feature
router.post('/nft/mint', 
  requireTenant,
  checkTenantFeature('NFT'),
  mintNFT
);

// Require Enterprise feature
router.post('/bulk-purchase',
  requireTenant,
  checkTenantFeature('Enterprise'),
  bulkPurchase
);
```

### Plan Checks

```typescript
import { checkTenantPlan } from './middleware/tenant.middleware';

// Require professional or enterprise plan
router.post('/advanced-analytics',
  requireTenant,
  checkTenantPlan(['professional', 'enterprise']),
  getAdvancedAnalytics
);
```

## Troubleshooting

### "Tenant not found" Error

Check that you're providing tenant information:
```bash
# Add X-Tenant-Slug header
curl http://localhost:3000/api/v1/content \
  -H "X-Tenant-Slug: mycompany"
```

### Data Not Showing

Verify tenant context is set:
```bash
curl http://localhost:3000/api/v1/tenants/current/info \
  -H "X-Tenant-Slug: mycompany"
```

### API Key Not Working

1. Check key is active: `GET /api/v1/tenants/:id/api-keys`
2. Verify key hasn't expired
3. Ensure correct permissions are set

## Next Steps

- Read the full [Multi-Tenancy Documentation](./MULTI_TENANCY.md)
- Set up custom domains for tenants
- Configure tenant-specific branding
- Implement usage-based billing
- Set up monitoring and alerts

## Support

For issues or questions:
- Check the [troubleshooting section](./MULTI_TENANCY.md#troubleshooting)
- Review the [API documentation](./MULTI_TENANCY.md#api-endpoints)
- Contact support team
