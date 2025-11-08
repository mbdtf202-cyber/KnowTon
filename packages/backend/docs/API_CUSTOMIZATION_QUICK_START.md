# API Customization - Quick Start Guide

## 🚀 Quick Start

Get started with API customization in 5 minutes!

## Prerequisites

- Backend server running
- Database migrated
- Tenant created

## Step 1: Run Database Migration

```bash
cd packages/backend
npx prisma migrate deploy
```

Or manually:

```bash
psql -d knowton -f prisma/migrations/add_api_customization/migration.sql
```

## Step 2: Create a Tenant

```bash
curl -X POST http://localhost:3001/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Company",
    "slug": "my-company",
    "plan": "enterprise"
  }'
```

Save the `id` from the response.

## Step 3: Create Custom API Endpoint

```bash
curl -X POST http://localhost:3001/api/v1/api-customization/endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "YOUR_TENANT_ID",
    "path": "/api/v1/custom/analytics",
    "method": "GET",
    "enabled": true,
    "rateLimit": 50,
    "requiresAuth": true
  }'
```

## Step 4: Create API Key

```bash
curl -X POST http://localhost:3001/api/v1/api-customization/keys/YOUR_TENANT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Key",
    "permissions": {
      "endpoints": ["*"],
      "methods": ["*"],
      "rateLimit": 100
    }
  }'
```

**Important**: Save the `secret` from the response - it won't be shown again!

## Step 5: Use API Key

```bash
curl -X GET http://localhost:3001/api/v1/content \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "X-Tenant-ID: YOUR_TENANT_ID"
```

Check the rate limit headers in the response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200000
```

## Common Use Cases

### Use Case 1: Different Rate Limits for Different Clients

```typescript
// Mobile app - lower rate limit
const mobileKey = await createApiKey({
  name: 'Mobile App',
  permissions: {
    endpoints: ['/api/v1/content'],
    methods: ['GET'],
    rateLimit: 50
  }
});

// Web app - higher rate limit
const webKey = await createApiKey({
  name: 'Web App',
  permissions: {
    endpoints: ['*'],
    methods: ['*'],
    rateLimit: 200
  }
});
```

### Use Case 2: Restrict API Access by IP

```typescript
// Update tenant config
await axios.put(`/api/v1/tenants/${tenantId}/config`, {
  ipWhitelist: [
    '192.168.1.0/24',  // Office network
    '10.0.0.5'          // Specific server
  ]
});
```

### Use Case 3: Restrict API Access by Origin

```typescript
// Update tenant config
await axios.put(`/api/v1/tenants/${tenantId}/config`, {
  allowedDomains: [
    'example.com',
    '*.example.com'
  ]
});
```

## Testing

Run the test suite:

```bash
cd packages/backend
ts-node src/scripts/test-api-customization.ts
```

Expected output:
```
🧪 Testing API Customization Implementation
============================================================

📝 Test 1: Create test tenant...
✅ Tenant created: abc-123-def

📝 Test 2: Create custom API endpoint...
✅ Custom endpoint created

📝 Test 3: List API endpoints...
✅ Found 1 endpoint(s)

...

📊 Test Summary

Total Tests: 10
✅ Passed: 10
❌ Failed: 0
Success Rate: 100.0%
```

## Next Steps

1. **Read Full Documentation**: [API_CUSTOMIZATION.md](./API_CUSTOMIZATION.md)
2. **Configure Rate Limits**: Adjust per your needs
3. **Set Up Monitoring**: Track API usage
4. **Implement Client SDK**: Create SDK for your API keys

## Troubleshooting

### Rate Limit Exceeded

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in 45 seconds.",
  "limit": 100,
  "retryAfter": 45
}
```

**Solution**: Wait for the retry period or increase rate limit.

### Invalid API Key

```json
{
  "error": "Invalid API key",
  "message": "API key is invalid or does not have permission for this endpoint"
}
```

**Solution**: Check API key permissions and expiration.

### IP Blocked

```json
{
  "error": "Access denied",
  "message": "Your IP address is not whitelisted for this tenant"
}
```

**Solution**: Add IP to whitelist or remove whitelist restrictions.

## Support

- 📖 Full Documentation: [API_CUSTOMIZATION.md](./API_CUSTOMIZATION.md)
- 🐛 Report Issues: [GitHub Issues](https://github.com/knowton/issues)
- 💬 Community: [Discord](https://discord.gg/knowton)
