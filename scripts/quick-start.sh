#!/bin/bash

# KnowTon Platform - 快速启动脚本

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo "======================================"
echo "  KnowTon Platform 快速启动"
echo "======================================"
echo ""

# 创建日志目录
mkdir -p logs

# 启动 Docker 服务
log_info "启动 Docker 服务..."
docker-compose up -d postgres redis mongodb

log_info "等待数据库就绪..."
sleep 10

# 启动后端
log_info "启动后端服务..."
cd packages/backend
npm run dev > ../../logs/backend.log 2>&1 &
cd ../..

sleep 5

# 启动 Oracle Adapter
log_info "启动 Oracle Adapter..."
cd packages/oracle-adapter
uvicorn src.main:app --host 0.0.0.0 --port 8000 > ../../logs/oracle.log 2>&1 &
cd ../..

sleep 5

# 启动前端
log_info "启动前端..."
cd packages/frontend
npm run dev > ../../logs/frontend.log 2>&1 &
cd ../..

sleep 5

echo ""
log_success "所有服务已启动！"
echo ""
echo "访问地址:"
echo "  - 前端: http://localhost:5173"
echo "  - 后端: http://localhost:3000"
echo "  - Oracle: http://localhost:8000"
echo ""
echo "查看日志:"
echo "  - tail -f logs/backend.log"
echo "  - tail -f logs/oracle.log"
echo "  - tail -f logs/frontend.log"
echo ""
