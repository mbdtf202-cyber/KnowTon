#!/bin/bash

echo "========================================"
echo "  KnowTon Platform - Standalone Mode"
echo "  (No external dependencies required)"
echo "========================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}[WARNING]${NC} Port $port is already in use"
        return 1
    fi
    return 0
}

# 清理端口
cleanup_port() {
    local port=$1
    echo -e "${BLUE}[INFO]${NC} Cleaning up port $port..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 1
}

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Node.js is not installed"
    exit 1
fi

echo -e "${GREEN}[SUCCESS]${NC} Node.js version: $(node --version)"
echo ""

# 清理可能占用的端口
echo -e "${BLUE}[INFO]${NC} Step 1: Cleaning up ports..."
cleanup_port 3000
cleanup_port 5173
cleanup_port 5174
cleanup_port 5175
echo ""

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}[INFO]${NC} Step 2: Installing dependencies..."
    npm install
    echo ""
fi

# 启动后端服务
echo -e "${BLUE}[INFO]${NC} Step 3: Starting backend service..."
cd packages/backend
if [ ! -d "node_modules" ]; then
    npm install
fi

# 后台启动后端
nohup npm run dev > ../../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}[SUCCESS]${NC} Backend started (PID: $BACKEND_PID)"
echo -e "           Logs: logs/backend.log"
cd ../..
echo ""

# 等待后端启动
echo -e "${BLUE}[INFO]${NC} Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}[SUCCESS]${NC} Backend is ready!"
        break
    fi
    sleep 1
    echo -n "."
done
echo ""
echo ""

# 启动前端服务
echo -e "${BLUE}[INFO]${NC} Step 4: Starting frontend service..."
cd packages/frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

# 后台启动前端
nohup npm run dev > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}[SUCCESS]${NC} Frontend started (PID: $FRONTEND_PID)"
echo -e "           Logs: logs/frontend.log"
cd ../..
echo ""

# 等待前端启动
echo -e "${BLUE}[INFO]${NC} Waiting for frontend to be ready..."
sleep 5
echo ""

# 显示服务状态
echo "========================================"
echo -e "${GREEN}✅ KnowTon Platform is now running!${NC}"
echo "========================================"
echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  🔧 Backend API:  ${GREEN}http://localhost:3000${NC}"
echo -e "  🌐 Frontend App: ${GREEN}http://localhost:5173${NC}"
echo -e "                   ${GREEN}http://localhost:5174${NC} (if 5173 is busy)"
echo -e "                   ${GREEN}http://localhost:5175${NC} (if 5174 is busy)"
echo ""
echo -e "${BLUE}API Endpoints:${NC}"
echo -e "  📊 Health Check: http://localhost:3000/health"
echo -e "  📈 Trading API:  http://localhost:3000/api/trading/pairs"
echo -e "  📚 API Docs:     http://localhost:3000/api-docs"
echo ""
echo -e "${BLUE}Logs:${NC}"
echo -e "  Backend:  tail -f logs/backend.log"
echo -e "  Frontend: tail -f logs/frontend.log"
echo ""
echo -e "${YELLOW}Note:${NC} Running in standalone mode (mock data, no external databases)"
echo ""
echo -e "${BLUE}To stop all services:${NC}"
echo -e "  bash scripts/stop-all-services.sh"
echo ""
echo "Press Ctrl+C to view logs (services will continue running)"
echo ""

# 创建 PID 文件
mkdir -p .pids
echo $BACKEND_PID > .pids/backend.pid
echo $FRONTEND_PID > .pids/frontend.pid

# 显示实时日志
tail -f logs/backend.log logs/frontend.log 2>/dev/null || sleep infinity
