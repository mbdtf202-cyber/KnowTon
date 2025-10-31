# KnowTon Platform - 快速部署指南

## 📋 前置要求

### 必需工具
- Node.js 20+
- Docker & Docker Compose
- Kubernetes (kubectl)
- Hardhat
- Python 3.10+
- Go 1.21+

### 必需账户
- Arbitrum Sepolia 测试网账户（带测试 ETH）
- Alchemy/Infura API Key
- Pinata IPFS API Key（可选）

---

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/knowton/platform.git
cd platform
```

### 2. 安装依赖

```bash
# 安装所有依赖
npm install

# 安装 Python 依赖（Oracle Adapter）
cd packages/oracle-adapter
pip install -r requirements.txt
cd ../..

# 安装 Go 依赖（Bonding Service）
cd packages/bonding-service
go mod download
cd ../..
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env
cp packages/contracts/.env.example packages/contracts/.env
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env
cp packages/oracle-adapter/.env.example packages/oracle-adapter/.env
cp packages/bonding-service/.env.example packages/bonding-service/.env
```

**编辑 `.env` 文件，填入必要的配置**:

```env
# Blockchain
ARBITRUM_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_private_key_here

# IPFS
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/knowton
MONGODB_URI=mongodb://localhost:27017/knowton
REDIS_URL=redis://localhost:6379

# Services
ORACLE_ADAPTER_URL=http://localhost:8000
BONDING_SERVICE_URL=localhost:50051
```

### 4. 启动本地开发环境

```bash
# 启动所有数据库和服务
docker-compose up -d

# 等待服务启动（约 30 秒）
sleep 30

# 检查服务状态
docker-compose ps
```

### 5. 部署智能合约

```bash
cd packages/contracts

# 编译合约
npx hardhat compile

# 部署到 Arbitrum Sepolia 测试网
npx hardhat run scripts/deploy.ts --network arbitrumSepolia

# 记录输出的合约地址！
```

**示例输出**:
```
CopyrightRegistry deployed to: 0x1234...
RoyaltyDistributor deployed to: 0x5678...
FractionalizationVault deployed to: 0x9abc...
...
```

### 6. 更新配置文件

**更新前端配置** (`packages/frontend/.env`):
```env
VITE_COPYRIGHT_REGISTRY_ADDRESS=0x1234...
VITE_ROYALTY_DISTRIBUTOR_ADDRESS=0x5678...
VITE_FRACTIONALIZATION_VAULT_ADDRESS=0x9abc...
# ... 其他合约地址
```

**更新后端配置** (`packages/backend/.env`):
```env
COPYRIGHT_REGISTRY_ADDRESS=0x1234...
ROYALTY_DISTRIBUTOR_ADDRESS=0x5678...
# ... 其他合约地址
```

### 7. 运行数据库迁移

```bash
# PostgreSQL 迁移
cd packages/backend
npx prisma migrate deploy
npx prisma generate

# ClickHouse 初始化
docker exec -it knowton-clickhouse clickhouse-client < scripts/init-clickhouse.sql

# MongoDB 初始化
docker exec -it knowton-mongodb mongosh < scripts/init-mongodb.js
```

### 8. 启动所有服务

```bash
# 启动后端服务
cd packages/backend
npm run dev &

# 启动前端
cd packages/frontend
npm run dev &

# 启动 Oracle Adapter
cd packages/oracle-adapter
uvicorn src.main:app --reload --port 8000 &

# 启动 Bonding Service
cd packages/bonding-service
make run &
```

### 9. 访问应用

- **前端 DApp**: http://localhost:5173
- **后端 API**: http://localhost:3000
- **Oracle Adapter**: http://localhost:8000
- **Bonding Service**: localhost:50051 (gRPC)

---

## 🧪 测试部署

### 1. 健康检查

```bash
# 检查后端
curl http://localhost:3000/health

# 检查 Oracle Adapter
curl http://localhost:8000/health

# 检查数据库连接
docker-compose exec postgres pg_isready
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
docker-compose exec redis redis-cli ping
```

### 2. 测试 NFT 铸造流程

1. 打开前端: http://localhost:5173
2. 连接 MetaMask 钱包（切换到 Arbitrum Sepolia）
3. 导航到 "Mint" 页面
4. 上传内容并填写元数据
5. 点击 "Mint NFT"
6. 确认交易

### 3. 测试 AI 服务

```bash
# 测试内容指纹生成
curl -X POST http://localhost:8000/api/v1/oracle/fingerprint \
  -H "Content-Type: application/json" \
  -d '{
    "content_url": "https://example.com/image.jpg",
    "content_type": "image",
    "metadata": {}
  }'

# 测试估值服务
curl -X POST http://localhost:8000/api/v1/oracle/valuation \
  -H "Content-Type: application/json" \
  -d '{
    "token_id": "1",
    "metadata": {
      "category": "music",
      "creator": "0x1234...",
      "views": 1000,
      "likes": 100
    }
  }'
```

---

## 🐳 Docker 部署

### 构建所有镜像

```bash
# 构建后端
docker build -t knowton/backend:latest packages/backend

# 构建前端
docker build -t knowton/frontend:latest packages/frontend

# 构建 Oracle Adapter
docker build -t knowton/oracle-adapter:latest packages/oracle-adapter

# 构建 Bonding Service
docker build -t knowton/bonding-service:latest packages/bonding-service
```

### 使用 Docker Compose 部署

```bash
# 启动所有服务
docker-compose -f docker-compose.yml up -d

# 查看日志
docker-compose logs -f

# 停止所有服务
docker-compose down
```

---

## ☸️ Kubernetes 部署

### 1. 准备 Kubernetes 集群

```bash
# 创建命名空间
kubectl create namespace knowton-prod

# 创建 Secrets
kubectl create secret generic knowton-secrets \
  --from-literal=database-url=$DATABASE_URL \
  --from-literal=private-key=$PRIVATE_KEY \
  --from-literal=pinata-api-key=$PINATA_API_KEY \
  -n knowton-prod
```

### 2. 部署数据库

```bash
# 部署 PostgreSQL
kubectl apply -f k8s/databases/postgres.yaml

# 部署 MongoDB
kubectl apply -f k8s/databases/mongodb.yaml

# 部署 Redis
kubectl apply -f k8s/databases/redis.yaml

# 部署 Kafka
kubectl apply -f k8s/databases/kafka.yaml

# 部署 ClickHouse
kubectl apply -f k8s/databases/clickhouse.yaml
```

### 3. 部署应用服务

```bash
# 部署后端服务
kubectl apply -f k8s/backend/

# 部署前端
kubectl apply -f k8s/frontend/

# 部署 Oracle Adapter
kubectl apply -f k8s/oracle-adapter/

# 部署 Bonding Service
kubectl apply -f k8s/bonding-service/

# 部署 API Gateway
kubectl apply -f k8s/gateway/
```

### 4. 部署监控

```bash
# 部署 Prometheus
kubectl apply -f k8s/monitoring/prometheus.yaml

# 部署 Grafana
kubectl apply -f k8s/monitoring/grafana.yaml
```

### 5. 验证部署

```bash
# 检查所有 Pods
kubectl get pods -n knowton-prod

# 检查服务
kubectl get svc -n knowton-prod

# 检查 Ingress
kubectl get ingress -n knowton-prod

# 查看日志
kubectl logs -f deployment/backend -n knowton-prod
```

---

## 📊 监控和日志

### Prometheus

访问: http://localhost:9090

**常用查询**:
```promql
# API 请求率
rate(http_requests_total[5m])

# 错误率
rate(http_requests_total{status=~"5.."}[5m])

# 响应时间
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Grafana

访问: http://localhost:3000  
默认账号: admin / admin

**导入仪表板**:
1. 导航到 Dashboards > Import
2. 上传 `k8s/monitoring/dashboards/*.json`

### 日志查询

```bash
# 查看后端日志
kubectl logs -f deployment/backend -n knowton-prod

# 查看 Oracle Adapter 日志
kubectl logs -f deployment/oracle-adapter -n knowton-prod

# 查看所有服务日志
kubectl logs -l app=knowton -n knowton-prod --tail=100
```

---

## 🔧 故障排查

### 常见问题

#### 1. 合约调用失败

**症状**: 交易 revert 或 gas 估算失败

**解决方案**:
```bash
# 检查钱包余额
cast balance $YOUR_ADDRESS --rpc-url $ARBITRUM_RPC_URL

# 检查合约是否部署
cast code $CONTRACT_ADDRESS --rpc-url $ARBITRUM_RPC_URL

# 检查 gas price
cast gas-price --rpc-url $ARBITRUM_RPC_URL
```

#### 2. 数据库连接失败

**症状**: 服务启动失败，数据库连接错误

**解决方案**:
```bash
# 检查数据库状态
docker-compose ps

# 重启数据库
docker-compose restart postgres mongodb redis

# 检查连接字符串
echo $DATABASE_URL
```

#### 3. IPFS 上传失败

**症状**: 内容上传超时或失败

**解决方案**:
```bash
# 检查 IPFS 节点
curl http://localhost:5001/api/v0/version

# 检查 Pinata API
curl -X GET https://api.pinata.cloud/data/testAuthentication \
  -H "pinata_api_key: $PINATA_API_KEY" \
  -H "pinata_secret_api_key: $PINATA_SECRET_KEY"
```

#### 4. AI 模型加载失败

**症状**: Oracle Adapter 启动慢或失败

**解决方案**:
```bash
# 检查 Python 依赖
pip list | grep torch

# 下载预训练模型
python -c "import torch; torch.hub.load('pytorch/vision:v0.10.0', 'resnet50', pretrained=True)"

# 检查 GPU 可用性（可选）
python -c "import torch; print(torch.cuda.is_available())"
```

---

## 🔐 安全最佳实践

### 1. 密钥管理

```bash
# 使用 HashiCorp Vault
vault kv put secret/knowton \
  private_key=$PRIVATE_KEY \
  database_password=$DB_PASSWORD

# 在 K8s 中使用 Vault
kubectl apply -f k8s/vault/
```

### 2. 网络安全

```bash
# 配置 Network Policies
kubectl apply -f k8s/security/network-policies.yaml

# 启用 Pod Security Standards
kubectl label namespace knowton-prod \
  pod-security.kubernetes.io/enforce=restricted
```

### 3. Rate Limiting

在 API Gateway 配置中启用:
```yaml
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: rate-limit
spec:
  rateLimit:
    average: 100
    burst: 50
```

---

## 📚 相关文档

- [智能合约文档](packages/contracts/README.md)
- [后端 API 文档](packages/backend/README.md)
- [前端开发指南](packages/frontend/README.md)
- [Oracle Adapter 文档](packages/oracle-adapter/README.md)
- [Bonding Service 文档](packages/bonding-service/README.md)

---

## 🆘 获取帮助

- **GitHub Issues**: https://github.com/knowton/platform/issues
- **Discord**: https://discord.gg/knowton
- **文档**: https://docs.knowton.io

---

*最后更新: 2025-10-31*
