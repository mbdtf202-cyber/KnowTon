#!/bin/bash

###############################################################################
# Cache Testing Script for KnowTon Platform
# Tests CDN and edge caching effectiveness
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:5173}"
DOMAIN="${DOMAIN:-knowton.io}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}KnowTon Cache Testing Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Testing URL: $BASE_URL"
echo ""

# Function to test cache headers
test_cache() {
    local url=$1
    local expected_cache=$2
    local description=$3
    
    echo -e "${BLUE}Testing: $description${NC}"
    echo "URL: $url"
    
    # First request (should be MISS)
    echo "  First request (expecting MISS)..."
    response1=$(curl -s -I "$url" 2>&1)
    cache_status1=$(echo "$response1" | grep -i "cache-control\|x-cache-status\|cf-cache-status" || echo "No cache headers")
    
    # Second request (should be HIT if cacheable)
    sleep 1
    echo "  Second request (expecting HIT if cacheable)..."
    response2=$(curl -s -I "$url" 2>&1)
    cache_status2=$(echo "$response2" | grep -i "cache-control\|x-cache-status\|cf-cache-status" || echo "No cache headers")
    
    echo "  Cache headers (1st request):"
    echo "$cache_status1" | sed 's/^/    /'
    echo "  Cache headers (2nd request):"
    echo "$cache_status2" | sed 's/^/    /'
    
    # Check if cache is working as expected
    if echo "$response2" | grep -qi "cache-control.*$expected_cache"; then
        echo -e "  ${GREEN}✓ Cache headers correct${NC}"
    else
        echo -e "  ${YELLOW}⚠ Cache headers may not be optimal${NC}"
    fi
    
    echo ""
}

# Test 1: Static JavaScript files (should be cached for 1 year)
test_cache \
    "${BASE_URL}/assets/index.js" \
    "immutable" \
    "Static JavaScript (should be immutable, 1 year)"

# Test 2: Static CSS files (should be cached for 1 year)
test_cache \
    "${BASE_URL}/assets/index.css" \
    "immutable" \
    "Static CSS (should be immutable, 1 year)"

# Test 3: Images (should be cached for 30 days)
test_cache \
    "${BASE_URL}/logo.png" \
    "max-age" \
    "Images (should be cached for 30 days)"

# Test 4: HTML files (should not be cached)
test_cache \
    "${BASE_URL}/index.html" \
    "no-cache" \
    "HTML files (should not be cached)"

# Test 5: Service Worker (should not be cached)
test_cache \
    "${BASE_URL}/sw.js" \
    "no-cache" \
    "Service Worker (should not be cached)"

# Test 6: API endpoints (should be cached for short duration)
test_cache \
    "${BASE_URL}/api/v1/nft/list" \
    "max-age" \
    "API endpoints (should be cached for 5 minutes)"

# Test compression
echo -e "${BLUE}Testing Compression...${NC}"
echo "Checking if gzip/brotli compression is enabled..."

response=$(curl -s -I -H "Accept-Encoding: gzip, br" "${BASE_URL}/assets/index.js" 2>&1)
encoding=$(echo "$response" | grep -i "content-encoding" || echo "No compression")

echo "  Compression headers:"
echo "$encoding" | sed 's/^/    /'

if echo "$encoding" | grep -qi "gzip\|br"; then
    echo -e "  ${GREEN}✓ Compression enabled${NC}"
else
    echo -e "  ${YELLOW}⚠ Compression may not be enabled${NC}"
fi
echo ""

# Test CORS headers
echo -e "${BLUE}Testing CORS Headers...${NC}"
echo "Checking CORS headers for fonts..."

response=$(curl -s -I "${BASE_URL}/fonts/inter.woff2" 2>&1)
cors=$(echo "$response" | grep -i "access-control-allow-origin" || echo "No CORS headers")

echo "  CORS headers:"
echo "$cors" | sed 's/^/    /'

if echo "$cors" | grep -qi "access-control-allow-origin"; then
    echo -e "  ${GREEN}✓ CORS headers present${NC}"
else
    echo -e "  ${YELLOW}⚠ CORS headers may be missing${NC}"
fi
echo ""

# Test security headers
echo -e "${BLUE}Testing Security Headers...${NC}"
echo "Checking security headers..."

response=$(curl -s -I "${BASE_URL}/" 2>&1)
security_headers=$(echo "$response" | grep -i "x-frame-options\|x-content-type-options\|x-xss-protection\|strict-transport-security" || echo "No security headers")

echo "  Security headers:"
echo "$security_headers" | sed 's/^/    /'

if echo "$security_headers" | grep -qi "x-frame-options"; then
    echo -e "  ${GREEN}✓ Security headers present${NC}"
else
    echo -e "  ${YELLOW}⚠ Some security headers may be missing${NC}"
fi
echo ""

# Performance test
echo -e "${BLUE}Testing Cache Performance...${NC}"
echo "Measuring response times..."

# Test uncached request
echo "  Testing uncached request..."
time1=$(curl -s -o /dev/null -w "%{time_total}" "${BASE_URL}/assets/index.js?nocache=$(date +%s)")
echo "    Time: ${time1}s"

# Test cached request
echo "  Testing cached request..."
time2=$(curl -s -o /dev/null -w "%{time_total}" "${BASE_URL}/assets/index.js")
echo "    Time: ${time2}s"

# Calculate improvement
improvement=$(echo "scale=2; (($time1 - $time2) / $time1) * 100" | bc)
echo "  Cache performance improvement: ${improvement}%"

if (( $(echo "$improvement > 20" | bc -l) )); then
    echo -e "  ${GREEN}✓ Significant cache performance improvement${NC}"
else
    echo -e "  ${YELLOW}⚠ Cache may not be providing significant benefit${NC}"
fi
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Cache Testing Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Summary:"
echo "  - Static assets should be cached with 'immutable' flag"
echo "  - HTML should not be cached"
echo "  - API responses should have short cache duration"
echo "  - Compression should be enabled"
echo "  - Security headers should be present"
echo ""
echo "For production testing with Cloudflare:"
echo "  BASE_URL=https://${DOMAIN} ./scripts/test-cache.sh"
echo ""
