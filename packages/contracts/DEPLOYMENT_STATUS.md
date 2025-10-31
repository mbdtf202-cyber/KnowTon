# 合约部署状态

## 本地测试网 (Hardhat)
✅ **已部署** - 2025-10-31

- MockERC20: `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`
- GovernanceToken: `0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6`
- CopyrightRegistry: `0x8A791620dd6260079BF849Dc5567aDC3F2FdC318`
- IPBond: `0x610178dA211FEF7D417bC0e6FeD39F05609AD788`
- FractionalToken: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`

## Arbitrum Sepolia 测试网
⏳ **待部署**

### 部署前准备清单

- [ ] 获取测试网 ETH
  - 访问: https://faucet.quicknode.com/arbitrum/sepolia
  - 或: https://www.alchemy.com/faucets/arbitrum-sepolia
  
- [ ] 配置环境变量
  ```bash
  cd packages/contracts
  # 编辑 .env 文件，填入以下信息：
  # PRIVATE_KEY=0x... (你的钱包私钥)
  # ARBISCAN_API_KEY=... (从 https://arbiscan.io/myapikey 获取)
  ```

- [ ] 执行部署
  ```bash
  npm run deploy:sepolia
  ```

### 部署后任务

- [ ] 验证合约已在 Arbiscan 上显示
- [ ] 记录合约地址到此文件
- [ ] 更新前端 .env 配置
- [ ] 初始化合约权限
- [ ] 测试合约功能

## 部署命令

```bash
# 本地部署（测试用）
npm run deploy:local

# Arbitrum Sepolia 测试网
npm run deploy:sepolia

# 配置合约
npm run configure:sepolia

# 验证合约
npm run verify:sepolia
```

## 注意事项

1. **私钥安全**: 永远不要提交包含真实私钥的 .env 文件
2. **Gas 费用**: 确保钱包有足够的 ETH 支付 gas
3. **网络确认**: 部署后等待几个区块确认再验证
4. **备份地址**: 部署后立即备份所有合约地址
