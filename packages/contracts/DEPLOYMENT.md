# 合约部署指南

## 部署到 Arbitrum Sepolia

### 1. 准备工作

```bash
cd packages/contracts

# 检查部署准备状态
npm run check:deploy

# 测试部署流程（不需要私钥）
npm run test:deploy
```

### 2. 获取测试网 ETH

访问以下任一水龙头：
- https://faucet.quicknode.com/arbitrum/sepolia
- https://www.alchemy.com/faucets/arbitrum-sepolia

### 3. 配置环境变量

编辑 `packages/contracts/.env`：

```bash
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
PRIVATE_KEY=0x你的私钥
ARBISCAN_API_KEY=你的API密钥
```

获取 Arbiscan API Key: https://arbiscan.io/myapikey

### 4. 执行部署

```bash
npm run deploy:sepolia
```

这个命令会：
1. 编译合约
2. 部署所有合约到 Arbitrum Sepolia
3. 配置合约权限
4. 验证合约代码（如果提供了 API Key）
5. 导出 ABI 和合约地址

## 部署的合约

- **CopyrightRegistrySimple** - IP-NFT 注册合约
- **GovernanceTokenSimple** - 治理代币
- **IPBondBasic** - IP 债券合约
- **MockERC20** - 测试用 ERC20 代币
- **FractionalToken** - 碎片化代币模板

## 部署结果

### 合约地址

保存在 `deployments/arbitrumSepolia-latest.json`

### ABI 文件

保存在 `deployments/abis/*.json`

### 更新前端配置

复制合约地址到前端 `.env`：

```bash
VITE_IP_NFT_ADDRESS=0x...
VITE_GOVERNANCE_TOKEN_ADDRESS=0x...
VITE_IP_BOND_ADDRESS=0x...
VITE_MOCK_TOKEN_ADDRESS=0x...
VITE_FRACTIONAL_TOKEN_ADDRESS=0x...
VITE_CHAIN_ID=421614
```

## 其他命令

```bash
# 仅配置合约
npm run configure:sepolia

# 仅验证合约
npm run verify:sepolia

# 本地部署（测试）
npm run deploy:local
```

## 网络信息

- **Network**: Arbitrum Sepolia
- **Chain ID**: 421614
- **RPC**: https://sepolia-rollup.arbitrum.io/rpc
- **Explorer**: https://sepolia.arbiscan.io

## 故障排除

### 余额不足
确保钱包有足够的 ETH 支付 gas 费用

### RPC 连接失败
尝试使用 Alchemy 或 Infura 的 RPC URL

### 验证失败
等待 30-60 秒后重试，或手动在 Arbiscan 上验证
