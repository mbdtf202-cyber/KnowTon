#!/bin/bash

# KnowTon Platform - 停止开发环境

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "======================================"
echo "  停止 KnowTon 开发环境"
echo "======================================"
echo ""

# 停止 Node.js 进程
log_info "停止 Node.js 服务..."
pkill -f "node.*backend" || log_warning "Backend 未运行"
pkill -f "vite" || log_warning "Frontend 未运行"

# 停止 Python 进程
log_info "停止 Python 服务..."
pkill -f "uvicorn" || log_warning "Oracle Adapter 未运行"

# 停止 Docker 服务
log_info "停止 Docker 服务..."
docker-compose -f docker-compose.dev.yml down

log_info "清理日志文件..."
rm -f logs/*.log

echo ""
echo "✅ 开发环境已停止！"
