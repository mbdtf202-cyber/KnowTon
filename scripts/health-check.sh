#!/bin/bash

echo "🏥 KnowTon Platform Health Check"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service
check_service() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -n "Checking $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$response" = "$expected" ]; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $response)"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $response)"
        return 1
    fi
}

# Check services
echo "📊 Service Status:"
echo ""

check_service "Frontend" "http://localhost:5173" "200"
check_service "Backend API" "http://localhost:3000/health" "200"
check_service "Backend Creators" "http://localhost:3000/api/v1/creators" "200"
check_service "Backend NFTs" "http://localhost:3000/api/v1/nfts" "200"

echo ""
echo "=================================="
echo "Health check complete!"
