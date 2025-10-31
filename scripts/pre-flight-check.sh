#!/bin/bash

# KnowTon Platform - 预检查脚本
# 用途：在启动服务前检查所有必需的工具和配置

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

echo "======================================"
echo "  KnowTon Platform - Pre-flight Check"
echo "======================================"
echo ""

errors=0
warnings=0

# 1. 检查必需工具
log_info "Checking required tools..."
echo ""

# Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    log_success "Node.js: $NODE_VERSION"
    
    # 检查版本
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ $MAJOR_VERSION -lt 18 ]; then
        log_warning "Node.js version should be 18 or higher (current: $NODE_VERSION)"
        warnings=$((warnings + 1))
    fi
else
    log_error "Node.js is not installed"
    errors=$((errors + 1))
fi

# npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    log_success "npm: $NPM_VERSION"
else
    log_error "npm is not installed"
    errors=$((errors + 1))
fi

# Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    log_success "Docker: $DOCKER_VERSION"
    
    # 检查 Docker 是否运行
    if docker info > /dev/null 2>&1; then
        log_success "Docker daemon is running"
    else
        log_error "Docker daemon is not running"
        errors=$((errors + 1))
    fi
else
    log_error "Docker is not installed"
    errors=$((errors + 1))
fi

# Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    log_success "Docker Compose: $COMPOSE_VERSION"
else
    log_error "Docker Compose is not installed"
    errors=$((errors + 1))
fi

# Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    log_success "Python: $PYTHON_VERSION"
else
    log_error "Python 3 is not installed"
    errors=$((errors + 1))
fi

# Go
if command -v go &> /dev/null; then
    GO_VERSION=$(go version)
    log_success "Go: $GO_VERSION"
else
    log_error "Go is not installed"
    errors=$((errors + 1))
fi

# Git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    log_success "Git: $GIT_VERSION"
else
    log_warning "Git is not installed (optional)"
    warnings=$((warnings + 1))
fi

echo ""

# 2. 检查端口可用性
log_info "Checking port availability..."
echo ""

check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "Port $port ($service) is already in use"
        warnings=$((warnings + 1))
        return 1
    else
        log_success "Port $port ($service) is available"
        return 0
    fi
}

# 关键端口
check_port 5432 "PostgreSQL"
check_port 6379 "Redis"
check_port 27017 "MongoDB"
check_port 8123 "ClickHouse"
check_port 9200 "Elasticsearch"
check_port 29092 "Kafka"
check_port 3000 "Backend API"
check_port 5173 "Frontend"
check_port 8000 "Oracle Adapter"
check_port 50051 "Bonding Service"

echo ""

# 3. 检查配置文件
log_info "Checking configuration files..."
echo ""

# 根目录 .env
if [ -f ".env" ]; then
    log_success ".env file exists"
else
    log_warning ".env file not found (will use .env.example)"
    warnings=$((warnings + 1))
fi

# Backend .env
if [ -f "packages/backend/.env" ]; then
    log_success "Backend .env file exists"
else
    log_warning "Backend .env file not found"
    warnings=$((warnings + 1))
fi

# Frontend .env
if [ -f "packages/frontend/.env" ]; then
    log_success "Frontend .env file exists"
else
    log_warning "Frontend .env file not found"
    warnings=$((warnings + 1))
fi

# Oracle Adapter .env
if [ -f "packages/oracle-adapter/.env" ]; then
    log_success "Oracle Adapter .env file exists"
else
    log_warning "Oracle Adapter .env file not found"
    warnings=$((warnings + 1))
fi

# Bonding Service .env
if [ -f "packages/bonding-service/.env" ]; then
    log_success "Bonding Service .env file exists"
else
    log_warning "Bonding Service .env file not found"
    warnings=$((warnings + 1))
fi

echo ""

# 4. 检查依赖安装
log_info "Checking dependencies..."
echo ""

# Root node_modules
if [ -d "node_modules" ]; then
    log_success "Root dependencies installed"
else
    log_warning "Root dependencies not installed (run: npm install)"
    warnings=$((warnings + 1))
fi

# Backend node_modules
if [ -d "packages/backend/node_modules" ]; then
    log_success "Backend dependencies installed"
else
    log_warning "Backend dependencies not installed"
    warnings=$((warnings + 1))
fi

# Frontend node_modules
if [ -d "packages/frontend/node_modules" ]; then
    log_success "Frontend dependencies installed"
else
    log_warning "Frontend dependencies not installed"
    warnings=$((warnings + 1))
fi

# Oracle Adapter venv
if [ -d "packages/oracle-adapter/venv" ]; then
    log_success "Oracle Adapter virtual environment exists"
else
    log_warning "Oracle Adapter virtual environment not found"
    warnings=$((warnings + 1))
fi

echo ""

# 5. 检查目录结构
log_info "Checking directory structure..."
echo ""

# 创建必需的目录
mkdir -p logs
mkdir -p .pids
mkdir -p data

log_success "Required directories created"

echo ""

# 6. 检查磁盘空间
log_info "Checking disk space..."
echo ""

AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}')
log_info "Available disk space: $AVAILABLE_SPACE"

# 检查是否有至少 10GB 可用空间
AVAILABLE_GB=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
if [ $AVAILABLE_GB -lt 10 ]; then
    log_warning "Low disk space (less than 10GB available)"
    warnings=$((warnings + 1))
else
    log_success "Sufficient disk space available"
fi

echo ""

# 7. 检查内存
log_info "Checking system memory..."
echo ""

if command -v free &> /dev/null; then
    TOTAL_MEM=$(free -h | awk 'NR==2 {print $2}')
    AVAILABLE_MEM=$(free -h | awk 'NR==2 {print $7}')
    log_info "Total memory: $TOTAL_MEM, Available: $AVAILABLE_MEM"
    
    AVAILABLE_MEM_GB=$(free -g | awk 'NR==2 {print $7}')
    if [ $AVAILABLE_MEM_GB -lt 4 ]; then
        log_warning "Low available memory (less than 4GB)"
        warnings=$((warnings + 1))
    else
        log_success "Sufficient memory available"
    fi
else
    log_info "Memory check skipped (free command not available)"
fi

echo ""

# 总结
echo "======================================"
echo "  Pre-flight Check Summary"
echo "======================================"
echo ""

if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    log_success "All checks passed! ✅"
    echo ""
    echo "You can now start the services with:"
    echo "  ./scripts/start-all-services.sh"
    echo ""
    exit 0
elif [ $errors -eq 0 ]; then
    log_warning "Pre-flight check completed with $warnings warning(s) ⚠️"
    echo ""
    echo "You can proceed, but please review the warnings above."
    echo ""
    echo "To start services:"
    echo "  ./scripts/start-all-services.sh"
    echo ""
    exit 0
else
    log_error "Pre-flight check failed with $errors error(s) and $warnings warning(s) ❌"
    echo ""
    echo "Please fix the errors above before starting services."
    echo ""
    exit 1
fi
