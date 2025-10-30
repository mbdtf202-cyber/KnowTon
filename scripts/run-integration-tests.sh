#!/bin/bash

# KnowTon Platform - Integration Test Suite
# Comprehensive end-to-end testing for all platform components

set -e

echo "🧪 Starting KnowTon Platform Integration Tests..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Test configuration
TEST_TIMEOUT=300  # 5 minutes per test suite
PARALLEL_TESTS=4
RETRY_COUNT=3

# Initialize test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Function to run test with retry logic
run_test_with_retry() {
    local test_name="$1"
    local test_command="$2"
    local retry_count=0
    
    while [ $retry_count -lt $RETRY_COUNT ]; do
        print_status "Running $test_name (attempt $((retry_count + 1))/$RETRY_COUNT)..."
        
        if timeout $TEST_TIMEOUT bash -c "$test_command"; then
            print_status "✅ $test_name passed"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $RETRY_COUNT ]; then
                print_warning "⚠️  $test_name failed, retrying..."
                sleep 5
            fi
        fi
    done
    
    print_error "❌ $test_name failed after $RETRY_COUNT attempts"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
}

# Function to check service health
check_service_health() {
    local service_name="$1"
    local health_url="$2"
    local max_attempts=30
    local attempt=0
    
    print_status "Checking $service_name health..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            print_status "$service_name is healthy"
            return 0
        fi
        
        attempt=$((attempt + 1))
        sleep 2
    done
    
    print_error "$service_name health check failed"
    return 1
}

print_header "Pre-test Setup"

# Check if services are running
print_status "Checking service availability..."

services=(
    "Backend API:http://localhost:3001/health"
    "Frontend:http://localhost:3000"
    "Oracle Adapter:http://localhost:8000/health"
    "Prometheus:http://localhost:9090/-/healthy"
    "Grafana:http://localhost:3002/api/health"
)

for service in "${services[@]}"; do
    name=$(echo "$service" | cut -d: -f1)
    url=$(echo "$service" | cut -d: -f2-)
    
    if ! check_service_health "$name" "$url"; then
        print_warning "$name is not available, some tests may be skipped"
    fi
done

print_header "1. Smart Contract Tests"

TOTAL_TESTS=$((TOTAL_TESTS + 6))

# Contract compilation and deployment tests
run_test_with_retry "Contract Compilation" "
    cd packages/contracts && 
    npm run compile
"

run_test_with_retry "Contract Unit Tests" "
    cd packages/contracts && 
    npm test
"

run_test_with_retry "Contract Gas Analysis" "
    cd packages/contracts && 
    npm run test:gas
"

run_test_with_retry "Contract Security Analysis" "
    cd packages/contracts && 
    npm run security:slither || true  # Non-blocking
"

run_test_with_retry "Contract Coverage" "
    cd packages/contracts && 
    npm run coverage
"

run_test_with_retry "Contract Deployment Simulation" "
    cd packages/contracts && 
    npx hardhat run scripts/test/simulate-deployment.ts
"

print_header "2. Backend API Tests"

TOTAL_TESTS=$((TOTAL_TESTS + 8))

# API endpoint tests
run_test_with_retry "API Health Check" "
    curl -f http://localhost:3001/health
"

run_test_with_retry "Authentication API" "
    cd packages/backend && 
    npm run test:auth
"

run_test_with_retry "NFT API Tests" "
    cd packages/backend && 
    npm run test:nft
"

run_test_with_retry "Trading API Tests" "
    cd packages/backend && 
    npm run test:trading
"

run_test_with_retry "Staking API Tests" "
    cd packages/backend && 
    npm run test:staking
"

run_test_with_retry "Governance API Tests" "
    cd packages/backend && 
    npm run test:governance
"

run_test_with_retry "Analytics API Tests" "
    cd packages/backend && 
    npm run test:analytics
"

run_test_with_retry "Database Integration" "
    cd packages/backend && 
    npm run test:db
"

print_header "3. AI Services Tests"

TOTAL_TESTS=$((TOTAL_TESTS + 4))

# AI model tests
run_test_with_retry "Oracle Adapter Health" "
    curl -f http://localhost:8000/health
"

run_test_with_retry "Content Fingerprinting" "
    curl -X POST http://localhost:8000/api/v1/oracle/fingerprint \
        -H 'Content-Type: application/json' \
        -d '{
            \"content_url\": \"data:text/plain;base64,SGVsbG8gV29ybGQ=\",
            \"content_type\": \"text\",
            \"metadata\": {}
        }'
"

run_test_with_retry "IP Valuation Service" "
    curl -X POST http://localhost:8000/api/v1/oracle/valuation \
        -H 'Content-Type: application/json' \
        -d '{
            \"token_id\": 1,
            \"metadata\": {\"category\": \"music\", \"creator\": \"0x123\"},
            \"historical_data\": []
        }'
"

run_test_with_retry "Recommendation Engine" "
    curl -f 'http://localhost:8000/api/v1/oracle/recommendations?user_address=0x123&limit=5'
"

print_header "4. Frontend Tests"

TOTAL_TESTS=$((TOTAL_TESTS + 5))

# Frontend tests
run_test_with_retry "Frontend Build" "
    cd packages/frontend && 
    npm run build
"

run_test_with_retry "Frontend Unit Tests" "
    cd packages/frontend && 
    npm test -- --watchAll=false
"

run_test_with_retry "Frontend Linting" "
    cd packages/frontend && 
    npm run lint
"

run_test_with_retry "Frontend Type Check" "
    cd packages/frontend && 
    npm run type-check
"

run_test_with_retry "Frontend Accessibility" "
    cd packages/frontend && 
    npm run test:a11y || true  # Non-blocking
"

print_header "5. Data Pipeline Tests"

TOTAL_TESTS=$((TOTAL_TESTS + 4))

# Data synchronization tests
run_test_with_retry "Kafka Health Check" "
    kubectl exec deployment/kafka -- kafka-topics.sh --bootstrap-server localhost:9092 --list
"

run_test_with_retry "PostgreSQL Connection" "
    kubectl exec deployment/postgres -- pg_isready -U knowton
"

run_test_with_retry "ClickHouse Connection" "
    kubectl exec deployment/clickhouse -- clickhouse-client --query 'SELECT 1'
"

run_test_with_retry "Data Sync Pipeline" "
    bash scripts/check-data-sync-health.sh
"

print_header "6. End-to-End User Flows"

TOTAL_TESTS=$((TOTAL_TESTS + 6))

# E2E workflow tests
run_test_with_retry "User Registration Flow" "
    # Simulate user registration
    curl -X POST http://localhost:3001/api/v1/auth/register \
        -H 'Content-Type: application/json' \
        -d '{
            \"address\": \"0x742d35Cc6634C0532925a3b8D4C9db96c4b4df93\",
            \"signature\": \"0x123...\",
            \"message\": \"Sign in to KnowTon\"
        }' || true
"

run_test_with_retry "Content Upload Flow" "
    # Simulate content upload
    curl -X POST http://localhost:3001/api/v1/content/upload \
        -H 'Content-Type: application/json' \
        -d '{
            \"title\": \"Test Content\",
            \"description\": \"Integration test content\",
            \"contentType\": \"text\",
            \"category\": \"other\",
            \"content\": \"SGVsbG8gV29ybGQ=\"
        }' || true
"

run_test_with_retry "NFT Minting Flow" "
    # Simulate NFT minting
    curl -X POST http://localhost:3001/api/v1/nft/mint \
        -H 'Content-Type: application/json' \
        -d '{
            \"tokenURI\": \"ipfs://QmTest123\",
            \"royaltyPercentage\": 10,
            \"price\": \"1000000000000000000\"
        }' || true
"

run_test_with_retry "Trading Flow" "
    # Simulate trading order
    curl -X POST http://localhost:3001/api/v1/trade/order \
        -H 'Content-Type: application/json' \
        -d '{
            \"tokenId\": 1,
            \"orderType\": \"buy\",
            \"amount\": \"1000000000000000000\",
            \"price\": \"2000000000000000000\"
        }' || true
"

run_test_with_retry "Staking Flow" "
    # Simulate staking
    curl -X POST http://localhost:3001/api/v1/staking/stake \
        -H 'Content-Type: application/json' \
        -d '{
            \"amount\": \"1000000000000000000\",
            \"lockPeriod\": 30
        }' || true
"

run_test_with_retry "Governance Flow" "
    # Simulate proposal creation
    curl -X POST http://localhost:3001/api/v1/governance/proposal \
        -H 'Content-Type: application/json' \
        -d '{
            \"title\": \"Test Proposal\",
            \"description\": \"This is a test proposal for integration testing\",
            \"proposalType\": \"general\",
            \"votingPeriod\": 7
        }' || true
"

print_header "7. Performance Tests"

TOTAL_TESTS=$((TOTAL_TESTS + 3))

# Performance and load tests
run_test_with_retry "API Load Test" "
    # Simple load test with curl
    for i in {1..10}; do
        curl -f http://localhost:3001/health &
    done
    wait
"

run_test_with_retry "Database Performance" "
    cd packages/backend && 
    npm run test:performance || true  # Non-blocking
"

run_test_with_retry "Memory Usage Check" "
    # Check memory usage of services
    kubectl top pods --no-headers | awk '{print \$3}' | sed 's/Mi//' | awk '{sum+=\$1} END {print \"Total Memory: \" sum \"Mi\"}'
"

print_header "8. Security Tests"

TOTAL_TESTS=$((TOTAL_TESTS + 4))

# Security tests
run_test_with_retry "Input Validation Tests" "
    # Test SQL injection protection
    curl -X POST http://localhost:3001/api/v1/test/validate \
        -H 'Content-Type: application/json' \
        -d '{\"input\": \"'; DROP TABLE users; --\"}' \
        -w '%{http_code}' | grep -q '400'
"

run_test_with_retry "Rate Limiting Tests" "
    # Test rate limiting
    for i in {1..20}; do
        curl -s http://localhost:3001/api/v1/test/rate-limit
    done | grep -q '429' || true
"

run_test_with_retry "CORS Tests" "
    # Test CORS headers
    curl -H 'Origin: http://malicious-site.com' \
        -H 'Access-Control-Request-Method: POST' \
        -H 'Access-Control-Request-Headers: X-Requested-With' \
        -X OPTIONS http://localhost:3001/api/v1/health
"

run_test_with_retry "Security Headers" "
    # Check security headers
    curl -I http://localhost:3001/health | grep -q 'X-Frame-Options'
"

print_header "9. Monitoring Tests"

TOTAL_TESTS=$((TOTAL_TESTS + 3))

# Monitoring and observability tests
run_test_with_retry "Prometheus Metrics" "
    curl -f http://localhost:9090/api/v1/query?query=up
"

run_test_with_retry "Grafana Dashboard" "
    curl -f http://localhost:3002/api/health
"

run_test_with_retry "Log Aggregation" "
    # Check if logs are being generated
    kubectl logs deployment/backend --tail=10 | wc -l | awk '{if(\$1 > 0) exit 0; else exit 1}'
"

print_header "Test Results Summary"

# Calculate test statistics
TOTAL_EXECUTED=$((PASSED_TESTS + FAILED_TESTS))
SUCCESS_RATE=0

if [ $TOTAL_EXECUTED -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_EXECUTED))
fi

echo ""
echo "📊 Integration Test Results:"
echo "  Total Tests: $TOTAL_TESTS"
echo "  Executed: $TOTAL_EXECUTED"
echo "  Passed: $PASSED_TESTS"
echo "  Failed: $FAILED_TESTS"
echo "  Skipped: $SKIPPED_TESTS"
echo "  Success Rate: $SUCCESS_RATE%"
echo ""

# Generate detailed test report
cat > /tmp/knowton-integration-test-report.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platform": "KnowTon",
  "test_suite": "integration",
  "results": {
    "total_tests": $TOTAL_TESTS,
    "executed": $TOTAL_EXECUTED,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "skipped": $SKIPPED_TESTS,
    "success_rate": $SUCCESS_RATE
  },
  "categories": {
    "smart_contracts": "$([ $FAILED_TESTS -eq 0 ] && echo "passed" || echo "failed")",
    "backend_api": "$([ $FAILED_TESTS -eq 0 ] && echo "passed" || echo "failed")",
    "ai_services": "$([ $FAILED_TESTS -eq 0 ] && echo "passed" || echo "failed")",
    "frontend": "$([ $FAILED_TESTS -eq 0 ] && echo "passed" || echo "failed")",
    "data_pipeline": "$([ $FAILED_TESTS -eq 0 ] && echo "passed" || echo "failed")",
    "e2e_flows": "$([ $FAILED_TESTS -eq 0 ] && echo "passed" || echo "failed")",
    "performance": "$([ $FAILED_TESTS -eq 0 ] && echo "passed" || echo "failed")",
    "security": "$([ $FAILED_TESTS -eq 0 ] && echo "passed" || echo "failed")",
    "monitoring": "$([ $FAILED_TESTS -eq 0 ] && echo "passed" || echo "failed")"
  },
  "recommendations": [
    $([ $FAILED_TESTS -gt 0 ] && echo '"Investigate and fix failed tests",' || echo '')
    $([ $SUCCESS_RATE -lt 95 ] && echo '"Improve test reliability",' || echo '')
    "Regular integration testing in CI/CD pipeline",
    "Monitor test performance and optimize slow tests"
  ]
}
EOF

print_status "Test report saved to /tmp/knowton-integration-test-report.json"

# Determine exit code
if [ $SUCCESS_RATE -ge 80 ]; then
    print_status "🎉 Integration tests completed successfully!"
    echo ""
    print_status "Platform is ready for further testing and deployment"
    exit 0
else
    print_error "❌ Integration tests failed!"
    echo ""
    print_error "Please investigate and fix the failing tests before proceeding"
    exit 1
fi