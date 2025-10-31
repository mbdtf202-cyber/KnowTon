# Cloudflare Workers for KnowTon Platform

This directory contains Cloudflare Workers for edge caching and content delivery optimization.

## Workers

### 1. API Cache Worker (`api-cache-worker.js`)

Intelligent caching for API endpoints with configurable TTL and cache invalidation.

**Features:**
- Automatic cache key generation
- Configurable TTL per endpoint
- Cache bypass for authenticated requests
- Cache status headers for debugging
- Support for cache purging

**Deployment:**
```bash
wrangler deploy api-cache-worker.js --name api-cache-worker
wrangler route add "knowton.io/api/*" api-cache-worker
```

**Configuration:**
```javascript
const CACHE_CONFIG = {
  GET: {
    '/api/v1/nft/list': 300,        // 5 minutes
    '/api/v1/nft/trending': 180,    // 3 minutes
    '/api/v1/marketplace/stats': 120, // 2 minutes
    default: 60                      // 1 minute
  }
};
```

### 2. IPFS Cache Worker (`ipfs-cache-worker.js`)

Aggressive caching for IPFS content with fallback gateway support.

**Features:**
- Multiple IPFS gateway fallback
- 30-day edge caching
- Automatic content-type detection
- CORS support
- Immutable content caching

**Deployment:**
```bash
wrangler deploy ipfs-cache-worker.js --name ipfs-cache-worker
wrangler route add "knowton.io/ipfs/*" ipfs-cache-worker
```

**IPFS Gateways:**
1. ipfs.io (primary)
2. gateway.pinata.cloud (fallback)
3. cloudflare-ipfs.com (fallback)
4. dweb.link (fallback)

## Setup

### Prerequisites

1. **Cloudflare Account**
   - Sign up at https://dash.cloudflare.com
   - Add your domain to Cloudflare
   - Enable "Proxied" (orange cloud) for DNS records

2. **Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

3. **Authentication**
   ```bash
   wrangler login
   ```

### Configuration

1. **Update `wrangler.toml`**
   ```toml
   account_id = "your-account-id"
   zone_id = "your-zone-id"
   ```

2. **Set Environment Variables**
   ```bash
   export CLOUDFLARE_ACCOUNT_ID="your-account-id"
   export CLOUDFLARE_ZONE_ID="your-zone-id"
   export CLOUDFLARE_API_TOKEN="your-api-token"
   ```

### Deployment

#### Deploy All Workers
```bash
# Deploy API cache worker
wrangler deploy api-cache-worker.js --name api-cache-worker

# Deploy IPFS cache worker
wrangler deploy ipfs-cache-worker.js --name ipfs-cache-worker
```

#### Add Routes
```bash
# API routes
wrangler route add "knowton.io/api/*" api-cache-worker
wrangler route add "*.knowton.io/api/*" api-cache-worker

# IPFS routes
wrangler route add "knowton.io/ipfs/*" ipfs-cache-worker
wrangler route add "*.knowton.io/ipfs/*" ipfs-cache-worker
```

#### Verify Deployment
```bash
wrangler deployments list
```

## Testing

### Test API Cache Worker

```bash
# First request (MISS)
curl -I https://knowton.io/api/v1/nft/list

# Second request (HIT)
curl -I https://knowton.io/api/v1/nft/list

# Look for headers:
# x-cache-status: HIT
# x-cache-key: GET:/api/v1/nft/list
# cache-control: public, max-age=300
```

### Test IPFS Cache Worker

```bash
# First request (MISS)
curl -I https://knowton.io/ipfs/QmTest123/metadata.json

# Second request (HIT)
curl -I https://knowton.io/ipfs/QmTest123/metadata.json

# Look for headers:
# x-cache-status: HIT
# x-ipfs-cid: QmTest123
# cache-control: public, max-age=2592000, immutable
```

### Test Cache Purging

```bash
# Purge specific path
curl -X POST https://knowton.io/api/cache/purge \
  -H "Content-Type: application/json" \
  -d '{"pathname":"/api/v1/nft/list"}'
```

## Monitoring

### View Logs

```bash
# Tail logs in real-time
wrangler tail api-cache-worker

# Filter by status
wrangler tail api-cache-worker --status error
```

### Metrics

View metrics in Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select your worker
3. Click "Metrics" tab

**Key Metrics:**
- Requests per second
- CPU time
- Errors
- Cache hit rate

### Alerts

Set up alerts in Cloudflare Dashboard:
1. Go to Notifications
2. Create new notification
3. Select "Workers" as service
4. Configure thresholds

## Advanced Configuration

### KV Namespace (Optional)

For advanced caching with KV storage:

```bash
# Create KV namespace
wrangler kv:namespace create "CACHE_KV"

# Add to wrangler.toml
[[kv_namespaces]]
binding = "CACHE_KV"
id = "your-kv-namespace-id"
```

### Durable Objects (Optional)

For distributed caching with Durable Objects:

```bash
# Create Durable Object
wrangler durable-objects create CacheObject

# Add to wrangler.toml
[[durable_objects.bindings]]
name = "CACHE_DO"
class_name = "CacheObject"
```

### Environment Variables

```bash
# Set secrets
wrangler secret put API_KEY
wrangler secret put DATABASE_URL

# List secrets
wrangler secret list
```

## Troubleshooting

### Worker Not Executing

1. Check route configuration:
   ```bash
   wrangler route list
   ```

2. Verify DNS is proxied (orange cloud)

3. Check worker logs:
   ```bash
   wrangler tail api-cache-worker
   ```

### Cache Not Working

1. Check cache headers in response
2. Verify request method is GET
3. Check for Authorization header (bypasses cache)
4. Verify cache TTL configuration

### High Error Rate

1. Check worker logs for errors
2. Verify IPFS gateways are accessible
3. Check rate limits
4. Monitor CPU time usage

## Performance Optimization

### Reduce CPU Time

- Minimize JSON parsing
- Use efficient regex patterns
- Cache compiled regex
- Avoid unnecessary string operations

### Reduce Memory Usage

- Stream large responses
- Avoid storing large objects in memory
- Use KV for large data

### Improve Cache Hit Rate

- Normalize cache keys
- Remove unnecessary query parameters
- Use consistent URL formats
- Implement cache warming

## Security

### Best Practices

1. **Validate Input**
   - Sanitize cache keys
   - Validate CIDs
   - Check URL patterns

2. **Rate Limiting**
   - Implement per-IP limits
   - Use Cloudflare Rate Limiting rules
   - Monitor for abuse

3. **CORS Configuration**
   - Restrict origins in production
   - Validate request headers
   - Use appropriate CORS policies

4. **Cache Poisoning Prevention**
   - Validate cache keys
   - Sanitize query parameters
   - Use cache tags

## Cost Optimization

### Cloudflare Workers Pricing

- **Free Tier**: 100,000 requests/day
- **Paid Plan**: $5/month for 10M requests
- **Additional**: $0.50 per million requests

### Optimization Tips

1. **Reduce Requests**
   - Increase cache TTL
   - Use edge caching
   - Implement request coalescing

2. **Reduce CPU Time**
   - Optimize code
   - Use efficient algorithms
   - Cache computed values

3. **Monitor Usage**
   - Set up billing alerts
   - Track request patterns
   - Optimize hot paths

## Maintenance

### Update Workers

```bash
# Update code
vim api-cache-worker.js

# Deploy update
wrangler deploy api-cache-worker.js

# Verify deployment
wrangler deployments list
```

### Rollback

```bash
# List deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback --deployment-id <deployment-id>
```

### Delete Workers

```bash
# Delete worker
wrangler delete api-cache-worker

# Remove routes
wrangler route delete <route-id>
```

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Workers Examples](https://developers.cloudflare.com/workers/examples/)
- [Workers Playground](https://workers.cloudflare.com/playground)

## Support

For issues or questions:
1. Check Cloudflare Workers documentation
2. Review worker logs
3. Contact Cloudflare support
4. Open issue in project repository
