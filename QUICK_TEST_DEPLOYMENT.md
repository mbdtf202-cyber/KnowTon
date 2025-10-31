# KnowTon Platform - 快速测试部署指南

## 🎯 目标

快速启动核心服务进行测试，不依赖完整的 Docker 环境。

## ✅ 已完成的工作总结

### 1. 端口冲突修复
- ✅ 修复了 TorchServe (8080 → 8090)
- ✅ 修复了 Weaviate (8080 → 8088)
- ✅ 修复了 Grafana (3000 → 3001)
- ✅ 所有端口配置已更新

### 2. 核心功能实现
- ✅ 10 个智能合约完成
- ✅ 12 个后端微服务完成
- ✅ AI Oracle 服务完成（指纹、估值、推荐、Chainlink 集成）
- ✅ 13 个前端页面完成
- ✅ Bonding Service 链上集成完成

### 3. 测试脚本创建
- ✅ `scripts/pre-flight-check.sh` - 环境检查
- ✅ `scripts/fix-common-issues.sh` - 自动修复
- ✅ `scripts/start-all-services.sh` - 启动所有服务
- ✅ `scripts/stop-all-services.sh` - 停止所有服务
- ✅ `scripts/test-all-services.sh` - 健康检查

## 🚀 使用本地数据库快速测试

如果你已经有本地运行的数据库（PostgreSQL, Redis, MongoDB），可以直接使用它们：

### 1. 更新环境变量

编辑 `.env` 文件：

```env
# 使用本地数据库
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/knowton
REDIS_URL=redis://localhost:6379
MONGODB_URL=mongodb://localhost:27017/knowton

# 其他配置保持不变
```

### 2. 启动后端服务

```bash
cd packages/backend
npm install
npm run dev
```

后端将在 http://localhost:3000 运行

### 3. 启动前端

```bash
cd packages/frontend
npm install
npm run dev
```

前端将在 http://localhost:5173 运行

### 4. 启动 Oracle Adapter（可选）

```bash
cd packages/oracle-adapter

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖（如果有网络问题，可以跳过）
pip install fastapi uvicorn web3 torch torchvision librosa opencv-python numpy pandas scikit-learn structlog httpx

# 启动服务
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

Oracle Adapter 将在 http://localhost:8000 运行

### 5. 启动 Bonding Service（可选）

```bash
cd packages/bonding-service

# 构建
make build

# 运行
./bin/server
```

Bonding Service 将在 localhost:50051 (gRPC) 运行

## 📝 测试清单

### 前端测试
- [ ] 访问 http://localhost:5173
- [ ] 连接 MetaMask 钱包
- [ ] 浏览市场页面
- [ ] 查看 NFT 详情
- [ ] 测试响应式设计（调整浏览器窗口）
- [ ] 测试语言切换（中英文）

### 后端 API 测试
```bash
# 健康检查
curl http://localhost:3000/health

# 测试 API（需要先启动服务）
curl http://localhost:3000/api/v1/nfts
```

### AI 服务测试
```bash
# 健康检查
curl http://localhost:8000/health

# 测试估值服务
curl -X POST http://localhost:8000/api/v1/oracle/valuation \
  -H "Content-Type: application/json" \
  -d '{
    "token_id": "1",
    "metadata": {
      "category": "music",
      "creator": "0x1234567890123456789012345678901234567890",
      "views": 1000,
      "likes": 100
    }
  }'
```

## 🐛 已知问题和解决方案

### 问题 1: Python SSL 证书错误

**症状**: `[SSL: CERTIFICATE_VERIFY_FAILED]`

**解决方案**:
```bash
# macOS
/Applications/Python\ 3.x/Install\ Certificates.command

# 或者使用 --trusted-host
pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt
```

### 问题 2: Docker 镜像拉取失败

**症状**: `failed to resolve reference`

**解决方案**:
1. 检查网络连接
2. 使用本地数据库代替 Docker
3. 或者使用国内镜像源

### 问题 3: 端口已被占用

**症状**: `Port already in use`

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :PORT_NUMBER

# 停止进程
kill -9 PID
```

### 问题 4: Node 模块未安装

**症状**: `Cannot find module`

**解决方案**:
```bash
# 在项目根目录
npm install

# 在各个包目录
cd packages/backend && npm install
cd packages/frontend && npm install
cd packages/contracts && npm install
```

## 📊 项目状态总结

### 完成度
- **智能合约**: 100% ✅
- **后端服务**: 100% ✅
- **AI 服务**: 100% ✅
- **前端 DApp**: 100% ✅
- **基础设施配置**: 100% ✅
- **测试脚本**: 100% ✅

### 待部署
- ⏳ 智能合约部署到测试网
- ⏳ 完整的 Docker 环境测试
- ⏳ 集成测试
- ⏳ 性能优化

## 🎯 下一步

### 选项 A: 本地测试（推荐）
1. 使用本地数据库
2. 启动核心服务（后端 + 前端）
3. 测试基本功能
4. 验证 UI 和交互

### 选项 B: Docker 部署
1. 解决网络问题
2. 拉取所有镜像
3. 启动完整环境
4. 运行集成测试

### 选项 C: 测试网部署
1. 部署智能合约到 Arbitrum Sepolia
2. 更新前端配置
3. 部署到 Vercel/Netlify
4. 公开测试

## 📞 支持

如果遇到问题：
1. 查看日志文件（`logs/` 目录）
2. 运行健康检查脚本
3. 查看 `PORT_CONFLICT_ANALYSIS.md`
4. 查看 `DEPLOYMENT_GUIDE.md`

## ✅ 验证清单

- [x] 端口冲突已修复
- [x] 所有核心代码已实现
- [x] 测试脚本已创建
- [x] 文档已完善
- [ ] 本地服务测试
- [ ] Docker 环境测试
- [ ] 测试网部署
- [ ] 集成测试

---

**项目已准备好进行本地测试！** 🎉

核心功能全部完成，可以开始测试和验证。建议先使用本地数据库进行快速测试，验证功能正常后再进行完整的 Docker 部署。
