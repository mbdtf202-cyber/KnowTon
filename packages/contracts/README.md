# @knowton/contracts

KnowTon 平台智能合约包

## 合约列表

- **CopyrightRegistry**: IP-NFT 铸造和管理
- **RoyaltyDistributor**: 版税自动分配
- **FractionalizationVault**: NFT 碎片化
- **IPBond**: 分级债券系统
- **DAOGovernance**: DAO 治理
- **StakingRewards**: 质押奖励
- **MarketplaceAMM**: 市场和 AMM

## 开发

```bash
# 安装依赖
npm install

# 编译合约
npm run build

# 运行测试
npm test

# 部署到测试网
npm run deploy:testnet

# 验证合约
npm run verify
```

## 测试网部署

合约已部署到 Arbitrum Goerli 测试网。

## 安全审计

- [ ] Slither 静态分析
- [ ] Mythril 符号执行
- [ ] Echidna 模糊测试
- [ ] 第三方审计
