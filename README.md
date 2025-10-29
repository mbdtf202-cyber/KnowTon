# KnowTon Platform

> 基于 Web3 的去中心化知识产权 RWA 平台

KnowTon 是一个革命性的 Web3 知识产权平台，将传统知识产权资产（RWA）代币化上链，结合 DeFi 协议实现流动性交易，使用零知识证明保护隐私，并通过 AI 技术实现智能版权验证和内容推荐。

## 🌟 核心特性

- **RWA 代币化**: 将音乐、视频、课程等知识产权铸造为 NFT
- **DeFi 集成**: 碎片化交易、流动性挖矿、版税代币化
- **隐私保护**: 零知识证明验证所有权，匿名交易
- **AI 驱动**: 智能版权检测、内容推荐、价值评估
- **DAO 治理**: 社区驱动的平台决策和争议解决

## 📦 Monorepo 结构

```
knowton-platform/
├── packages/
│   ├── contracts/      # 智能合约 (Solidity + Hardhat)
│   ├── backend/        # 后端微服务 (Node.js + TypeScript)
│   ├── frontend/       # 前端 DApp (React + Vite)
│   └── sdk/            # JavaScript SDK
├── .github/            # GitHub Actions CI/CD
├── .husky/             # Git hooks
└── turbo.json          # Turborepo 配置
```

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker & Docker Compose
- Kubernetes (Minikube/Kind)

### 安装

```bash
# 克隆仓库
git clone https://github.com/knowton/knowton-platform.git
cd knowton-platform

# 安装依赖
npm install

# 设置 Git hooks
npm run prepare
```

### 开发

```bash
# 启动所有服务
npm run dev

# 构建所有包
npm run build

# 运行测试
npm run test

# 代码检查
npm run lint

# 格式化代码
npm run format
```

### 单独运行包

```bash
# 智能合约
cd packages/contracts
npm run build
npm test

# 后端服务
cd packages/backend
npm run dev

# 前端 DApp
cd packages/frontend
npm run dev

# SDK
cd packages/sdk
npm run build
```

## 🏗️ 技术栈

### 区块链层
- **Layer 2**: Arbitrum One / zkSync Era
- **智能合约**: Solidity 0.8.20, OpenZeppelin
- **开发框架**: Hardhat, Ethers.js
- **标准**: ERC-721, ERC-1155, ERC-20, ERC-2981

### 后端层
- **语言**: Node.js, TypeScript, Go, Python
- **框架**: Express.js, Gin, FastAPI
- **数据库**: PostgreSQL, MongoDB, ClickHouse, Redis
- **消息队列**: Apache Kafka
- **索引**: The Graph

### 前端层
- **框架**: React 18, TypeScript
- **构建工具**: Vite
- **样式**: TailwindCSS
- **Web3**: Wagmi, RainbowKit, Ethers.js
- **状态管理**: Zustand

### AI 层
- **模型服务**: TorchServe, TensorFlow Serving
- **向量数据库**: Pinecone, Weaviate
- **模型**: ResNet, BERT, GPT, GNN

### 基础设施
- **容器**: Docker, Kubernetes
- **CI/CD**: GitHub Actions, ArgoCD
- **监控**: Prometheus, Grafana, ELK Stack
- **安全**: HashiCorp Vault, Falco

## 📚 文档

- [需求文档](.kiro/specs/knowton-platform/requirements.md)
- [设计文档](.kiro/specs/knowton-platform/design.md)
- [任务列表](.kiro/specs/knowton-platform/tasks.md)
- [架构图](.kiro/specs/knowton-platform/architecture-diagram.md)

## 🧪 测试

```bash
# 运行所有测试
npm test

# 智能合约测试
cd packages/contracts && npm test

# 后端测试
cd packages/backend && npm test

# 前端测试
cd packages/frontend && npm test
```

## 🚢 部署

### 测试网部署

```bash
# 部署智能合约到 Arbitrum Goerli
cd packages/contracts
npm run deploy:testnet

# 部署后端服务到 Kubernetes
kubectl apply -f k8s/dev/
```

### 生产环境部署

```bash
# 使用 ArgoCD GitOps 部署
argocd app sync knowton-platform
```

## 🤝 贡献

我们欢迎所有形式的贡献！请阅读 [贡献指南](CONTRIBUTING.md) 了解详情。

### 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```bash
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
perf: 性能优化
test: 添加测试
chore: 构建/工具变动
```

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🔗 链接

- [官网](https://knowton.io)
- [文档](https://docs.knowton.io)
- [Discord](https://discord.gg/knowton)
- [Twitter](https://twitter.com/knowton_io)

## 👥 团队

KnowTon 由一支充满激情的 Web3 团队打造。

---

**Built with ❤️ by KnowTon Team**
