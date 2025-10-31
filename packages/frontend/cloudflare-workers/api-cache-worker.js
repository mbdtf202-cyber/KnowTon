/**
 * Cloudflare Worker for API Response Caching
 * Implements intelligent caching for API endpoints with cache invalidation
 */

// Cache configuration
const CACHE_CONFIG = {
  // GET requests cache duration
  GET: {
    '/api/v1/nft/list': 300, // 5 minutes
    '/api/v1/nft/trending': 180, // 3 minutes
    '/api/v1/marketplace/stats': 120, // 2 minutes
    '/api/v1/analytics/dashboard': 300, // 5 minutes
    '/api/v1/content/search': 60, // 1 minute
    default: 60 // 1 minute default
  },
  // POST/PUT/DELETE bypass cache
  BYPASS_METHODS: ['POST', 'PUT', 'DELETE', 'PATCH']
};

// Cache key generation
function generateCacheKey(request) {
  const url = new URL(request.url);
  const cacheKey = `${request.method}:${url.pathname}${url.search}`;
  return cacheKey;
}

// Get cache TTL for endpoint
function getCacheTTL(pathname) {
  for (const [pattern, ttl] of Object.entries(CACHE_CONFIG.GET)) {
    if (pathname.includes(pattern)) {
      return ttl;
    }
  }
  return CACHE_CONFIG.GET.default;
}

// Check if request should be cached
function shouldCache(request) {
  const method = request.method.toUpperCase();
  
  // Bypass cache for non-GET requests
  if (CACHE_CONFIG.BYPASS_METHODS.includes(method)) {
    return false;
  }
  
  // Bypass cache if Authorization header present
  if (request.headers.get('Authorization')) {
    return false;
  }
  
  // Bypass cache if no-cache header present
  const cacheControl = request.headers.get('Cache-Control');
  if (cacheControl && cacheControl.includes('no-cache')) {
    return false;
  }
  
  return true;
}

// Main worker handler
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Only cache API requests
  if (!url.pathname.startsWith('/api/')) {
    return fetch(request);
  }
  
  // Check if request should be cached
  if (!shouldCache(request)) {
    return fetch(request);
  }
  
  // Generate cache key
  const cacheKey = generateCacheKey(request);
  const cache = caches.default;
  
  // Try to get from cache
  let response = await cache.match(cacheKey);
  
  if (response) {
    // Cache hit - add custom header
    response = new Response(response.body, response);
    response.headers.set('X-Cache-Status', 'HIT');
    response.headers.set('X-Cache-Key', cacheKey);
    return response;
  }
  
  // Cache miss - fetch from origin
  response = await fetch(request);
  
  // Only cache successful responses
  if (response.ok) {
    // Clone response for caching
    const responseToCache = response.clone();
    
    // Get cache TTL
    const ttl = getCacheTTL(url.pathname);
    
    // Create new response with cache headers
    const cachedResponse = new Response(responseToCache.body, responseToCache);
    cachedResponse.headers.set('Cache-Control', `public, max-age=${ttl}`);
    cachedResponse.headers.set('X-Cache-Status', 'MISS');
    cachedResponse.headers.set('X-Cache-TTL', ttl.toString());
    
    // Store in cache
    event.waitUntil(cache.put(cacheKey, cachedResponse.clone()));
    
    return cachedResponse;
  }
  
  // Return original response for errors
  return response;
}

// Cache purge handler (called via webhook)
async function handleCachePurge(request) {
  const { pathname, pattern } = await request.json();
  const cache = caches.default;
  
  if (pattern) {
    // Purge by pattern (requires iteration - expensive)
    // In production, use Cloudflare API for bulk purge
    return new Response(JSON.stringify({
      success: true,
      message: 'Use Cloudflare API for pattern-based purge'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (pathname) {
    // Purge specific path
    const cacheKey = `GET:${pathname}`;
    await cache.delete(cacheKey);
    
    return new Response(JSON.stringify({
      success: true,
      purged: cacheKey
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({
    success: false,
    error: 'Invalid purge request'
  }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}
