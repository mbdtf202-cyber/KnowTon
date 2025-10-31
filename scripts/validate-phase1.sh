#!/bin/bash

# Phase 1 Validation: Core Integration & Validation

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

echo "======================================"
echo "  Phase 1 Validation"
echo "  Core Integration & Validation"
echo "======================================"
echo ""

passed=0
failed=0

# Test 1: Bonding Service Smart Contract Integration
log_info "Test 1: Bonding Service Smart Contract Integration"
cd packages/bonding-service

if go test ./internal/blockchain -v -run TestIPBondContract 2>&1 | tee /tmp/bonding-test.log; then
    log_success "Bonding Service contract integration tests passed"
    ((passed++))
else
    log_error "Bonding Service contract integration tests failed"
    ((failed++))
fi

cd ../..
echo ""

# Test 2: Oracle Integration
log_info "Test 2: Oracle Adapter Integration"

# Start Oracle Adapter if not running
if ! curl -f -s http://localhost:8000/health > /dev/null 2>&1; then
    log_warning "Oracle Adapter not running, starting it..."
    cd packages/oracle-adapter
    source venv/bin/activate 2>/dev/null || python3 -m venv venv && source venv/bin/activate
    pip install -q -r requirements.txt
    uvicorn src.main:app --host 0.0.0.0 --port 8000 > /tmp/oracle.log 2>&1 &
    ORACLE_PID=$!
    sleep 10
    cd ../..
fi

# Test valuation API
if curl -f -s -X POST http://localhost:8000/api/v1/oracle/valuation \
    -H "Content-Type: application/json" \
    -d '{
        "token_id": "1",
        "metadata": {
            "category": "music",
            "creator": "0x1234567890123456789012345678901234567890",
            "views": 10000,
            "likes": 500,
            "quality_score": 0.8,
            "rarity": 0.6
        }
    }' > /tmp/valuation-response.json; then
    log_success "Valuation API test passed"
    cat /tmp/valuation-response.json | jq '.'
    ((passed++))
else
    log_error "Valuation API test failed"
    ((failed++))
fi

echo ""

# Test 3: Fingerprint Generation
log_info "Test 3: Content Fingerprint Generation"

if curl -f -s -X POST http://localhost:8000/api/v1/oracle/fingerprint \
    -H "Content-Type: application/json" \
    -d '{
        "content_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "content_type": "image",
        "metadata": {}
    }' > /tmp/fingerprint-response.json; then
    log_success "Fingerprint generation test passed"
    cat /tmp/fingerprint-response.json | jq '.'
    ((passed++))
else
    log_error "Fingerprint generation test failed"
    ((failed++))
fi

echo ""

# Test 4: Grafana Dashboards
log_info "Test 4: Grafana Dashboard Validation"

# Check if Grafana is running
if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
    log_success "Grafana is running"
    
    # Check dashboards
    DASHBOARDS=$(ls k8s/dev/grafana-dashboards/*.json 2>/dev/null | wc -l)
    if [ $DASHBOARDS -ge 4 ]; then
        log_success "Found $DASHBOARDS Grafana dashboards"
        ((passed++))
    else
        log_error "Expected at least 4 dashboards, found $DASHBOARDS"
        ((failed++))
    fi
else
    log_warning "Grafana not running, skipping dashboard validation"
    ((failed++))
fi

echo ""

# Test 5: Prometheus Metrics
log_info "Test 5: Prometheus Metrics Validation"

if curl -f -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
    log_success "Prometheus is running"
    
    # Check if targets are up
    TARGETS=$(curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets | length')
    log_info "Found $TARGETS active Prometheus targets"
    
    if [ $TARGETS -gt 0 ]; then
        log_success "Prometheus has active targets"
        ((passed++))
    else
        log_warning "No active Prometheus targets found"
        ((failed++))
    fi
else
    log_warning "Prometheus not running, skipping metrics validation"
    ((failed++))
fi

echo ""

# Test 6: Backend API Health
log_info "Test 6: Backend API Health Check"

if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
    log_success "Backend API is healthy"
    ((passed++))
else
    log_error "Backend API health check failed"
    ((failed++))
fi

echo ""

# Summary
echo "======================================"
echo "  Phase 1 Validation Summary"
echo "======================================"
echo ""
echo "Total Tests: $((passed + failed))"
echo -e "${GREEN}Passed: $passed${NC}"
echo -e "${RED}Failed: $failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
    log_success "Phase 1 validation passed! ✅"
    log_info "Ready to proceed to Phase 2"
    exit 0
else
    log_error "Phase 1 validation failed! ❌"
    log_info "Please fix the issues before proceeding"
    exit 1
fi
