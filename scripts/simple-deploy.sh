#!/bin/bash

# ============================================
# KnowTon Platform - 简单部署脚本
# ============================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 KnowTon Platform - 简单部署${NC}"
echo ""

# 1. 检查环境
echo -e "${BLUE}📋 检查环境...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm 未安装${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 环境检查通过${NC}"
echo ""

# 2. 安装依赖
echo -e "${BLUE}📦 安装依赖...${NC}"
npm install --legacy-peer-deps || {
    echo -e "${YELLOW}⚠️  使用 --force 重试...${NC}"
    npm install --force
}
echo -e "${GREEN}✅ 依赖安装完成${NC}"
echo ""

# 3. 启动基础设施
echo -e "${BLUE}🐳 启动基础设施...${NC}"
docker-compose -f docker-compose.simple.yml down -v 2>/dev/null || true
docker-compose -f docker-compose.simple.yml up -d postgres mongodb redis
echo -e "${YELLOW}⏳ 等待数据库启动...${NC}"
sleep 10
echo -e "${GREEN}✅ 基础设施已启动${NC}"
echo ""

# 4. 编译合约
echo -e "${BLUE}📝 编译智能合约...${NC}"
if [ -d "packages/contracts" ]; then
    (cd packages/contracts && npx hardhat compile)
    echo -e "${GREEN}✅ 合约编译完成${NC}"
else
    echo -e "${YELLOW}⚠️  合约目录不存在${NC}"
fi
echo ""

# 5. 启动本地区块链
echo -e "${BLUE}⛓️  启动本地区块链...${NC}"
npx hardhat node --config packages/contracts/hardhat.config.ts > hardhat-node.log 2>&1 &
HARDHAT_PID=$!
echo $HARDHAT_PID > hardhat-node.pid
echo -e "${GREEN}✅ 区块链节点已启动 (PID: $HARDHAT_PID)${NC}"
sleep 5
echo ""

# 6. 部署合约
echo -e "${BLUE}📝 部署智能合约...${NC}"
npx hardhat run packages/contracts/scripts/deploy.ts --network localhost || {
    echo -e "${RED}❌ 合约部署失败${NC}"
    kill $HARDHAT_PID 2>/dev/null || true
    exit 1
}
echo -e "${GREEN}✅ 合约部署完成${NC}"
echo ""

# 7. 构建前端
echo -e "${BLUE}🎨 构建前端...${NC}"
if [ -d "packages/frontend" ]; then
    (cd packages/frontend && npm run build) || {
        echo -e "${YELLOW}⚠️  前端构建失败，将使用开发模式${NC}"
    }
fi
echo ""

echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""

echo -e "${BLUE}访问地址:${NC}"
echo "  • 区块链 RPC: http://localhost:8545"
echo "  • 前端: http://localhost:5173 (运行 'cd packages/frontend && npm run dev')"
echo ""

echo -e "${BLUE}查看日志:${NC}"
echo "  • 区块链: tail -f hardhat-node.log"
echo "  • Docker: docker-compose -f docker-compose.simple.yml logs -f"
echo ""

echo -e "${BLUE}停止服务:${NC}"
echo "  • ./scripts/stop-services.sh"
echo ""

echo -e "${BLUE}合约地址:${NC}"
if [ -f "packages/contracts/deployments/localhost-latest.json" ]; then
    cat packages/contracts/deployments/localhost-latest.json | grep -A 10 '"contracts"' || true
fi
echo ""

echo -e "${GREEN}🎉 部署成功！${NC}"
