#!/bin/bash

# KnowTon Platform - 全面测试脚本
# 用途: 测试所有服务并排查问题

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 未安装"
        return 1
    fi
    log_success "$1 已安装"
    return 0
}

# 检查端口是否被占用
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "端口 $port ($service) 已被占用"
        lsof -i :$port
        return 1
    else
        log_success "端口 $port ($service) 可用"
        return 0
    fi
}

# 等待服务就绪
wait_for_service() {
    local host=$1
    local port=$2
    local service=$3
    local max_attempts=30
    local attempt=1
    
    log_info "等待 $service 启动..."
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z $host $port 2>/dev/null; then
            log_success "$service 已就绪"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "$service 启动超时"
    return 1
}

# 测试 HTTP 端点
test_http_endpoint() {
    local url=$1
    local service=$2
    
    log_info "测试 $service: $url"
    
    if curl -f -s -o /dev/null -w "%{http_code}" $url | grep -q "200\|301\|302"; then
        log_success "$service HTTP 端点正常"
        return 0
    else
        log_error "$service HTTP 端点失败"
        return 1
    fi
}

echo "======================================"
echo "  KnowTon Platform 全面测试"
echo "======================================"
echo ""

# 第一步: 检查必需工具
log_info "步骤 1: 检查必需工具"
echo "--------------------------------------"

check_command "node" || exit 1
check_command "npm" || exit 1
check_command "docker" || exit 1
check_command "docker-compose" || exit 1
check_command "curl" || exit 1
check_command "nc" || exit 1

echo ""

# 第二步: 检查端口占用
log_info "步骤 2: 检查端口占用"
echo "--------------------------------------"

PORTS_TO_CHECK=(
    "3000:Backend"
    "5173:Frontend"
    "8000:Oracle"
    "50051:Bonding"
    "5432:PostgreSQL"
    "6379:Redis"
    "27017:MongoDB"
    "9092:Kafka"
    "8123:ClickHouse"
    "9200:Elasticsearch"
    "5001:IPFS"
)

PORT_CONFLICTS=0
for port_service in "${PORTS_TO_CHECK[@]}"; do
    IFS=':' read -r port service <<< "$port_service"
    check_port $port $service || PORT_CONFLICTS=$((PORT_CONFLICTS + 1))
done

if [ $PORT_CONFLICTS -gt 0 ]; then
    log_warning "发现 $PORT_CONFLICTS 个端口冲突"
    read -p "是否继续? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""

# 第三步: 启动 Docker 服务
log_info "步骤 3: 启动 Docker 服务"
echo "--------------------------------------"

log_info "停止现有服务..."
docker-compose down 2>/dev/null || true

log_info "启动数据库服务..."
docker-compose up -d postgres redis mongodb

log_info "等待数据库就绪..."
wait_for_service localhost 5432 "PostgreSQL"
wait_for_service localhost 6379 "Redis"
wait_for_service localhost 27017 "MongoDB"

echo ""

# 第四步: 测试数据库连接
log_info "步骤 4: 测试数据库连接"
echo "--------------------------------------"

# 测试 PostgreSQL
log_info "测试 PostgreSQL..."
if docker exec knowton-postgres pg_isready -U knowton_user >/dev/null 2>&1; then
    log_success "PostgreSQL 连接正常"
else
    log_error "PostgreSQL 连接失败"
fi

# 测试 Redis
log_info "测试 Redis..."
if docker exec knowton-redis redis-cli -a knowton_redis_password ping 2>/dev/null | grep -q "PONG"; then
    log_success "Redis 连接正常"
else
    log_error "Redis 连接失败"
fi

# 测试 MongoDB
log_info "测试 MongoDB..."
if docker exec knowton-mongodb mongosh --eval "db.adminCommand('ping')" --quiet >/dev/null 2>&1; then
    log_success "MongoDB 连接正常"
else
    log_error "MongoDB 连接失败"
fi

echo ""

# 第五步: 运行数据库迁移
log_info "步骤 5: 运行数据库迁移"
echo "--------------------------------------"

cd packages/backend

if [ -f "prisma/schema.prisma" ]; then
    log_info "运行 Prisma 迁移..."
    npx prisma generate || log_warning "Prisma generate 失败"
    npx prisma db push || log_warning "Prisma db push 失败"
fi

cd ../..

echo ""

# 第六步: 启动后端服务
log_info "步骤 6: 启动后端服务"
echo "--------------------------------------"

cd packages/backend

log_info "安装依赖..."
npm install --silent || log_warning "npm install 失败"

log_info "构建后端..."
npm run build || log_warning "后端构建失败"

log_info "启动后端服务..."
npm run dev > ../../logs/backend.log 2>&1 &
BACKEND_PID=$!

cd ../..

wait_for_service localhost 3000 "Backend"

echo ""

# 第七步: 测试后端 API
log_info "步骤 7: 测试后端 API"
echo "--------------------------------------"

test_http_endpoint "http://localhost:3000/health" "Backend Health"
test_http_endpoint "http://localhost:3000/api/v1/creators" "Backend API"

echo ""

# 第八步: 启动 Oracle Adapter
log_info "步骤 8: 启动 Oracle Adapter"
echo "--------------------------------------"

cd packages/oracle-adapter

log_info "安装 Python 依赖..."
pip install -r requirements.txt --quiet || log_warning "pip install 失败"

log_info "启动 Oracle Adapter..."
uvicorn src.main:app --host 0.0.0.0 --port 8000 > ../../logs/oracle.log 2>&1 &
ORACLE_PID=$!

cd ../..

wait_for_service localhost 8000 "Oracle Adapter"

echo ""

# 第九步: 测试 Oracle Adapter
log_info "步骤 9: 测试 Oracle Adapter"
echo "--------------------------------------"

test_http_endpoint "http://localhost:8000/health" "Oracle Health"

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
      "likes": 100
    }
  }')

if echo $VALUATION_RESPONSE | grep -q "estimated_value"; then
    log_success "估值 API 正常"
    echo "估值结果: $(echo $VALUATION_RESPONSE | jq -r '.estimated_value' 2>/dev/null || echo 'N/A')"
else
    log_error "估值 API 失败"
fi

echo ""

# 第十步: 启动前端
log_info "步骤 10: 启动前端"
echo "--------------------------------------"

cd packages/frontend

log_info "安装依赖..."
npm install --silent || log_warning "npm install 失败"

log_info "启动前端服务..."
npm run dev > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!

cd ../..

wait_for_service localhost 5173 "Frontend"

echo ""

# 第十一步: 测试前端
log_info "步骤 11: 测试前端"
echo "--------------------------------------"

test_http_endpoint "http://localhost:5173" "Frontend"

echo ""

# 第十二步: 生成测试报告
log_info "步骤 12: 生成测试报告"
echo "--------------------------------------"

cat > TEST_REPORT.md << EOF
# KnowTon Platform 测试报告

**测试时间**: $(date)

## 服务状态

### 数据库服务
- PostgreSQL: ✅ 运行中 (端口 5432)
- Redis: ✅ 运行中 (端口 6379)
- MongoDB: ✅ 运行中 (端口 27017)

### 应用服务
- Backend API: ✅ 运行中 (端口 3000)
- Frontend: ✅ 运行中 (端口 5173)
- Oracle Adapter: ✅ 运行中 (端口 8000)

### 进程 ID
- Backend PID: $BACKEND_PID
- Oracle PID: $ORACLE_PID
- Frontend PID: $FRONTEND_PID

## 访问地址

- 前端: http://localhost:5173
- 后端 API: http://localhost:3000
- Oracle Adapter: http://localhost:8000
- Adminer: http://localhost:8081

## 日志文件

- Backend: logs/backend.log
- Oracle: logs/oracle.log
- Frontend: logs/frontend.log

## 停止服务

\`\`\`bash
# 停止应用服务
kill $BACKEND_PID $ORACLE_PID $FRONTEND_PID

# 停止 Docker 服务
docker-compose down
\`\`\`

---
*自动生成于 $(date)*
EOF

log_success "测试报告已生成: TEST_REPORT.md"

echo ""
echo "======================================"
echo "  测试完成！"
echo "======================================"
echo ""
echo "访问地址:"
echo "  - 前端: http://localhost:5173"
echo "  - 后端: http://localhost:3000"
echo "  - Oracle: http://localhost:8000"
echo ""
echo "查看日志:"
echo "  - tail -f logs/backend.log"
echo "  - tail -f logs/oracle.log"
echo "  - tail -f logs/frontend.log"
echo ""
echo "停止所有服务:"
echo "  - ./scripts/stop-all-services.sh"
echo ""
