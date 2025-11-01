# 🚀 KnowTon - 快速部署参考

## 一键部署

```bash
./deploy.sh
```

## 快速命令

| 命令 | 说明 |
|------|------|
| `./deploy.sh` | 交互式部署菜单 |
| `./scripts/quick-deploy.sh` | 快速启动开发环境 |
| `./scripts/full-deployment.sh` | 完整部署所有服务 |
| `./scripts/verify-deployment.sh` | 验证部署状态 |
| `./scripts/stop-services.sh` | 停止所有服务 |

## 服务地址

| 服务 | 地址 | 凭据 |
|------|------|------|
| 前端 | http://localhost:5173 | - |
| 后端 API | http://localhost:3000 | - |
| API 文档 | http://localhost:3000/api-docs | - |
| Grafana | http://localhost:3001 | admin/admin |
| Prometheus | http://localhost:9090 | - |
| 区块链 RPC | http://localhost:8545 | - |

## 常用操作

### 查看日志
```bash
# 所有服务
docker-compose -f docker-compose.simple.yml logs -f

# 特定服务
docker-compose -f docker-compose.simple.yml logs -f backend

# Hardhat 节点
tail -f hardhat-node.log
```

### 重启服务
```bash
# 重启所有
docker-compose -f docker-compose.simple.yml restart

# 重启特定服务
docker-compose -f docker-compose.simple.yml restart backend
```

### 查看合约地址
```bash
cat deployed-contracts.json
```

## 测试网部署

### 1. 获取测试网 ETH
访问: https://faucet.quicknode.com/arbitrum/sepolia

### 2. 配置私钥
```bash
echo "PRIVATE_KEY=0x你的私钥" >> .env
```

### 3. 部署
```bash
./deploy.sh
# 选择选项 3
```

## 故障排除

### 端口被占用
```bash
# 查找进程
lsof -i :5173
lsof -i :3000
lsof -i :8545

# 杀死进程
kill -9 <PID>
```

### 清理环境
```bash
./scripts/stop-services.sh
docker-compose -f docker-compose.simple.yml down -v
docker system prune -f
```

### 重新部署
```bash
./scripts/stop-services.sh
./scripts/full-deployment.sh
```

## 测试

```bash
# 单元测试
npm test

# 集成测试
npm run test:integration

# E2E 测试
npm run test:e2e

# 负载测试
npm run test:load
```

## 开发

```bash
# 启动前端开发服务器
cd packages/frontend && npm run dev

# 启动后端开发服务器
cd packages/backend && npm run dev

# 编译合约
cd packages/contracts && npm run compile

# 运行合约测试
cd packages/contracts && npm test
```

## 需要帮助？

- 📚 [完整部署指南](./DEPLOYMENT_GUIDE.md)
- 📖 [项目文档](./README.md)
- 🐛 [问题追踪](https://github.com/mbdtf202-cyber/KnowTon/issues)
- 💬 [Discord 社区](https://discord.gg/knowton)

---

**快速开始**: `./deploy.sh` → 选择选项 1 → 等待 3-5 分钟 → 访问 http://localhost:5173 🎉
