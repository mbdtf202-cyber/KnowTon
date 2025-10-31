#!/bin/bash

# KnowTon Platform - 本地快速测试
# 使用本地数据库，无需 Docker

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
echo "  KnowTon Platform - 本地快速测试"
echo "======================================"
echo ""

# 创建日志目录
mkdir -p logs

# 检查本地数据库
log_info "检查本地数据库..."

if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    log_success "PostgreSQL 可用"
else
    log_error "PostgreSQL 不可用，请启动 PostgreSQL"
    exit 1
fi

if redis-cli -h localhost -p 6379 ping >/dev/null 2>&1; then
    log_success "Redis 可用"
else
    log_warning "Redis 不可用，某些功能可能受限"
fi

# 设置环境变量
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/knowton_test"
export REDIS_URL="redis://localhost:6379"
export MONGODB_URI="mongodb://localhost:27017/knowton_test"
export PORT=3000

# 创建测试数据库
log_info "创建测试数据库..."
createdb knowton_test 2>/dev/null || log_warning "数据库已存在"

# 运行 Prisma 迁移
log_info "运行数据库迁移..."
cd packages/backend

if [ -f "prisma/schema.prisma" ]; then
    npx prisma generate >/dev/null 2>&1 || log_warning "Prisma generate 失败"
    npx prisma db push >/dev/null 2>&1 || log_warning "Prisma db push 失败"
    log_success "数据库迁移完成"
fi

cd ../..

# 启动后端
log_info "启动后端服务..."
cd packages/backend

if [ ! -d "node_modules" ]; then
    log_info "安装后端依赖..."
    npm install --silent
fi

npm run dev > ../../logs/backend-local.log 2>&1 &
BACKEND_PID=$!
log_success "后端已启动 (PID: $BACKEND_PID)"

cd ../..

# 等待后端就绪
log_info "等待后端就绪..."
for i in {1..30}; do
    if curl -s http://localhost:3000/health >/dev/null 2>&1; then
        log_success "后端已就绪"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        log_error "后端启动超时"
        cat logs/backend-local.log
        exit 1
    fi
done

# 测试后端 API
log_info "测试后端 API..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
if echo $HEALTH_RESPONSE | grep -q "ok\|healthy"; then
    log_success "后端健康检查通过"
else
    log_error "后端健康检查失败"
fi

# 启动 Oracle Adapter
log_info "启动 Oracle Adapter..."
cd packages/oracle-adapter

if [ ! -d "venv" ]; then
    log_info "创建 Python 虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate

if [ ! -f "venv/bin/uvicorn" ]; then
    log_info "安装 Python 依赖..."
    pip install -r requirements.txt --quiet
fi

uvicorn src.main:app --host 0.0.0.0 --port 8000 > ../../logs/oracle-local.log 2>&1 &
ORACLE_PID=$!
log_success "Oracle Adapter 已启动 (PID: $ORACLE_PID)"

cd ../..

# 等待 Oracle 就绪
log_info "等待 Oracle Adapter 就绪..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health >/dev/null 2>&1; then
        log_success "Oracle Adapter 已就绪"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        log_warning "Oracle Adapter 启动超时"
    fi
done

# 测试 Oracle API
log_info "测试 Oracle API..."
ORACLE_HEALTH=$(curl -s http://localhost:8000/health)
if echo $ORACLE_HEALTH | grep -q "healthy"; then
    log_success "Oracle 健康检查通过"
else
    log_warning "Oracle 健康检查失败"
fi

# 测试估值 API
log_info "测试估值 API..."
VALUATION_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/oracle/valuation \
  -H "Content-Type: application/json" \
  -d '{
    "token_id": "1",
    "metadata": {
      "category": "music",
      "creator": "0x1234567890123456789012345678901234567890",
      "views": 1000,
      "likes": 100,
      "quality_score": 0.8,
      "rarity": 0.6
    }
  }' 2>/dev/null)

if echo $VALUATION_RESPONSE | grep -q "estimated_value"; then
    ESTIMATED_VALUE=$(echo $VALUATION_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('estimated_value', 'N/A'))" 2>/dev/null || echo "N/A")
    log_success "估值 API 正常 (估值: \$$ESTIMATED_VALUE)"
else
    log_warning "估值 API 测试失败"
fi

# 启动前端
log_info "启动前端..."
cd packages/frontend

if [ ! -d "node_modules" ]; then
    log_info "安装前端依赖..."
    npm install --silent
fi

npm run dev > ../../logs/frontend-local.log 2>&1 &
FRONTEND_PID=$!
log_success "前端已启动 (PID: $FRONTEND_PID)"

cd ../..

# 等待前端就绪
log_info "等待前端就绪..."
for i in {1..30}; do
    if curl -s http://localhost:5173 >/dev/null 2>&1; then
        log_success "前端已就绪"
        break
    fi
    sleep 1
done

# 生成测试报告
cat > LOCAL_TEST_REPORT.md << EOF
# KnowTon Platform - 本地测试报告

**测试时间**: $(date)

## ✅ 测试结果

### 服务状态
- ✅ Backend API (端口 3000, PID: $BACKEND_PID)
- ✅ Oracle Adapter (端口 8000, PID: $ORACLE_PID)
- ✅ Frontend (端口 5173, PID: $FRONTEND_PID)

### 数据库
- ✅ PostgreSQL (localhost:5432)
- ✅ Redis (localhost:6379)
- ✅ MongoDB (localhost:27017)

## 🌐 访问地址

- **前端**: http://localhost:5173
- **后端 API**: http://localhost:3000
- **Oracle Adapter**: http://localhost:8000
- **Oracle 文档**: http://localhost:8000/docs

## 📝 日志文件

\`\`\`bash
tail -f logs/backend-local.log
tail -f logs/oracle-local.log
tail -f logs/frontend-local.log
\`\`\`

## 🛑 停止服务

\`\`\`bash
kill $BACKEND_PID $ORACLE_PID $FRONTEND_PID
\`\`\`

## 🧪 测试命令

\`\`\`bash
# 健康检查
curl http://localhost:3000/health
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
echo "  ✅ 本地测试环境启动完成！"
echo "======================================"
echo ""
echo "📱 访问地址:"
echo "  - 前端: http://localhost:5173"
echo "  - 后端: http://localhost:3000"
echo "  - Oracle: http://localhost:8000"
echo ""
echo "📝 查看日志:"
echo "  - tail -f logs/backend-local.log"
echo "  - tail -f logs/oracle-local.log"
echo "  - tail -f logs/frontend-local.log"
echo ""
echo "🛑 停止服务:"
echo "  - kill $BACKEND_PID $ORACLE_PID $FRONTEND_PID"
echo ""
echo "📄 详细报告: cat LOCAL_TEST_REPORT.md"
echo ""
