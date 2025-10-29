# KnowTon Platform - 快速开始指南

## 🚀 5 分钟快速启动

### 1. 验证设置

```bash
# 验证所有文件已创建
./scripts/verify-setup.sh
```

### 2. 安装依赖

```bash
# 安装所有包的依赖
npm install

# 设置 Git hooks
npm run prepare
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件（可选，开发环境使用默认值即可）
# vim .env
```

### 4. 启动开发环境

#### 选项 A: 使用 Docker Compose（推荐）

```bash
# 启动所有基础服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 选项 B: 使用 Kubernetes

```bash
# 自动设置 K8s 环境
./scripts/setup-k8s-dev.sh

# 或手动设置
minikube start --cpus=4 --memory=8192
kubectl apply -f k8s/dev/
```

### 5. 启动应用

```bash
# 启动所有包的开发服务器
npm run dev

# 或单独启动
cd packages/frontend && npm run dev
cd packages/backend && npm run dev
```

## 📍 访问地址

### 开发环境

- **Frontend DApp**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **MongoDB**: localhost:27017
- **Kafka**: localhost:29092
- **ClickHouse**: localhost:8123
- **Elasticsearch**: localhost:9200
- **Adminer**: http://localhost:8081
- **Redis Commander**: http://localhost:8082

## 🛠️ 常用命令

### 开发

```bash
npm run dev          # 启动所有包的开发服务器
npm run build        # 构建所有包
npm test             # 运行所有测试
npm run lint         # 代码检查
npm run format       # 格式化代码
npm run type-check   # TypeScript 类型检查
```

### Docker

```bash
docker-compose up -d              # 启动服务
docker-compose down               # 停止服务
docker-compose down -v            # 停止并删除数据卷
docker-compose logs -f [service]  # 查看日志
docker-compose restart [service]  # 重启服务
docker-compose ps                 # 查看状态
```

### Kubernetes

```bash
kubectl get all -n knowton-dev                    # 查看所有资源
kubectl get pods -n knowton-dev                   # 查看 Pods
kubectl logs -f <pod-name> -n knowton-dev         # 查看日志
kubectl describe pod <pod-name> -n knowton-dev    # Pod 详情
kubectl port-forward <pod-name> 3000:3000 -n knowton-dev  # 端口转发
kubectl exec -it <pod-name> -n knowton-dev -- sh  # 进入容器
```

### Git

```bash
git add .
git commit -m "feat: add new feature"  # 遵循 Conventional Commits
git push origin <branch-name>
```

## 📦 包结构

```
knowton-platform/
├── packages/
│   ├── contracts/      # 智能合约 (Solidity + Hardhat)
│   ├── backend/        # 后端微服务 (Node.js + TypeScript)
│   ├── frontend/       # 前端 DApp (React + Vite)
│   └── sdk/            # JavaScript SDK
├── k8s/                # Kubernetes 配置
├── scripts/            # 工具脚本
├── .github/            # GitHub Actions CI/CD
└── docker-compose.yml  # Docker 开发环境
```

## 🔧 故障排查

### 端口冲突

```bash
# 查看端口占用
lsof -i :5173  # Frontend
lsof -i :3000  # Backend
lsof -i :5432  # PostgreSQL

# 杀死进程
kill -9 <PID>
```

### Docker 问题

```bash
# 清理 Docker
docker-compose down -v
docker system prune -a

# 重新构建
docker-compose up -d --build
```

### 依赖问题

```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install

# 清理 Turbo 缓存
rm -rf .turbo
npm run clean
```

### Kubernetes 问题

```bash
# 重启 Minikube
minikube stop
minikube delete
minikube start --cpus=4 --memory=8192

# 重新部署
kubectl delete namespace knowton-dev
./scripts/setup-k8s-dev.sh
```

## 📚 下一步

1. **阅读文档**
   - [需求文档](.kiro/specs/knowton-platform/requirements.md)
   - [设计文档](.kiro/specs/knowton-platform/design.md)
   - [任务列表](.kiro/specs/knowton-platform/tasks.md)

2. **开始开发**
   - 查看 [SETUP_COMPLETE.md](SETUP_COMPLETE.md) 了解已完成的设置
   - 查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解贡献指南
   - 开始实施阶段 2 的智能合约开发任务

3. **加入社区**
   - Discord: https://discord.gg/knowton
   - Twitter: https://twitter.com/knowton_io

## 💡 提示

- 使用 `npm run dev` 启动所有服务的热重载开发模式
- 使用 `docker-compose` 管理数据库和中间件
- 使用 `kubectl` 管理 Kubernetes 部署
- 遵循 Conventional Commits 规范提交代码
- 提交前会自动运行 lint 和格式化

## 🆘 获取帮助

- 查看 [SETUP_COMPLETE.md](SETUP_COMPLETE.md) 完整设置文档
- 查看 [k8s/README.md](k8s/README.md) Kubernetes 文档
- 创建 GitHub Issue
- 联系团队: dev@knowton.io

---

**准备好了吗？开始构建 Web3 知识产权平台！🚀**
