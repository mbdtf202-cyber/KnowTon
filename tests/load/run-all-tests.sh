#!/bin/bash

###############################################################################
# KnowTon Platform Load Testing Suite
# Task 17.3: 进行负载测试
#
# This script runs all load tests in sequence and generates a comprehensive
# performance report.
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
REPORTS_DIR="$(dirname "$0")/reports"
SKIP_SOAK="${SKIP_SOAK:-false}"
SOAK_TEST_HOURS="${SOAK_TEST_HOURS:-1}" # Default to 1 hour for testing

# Create reports directory
mkdir -p "$REPORTS_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     KnowTon Platform Load Testing Suite - Task 17.3           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  API Base URL: ${GREEN}$API_BASE_URL${NC}"
echo -e "  Reports Directory: ${GREEN}$REPORTS_DIR${NC}"
echo -e "  Skip Soak Test: ${GREEN}$SKIP_SOAK${NC}"
echo -e "  Soak Test Duration: ${GREEN}$SOAK_TEST_HOURS hours${NC}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed${NC}"
    echo -e "${YELLOW}Install k6:${NC}"
    echo -e "  macOS: brew install k6"
    echo -e "  Linux: See https://k6.io/docs/getting-started/installation/"
    exit 1
fi

echo -e "${GREEN}✅ k6 is installed: $(k6 version)${NC}"
echo ""

# Check if API is accessible
echo -e "${YELLOW}🔍 Checking API health...${NC}"
if curl -s -f "$API_BASE_URL/api/v1/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is accessible${NC}"
else
    echo -e "${RED}❌ API is not accessible at $API_BASE_URL${NC}"
    echo -e "${YELLOW}Please start the backend server first:${NC}"
    echo -e "  cd packages/backend && npm run dev"
    exit 1
fi
echo ""

# Function to run a test
run_test() {
    local test_name=$1
    local test_file=$2
    local description=$3
    
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Running: $test_name${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo -e "${YELLOW}Description: $description${NC}"
    echo ""
    
    if k6 run --env API_BASE_URL="$API_BASE_URL" "$test_file"; then
        echo -e "${GREEN}✅ $test_name completed successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        return 1
    fi
}

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Test 1: API Load Test (Task 17.3.1)
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Task 17.3.1: 执行 API 负载测试${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if run_test "API Load Test" "$(dirname "$0")/api-load-test.js" "Tests NFT minting, marketplace, trading, and analytics APIs"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi
echo ""
sleep 5

# Test 2: Database Load Test (Task 17.3.2)
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Task 17.3.2: 执行数据库负载测试${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if run_test "Database Load Test" "$(dirname "$0")/database-load-test.js" "Tests PostgreSQL, MongoDB, ClickHouse, and Redis performance"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi
echo ""
sleep 5

# Test 3: Stress Test (Task 17.3.3)
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Task 17.3.3: 执行压力测试${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if run_test "Stress Test" "$(dirname "$0")/stress-test.js" "Finds system breaking point and tests HPA scaling"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi
echo ""
sleep 5

# Test 4: Soak Test (Task 17.3.4)
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Task 17.3.4: 执行浸泡测试${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$SKIP_SOAK" = "true" ]; then
    echo -e "${YELLOW}⏭️  Skipping soak test (SKIP_SOAK=true)${NC}"
    ((TESTS_SKIPPED++))
else
    echo -e "${YELLOW}⚠️  Soak test will run for $SOAK_TEST_HOURS hours${NC}"
    echo -e "${YELLOW}   Set SKIP_SOAK=true to skip this test${NC}"
    echo ""
    
    if run_test "Soak Test" "$(dirname "$0")/soak-test.js" "Tests long-term stability and detects memory leaks"; then
        ((TESTS_PASSED++))
    else
        ((TESTS_FAILED++))
    fi
fi
echo ""

# Generate Performance Report (Task 17.3.5)
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Task 17.3.5: 生成性能报告${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}📊 Generating comprehensive performance report...${NC}"
if node "$(dirname "$0")/generate-performance-report.js"; then
    echo -e "${GREEN}✅ Performance report generated${NC}"
else
    echo -e "${RED}❌ Failed to generate performance report${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Test Summary                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}✅ Tests Passed: $TESTS_PASSED${NC}"
echo -e "  ${RED}❌ Tests Failed: $TESTS_FAILED${NC}"
echo -e "  ${YELLOW}⏭️  Tests Skipped: $TESTS_SKIPPED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  🎉 All load tests completed successfully!                    ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}📄 View the performance report:${NC}"
    echo -e "   ${GREEN}$REPORTS_DIR/performance-report.md${NC}"
    echo ""
    echo -e "${YELLOW}📊 View detailed test results:${NC}"
    echo -e "   ${GREEN}$REPORTS_DIR/*.html${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ⚠️  Some tests failed. Review the logs above.                ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 1
fi
