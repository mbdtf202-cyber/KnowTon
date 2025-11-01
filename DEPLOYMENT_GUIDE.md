# KnowTon Platform - 部署指南

## 🚀 快速开始

### 方式一：全面部署（推荐）

完整部署包括智能合约、所有服务和基础设施：

```bash
./scripts/full-deployment.sh
```

这个脚本会：
1. ✅ 检查环境和依赖
2. ✅ 安装所有 npm 包
3. ✅ 启动数据库和基础设施
4. ✅ 部署智能合约（本地或测试网）
5. ✅ 构建并启动所有服务
6. ✅ 生成部署报告

**预计时间**: 10-15 分钟

### 方式二：快速部署（开发环境）

仅启动本地开发环境：

```bash
./scripts/quick-deploy.sh
```

这个脚本会：
1. ✅ 安装依赖
2. ✅ 启动基础设施（PostgreSQL, MongoDB, Redis）
3. ✅ 启动本地区块链
4. ✅ 部署合约到本地网络
5. ✅ 启动前端和后端

**预计时间**: 3-5 分钟

## 📋 前置要求

### 必需软件

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker** >= 20.10.0
- **Docker Compose** >= 2.0.0

### 可选软件

- **Git** (用于版本控制)
- **MetaMask** (用于测试 DApp)

### 环境配置

1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入必要的配置：
```bash
# 对于本地开发，可以保持默认值
# 对于测试网部署，需要填入：
PRIVATE_KEY=你的钱包私钥
ARBISCAN_API_KEY=你的Arbiscan API密钥
```

## 🔧 部署选项

### 选项 1: 本地开发网络

使用 Hardhat 本地网络（无需真实 ETH）：

```bash
# 使用全面部署脚本（不设置 PRIVATE_KEY）
./scripts/full-deployment.sh

# 或使用快速部署
./scripts/quick-deploy.sh
```

**优点**:
- ✅ 无需真实资金
- ✅ 快速部署和测试
- ✅ 完全控制区块链状态

**缺点**:
- ❌ 仅限本地访问
- ❌ 重启后数据丢失

### 选项 2: Arbitrum Sepolia 测试网

部署到公共测试网：

```bash
# 1. 获取测试网 ETH
# 访问: https://faucet.quicknode.com/arbitrum/sepolia

# 2. 配置私钥
echo "PRIVATE_KEY=0x你的私钥" >> .env

# 3. 运行部署
./scripts/full-deployment.sh
```

**优点**:
- ✅ 真实的网络环境
- ✅ 可以公开访问
- ✅ 与其他测试网服务集成

**缺点**:
- ❌ 需要测试网 ETH
- ❌ 部署较慢（需要等待区块确认）

### 选项 3: Docker Compose 完整栈

使用 Docker Compose 运行所有服务：

```bash
# 启动所有服务
docker-compose -f docker-compose.simple.yml up -d

# 查看日志
docker-compose -f docker-compose.simple.yml logs -f

# 停止服务
docker-compose -f docker-compose.simple.yml down
```

## 📊 验证部署

运行验证脚本检查所有服务状态：

```bash
./scripts/verify-deployment.sh
```

输出示例：
```
🔍 验证 KnowTon Platform 部署状态

Docker 服务:
检查 PostgreSQL (端口 5432)... ✓
检查 MongoDB (端口 27017)... ✓
检查 Redis (端口 6379)... ✓

应用服务:
检查 后端 API... ✓
检查 前端应用... ✓
检查 Hardhat 节点... ✓

智能合约:
✓ 合约已部署
```

## 🌐 访问服务

部署完成后，可以访问以下服务：

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端应用 | http://localhost:5173 | React DApp |
| 后端 API | http://localhost:3000 | REST API |
| API 文档 | http://localhost:3000/api-docs | Swagger UI |
| Grafana | http://localhost:3001 | 监控面板 (admin/admin) |
| Prometheus | http://localhost:9090 | 指标收集 |
| Hardhat 节点 | http://localhost:8545 | 本地区块链 RPC |

## 🔍 查看合约地址

部署完成后，合约地址保存在 `deployed-contracts.json`：

```bash
cat deployed-contracts.json
```

输出示例：
```json
{
  "network": "localhost",
  "chainId": 31337,
  "contracts": {
    "CopyrightRegistry": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "GovernanceToken": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "IPBond": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    "MockERC20": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    "FractionalToken": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"
  }
}
```

## 🛠️ 常用命令

### 查看日志

```bash
# 查看所有服务日志
docker-compose -f docker-compose.simple.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.simple.yml logs -f backend

# 查看 Hardhat 节点日志
tail -f hardhat-node.log

# 查看后端日志
tail -f backend.log

# 查看前端日志
tail -f frontend.log
```

### 重启服务

```bash
# 重启所有 Docker 服务
docker-compose -f docker-compose.simple.yml restart

# 重启特定服务
docker-compose -f docker-compose.simple.yml restart backend

# 重启前端（如果使用 quick-deploy）
kill $(cat frontend.pid)
cd packages/frontend && npm run dev &
```

### 停止服务

```bash
# 使用停止脚本（推荐）
./scripts/stop-services.sh

# 或手动停止 Docker
docker-compose -f docker-compose.simple.yml down

# 停止并删除数据卷
docker-compose -f docker-compose.simple.yml down -v
```

### 清理环境

```bash
# 停止所有服务
./scripts/stop-services.sh

# 清理 Docker 资源
docker-compose -f docker-compose.simple.yml down -v
docker system prune -f

# 清理 node_modules
npm run clean

# 清理日志文件
rm -f *.log *.pid
```

## 🧪 测试部署

### 1. 测试后端 API

```bash
# 健康检查
curl http://localhost:3000/health

# 获取 NFT 列表
curl http://localhost:3000/api/nfts
```

### 2. 测试智能合约

```bash
cd packages/contracts

# 运行测试
npm test

# 运行特定测试
npx hardhat test test/CopyrightRegistry.test.ts
```

### 3. 测试前端

访问 http://localhost:5173 并：
1. 连接 MetaMask 钱包
2. 切换到本地网络（Chain ID: 31337）
3. 导入测试账户（使用 Hardhat 默认私钥）
4. 测试 NFT 铸造功能

### 4. 运行 E2E 测试

```bash
# 运行所有 E2E 测试
npm run test:e2e

# 运行特定测试
npm run test:e2e -- nft-minting.spec.ts

# 以 UI 模式运行
npm run test:e2e:ui
```

## 🐛 故障排除

### 问题 1: 端口已被占用

```bash
# 查找占用端口的进程
lsof -i :5173  # 前端
lsof -i :3000  # 后端
lsof -i :8545  # Hardhat

# 杀死进程
kill -9 <PID>
```

### 问题 2: Docker 容器无法启动

```bash
# 查看容器日志
docker-compose -f docker-compose.simple.yml logs postgres

# 重新创建容器
docker-compose -f docker-compose.simple.yml up -d --force-recreate postgres
```

### 问题 3: 合约部署失败

```bash
# 检查 Hardhat 配置
cd packages/contracts
cat hardhat.config.ts

# 清理缓存并重新编译
npx hardhat clean
npx hardhat compile

# 重新部署
npm run deploy:local
```

### 问题 4: 前端无法连接后端

```bash
# 检查后端是否运行
curl http://localhost:3000/health

# 检查 CORS 配置
grep CORS_ORIGIN .env

# 重启后端
docker-compose -f docker-compose.simple.yml restart backend
```

### 问题 5: MetaMask 连接问题

1. 确保 MetaMask 连接到正确的网络
2. 重置 MetaMask 账户（设置 -> 高级 -> 重置账户）
3. 清除浏览器缓存
4. 重新导入账户

## 📚 更多资源

### 文档

- [README.md](./README.md) - 项目概述
- [CONTRIBUTING.md](./CONTRIBUTING.md) - 贡献指南
- [packages/contracts/DEPLOYMENT.md](./packages/contracts/DEPLOYMENT.md) - 合约部署详细说明

### 脚本

- `scripts/full-deployment.sh` - 完整部署脚本
- `scripts/quick-deploy.sh` - 快速部署脚本
- `scripts/stop-services.sh` - 停止所有服务
- `scripts/verify-deployment.sh` - 验证部署状态

### 配置文件

- `.env` - 环境变量
- `docker-compose.simple.yml` - Docker Compose 配置
- `packages/contracts/hardhat.config.ts` - Hardhat 配置

## 🎯 下一步

部署完成后，你可以：

1. **开发新功能**
   - 修改智能合约
   - 添加新的 API 端点
   - 改进前端 UI

2. **运行测试**
   - 单元测试: `npm test`
   - 集成测试: `npm run test:integration`
   - E2E 测试: `npm run test:e2e`

3. **部署到测试网**
   - 获取测试网 ETH
   - 配置私钥和 API 密钥
   - 运行 `./scripts/full-deployment.sh`

4. **监控和优化**
   - 查看 Grafana 面板
   - 分析性能指标
   - 优化数据库查询

## 💡 提示

- 首次部署建议使用本地网络进行测试
- 定期备份 `.env` 文件（不要提交到 Git）
- 使用 `./scripts/verify-deployment.sh` 检查服务状态
- 查看日志文件排查问题
- 加入我们的社区获取帮助

## 🤝 获取帮助

如果遇到问题：

1. 查看本文档的故障排除部分
2. 检查日志文件
3. 运行验证脚本
4. 查看 GitHub Issues
5. 联系开发团队

---

**祝你部署顺利！** 🎉
