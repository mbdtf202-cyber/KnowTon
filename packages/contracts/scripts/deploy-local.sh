#!/bin/bash

echo "════════════════════════════════════════════════════"
echo "  KnowTon - Local Testnet Deployment"
echo "════════════════════════════════════════════════════"
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 检查是否在 contracts 目录
if [ ! -f "hardhat.config.ts" ]; then
    echo -e "${RED}[ERROR]${NC} Please run this script from packages/contracts directory"
    exit 1
fi

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}[INFO]${NC} Installing dependencies..."
    npm install
fi

# 编译合约
echo -e "${BLUE}[INFO]${NC} Compiling contracts..."
npx hardhat compile

if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Contract compilation failed"
    exit 1
fi

echo -e "${GREEN}[SUCCESS]${NC} Contracts compiled successfully"
echo ""

# 启动本地节点（后台）
echo -e "${BLUE}[INFO]${NC} Starting local Hardhat node..."
npx hardhat node > ../../logs/hardhat-node.log 2>&1 &
HARDHAT_PID=$!
echo $HARDHAT_PID > ../../.pids/hardhat.pid

echo -e "${GREEN}[SUCCESS]${NC} Hardhat node started (PID: $HARDHAT_PID)"
echo -e "           Logs: logs/hardhat-node.log"
echo ""

# 等待节点启动
echo -e "${BLUE}[INFO]${NC} Waiting for node to be ready..."
sleep 5

# 部署合约
echo -e "${BLUE}[INFO]${NC} Deploying contracts to local network..."
echo ""
npx hardhat run scripts/deploy.ts --network localhost

if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Deployment failed"
    kill $HARDHAT_PID 2>/dev/null
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Local deployment complete!${NC}"
echo "════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}Local Network Info:${NC}"
echo "  RPC URL: http://localhost:8545"
echo "  Chain ID: 31337"
echo ""
echo -e "${BLUE}Test Accounts:${NC}"
echo "  Check logs/hardhat-node.log for account details"
echo ""
echo -e "${BLUE}To stop the node:${NC}"
echo "  kill $HARDHAT_PID"
echo ""
