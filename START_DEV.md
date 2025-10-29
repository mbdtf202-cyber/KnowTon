# KnowTon Platform - 开发环境快速启动

## 当前状态

✅ **已完成的核心功能：**
- 11个后端微服务实现
- 所有智能合约和测试
- 完整的前端应用
- 完整的数据层配置
- K8s 部署配置
- Docker 配置

## 快速启动（无需 Docker）

由于 Docker 未运行，可以直接启动前端查看 UI：

```bash
# 1. 启动前端（无需后端）
npm run dev --workspace=packages/frontend
```

前端将在 http://localhost:5173 运行

## 完整启动（需要 Docker）

如果要运行完整的平台（包括后端和数据库）：

```bash
# 1. 启动 Docker Desktop

# 2. 启动所有基础设施服务
docker-compose up -d

# 3. 等待服务就绪（约 30 秒）

# 4. 初始化数据库
npm run db:migrate --workspace=packages/backend

# 5. 启动后端
npm run dev --workspace=packages/backend

# 6. 启动前端
npm run dev --workspace=packages/frontend
```

## 测试智能合约

```bash
# 运行所有合约测试
npm run test --workspace=packages/contracts

# 运行特定测试
npm run test --workspace=packages/contracts -- --grep "CopyrightRegistry"
```

## 已实现的功能

### 智能合约
- CopyrightRegistry - IP-NFT 注册
- RoyaltyDistributor - 版税分配
- FractionalizationVault - NFT 碎片化
- MarketplaceAMM - AMM 交易
- StakingRewards - 质押奖励
- DAOGovernance - DAO 治理
- IPBond - IP 债券
- LendingAdapter - DeFi 借贷

### 后端服务
- Creator Service
- Content Service
- NFT Service
- Royalty Service
- Marketplace Service
- Fractionalization Service
- Staking Service
- Governance Service
- Bonding Service
- Lending Service
- Analytics Service

### 前端页面
- 首页
- 创作者注册
- 内容上传
- NFT 铸造
- 市场交易
- NFT 碎片化
- 质押
- 治理
- 分析

## 下一步

平台已经基本完成，可以：
1. 启动前端查看 UI
2. 运行智能合约测试
3. 部署到测试网
4. 添加 AI/ML 功能（可选）
5. 添加监控系统（可选）
