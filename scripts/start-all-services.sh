#!/bin/bash

# KnowTon Platform - 启动所有服务
# 用途：按正确顺序启动所有服务

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
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "======================================"
echo "  KnowTon Platform - Starting Services"
echo "======================================"
echo ""

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running. Please start Docker first."
    exit 1
fi

log_success "Docker is running"
echo ""

# 1. 启动数据库和基础设施服务
log_info "Step 1: Starting infrastructure services (databases, message queues)..."
echo ""

docker-compose up -d postgres redis mongodb kafka clickhouse elasticsearch ipfs

log_info "Waiting for services to be ready (30 seconds)..."
sleep 30

# 检查服务健康状态
log_info "Checking service health..."
docker-compose ps

echo ""
log_success "Infrastructure services started"
echo ""

# 2. 运行数据库迁移
log_info "Step 2: Running database migrations..."
echo ""

# PostgreSQL 迁移
if [ -f "packages/backend/prisma/schema.prisma" ]; then
    log_info "Running Prisma migrations..."
    cd packages/backend
    npx prisma migrate deploy || log_error "Prisma migration failed (continuing anyway)"
    npx prisma generate || log_error "Prisma generate failed (continuing anyway)"
    cd ../..
fi

log_success "Database migrations completed"
echo ""

# 3. 启动管理工具
log_info "Step 3: Starting management tools..."
echo ""

docker-compose up -d adminer redis-commander

log_success "Management tools started"
echo ""

# 4. 启动后端服务
log_info "Step 4: Starting backend services..."
echo ""

# 检查是否需要安装依赖
if [ ! -d "node_modules" ]; then
    log_info "Installing dependencies..."
    npm install
fi

# 启动后端 API
log_info "Starting Backend API..."
cd packages/backend
if [ ! -d "node_modules" ]; then
    npm install
fi

# 后台启动
npm run dev > ../../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../../.pids/backend.pid

cd ../..

log_info "Waiting for Backend API to start (10 seconds)..."
sleep 10

# 检查后端是否启动
if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
    log_success "Backend API is running (PID: $BACKEND_PID)"
else
    log_error "Backend API failed to start. Check logs/backend.log"
fi

echo ""

# 5. 启动 Oracle Adapter
log_info "Step 5: Starting Oracle Adapter (AI Service)..."
echo ""

cd packages/oracle-adapter

# 检查 Python 环境
if [ ! -d "venv" ]; then
    log_info "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

# 安装依赖
if [ ! -f "venv/.installed" ]; then
    log_info "Installing Python dependencies..."
    pip install -r requirements.txt
    touch venv/.installed
fi

# 后台启动
log_info "Starting Oracle Adapter..."
uvicorn src.main:app --host 0.0.0.0 --port 8000 > ../../logs/oracle-adapter.log 2>&1 &
ORACLE_PID=$!
echo $ORACLE_PID > ../../.pids/oracle-adapter.pid

cd ../..

log_info "Waiting for Oracle Adapter to start (15 seconds)..."
sleep 15

# 检查 Oracle Adapter 是否启动
if curl -f -s http://localhost:8000/health > /dev/null 2>&1; then
    log_success "Oracle Adapter is running (PID: $ORACLE_PID)"
else
    log_error "Oracle Adapter failed to start. Check logs/oracle-adapter.log"
fi

echo ""

# 6. 启动 Bonding Service
log_info "Step 6: Starting Bonding Service (gRPC)..."
echo ""

cd packages/bonding-service

# 构建 Go 服务
if [ ! -f "bin/server" ]; then
    log_info "Building Bonding Service..."
    make build
fi

# 后台启动
log_info "Starting Bonding Service..."
./bin/server > ../../logs/bonding-service.log 2>&1 &
BONDING_PID=$!
echo $BONDING_PID > ../../.pids/bonding-service.pid

cd ../..

log_info "Waiting for Bonding Service to start (5 seconds)..."
sleep 5

log_success "Bonding Service is running (PID: $BONDING_PID)"
echo ""

# 7. 启动前端
log_info "Step 7: Starting Frontend (Development Server)..."
echo ""

cd packages/frontend

if [ ! -d "node_modules" ]; then
    log_info "Installing frontend dependencies..."
    npm install
fi

# 后台启动
log_info "Starting Frontend..."
npm run dev > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../../.pids/frontend.pid

cd ../..

log_info "Waiting for Frontend to start (10 seconds)..."
sleep 10

log_success "Frontend is running (PID: $FRONTEND_PID)"
echo ""

# 8. 显示服务状态
echo "======================================"
echo "  Service Status"
echo "======================================"
echo ""

log_info "Running services:"
echo ""
echo "Infrastructure:"
echo "  - PostgreSQL:      localhost:5432"
echo "  - Redis:           localhost:6379"
echo "  - MongoDB:         localhost:27017"
echo "  - Kafka:           localhost:29092"
echo "  - ClickHouse:      localhost:8123"
echo "  - Elasticsearch:   localhost:9200"
echo "  - IPFS:            localhost:5001"
echo ""
echo "Applications:"
echo "  - Backend API:     http://localhost:3000 (PID: $BACKEND_PID)"
echo "  - Frontend:        http://localhost:5173 (PID: $FRONTEND_PID)"
echo "  - Oracle Adapter:  http://localhost:8000 (PID: $ORACLE_PID)"
echo "  - Bonding Service: localhost:50051 (PID: $BONDING_PID)"
echo ""
echo "Management Tools:"
echo "  - Adminer:         http://localhost:8081"
echo "  - Redis Commander: http://localhost:8082"
echo ""

log_success "All services started successfully! ✅"
echo ""
echo "To stop all services, run: ./scripts/stop-all-services.sh"
echo "To check service health, run: ./scripts/test-all-services.sh"
echo ""
echo "Logs are available in the 'logs/' directory"
echo "PIDs are stored in the '.pids/' directory"
echo ""
