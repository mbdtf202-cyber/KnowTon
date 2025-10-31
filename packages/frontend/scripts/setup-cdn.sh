#!/bin/bash

###############################################################################
# CDN Setup Script for KnowTon Platform
# This script helps configure Cloudflare CDN for the platform
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CLOUDFLARE_ZONE_ID="${CLOUDFLARE_ZONE_ID:-}"
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
DOMAIN="${DOMAIN:-knowton.io}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}KnowTon CDN Setup Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Cloudflare credentials are set
if [ -z "$CLOUDFLARE_ZONE_ID" ] || [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${YELLOW}Warning: Cloudflare credentials not set${NC}"
    echo "Please set the following environment variables:"
    echo "  - CLOUDFLARE_ZONE_ID"
    echo "  - CLOUDFLARE_API_TOKEN"
    echo ""
    echo "You can get these from your Cloudflare dashboard:"
    echo "  1. Go to https://dash.cloudflare.com"
    echo "  2. Select your domain"
    echo "  3. Zone ID is on the right sidebar"
    echo "  4. Create API token with 'Edit' permissions for 'Zone Settings' and 'Cache Purge'"
    echo ""
    read -p "Do you want to continue with manual setup? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Function to call Cloudflare API
cloudflare_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
        echo -e "${RED}Error: CLOUDFLARE_API_TOKEN not set${NC}"
        return 1
    fi
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
            "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}${endpoint}" \
            -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "$data"
    else
        curl -s -X "$method" \
            "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}${endpoint}" \
            -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
            -H "Content-Type: application/json"
    fi
}

# Enable performance features
echo -e "${BLUE}Configuring Cloudflare performance settings...${NC}"

if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
    # Enable Brotli compression
    echo "  - Enabling Brotli compression..."
    cloudflare_api PATCH "/settings/brotli" '{"value":"on"}' > /dev/null
    
    # Enable HTTP/2
    echo "  - Enabling HTTP/2..."
    cloudflare_api PATCH "/settings/http2" '{"value":"on"}' > /dev/null
    
    # Enable HTTP/3
    echo "  - Enabling HTTP/3..."
    cloudflare_api PATCH "/settings/http3" '{"value":"on"}' > /dev/null
    
    # Enable Early Hints
    echo "  - Enabling Early Hints..."
    cloudflare_api PATCH "/settings/early_hints" '{"value":"on"}' > /dev/null
    
    # Enable Auto Minify
    echo "  - Enabling Auto Minify..."
    cloudflare_api PATCH "/settings/minify" '{"value":{"css":"on","html":"on","js":"on"}}' > /dev/null
    
    # Enable Polish (image optimization)
    echo "  - Enabling Polish (Lossless)..."
    cloudflare_api PATCH "/settings/polish" '{"value":"lossless"}' > /dev/null
    
    # Enable Mirage (lazy loading)
    echo "  - Enabling Mirage..."
    cloudflare_api PATCH "/settings/mirage" '{"value":"on"}' > /dev/null
    
    echo -e "${GREEN}✓ Performance settings configured${NC}"
else
    echo -e "${YELLOW}Skipping API configuration (no credentials)${NC}"
    echo "Please configure these settings manually in Cloudflare dashboard:"
    echo "  - Brotli: ON"
    echo "  - HTTP/2: ON"
    echo "  - HTTP/3: ON"
    echo "  - Early Hints: ON"
    echo "  - Auto Minify: ON (HTML, CSS, JS)"
    echo "  - Polish: Lossless"
    echo "  - Mirage: ON"
fi

echo ""

# Configure cache rules
echo -e "${BLUE}Configuring cache rules...${NC}"
echo "Cache rules should be configured in Cloudflare dashboard:"
echo ""
echo "1. Static Assets (JS, CSS, Images):"
echo "   - Pattern: *.js, *.css, *.png, *.jpg, *.svg, *.woff2"
echo "   - Edge Cache TTL: 1 year"
echo "   - Browser Cache TTL: 1 year"
echo "   - Cache Level: Cache Everything"
echo ""
echo "2. HTML Pages:"
echo "   - Pattern: *.html"
echo "   - Edge Cache TTL: 1 hour"
echo "   - Browser Cache TTL: 0"
echo "   - Bypass cache on cookie"
echo ""
echo "3. API Responses:"
echo "   - Pattern: /api/*"
echo "   - Edge Cache TTL: 5 minutes"
echo "   - Browser Cache TTL: 1 minute"
echo "   - Cache by query string"
echo ""
echo "4. IPFS Content:"
echo "   - Pattern: /ipfs/*"
echo "   - Edge Cache TTL: 30 days"
echo "   - Browser Cache TTL: 30 days"
echo "   - Cache Level: Cache Everything"
echo ""

# Deploy Cloudflare Workers
echo -e "${BLUE}Deploying Cloudflare Workers...${NC}"
echo "To deploy workers, run:"
echo "  npm install -g wrangler"
echo "  wrangler login"
echo "  wrangler deploy cloudflare-workers/api-cache-worker.js"
echo "  wrangler deploy cloudflare-workers/ipfs-cache-worker.js"
echo ""

# Purge cache
echo -e "${BLUE}Cache Management${NC}"
echo "To purge cache, use:"
echo "  curl -X POST \"https://api.cloudflare.com/client/v4/zones/\${CLOUDFLARE_ZONE_ID}/purge_cache\" \\"
echo "    -H \"Authorization: Bearer \${CLOUDFLARE_API_TOKEN}\" \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d '{\"purge_everything\":true}'"
echo ""

# Test CDN
echo -e "${BLUE}Testing CDN Configuration...${NC}"
echo "Run these commands to test:"
echo "  1. Test static asset caching:"
echo "     curl -I https://${DOMAIN}/assets/index.js"
echo "     (Look for 'cf-cache-status: HIT')"
echo ""
echo "  2. Test API caching:"
echo "     curl -I https://${DOMAIN}/api/v1/nft/list"
echo "     (Look for 'x-cache-status' header)"
echo ""
echo "  3. Test IPFS caching:"
echo "     curl -I https://${DOMAIN}/ipfs/QmTest..."
echo "     (Look for 'cf-cache-status: HIT')"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}CDN Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Configure DNS to point to Cloudflare"
echo "  2. Enable 'Proxied' (orange cloud) in DNS settings"
echo "  3. Deploy Cloudflare Workers"
echo "  4. Test cache behavior"
echo "  5. Monitor cache hit rates in Cloudflare Analytics"
echo ""
