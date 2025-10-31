#!/bin/bash

# KnowTon Platform - 修复常见问题
# 用途：自动修复常见的配置和依赖问题

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "======================================"
echo "  KnowTon Platform - Fix Common Issues"
echo "======================================"
echo ""

# 1. 创建缺失的环境变量文件
log_info "Checking environment files..."
echo ""

if [ ! -f ".env" ]; then
    log_info "Creating .env from .env.example..."
    cp .env.example .env
    log_success ".env created"
fi

if [ ! -f "packages/backend/.env" ]; then
    log_info "Creating backend .env..."
    cp packages/backend/.env.example packages/backend/.env
    log_success "Backend .env created"
fi

if [ ! -f "packages/frontend/.env" ]; then
    log_info "Creating frontend .env..."
    cp packages/frontend/.env.example packages/frontend/.env
    log_success "Frontend .env created"
fi

if [ ! -f "packages/oracle-adapter/.env" ]; then
    log_info "Creating oracle-adapter .env..."
    cp packages/oracle-adapter/.env.example packages/oracle-adapter/.env
    log_success "Oracle Adapter .env created"
fi

if [ ! -f "packages/bonding-service/.env" ]; then
    log_info "Creating bonding-service .env..."
    cp packages/bonding-service/.env.example packages/bonding-service/.env
    log_success "Bonding Service .env created"
fi

echo ""

# 2. 安装依赖
log_info "Installing dependencies..."
echo ""

# Root dependencies
if [ ! -d "node_modules" ]; then
    log_info "Installing root dependencies..."
    npm install
    log_success "Root dependencies installed"
fi

# Backend dependencies
if [ ! -d "packages/backend/node_modules" ]; then
    log_info "Installing backend dependencies..."
    cd packages/backend
    npm install
    cd ../..
    log_success "Backend dependencies installed"
fi

# Frontend dependencies
if [ ! -d "packages/frontend/node_modules" ]; then
    log_info "Installing frontend dependencies..."
    cd packages/frontend
    npm install
    cd ../..
    log_success "Frontend dependencies installed"
fi

# Contracts dependencies
if [ ! -d "packages/contracts/node_modules" ]; then
    log_info "Installing contracts dependencies..."
    cd packages/contracts
    npm install
    cd ../..
    log_success "Contracts dependencies installed"
fi

# SDK dependencies
if [ ! -d "packages/sdk/node_modules" ]; then
    log_info "Installing SDK dependencies..."
    cd packages/sdk
    npm install
    cd ../..
    log_success "SDK dependencies installed"
fi

echo ""

# 3. Python 环境
log_info "Setting up Python environment..."
echo ""

cd packages/oracle-adapter

if [ ! -d "venv" ]; then
    log_info "Creating Python virtual environment..."
    python3 -m venv venv
    log_success "Virtual environment created"
fi

source venv/bin/activate

log_info "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
touch venv/.installed

deactivate
cd ../..

log_success "Python environment ready"
echo ""

# 4. Go 依赖
log_info "Setting up Go dependencies..."
echo ""

cd packages/bonding-service

if [ ! -d "vendor" ]; then
    log_info "Downloading Go dependencies..."
    go mod download
    go mod vendor
    log_success "Go dependencies downloaded"
fi

cd ../..

echo ""

# 5. 创建必需的目录
log_info "Creating required directories..."
echo ""

mkdir -p logs
mkdir -p .pids
mkdir -p data
mkdir -p data/postgres
mkdir -p data/redis
mkdir -p data/mongodb
mkdir -p data/kafka
mkdir -p data/clickhouse
mkdir -p data/elasticsearch

log_success "Directories created"
echo ""

# 6. 清理旧的 PID 文件
log_info "Cleaning up old PID files..."
echo ""

rm -f .pids/*.pid

log_success "PID files cleaned"
echo ""

# 7. 检查并修复端口冲突
log_info "Checking for port conflicts..."
echo ""

# 检查关键端口
PORTS_IN_USE=()

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        PORTS_IN_USE+=($port)
    fi
}

check_port 5432
check_port 6379
check_port 27017
check_port 3000
check_port 5173
check_port 8000

if [ ${#PORTS_IN_USE[@]} -gt 0 ]; then
    log_error "The following ports are in use: ${PORTS_IN_USE[*]}"
    echo ""
    echo "To free these ports, you can:"
    echo "  1. Stop the services using these ports"
    echo "  2. Run: ./scripts/stop-all-services.sh"
    echo "  3. Or manually kill the processes"
    echo ""
else
    log_success "No port conflicts detected"
fi

echo ""

# 8. 编译智能合约
log_info "Compiling smart contracts..."
echo ""

cd packages/contracts

if [ ! -d "artifacts" ]; then
    log_info "Compiling contracts..."
    npx hardhat compile
    log_success "Contracts compiled"
else
    log_info "Contracts already compiled (skipping)"
fi

cd ../..

echo ""

# 9. 生成 Prisma Client
log_info "Generating Prisma Client..."
echo ""

cd packages/backend

if [ -f "prisma/schema.prisma" ]; then
    npx prisma generate
    log_success "Prisma Client generated"
fi

cd ../..

echo ""

# 10. 构建 TypeScript SDK
log_info "Building TypeScript SDK..."
echo ""

cd packages/sdk

if [ ! -d "dist" ]; then
    npm run build
    log_success "SDK built"
else
    log_info "SDK already built (skipping)"
fi

cd ../..

echo ""

# 总结
echo "======================================"
echo "  Fix Summary"
echo "======================================"
echo ""

log_success "Common issues fixed! ✅"
echo ""
echo "Next steps:"
echo "  1. Review and update .env files with your configuration"
echo "  2. Run pre-flight check: ./scripts/pre-flight-check.sh"
echo "  3. Start services: ./scripts/start-all-services.sh"
echo ""
