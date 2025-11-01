/**
 * Cloudflare Worker for IPFS Content Caching
 * Caches IPFS content at the edge for faster delivery
 */

// IPFS gateway configuration
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/'
];

// Cache duration for IPFS content (30 days)
const IPFS_CACHE_TTL = 2592000;

// Content type mapping
const CONTENT_TYPES = {
  'json': 'application/json',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'svg': 'image/svg+xml',
  'webp': 'image/webp',
  'mp4': 'video/mp4',
  'mp3': 'audio/mpeg',
  'pdf': 'application/pdf',
  'txt': 'text/plain',
  'html': 'text/html'
};

// Extract CID from URL
function extractCID(url) {
  const match = url.pathname.match(/\/ipfs\/([^\/]+)/);
  return match ? match[1] : null;
}

// Get content type from filename
function getContentType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}

// Fetch from IPFS with fallback gateways
async function fetchFromIPFS(cid, filename = '') {
  let lastError;
  
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const url = `${gateway}${cid}${filename ? '/' + filename : ''}`;
      const response = await fetch(url, {
        cf: {
          cacheTtl: IPFS_CACHE_TTL,
          cacheEverything: true
        }
      });
      
      if (response.ok) {
        return response;
      }
    } catch (error) {
      lastError = error;
      continue;
    }
  }
  
  throw lastError || new Error('All IPFS gateways failed');
}

// Main worker handler
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Only handle IPFS requests
  if (!url.pathname.startsWith('/ipfs/')) {
    return new Response('Not Found', { status: 404 });
  }
  
  // Extract CID
  const cid = extractCID(url);
  if (!cid) {
    return new Response('Invalid IPFS CID', { status: 400 });
  }
  
  // Generate cache key
  const cacheKey = new Request(url.toString(), request);
  const cache = caches.default;
  
  // Try to get from cache
  let response = await cache.match(cacheKey);
  
  if (response) {
    // Cache hit
    response = new Response(response.body, response);
    response.headers.set('X-Cache-Status', 'HIT');
    response.headers.set('X-IPFS-CID', cid);
    return response;
  }
  
  // Cache miss - fetch from IPFS
  try {
    const filename = url.pathname.split('/').pop();
    response = await fetchFromIPFS(cid, filename);
    
    // Clone for caching
    const responseToCache = response.clone();
    
    // Create cached response with headers
    const cachedResponse = new Response(responseToCache.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers)
    });
    
    // Set cache headers
    cachedResponse.headers.set('Cache-Control', `public, max-age=${IPFS_CACHE_TTL}, immutable`);
    cachedResponse.headers.set('X-Cache-Status', 'MISS');
    cachedResponse.headers.set('X-IPFS-CID', cid);
    cachedResponse.headers.set('Access-Control-Allow-Origin', '*');
    
    // Set content type if not present
    if (!cachedResponse.headers.has('Content-Type') && filename) {
      cachedResponse.headers.set('Content-Type', getContentType(filename));
    }
    
    // Store in cache
    event.waitUntil(cache.put(cacheKey, cachedResponse.clone()));
    
    return cachedResponse;
    
  } catch (error) {
    return new Response(`IPFS fetch failed: ${error.message}`, {
      status: 502,
      headers: {
        'Content-Type': 'text/plain',
        'X-Cache-Status': 'ERROR'
      }
    });
  }
}

// Handle OPTIONS for CORS
addEventListener('fetch', event => {
  const request = event.request;
  
  if (request.method === 'OPTIONS') {
    event.respondWith(handleOptions(request));
  }
});

function handleOptions(request) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}
