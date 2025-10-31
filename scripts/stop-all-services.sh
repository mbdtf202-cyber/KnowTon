#!/bin/bash

# KnowTon Platform - 停止所有服务

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
echo "  停止 KnowTon Platform 所有服务"
echo "======================================"
echo ""

# 停止 Node.js 进程
log_info "停止 Node.js 服务..."
pkill -f "node.*backend" || log_warning "Backend 未运行"
pkill -f "vite" || log_warning "Frontend 未运行"

# 停止 Python 进程
log_info "停止 Python 服务..."
pkill -f "uvicorn" || log_warning "Oracle Adapter 未运行"

# 停止 Go 进程
log_info "停止 Go 服务..."
pkill -f "bonding-service" || log_warning "Bonding Service 未运行"

# 停止 Docker 服务
log_info "停止 Docker 服务..."
docker-compose down

log_info "所有服务已停止"

# 清理日志
if [ -d "logs" ]; then
    log_info "清理日志文件..."
    rm -f logs/*.log
fi

echo ""
echo "✅ 完成！"
