#!/bin/bash

# KnowTon Platform - 全面服务测试脚本
# 用途：测试所有服务的健康状态和端口可用性

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查端口是否被占用
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_success "Port $port ($service) is in use"
        return 0
    else
        log_warning "Port $port ($service) is NOT in use"
        return 1
    fi
}

# 检查 HTTP 服务健康状态
check_http_health() {
    local url=$1
    local service=$2
    local timeout=${3:-5}
    
    if curl -f -s -m $timeout "$url" > /dev/null 2>&1; then
        log_success "$service is healthy at $url"
        return 0
    else
        log_error "$service is NOT healthy at $url"
        return 1
    fi
}

# 检查 TCP 连接
check_tcp() {
    local host=$1
    local port=$2
    local service=$3
    local timeout=${4:-5}
    
    if timeout $timeout bash -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null; then
        log_success "$service is reachable at $host:$port"
        return 0
    else
        log_error "$service is NOT reachable at $host:$port"
        return 1
    fi
}

echo "======================================"
echo "  KnowTon Platform - Service Tests"
echo "======================================"
echo ""

# 测试计数器
total_tests=0
passed_tests=0
failed_tests=0

# 1. 测试数据库服务
log_info "Testing Database Services..."
echo ""

# PostgreSQL
total_tests=$((total_tests + 1))
if check_tcp localhost 5432 "PostgreSQL"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# Redis
total_tests=$((total_tests + 1))
if check_tcp localhost 6379 "Redis"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# MongoDB
total_tests=$((total_tests + 1))
if check_tcp localhost 27017 "MongoDB"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# ClickHouse
total_tests=$((total_tests + 1))
if check_http_health "http://localhost:8123/ping" "ClickHouse"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# Elasticsearch
total_tests=$((total_tests + 1))
if check_http_health "http://localhost:9200/_cluster/health" "Elasticsearch"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

echo ""
log_info "Testing Message Queue Services..."
echo ""

# Kafka
total_tests=$((total_tests + 1))
if check_tcp localhost 29092 "Kafka"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

echo ""
log_info "Testing Application Services..."
echo ""

# Backend API
total_tests=$((total_tests + 1))
if check_http_health "http://localhost:3000/health" "Backend API" 10; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# Frontend (development server)
total_tests=$((total_tests + 1))
if check_tcp localhost 5173 "Frontend Dev Server"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# Oracle Adapter
total_tests=$((total_tests + 1))
if check_http_health "http://localhost:8000/health" "Oracle Adapter" 10; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# Bonding Service (gRPC)
total_tests=$((total_tests + 1))
if check_tcp localhost 50051 "Bonding Service (gRPC)"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

echo ""
log_info "Testing Storage Services..."
echo ""

# IPFS
total_tests=$((total_tests + 1))
if check_http_health "http://localhost:5001/api/v0/version" "IPFS API"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

echo ""
log_info "Testing Management Tools..."
echo ""

# Adminer
total_tests=$((total_tests + 1))
if check_tcp localhost 8081 "Adminer"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# Redis Commander
total_tests=$((total_tests + 1))
if check_tcp localhost 8082 "Redis Commander"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

echo ""
log_info "Testing Monitoring Services..."
echo ""

# Prometheus
total_tests=$((total_tests + 1))
if check_http_health "http://localhost:9090/-/healthy" "Prometheus"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

# Grafana
total_tests=$((total_tests + 1))
if check_http_health "http://localhost:3001/api/health" "Grafana"; then
    passed_tests=$((passed_tests + 1))
else
    failed_tests=$((failed_tests + 1))
fi

echo ""
echo "======================================"
echo "  Test Summary"
echo "======================================"
echo ""
echo "Total Tests:  $total_tests"
echo -e "${GREEN}Passed:       $passed_tests${NC}"
echo -e "${RED}Failed:       $failed_tests${NC}"
echo ""

# 计算成功率
success_rate=$((passed_tests * 100 / total_tests))
echo "Success Rate: $success_rate%"
echo ""

# 端口冲突检查
echo "======================================"
echo "  Port Conflict Check"
echo "======================================"
echo ""

log_info "Checking for port conflicts..."
echo ""

# 检查关键端口
declare -A ports=(
    [5432]="PostgreSQL"
    [6379]="Redis"
    [27017]="MongoDB"
    [8123]="ClickHouse"
    [9200]="Elasticsearch"
    [29092]="Kafka"
    [3000]="Backend API"
    [5173]="Frontend"
    [8000]="Oracle Adapter"
    [50051]="Bonding Service"
    [8080]="IPFS Gateway"
    [5001]="IPFS API"
    [8081]="Adminer"
    [8082]="Redis Commander"
    [9090]="Prometheus"
    [3001]="Grafana"
)

conflicts=0
for port in "${!ports[@]}"; do
    service="${ports[$port]}"
    count=$(lsof -Pi :$port -sTCP:LISTEN 2>/dev/null | wc -l)
    
    if [ $count -gt 1 ]; then
        log_error "Port $port ($service) has multiple processes!"
        conflicts=$((conflicts + 1))
        lsof -Pi :$port -sTCP:LISTEN
    elif [ $count -eq 1 ]; then
        log_success "Port $port ($service) - OK"
    else
        log_warning "Port $port ($service) - Not in use"
    fi
done

echo ""
if [ $conflicts -eq 0 ]; then
    log_success "No port conflicts detected!"
else
    log_error "Found $conflicts port conflicts!"
fi

echo ""
echo "======================================"
echo "  Service URLs"
echo "======================================"
echo ""
echo "Frontend:         http://localhost:5173"
echo "Backend API:      http://localhost:3000"
echo "Oracle Adapter:   http://localhost:8000"
echo "Adminer:          http://localhost:8081"
echo "Redis Commander:  http://localhost:8082"
echo "Prometheus:       http://localhost:9090"
echo "Grafana:          http://localhost:3001"
echo "IPFS Gateway:     http://localhost:8080"
echo ""

# 退出码
if [ $failed_tests -eq 0 ] && [ $conflicts -eq 0 ]; then
    log_success "All tests passed! ✅"
    exit 0
else
    log_error "Some tests failed or conflicts detected! ❌"
    exit 1
fi
