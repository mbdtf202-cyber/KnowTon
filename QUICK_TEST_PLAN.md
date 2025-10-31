# KnowTon Platform - 快速测试方案

## 🎯 目标

使用本地已有的数据库服务快速测试核心功能，无需 Docker。

## 📋 前置条件

已确认本地运行的服务：
- ✅ PostgreSQL (端口 5432)
- ✅ Redis (端口 6379)
- ✅ MongoDB (端口 27017)

## 🚀 快速启动步骤

### 1. 配置环境变量

创建 `.env.local`:

\`\`\`bash
# 使用本地数据库
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/knowton_test
MONGODB_URI=mongodb://localhost:27017/knowton_test
REDIS_URL=redis://localhost:6379

# 服务端口
BACKEND_PORT=3000
FRONTEND_PORT=5173
ORACLE_PORT=8000

# 开发模式
NODE_ENV=development
\`\`\`

### 2. 初始化数据库

\`\`\`bash
# 创建测试数据库
createdb knowton_test

# 运行 Prisma 迁移
cd packages/backend
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/knowton_test"
npx prisma generate
npx prisma db push
cd ../..
\`\`\`

### 3. 启动后端服务

\`\`\`bash
cd packages/backend
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/knowton_test"
export REDIS_URL="redis://localhost:6379"
export MONGODB_URI="mongodb://localhost:27017/knowton_test"
export PORT=3000

npm run dev
\`\`\`

### 4. 启动 Oracle Adapter

\`\`\`bash
cd packages/oracle-adapter

# 创建虚拟环境（如果还没有）
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
\`\`\`

### 5. 启动前端

\`\`\`bash
cd packages/frontend
npm run dev
\`\`\`

## 🧪 测试核心功能

### 测试 1: 后端健康检查

\`\`\`bash
curl http://localhost:3000/health
# 预期: {"status":"ok"}
\`\`\`

### 测试 2: Oracle Adapter 健康检查

\`\`\`bash
curl http://localhost:8000/health
# 预期: {"status":"healthy",...}
\`\`\`

### 测试 3: AI 估值服务

\`\`\`bash
curl -X POST http://localhost:8000/api/v1/oracle/valuation \\
  -H "Content-Type: application/json" \\
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
  }'
\`\`\`

### 测试 4: 内容指纹生成

\`\`\`bash
curl -X POST http://localhost:8000/api/v1/oracle/fingerprint \\
  -H "Content-Type: application/json" \\
  -d '{
    "content_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "content_type": "image"
  }'
\`\`\`

### 测试 5: 前端访问

打开浏览器访问: http://localhost:5173

## 📊 预期结果

所有测试应该返回成功响应：

1. ✅ 后端健康检查返回 200
2. ✅ Oracle 健康检查返回 200
3. ✅ 估值 API 返回估值结果（包含 estimated_value）
4. ✅ 指纹 API 返回指纹哈希
5. ✅ 前端页面正常加载

## 🐛 常见问题

### 问题 1: 数据库连接失败

**解决方案**:
\`\`\`bash
# 检查 PostgreSQL 是否运行
pg_isready

# 检查连接字符串
psql postgresql://postgres:postgres@localhost:5432/postgres
\`\`\`

### 问题 2: Python 依赖安装失败

**解决方案**:
\`\`\`bash
# 升级 pip
pip install --upgrade pip

# 单独安装问题包
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
\`\`\`

### 问题 3: 端口被占用

**解决方案**:
\`\`\`bash
# 查找占用端口的进程
lsof -i :3000
lsof -i :8000
lsof -i :5173

# 杀死进程
kill -9 <PID>
\`\`\`

## 📝 下一步

测试通过后：

1. ✅ 部署智能合约到测试网
2. ✅ 更新前端合约地址配置
3. ✅ 测试完整的 NFT 铸造流程
4. ✅ 测试交易和碎片化功能
5. ✅ 性能测试和优化

---

*创建于 2025-10-31*
