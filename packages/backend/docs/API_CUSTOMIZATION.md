# API Customization - White-Label Solution

## Overview

The API Customization feature enables tenants to create custom API endpoints, manage API keys with granular permissions, and configure rate limiting per tenant. This is a core component of the white-label solution that allows each tenant to have their own API configuration.

## Features

### 1. Tenant-Specific API Endpoints

Create custom API endpoints for each tenant with:
- Custom paths and HTTP methods
- Enable/disable endpoints dynamically
- Per-endpoint rate limiting
- Authentication requirements
- Custom business logic
- Metadata for documentation

### 2. API Key Management

Advanced API key management with:
- Granular permissions (endpoints, methods)
- Per-key rate limiting
- IP whitelisting
- Origin allowlisting
- Expiration dates
- Usage tracking and analytics

### 3. Rate Limiting Per Tenant

Flexible rate limiting:
- Tenant-level default rate limits
- Endpoint-specific rate limits
- API key-specific rate limits
- Real-time rate limit tracking
- Rate limit headers in responses

### 4. Security Features

- IP whitelist validation
- Origin allowlist validation
- API key validation and verification
- Usage logging for audit trails

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Request                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Tenant Resolution Middleware                   │
│  - Domain/Subdomain                                         │
│  - Headers (X-Tenant-ID, X-Tenant-Slug)                    │
│  - API Key                                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Security Middleware                            │
│  - IP Whitelist Check                                       │
│  - Origin Validation                                        │
│  - API Key Validation                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Rate Limiting Middleware                       │
│  - Tenant Rate Limit                                        │
│  - Endpoint Rate Limit                                      │
│  - API Key Rate Limit                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              API Endpoint Handler                           │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### tenant_api_endpoints

```sql
CREATE TABLE tenant_api_endpoints (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  path VARCHAR(500) NOT NULL,
  method VARCHAR(10) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  rate_limit INTEGER,
  requires_auth BOOLEAN DEFAULT true,
  custom_logic TEXT,
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(tenant_id, path, method)
);
```

### api_key_usage_logs

```sql
CREATE TABLE api_key_usage_logs (
  id UUID PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES tenant_api_keys(id),
  endpoint VARCHAR(500) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  response_time INTEGER NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  timestamp TIMESTAMP
);
```

## API Reference

### Create Custom API Endpoint

```http
POST /api/v1/api-customization/endpoints
Content-Type: application/json

{
  "tenantId": "uuid",
  "path": "/api/v1/custom/analytics",
  "method": "GET",
  "enabled": true,
  "rateLimit": 50,
  "requiresAuth": true,
  "metadata": {
    "description": "Custom analytics endpoint",
    "version": "1.0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "path": "/api/v1/custom/analytics",
    "method": "GET",
    "enabled": true,
    "rateLimit": 50,
    "requiresAuth": true,
    "metadata": { ... }
  }
}
```

### List API Endpoints

```http
GET /api/v1/api-customization/endpoints/:tenantId?enabled=true&method=GET&search=analytics
```

**Response:**
```json
{
  "success": true,
  "data": [ ... ],
  "count": 5
}
```

### Update API Endpoint

```http
PUT /api/v1/api-customization/endpoints/:tenantId/:path/:method
Content-Type: application/json

{
  "enabled": true,
  "rateLimit": 100
}
```

### Delete API Endpoint

```http
DELETE /api/v1/api-customization/endpoints/:tenantId/:path/:method
```

### Create API Key

```http
POST /api/v1/api-customization/keys/:tenantId
Content-Type: application/json

{
  "name": "Production API Key",
  "permissions": {
    "endpoints": ["/api/v1/content", "/api/v1/analytics"],
    "methods": ["GET", "POST"],
    "rateLimit": 200,
    "ipWhitelist": ["192.168.1.0/24"],
    "allowedOrigins": ["https://example.com"]
  },
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "key": "kt_abc123...",
    "secret": "secret_xyz789...",
    "name": "Production API Key",
    "permissions": { ... },
    "expiresAt": "2025-12-31T23:59:59Z"
  },
  "message": "API key created successfully. Save the secret securely - it will not be shown again."
}
```

### Validate API Key

```http
GET /api/v1/api-customization/keys/:key/validate?path=/api/v1/content&method=GET
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "tenantId": "uuid",
    "permissions": { ... },
    "rateLimit": 200
  }
}
```

### Get API Key Usage

```http
GET /api/v1/api-customization/keys/:keyId/usage?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "request_count": 1250,
      "unique_endpoints": 5,
      "avg_response_time": 145,
      "error_count": 12
    }
  ]
}
```

### Get Tenant Rate Limit

```http
GET /api/v1/api-customization/rate-limit/:tenantId?endpoint=/api/v1/content
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rateLimit": 100,
    "endpoint": "/api/v1/content"
  }
}
```

### Check IP Whitelist

```http
GET /api/v1/api-customization/security/:tenantId/ip-whitelist?ipAddress=192.168.1.1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ipAddress": "192.168.1.1",
    "allowed": true
  }
}
```

### Check Origin

```http
GET /api/v1/api-customization/security/:tenantId/origin?origin=https://example.com
```

**Response:**
```json
{
  "success": true,
  "data": {
    "origin": "https://example.com",
    "allowed": true
  }
}
```

## Usage Examples

### Example 1: Create Custom Endpoint with Rate Limiting

```typescript
import axios from 'axios';

const tenantId = 'your-tenant-id';

// Create custom endpoint
const endpoint = await axios.post('/api/v1/api-customization/endpoints', {
  tenantId,
  path: '/api/v1/custom/reports',
  method: 'GET',
  enabled: true,
  rateLimit: 30, // 30 requests per minute
  requiresAuth: true,
  metadata: {
    description: 'Custom reporting endpoint',
    version: '1.0',
    tags: ['reporting', 'analytics']
  }
});

console.log('Endpoint created:', endpoint.data);
```

### Example 2: Create API Key with Permissions

```typescript
// Create API key with specific permissions
const apiKey = await axios.post(`/api/v1/api-customization/keys/${tenantId}`, {
  name: 'Mobile App API Key',
  permissions: {
    endpoints: [
      '/api/v1/content',
      '/api/v1/custom/reports'
    ],
    methods: ['GET'],
    rateLimit: 100,
    allowedOrigins: ['https://mobile.example.com']
  },
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
});

// Save the secret securely - it won't be shown again
console.log('API Key:', apiKey.data.key);
console.log('Secret:', apiKey.data.secret);
```

### Example 3: Use API Key in Requests

```typescript
// Make authenticated request with API key
const response = await axios.get('/api/v1/content', {
  headers: {
    'X-API-Key': 'kt_abc123...',
    'X-Tenant-ID': tenantId
  }
});

// Check rate limit headers
console.log('Rate Limit:', response.headers['x-ratelimit-limit']);
console.log('Remaining:', response.headers['x-ratelimit-remaining']);
console.log('Reset:', response.headers['x-ratelimit-reset']);
```

### Example 4: Handle Rate Limiting

```typescript
try {
  const response = await axios.get('/api/v1/content', {
    headers: { 'X-API-Key': apiKey }
  });
  
  // Process response
  console.log('Data:', response.data);
} catch (error) {
  if (error.response?.status === 429) {
    // Rate limit exceeded
    const retryAfter = error.response.headers['retry-after'];
    console.log(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
    
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    // Retry request...
  }
}
```

## Rate Limiting

### Rate Limit Hierarchy

Rate limits are applied in the following order (most specific wins):

1. **API Key Rate Limit**: Specified in API key permissions
2. **Endpoint Rate Limit**: Specified in endpoint configuration
3. **Tenant Rate Limit**: Default tenant configuration

### Rate Limit Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200000
```

When rate limit is exceeded:

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200000
Retry-After: 45

{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in 45 seconds.",
  "limit": 100,
  "retryAfter": 45
}
```

## Security Best Practices

### 1. API Key Management

- **Never expose API keys in client-side code**
- Store secrets securely (environment variables, secret managers)
- Rotate API keys regularly
- Use different keys for different environments
- Set expiration dates on API keys
- Monitor API key usage for anomalies

### 2. IP Whitelisting

```typescript
// Update tenant config with IP whitelist
await axios.put(`/api/v1/tenants/${tenantId}/config`, {
  ipWhitelist: [
    '192.168.1.0/24',  // Office network
    '10.0.0.0/8'        // VPN network
  ]
});
```

### 3. Origin Allowlisting

```typescript
// Update tenant config with allowed origins
await axios.put(`/api/v1/tenants/${tenantId}/config`, {
  allowedDomains: [
    'example.com',
    '*.example.com',  // Wildcard for subdomains
    'app.example.com'
  ]
});
```

### 4. Rate Limiting Strategy

- Set conservative default limits
- Increase limits for trusted API keys
- Monitor usage patterns
- Implement exponential backoff in clients
- Use caching to reduce API calls

## Monitoring and Analytics

### API Key Usage Tracking

All API key requests are logged with:
- Endpoint accessed
- HTTP method
- Status code
- Response time
- IP address
- User agent
- Timestamp

### Usage Analytics

```typescript
// Get API key usage statistics
const usage = await axios.get(
  `/api/v1/api-customization/keys/${keyId}/usage`,
  {
    params: {
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    }
  }
);

console.log('Daily usage:', usage.data);
```

## Migration Guide

### Database Migration

Run the migration to create required tables:

```bash
cd packages/backend
npx prisma migrate deploy
```

Or manually run the SQL:

```bash
psql -d knowton -f prisma/migrations/add_api_customization/migration.sql
```

### Existing Tenants

For existing tenants, default API endpoints and rate limits will be applied automatically. You can customize them via the API.

## Testing

### Run Test Suite

```bash
cd packages/backend
npm run test:api-customization
```

Or manually:

```bash
ts-node src/scripts/test-api-customization.ts
```

### Test Coverage

The test suite covers:
- ✅ Tenant creation
- ✅ Custom endpoint creation
- ✅ Endpoint listing and filtering
- ✅ Endpoint updates
- ✅ API key creation with permissions
- ✅ API key validation
- ✅ Rate limit configuration
- ✅ IP whitelist validation
- ✅ Origin validation
- ✅ Endpoint deletion

## Troubleshooting

### Issue: Rate Limit Not Applied

**Solution**: Check the rate limit hierarchy. Endpoint-specific limits override tenant defaults.

```typescript
// Check effective rate limit
const rateLimit = await axios.get(
  `/api/v1/api-customization/rate-limit/${tenantId}`,
  { params: { endpoint: '/api/v1/content' } }
);
```

### Issue: API Key Invalid

**Solution**: Verify the API key hasn't expired and has permissions for the endpoint.

```typescript
// Validate API key
const validation = await axios.get(
  `/api/v1/api-customization/keys/${apiKey}/validate`,
  {
    params: {
      path: '/api/v1/content',
      method: 'GET'
    }
  }
);
```

### Issue: IP Blocked

**Solution**: Check if IP is in the whitelist or if whitelist is empty (allows all).

```typescript
// Check IP whitelist
const check = await axios.get(
  `/api/v1/api-customization/security/${tenantId}/ip-whitelist`,
  { params: { ipAddress: '192.168.1.1' } }
);
```

## Performance Considerations

### In-Memory Rate Limiting

Current implementation uses in-memory storage for rate limiting. For production:

**Recommended**: Use Redis for distributed rate limiting

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Store rate limit in Redis
await redis.setex(
  `ratelimit:${key}`,
  60, // TTL in seconds
  count
);
```

### Caching

API endpoint configurations and tenant settings are cached to reduce database queries.

## Future Enhancements

- [ ] GraphQL API support
- [ ] Webhook endpoints
- [ ] Custom authentication providers
- [ ] API versioning per tenant
- [ ] Request/response transformation
- [ ] API documentation generation
- [ ] Developer portal per tenant

## Support

For issues or questions:
- GitHub Issues: [knowton/issues](https://github.com/knowton/issues)
- Documentation: [docs.knowton.io](https://docs.knowton.io)
- Email: support@knowton.io
