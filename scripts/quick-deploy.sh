#!/bin/bash

# ============================================
# KnowTon Platform - 快速部署脚本
# ============================================
# 用于快速启动本地开发环境
# ============================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 KnowTon Platform - 快速部署${NC}"
echo ""

# 1. 安装依赖
echo -e "${BLUE}📦 安装依赖...${NC}"
npm install --legacy-peer-deps

# 2. 启动基础设施
echo -e "${BLUE}🐳 启动基础设施...${NC}"
docker-compose -f docker-compose.simple.yml down -v 2>/dev/null || true
docker-compose -f docker-compose.simple.yml up -d postgres mongodb redis

echo -e "${YELLOW}⏳ 等待数据库启动...${NC}"
sleep 10

# 3. 启动本地区块链
echo -e "${BLUE}⛓️  启动本地区块链...${NC}"
npx hardhat node --config packages/contracts/hardhat.config.ts > hardhat-node.log 2>&1 &
echo $! > hardhat-node.pid
sleep 5

# 4. 部署合约
echo -e "${BLUE}📝 部署智能合约...${NC}"
npx hardhat run packages/contracts/scripts/deploy.ts --network localhost

# 5. 启动后端（如果存在）
if [ -d "packages/backend" ] && [ -f "packages/backend/package.json" ]; then
    echo -e "${BLUE}🔧 启动后端服务...${NC}"
    (cd packages/backend && npm run dev > ../../backend.log 2>&1) &
    echo $! > backend.pid
else
    echo -e "${YELLOW}⚠️  后端服务不存在，跳过${NC}"
fi

# 6. 启动前端
echo -e "${BLUE}🎨 启动前端应用...${NC}"
(cd packages/frontend && npm run dev > ../../frontend.log 2>&1) &
echo $! > frontend.pid

sleep 5

echo ""
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo "访问地址:"
echo "  • 前端: http://localhost:5173"
echo "  • 后端: http://localhost:3000"
echo "  • 区块链: http://localhost:8545"
echo ""
echo "停止服务:"
echo "  ./scripts/stop-services.sh"
echo ""
