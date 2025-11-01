#!/bin/bash

# ============================================
# 停止所有服务
# ============================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🛑 停止 KnowTon 服务...${NC}"
echo ""

# 停止 Node 进程
if [ -f hardhat-node.pid ]; then
    echo "停止 Hardhat 节点..."
    kill $(cat hardhat-node.pid) 2>/dev/null || true
    rm hardhat-node.pid
fi

if [ -f backend.pid ]; then
    echo "停止后端服务..."
    kill $(cat backend.pid) 2>/dev/null || true
    rm backend.pid
fi

if [ -f frontend.pid ]; then
    echo "停止前端服务..."
    kill $(cat frontend.pid) 2>/dev/null || true
    rm frontend.pid
fi

# 停止 Docker 容器
echo "停止 Docker 容器..."
docker-compose -f docker-compose.simple.yml down

echo ""
echo -e "${GREEN}✅ 所有服务已停止${NC}"
