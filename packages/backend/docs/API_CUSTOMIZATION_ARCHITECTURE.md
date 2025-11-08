# API Customization - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Application                        │
│  (Web App, Mobile App, Third-party Integration)                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    HTTP Request with Headers:
                    - X-API-Key
                    - X-Tenant-ID / X-Tenant-Slug
                    - Origin
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway / Load Balancer                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Tenant Resolution Middleware                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Check custom domain (e.g., acme.knowton.com)           │ │
│  │ 2. Check subdomain (e.g., acme.platform.com)              │ │
│  │ 3. Check X-Tenant-ID header                               │ │
│  │ 4. Check X-Tenant-Slug header                             │ │
│  │ 5. Check API key → resolve tenant                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Result: req.tenant = { id, slug, name, plan, config }          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Security Middleware                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ IP Whitelist Check                                         │ │
│  │ - Get tenant IP whitelist from config                     │ │
│  │ - Validate request IP against whitelist                   │ │
│  │ - Block if not whitelisted (403)                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Origin Validation                                          │ │
│  │ - Get tenant allowed origins from config                  │ │
│  │ - Validate request origin                                 │ │
│  │ - Support wildcard subdomains (*.example.com)             │ │
│  │ - Block if not allowed (403)                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ API Key Validation                                         │ │
│  │ - Extract API key from X-API-Key header                   │ │
│  │ - Validate key exists and is active                       │ │
│  │ - Check expiration date                                   │ │
│  │ - Verify endpoint permissions                             │ │
│  │ - Verify method permissions                               │ │
│  │ - Block if invalid (403)                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Rate Limiting Middleware                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Rate Limit Resolution (Hierarchy)                          │ │
│  │ 1. API Key Rate Limit (highest priority)                  │ │
│  │ 2. Endpoint Rate Limit                                    │ │
│  │ 3. Tenant Rate Limit (default)                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Rate Limit Tracking                                        │ │
│  │ - Create key: tenant:endpoint:method or apikey:key        │ │
│  │ - Get current count from store (in-memory/Redis)          │ │
│  │ - Check if window expired, reset if needed                │ │
│  │ - Increment counter                                       │ │
│  │ - Compare with limit                                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Rate Limit Response                                        │ │
│  │ - If exceeded: Return 429 with Retry-After header         │ │
│  │ - If OK: Add rate limit headers to response               │ │
│  │   * X-RateLimit-Limit                                     │ │
│  │   * X-RateLimit-Remaining                                 │ │
│  │   * X-RateLimit-Reset                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API Endpoint Handler                        │
│  - Execute business logic                                        │
│  - Access tenant context from req.tenant                         │
│  - Return response                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Usage Logging (Async)                       │
│  - Log API key usage to database                                 │
│  - Track: endpoint, method, status, response time, IP, UA        │
│  - Used for analytics and billing                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                         Response to Client
```

## Data Flow

### 1. API Key Creation Flow

```
Client Request
    ↓
POST /api/v1/api-customization/keys/:tenantId
    ↓
Controller: createApiKey()
    ↓
Service: apiCustomizationService.createApiKey()
    ↓
┌─────────────────────────────────────┐
│ 1. Generate random key (kt_...)    │
│ 2. Generate random secret          │
│ 3. Hash secret with SHA-256        │
│ 4. Store in database               │
│ 5. Return key + plain secret       │
└─────────────────────────────────────┘
    ↓
Response: { key, secret, ... }
    ↓
Client saves secret securely
```

### 2. API Request Flow with Key

```
Client Request with X-API-Key header
    ↓
Tenant Resolution Middleware
    ↓
┌─────────────────────────────────────┐
│ 1. Extract API key from header     │
│ 2. Query database for key          │
│ 3. Check if active and not expired │
│ 4. Get tenant from key             │
│ 5. Set req.tenant                  │
└─────────────────────────────────────┘
    ↓
API Key Validation Middleware
    ↓
┌─────────────────────────────────────┐
│ 1. Get key permissions             │
│ 2. Check endpoint allowed          │
│ 3. Check method allowed            │
│ 4. Update last_used_at             │
└─────────────────────────────────────┘
    ↓
Rate Limiting Middleware
    ↓
┌─────────────────────────────────────┐
│ 1. Get rate limit from key/tenant  │
│ 2. Check current usage             │
│ 3. Increment counter               │
│ 4. Allow or block request          │
└─────────────────────────────────────┘
    ↓
Endpoint Handler
    ↓
Response with rate limit headers
```

### 3. Custom Endpoint Creation Flow

```
Client Request
    ↓
POST /api/v1/api-customization/endpoints
    ↓
Controller: createApiEndpoint()
    ↓
Service: apiCustomizationService.createApiEndpoint()
    ↓
┌─────────────────────────────────────┐
│ 1. Validate tenant exists          │
│ 2. Validate path format            │
│ 3. Check for duplicates            │
│ 4. Insert into database            │
│ 5. Return endpoint config          │
└─────────────────────────────────────┘
    ↓
Response: { id, path, method, ... }
    ↓
Endpoint is now active and enforced
```

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐
│    tenants      │
│─────────────────│
│ id (PK)         │
│ name            │
│ slug (UNIQUE)   │
│ domain (UNIQUE) │
│ plan            │
│ status          │
└─────────────────┘
        │
        │ 1:1
        ↓
┌─────────────────┐
│ tenant_configs  │
│─────────────────│
│ id (PK)         │
│ tenant_id (FK)  │
│ rateLimitPerMin │
│ ipWhitelist[]   │
│ allowedDomains[]│
└─────────────────┘

┌─────────────────┐
│    tenants      │
└─────────────────┘
        │
        │ 1:N
        ↓
┌──────────────────────┐
│ tenant_api_endpoints │
│──────────────────────│
│ id (PK)              │
│ tenant_id (FK)       │
│ path                 │
│ method               │
│ enabled              │
│ rate_limit           │
│ requires_auth        │
│ custom_logic         │
│ metadata (JSONB)     │
└──────────────────────┘

┌─────────────────┐
│    tenants      │
└─────────────────┘
        │
        │ 1:N
        ↓
┌──────────────────┐
│ tenant_api_keys  │
│──────────────────│
│ id (PK)          │
│ tenant_id (FK)   │
│ key (UNIQUE)     │
│ secret (HASHED)  │
│ permissions      │
│ is_active        │
│ expires_at       │
│ last_used_at     │
└──────────────────┘
        │
        │ 1:N
        ↓
┌──────────────────────┐
│ api_key_usage_logs   │
│──────────────────────│
│ id (PK)              │
│ api_key_id (FK)      │
│ endpoint             │
│ method               │
│ status_code          │
│ response_time        │
│ ip_address           │
│ user_agent           │
│ timestamp            │
└──────────────────────┘
```

## Component Interactions

### Service Layer

```typescript
apiCustomizationService
├── createApiEndpoint()
│   └── Validates and creates custom endpoint
├── listApiEndpoints()
│   └── Lists endpoints with filtering
├── updateApiEndpoint()
│   └── Updates endpoint configuration
├── deleteApiEndpoint()
│   └── Removes endpoint
├── createApiKey()
│   └── Generates API key with permissions
├── validateApiKey()
│   └── Validates key and checks permissions
├── getApiKeyUsage()
│   └── Returns usage statistics
├── getTenantRateLimit()
│   └── Resolves effective rate limit
├── isIpWhitelisted()
│   └── Checks IP against whitelist
└── isOriginAllowed()
    └── Checks origin against allowlist
```

### Middleware Chain

```typescript
app.use(resolveTenant)           // 1. Resolve tenant
app.use(checkIpWhitelist)        // 2. Validate IP
app.use(checkOrigin)             // 3. Validate origin
app.use(apiKeyRateLimit)         // 4. Rate limit by API key
app.use(tenantRateLimit)         // 5. Rate limit by tenant
app.use(requireTenant)           // 6. Ensure tenant exists
app.use(endpointHandler)         // 7. Execute business logic
```

## Rate Limiting Algorithm

### Sliding Window Implementation

```typescript
interface RateLimitEntry {
  count: number;      // Number of requests in window
  resetAt: number;    // Timestamp when window resets
}

const store = new Map<string, RateLimitEntry>();

function checkRateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  
  let entry = store.get(key);
  
  // Create new window if expired or doesn't exist
  if (!entry || now > entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + windowMs
    };
    store.set(key, entry);
  }
  
  // Increment counter
  entry.count++;
  
  // Check if limit exceeded
  return entry.count <= limit;
}
```

### Rate Limit Key Generation

```typescript
// Tenant-level rate limit
const key = `tenant:${tenantId}:${endpoint}:${method}`;

// API key-level rate limit
const key = `apikey:${apiKey}:${endpoint}:${method}`;
```

## Security Architecture

### API Key Security

```
┌─────────────────────────────────────┐
│ API Key Generation                  │
│─────────────────────────────────────│
│ 1. Generate random key (32 bytes)  │
│    Format: kt_[hex]                 │
│                                     │
│ 2. Generate random secret (64 bytes)│
│                                     │
│ 3. Hash secret with SHA-256         │
│    stored_secret = SHA256(secret)   │
│                                     │
│ 4. Store key + hashed secret        │
│                                     │
│ 5. Return key + plain secret        │
│    (secret shown only once)         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ API Key Validation                  │
│─────────────────────────────────────│
│ 1. Extract key from header          │
│                                     │
│ 2. Query database by key            │
│                                     │
│ 3. Check is_active = true           │
│                                     │
│ 4. Check expires_at > now           │
│                                     │
│ 5. Verify endpoint permissions      │
│                                     │
│ 6. Verify method permissions        │
│                                     │
│ 7. Update last_used_at              │
└─────────────────────────────────────┘
```

### Permission Model

```typescript
interface ApiKeyPermissions {
  endpoints: string[];      // ["/api/v1/content", "*"]
  methods: string[];        // ["GET", "POST", "*"]
  rateLimit?: number;       // Override tenant rate limit
  ipWhitelist?: string[];   // Allowed IPs
  allowedOrigins?: string[]; // Allowed origins
}

// Permission check
function hasPermission(
  permissions: ApiKeyPermissions,
  endpoint: string,
  method: string
): boolean {
  const endpointAllowed = 
    permissions.endpoints.includes('*') ||
    permissions.endpoints.includes(endpoint);
    
  const methodAllowed =
    permissions.methods.includes('*') ||
    permissions.methods.includes(method);
    
  return endpointAllowed && methodAllowed;
}
```

## Scalability Considerations

### Current Implementation

- **In-Memory Rate Limiting**: Fast but not distributed
- **Direct Database Queries**: Simple but may need caching
- **Synchronous Validation**: Blocking but fast

### Production Recommendations

#### 1. Redis for Rate Limiting

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function checkRateLimit(
  key: string,
  limit: number
): Promise<boolean> {
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, 60); // 60 seconds
  }
  
  return count <= limit;
}
```

#### 2. Cache Tenant Configurations

```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

async function getTenantConfig(tenantId: string) {
  const cached = cache.get(`tenant:${tenantId}`);
  if (cached) return cached;
  
  const config = await db.getTenantConfig(tenantId);
  cache.set(`tenant:${tenantId}`, config);
  return config;
}
```

#### 3. Async Usage Logging

```typescript
import { Queue } from 'bull';

const usageQueue = new Queue('api-usage', {
  redis: process.env.REDIS_URL
});

// Log usage asynchronously
usageQueue.add({
  apiKeyId,
  endpoint,
  method,
  statusCode,
  responseTime
});

// Process in background
usageQueue.process(async (job) => {
  await db.logUsage(job.data);
});
```

## Monitoring and Observability

### Metrics to Track

```typescript
// Prometheus metrics
const metrics = {
  apiRequests: new Counter({
    name: 'api_requests_total',
    help: 'Total API requests',
    labelNames: ['tenant', 'endpoint', 'method', 'status']
  }),
  
  rateLimitHits: new Counter({
    name: 'rate_limit_hits_total',
    help: 'Rate limit exceeded count',
    labelNames: ['tenant', 'endpoint']
  }),
  
  apiKeyValidations: new Counter({
    name: 'api_key_validations_total',
    help: 'API key validation attempts',
    labelNames: ['tenant', 'valid']
  }),
  
  responseTime: new Histogram({
    name: 'api_response_time_seconds',
    help: 'API response time',
    labelNames: ['tenant', 'endpoint']
  })
};
```

### Logging Strategy

```typescript
// Structured logging
logger.info('API request', {
  tenant_id: req.tenant.id,
  api_key_id: req.apiKey?.id,
  endpoint: req.path,
  method: req.method,
  status_code: res.statusCode,
  response_time_ms: responseTime,
  ip_address: req.ip,
  user_agent: req.headers['user-agent']
});
```

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;        // Error type
  message: string;      // Human-readable message
  code?: string;        // Error code
  details?: any;        // Additional details
}

// Examples
{
  error: 'Rate limit exceeded',
  message: 'Too many requests. Please try again in 45 seconds.',
  code: 'RATE_LIMIT_EXCEEDED',
  details: {
    limit: 100,
    retryAfter: 45
  }
}

{
  error: 'Invalid API key',
  message: 'API key is invalid or does not have permission for this endpoint',
  code: 'INVALID_API_KEY'
}

{
  error: 'Access denied',
  message: 'Your IP address is not whitelisted for this tenant',
  code: 'IP_NOT_WHITELISTED',
  details: {
    ipAddress: '192.168.1.1'
  }
}
```

## Testing Strategy

### Unit Tests

- Service methods
- Middleware functions
- Permission validation
- Rate limit calculations

### Integration Tests

- End-to-end API flows
- Database interactions
- Multi-tenant isolation
- Rate limiting across requests

### Load Tests

- Rate limit enforcement under load
- Concurrent request handling
- Memory usage monitoring
- Database query performance

## Deployment Architecture

### Single Instance

```
┌─────────────────────────────────────┐
│         Express Server              │
│  ┌──────────────────────────────┐  │
│  │  In-Memory Rate Limit Store  │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  API Customization Service   │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│         PostgreSQL Database         │
└─────────────────────────────────────┘
```

### Multi-Instance (Production)

```
┌─────────────────────────────────────┐
│         Load Balancer               │
└─────────────────────────────────────┘
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
┌─────────┐       ┌─────────┐
│ Server 1│       │ Server 2│
└─────────┘       └─────────┘
    ↓                   ↓
    └─────────┬─────────┘
              ↓
┌─────────────────────────────────────┐
│         Redis Cluster               │
│  (Rate Limiting + Caching)          │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│    PostgreSQL Database (Primary)    │
│         + Read Replicas             │
└─────────────────────────────────────┘
```

## Future Enhancements

### Phase 1: Performance

- [ ] Redis integration for rate limiting
- [ ] Caching layer for tenant configs
- [ ] Async usage logging with queues
- [ ] Database query optimization

### Phase 2: Features

- [ ] GraphQL endpoint support
- [ ] Webhook endpoints
- [ ] Request/response transformation
- [ ] API versioning per tenant

### Phase 3: Developer Experience

- [ ] Auto-generated API documentation
- [ ] Developer portal per tenant
- [ ] Client SDK generation
- [ ] Interactive API explorer

### Phase 4: Advanced

- [ ] Custom authentication providers
- [ ] API gateway integration
- [ ] Service mesh support
- [ ] Multi-region deployment

## Conclusion

The API Customization architecture provides a robust, scalable foundation for white-label API management. The modular design allows for easy extension and customization while maintaining security and performance.

Key strengths:
- ✅ Multi-level rate limiting
- ✅ Granular permission control
- ✅ Comprehensive security features
- ✅ Usage tracking and analytics
- ✅ Tenant isolation
- ✅ Extensible design

For production deployment, consider implementing Redis for distributed rate limiting and caching to support multi-instance deployments.
