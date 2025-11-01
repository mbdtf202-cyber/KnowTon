#!/bin/bash

# ============================================
# 验证部署状态
# ============================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check_service() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -n "检查 $name... "
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
}

check_port() {
    local name=$1
    local port=$2
    
    echo -n "检查 $name (端口 $port)... "
    
    if nc -z localhost $port 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
}

echo -e "${BLUE}🔍 验证 KnowTon Platform 部署状态${NC}"
echo ""

# 检查 Docker 服务
echo -e "${BLUE}Docker 服务:${NC}"
check_port "PostgreSQL" 5432
check_port "MongoDB" 27017
check_port "Redis" 6379
check_port "Kafka" 29092
echo ""

# 检查应用服务
echo -e "${BLUE}应用服务:${NC}"
check_service "后端 API" "http://localhost:3000/health" || true
check_service "前端应用" "http://localhost:5173" || true
check_port "Hardhat 节点" 8545 || true
echo ""

# 检查合约部署
echo -e "${BLUE}智能合约:${NC}"
if [ -f "deployed-contracts.json" ]; then
    echo -e "${GREEN}✓${NC} 合约已部署"
    echo ""
    echo "合约地址:"
    cat deployed-contracts.json | grep -A 20 '"contracts"' | grep '"' | head -10
else
    echo -e "${RED}✗${NC} 未找到合约部署文件"
fi
echo ""

# 检查进程
echo -e "${BLUE}运行中的进程:${NC}"
if [ -f "hardhat-node.pid" ]; then
    if ps -p $(cat hardhat-node.pid) > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Hardhat 节点运行中 (PID: $(cat hardhat-node.pid))"
    else
        echo -e "${RED}✗${NC} Hardhat 节点未运行"
    fi
fi

if [ -f "backend.pid" ]; then
    if ps -p $(cat backend.pid) > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} 后端服务运行中 (PID: $(cat backend.pid))"
    else
        echo -e "${RED}✗${NC} 后端服务未运行"
    fi
fi

if [ -f "frontend.pid" ]; then
    if ps -p $(cat frontend.pid) > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} 前端服务运行中 (PID: $(cat frontend.pid))"
    else
        echo -e "${RED}✗${NC} 前端服务未运行"
    fi
fi
echo ""

# Docker 容器状态
echo -e "${BLUE}Docker 容器状态:${NC}"
docker-compose -f docker-compose.simple.yml ps
echo ""

echo -e "${GREEN}验证完成！${NC}"
