# KnowTon - Web3 Intellectual Property Platform

[English](#english) | [中文](#chinese)

---

<a name="english"></a>

## 🌟 Overview

KnowTon is a comprehensive Web3 platform for intellectual property management, combining blockchain technology, DeFi, and AI to revolutionize how creators protect, monetize, and trade their digital assets.

### Key Features

- **🎨 IP-NFT Registration** - Mint intellectual property as NFTs with built-in copyright protection
- **💰 Automated Royalty Distribution** - Smart contract-based royalty payments to multiple beneficiaries
- **🔄 NFT Fractionalization** - Split NFT ownership into tradeable fractions
- **📈 AMM Trading** - Decentralized marketplace with automated market making
- **🏦 DeFi Integration** - Collateralize IP-NFTs for lending and borrowing
- **🎯 IP Bonds** - Structured finance products with senior/mezzanine/junior tranches
- **🗳️ DAO Governance** - Community-driven platform governance with quadratic voting
- **💎 Staking Rewards** - Earn rewards by staking platform tokens
- **📊 Real-time Analytics** - Comprehensive analytics and insights dashboard

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                   │
│              Responsive UI with i18n Support                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway / Ingress                      │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌────────┐     ┌────────┐     ┌────────┐
    │Creator │     │  NFT   │     │Royalty │
    │Service │     │Service │     │Service │
    └────────┘     └────────┘     └────────┘
         │               │               │
         └───────────────┼───────────────┘
                         ▼
         ┌───────────────────────────────┐
         │   Data Layer                  │
         │  - PostgreSQL                 │
         │  - Redis                      │
         │  - MongoDB                    │
         │  - ClickHouse                 │
         │  - Kafka                      │
         │  - Elasticsearch              │
         └───────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │   Blockchain Layer            │
         │  - Arbitrum                   │
         │  - Smart Contracts            │
         │  - The Graph                  │
         └───────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/mbdtf202-cyber/KnowTon.git
cd KnowTon

# Install dependencies
npm install

# Start infrastructure services
docker-compose up -d

# Run database migrations
npm run db:migrate --workspace=packages/backend

# Start development servers
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs

## 📦 Project Structure

```
KnowTon/
├── packages/
│   ├── contracts/          # Smart contracts (Solidity)
│   ├── backend/            # Backend services (Node.js + TypeScript)
│   ├── frontend/           # Frontend app (React + Vite)
│   └── sdk/                # TypeScript SDK
├── k8s/                    # Kubernetes configurations
├── scripts/                # Deployment and utility scripts
├── subgraph/               # The Graph subgraph
└── docs/                   # Documentation
```

## 🔧 Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for fast builds
- TailwindCSS for styling
- ethers.js for Web3 integration
- i18n for internationalization

### Backend
- Node.js with Express
- TypeScript
- Prisma ORM
- Kafka for event streaming
- Redis for caching
- Bull for job queues

### Smart Contracts
- Solidity 0.8.20
- Hardhat development environment
- OpenZeppelin contracts
- Comprehensive test coverage

### Infrastructure
- Docker & Kubernetes
- PostgreSQL, MongoDB, Redis
- ClickHouse for analytics
- Elasticsearch for search
- Kafka for messaging
- The Graph for blockchain indexing

## 🧪 Testing

```bash
# Run all tests
npm test

# Run smart contract tests
npm run test --workspace=packages/contracts

# Run backend tests
npm run test --workspace=packages/backend

# Run frontend tests
npm run test --workspace=packages/frontend
```

## 📚 Documentation

- [Quick Start Guide](./QUICK_START.md)
- [Deployment Guide](./DEPLOYMENT_READY.md)
- [API Documentation](./docs/API.md)
- [Smart Contract Documentation](./docs/CONTRACTS.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🔗 Links

- [Website](https://knowton.io)
- [Documentation](https://docs.knowton.io)
- [Discord](https://discord.gg/knowton)
- [Twitter](https://twitter.com/knowton_io)

---

<a name="chinese"></a>

## 🌟 项目概述

KnowTon 是一个综合性的 Web3 知识产权管理平台，结合区块链技术、DeFi 和 AI，革新创作者保护、变现和交易数字资产的方式。

### 核心功能

- **🎨 IP-NFT 注册** - 将知识产权铸造为 NFT，内置版权保护
- **💰 自动化版税分配** - 基于智能合约的版税支付给多个受益人
- **🔄 NFT 碎片化** - 将 NFT 所有权分割为可交易的份额
- **� 队AMM 交易** - 去中心化市场与自动做市
- **🏦 DeFi 集成** - 使用 IP-NFT 作为抵押品进行借贷
- **🎯 IP 债券** - 结构化金融产品，支持高级/中级/初级分级
- **🗳️ DAO 治理** - 社区驱动的平台治理，支持二次方投票
- **💎 质押奖励** - 通过质押平台代币赚取奖励
- **📊 实时分析** - 综合分析和洞察仪表板

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    前端 (React + Vite)                       │
│              响应式 UI，支持国际化                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   API 网关 / Ingress                         │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌────────┐     ┌────────┐     ┌────────┐
    │创作者  │     │  NFT   │     │版税    │
    │服务    │     │服务    │     │服务    │
    └────────┘     └────────┘     └────────┘
         │               │               │
         └───────────────┼───────────────┘
                         ▼
         ┌───────────────────────────────┐
         │   数据层                      │
         │  - PostgreSQL                 │
         │  - Redis                      │
         │  - MongoDB                    │
         │  - ClickHouse                 │
         │  - Kafka                      │
         │  - Elasticsearch              │
         └───────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │   区块链层                    │
         │  - Arbitrum                   │
         │  - 智能合约                   │
         │  - The Graph                  │
         └───────────────────────────────┘
```

## 🚀 快速开始

### 环境要求

- Node.js 20+
- Docker & Docker Compose
- Git

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/mbdtf202-cyber/KnowTon.git
cd KnowTon

# 安装依赖
npm install

# 启动基础设施服务
docker-compose up -d

# 运行数据库迁移
npm run db:migrate --workspace=packages/backend

# 启动开发服务器
npm run dev
```

### 访问应用

- **前端**: http://localhost:5173
- **后端 API**: http://localhost:3000
- **API 文档**: http://localhost:3000/api-docs

## 📦 项目结构

```
KnowTon/
├── packages/
│   ├── contracts/          # 智能合约 (Solidity)
│   ├── backend/            # 后端服务 (Node.js + TypeScript)
│   ├── frontend/           # 前端应用 (React + Vite)
│   └── sdk/                # TypeScript SDK
├── k8s/                    # Kubernetes 配置
├── scripts/                # 部署和工具脚本
├── subgraph/               # The Graph 子图
└── docs/                   # 文档
```

## 🔧 技术栈

### 前端
- React 18 + TypeScript
- Vite 构建工具
- TailwindCSS 样式
- ethers.js Web3 集成
- i18n 国际化

### 后端
- Node.js + Express
- TypeScript
- Prisma ORM
- Kafka 事件流
- Redis 缓存
- Bull 任务队列

### 智能合约
- Solidity 0.8.20
- Hardhat 开发环境
- OpenZeppelin 合约库
- 完整测试覆盖

### 基础设施
- Docker & Kubernetes
- PostgreSQL, MongoDB, Redis
- ClickHouse 分析数据库
- Elasticsearch 搜索引擎
- Kafka 消息队列
- The Graph 区块链索引

## 🧪 测试

```bash
# 运行所有测试
npm test

# 运行智能合约测试
npm run test --workspace=packages/contracts

# 运行后端测试
npm run test --workspace=packages/backend

# 运行前端测试
npm run test --workspace=packages/frontend
```

## 📚 文档

- [快速开始指南](./QUICK_START.md)
- [部署指南](./DEPLOYMENT_READY.md)
- [API 文档](./docs/API.md)
- [智能合约文档](./docs/CONTRACTS.md)
- [贡献指南](./CONTRIBUTING.md)

## 🤝 贡献

我们欢迎贡献！请查看我们的[贡献指南](./CONTRIBUTING.md)了解详情。

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](./LICENSE) 文件了解详情。

## 🔗 链接

- [官网](https://knowton.io)
- [文档](https://docs.knowton.io)
- [Discord](https://discord.gg/knowton)
- [Twitter](https://twitter.com/knowton_io)

---

## 🎯 实现状态

### ✅ 已完成
- 所有智能合约及测试
- 11 个后端微服务
- 完整的前端应用
- 数据层配置
- K8s 部署配置
- CI/CD 流水线

### 🚧 进行中
- AI/ML 模型集成
- 监控系统部署
- 测试网部署

### 📋 计划中
- 主网部署
- 移动应用
- 更多 DeFi 集成

## 💡 核心创新

1. **IP-NFT 标准** - 专为知识产权设计的 NFT 标准
2. **自动化版税** - 智能合约驱动的版税分配
3. **碎片化交易** - 降低 IP 投资门槛
4. **结构化金融** - IP 债券分级产品
5. **DAO 治理** - 社区驱动的平台发展

## 🌐 支持的网络

- Arbitrum (主网)
- Arbitrum Sepolia (测试网)
- 更多网络即将支持

## 📊 统计数据

- **智能合约**: 10+ 个核心合约
- **后端服务**: 11 个微服务
- **前端页面**: 15+ 个功能页面
- **测试覆盖**: 90%+
- **代码行数**: 50,000+

---

**Built with ❤️ by the KnowTon Team**
