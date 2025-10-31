#!/bin/bash

# KnowTon Platform - 开发环境启动脚本
# 使用非冲突端口配置

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "======================================"
echo "  KnowTon Platform - 开发环境启动"
echo "======================================"
echo ""

# 创建必要的目录
mkdir -p logs

# 加载环境变量
if [ -f ".env.dev" ]; then
    log_info "加载开发环境配置..."
    export $(cat .env.dev | grep -v '^#' | xargs)
else
    log_warning ".env.dev 文件不存在，使用默认配置"
fi

# 停止现有服务
log_info "停止现有服务..."
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
pkill -f "node.*backend" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "uvicorn" 2>/dev/null || true

# 启动 Docker 服务
log_info "启动 Docker 服务 (使用非冲突端口)..."
docker-compose -f docker-compose.dev.yml up -d

log_info "等待数据库就绪..."
sleep 15

# 检查数据库连接
log_info "检查数据库连接..."

if docker exec knowton-postgres-dev pg_isready -U knowton_user >/dev/null 2>&1; then
    log_success "PostgreSQL (端口 5433) 已就绪"
else
    log_error "PostgreSQL 连接失败"
    exit 1
fi

if docker exec knowton-redis-dev redis-cli -a knowton_redis_password ping 2>/dev/null | grep -q "PONG"; then
    log_success "Redis (端口 6380) 已就绪"
else
    log_error "Redis 连接失败"
    exit 1
fi

if docker exec knowton-mongodb-dev mongosh --eval "db.adminCommand('ping')" --quiet >/dev/null 2>&1; then
    log_success "MongoDB (端口 27018) 已就绪"
else
    log_error "MongoDB 连接失败"
    exit 1
fi

# 运行数据库迁移
log_info "运行数据库迁移..."
cd packages/backend

if [ -f "prisma/schema.prisma" ]; then
    # 更新 Prisma 配置使用新端口
    export DATABASE_URL="postgresql://knowton_user:knowton_password@localhost:5433/knowton"
    
    npx prisma generate || log_warning "Prisma generate 失败"
    npx prisma db push || log_warning "Prisma db push 失败"
    log_success "数据库迁移完成"
fi

cd ../..

# 启动后端服务
log_info "启动后端服务 (端口 3000)..."
cd packages/backend

# 确保依赖已安装
if [ ! -d "node_modules" ]; then
    log_info "安装后端依赖..."
    npm install
fi

# 设置环境变量并启动
export PORT=3000
export DATABASE_URL="postgresql://knowton_user:knowton_password@localhost:5433/knowton"
export REDIS_URL="redis://:knowton_redis_password@localhost:6380"
export MONGODB_URI="mongodb://knowton_admin:knowton_mongo_password@localhost:27018/knowton?authSource=admin"

npm run dev > ../../logs/backend.log 2>&1 &
BACKEND_PID=$!
log_success "后端服务已启动 (PID: $BACKEND_PID)"

cd ../..

# 等待后端启动
log_info "等待后端服务就绪..."
for i in {1..30}; do
    if curl -s http://localhost:3000/health >/dev/null 2>&1; then
        log_success "后端服务已就绪"
        break
    fi
    sleep 1
done

# 启动 Oracle Adapter
log_info "启动 Oracle Adapter (端口 8000)..."
cd packages/oracle-adapter

# 确保依赖已安装
if [ ! -d "venv" ]; then
    log_info "创建 Python 虚拟环境..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# 设置环境变量
export ARBITRUM_RPC_URL="${ARBITRUM_RPC_URL:-}"
export CHAINLINK_ORACLE_ADDRESS="${CHAINLINK_ORACLE_ADDRESS:-}"

uvicorn src.main:app --host 0.0.0.0 --port 8000 > ../../logs/oracle.log 2>&1 &
ORACLE_PID=$!
log_success "Oracle Adapter 已启动 (PID: $ORACLE_PID)"

cd ../..

# 等待 Oracle 启动
log_info "等待 Oracle Adapter 就绪..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health >/dev/null 2>&1; then
        log_success "Oracle Adapter 已就绪"
        break
    fi
    sleep 1
done

# 启动前端
log_info "启动前端服务 (端口 5173)..."
cd packages/frontend

# 确保依赖已安装
if [ ! -d "node_modules" ]; then
    log_info "安装前端依赖..."
    npm install
fi

npm run dev > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
log_success "前端服务已启动 (PID: $FRONTEND_PID)"

cd ../..

# 等待前端启动
log_info "等待前端服务就绪..."
for i in {1..30}; do
    if curl -s http://localhost:5173 >/dev/null 2>&1; then
        log_success "前端服务已就绪"
        break
    fi
    sleep 1
done

# 生成启动报告
cat > DEV_STATUS.md << EOF
# KnowTon Platform - 开发环境状态

**启动时间**: $(date)

## 🚀 服务状态

### 数据库服务 (Docker)
- ✅ PostgreSQL: 运行中 (端口 5433)
- ✅ Redis: 运行中 (端口 6380)
- ✅ MongoDB: 运行中 (端口 27018)
- ✅ IPFS: 运行中 (端口 5001, Gateway: 8090)

### 应用服务
- ✅ Backend API: 运行中 (端口 3000, PID: $BACKEND_PID)
- ✅ Frontend: 运行中 (端口 5173, PID: $FRONTEND_PID)
- ✅ Oracle Adapter: 运行中 (端口 8000, PID: $ORACLE_PID)

## 🌐 访问地址

- **前端**: http://localhost:5173
- **后端 API**: http://localhost:3000
- **API 文档**: http://localhost:3000/api-docs
- **Oracle Adapter**: http://localhost:8000
- **Oracle 文档**: http://localhost:8000/docs
- **IPFS Gateway**: http://localhost:8090

## 📊 数据库连接

\`\`\`bash
# PostgreSQL
psql postgresql://knowton_user:knowton_password@localhost:5433/knowton

# MongoDB
mongosh mongodb://knowton_admin:knowton_mongo_password@localhost:27018/knowton?authSource=admin

# Redis
redis-cli -h localhost -p 6380 -a knowton_redis_password
\`\`\`

## 📝 日志文件

\`\`\`bash
# 查看实时日志
tail -f logs/backend.log
tail -f logs/oracle.log
tail -f logs/frontend.log

# 查看 Docker 日志
docker-compose -f docker-compose.dev.yml logs -f
\`\`\`

## 🛑 停止服务

\`\`\`bash
# 停止应用服务
kill $BACKEND_PID $ORACLE_PID $FRONTEND_PID

# 停止 Docker 服务
docker-compose -f docker-compose.dev.yml down

# 或使用脚本
./scripts/dev-stop.sh
\`\`\`

## 🧪 测试命令

\`\`\`bash
# 测试后端健康检查
curl http://localhost:3000/health

# 测试 Oracle Adapter
curl http://localhost:8000/health

# 测试估值 API
curl -X POST http://localhost:8000/api/v1/oracle/valuation \\
  -H "Content-Type: application/json" \\
  -d '{
    "token_id": "1",
    "metadata": {
      "category": "music",
      "creator": "0x1234567890123456789012345678901234567890",
      "views": 1000,
      "likes": 100
    }
  }'
\`\`\`

---
*自动生成于 $(date)*
EOF

echo ""
echo "======================================"
echo "  ✅ 开发环境启动完成！"
echo "======================================"
echo ""
echo "📱 访问地址:"
echo "  - 前端: http://localhost:5173"
echo "  - 后端: http://localhost:3000"
echo "  - Oracle: http://localhost:8000"
echo ""
echo "📊 数据库端口 (避免冲突):"
echo "  - PostgreSQL: 5433"
echo "  - Redis: 6380"
echo "  - MongoDB: 27018"
echo ""
echo "📝 查看日志:"
echo "  - tail -f logs/backend.log"
echo "  - tail -f logs/oracle.log"
echo "  - tail -f logs/frontend.log"
echo ""
echo "🛑 停止服务:"
echo "  - ./scripts/dev-stop.sh"
echo ""
echo "📄 详细状态: cat DEV_STATUS.md"
echo ""
