#!/bin/bash

echo "========================================"
echo "  KnowTon Platform - Verification"
echo "========================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

# 测试函数
test_endpoint() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$response" = "$expected" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $response)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (Expected $expected, got $response)"
        ((FAILED++))
        return 1
    fi
}

test_json_response() {
    local name=$1
    local url=$2
    local field=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s "$url" 2>/dev/null)
    
    if echo "$response" | grep -q "$field"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Response: $response"
        ((FAILED++))
        return 1
    fi
}

echo -e "${BLUE}[1/3] Backend API Tests${NC}"
echo "-----------------------------------"
test_endpoint "Health Check" "http://localhost:3000/health" "200"
test_json_response "Health Status" "http://localhost:3000/health" "status"
test_endpoint "Ready Check" "http://localhost:3000/ready" "200"
test_endpoint "API Docs" "http://localhost:3000/api-docs" "200"
test_json_response "Trading Pairs" "http://localhost:3000/api/trading/pairs" "tokenId"
echo ""

echo -e "${BLUE}[2/3] Frontend Tests${NC}"
echo "-----------------------------------"
test_endpoint "Frontend Home" "http://localhost:5175" "200"
test_endpoint "Frontend Assets" "http://localhost:5175/@vite/client" "200"
echo ""

echo -e "${BLUE}[3/3] API Endpoints Tests${NC}"
echo "-----------------------------------"
test_endpoint "NFT API" "http://localhost:3000/api/v1/nfts" "200"
echo ""

echo "========================================"
echo -e "${BLUE}Test Summary${NC}"
echo "========================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo -e "${BLUE}Platform Status: ${GREEN}ONLINE${NC}"
    echo ""
    echo "Access the platform:"
    echo -e "  Frontend: ${GREEN}http://localhost:5175${NC}"
    echo -e "  Backend:  ${GREEN}http://localhost:3000${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "Please check:"
    echo "  1. Services are running"
    echo "  2. Ports are not blocked"
    echo "  3. Check logs for errors"
    echo ""
    exit 1
fi
