# Vercel 快速部署指南

## 🚀 5分钟快速部署

### 步骤 1: 准备环境

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录 Vercel
vercel login
```

### 步骤 2: 获取 WalletConnect Project ID

1. 访问 [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. 创建新项目
3. 复制 Project ID

### 步骤 3: 一键部署

```bash
# 使用部署脚本
./scripts/deploy-vercel.sh --prod
```

### 步骤 4: 配置环境变量

部署完成后，在 Vercel Dashboard 中添加环境变量：

```
VITE_API_BASE_URL=https://your-backend-api.com/api/v1
VITE_CHAIN_ID=42161
VITE_RPC_URL=https://arb1.arbitrum.io/rpc
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### 步骤 5: 重新部署

配置环境变量后，触发重新部署：

```bash
vercel --prod
```

## 🎉 完成！

你的 KnowTon 平台现在已经部署到 Vercel 上了！

## 📋 后续配置

1. **自定义域名**: 在 Vercel Dashboard > Domains 中添加
2. **后端 API**: 确保后端服务已部署并可访问
3. **智能合约**: 部署合约后更新合约地址
4. **IPFS 配置**: 配置 Pinata 或其他 IPFS 服务

## 🔧 故障排除

### 构建失败
- 检查 Node.js 版本 (需要 >= 18.0.0)
- 确保所有依赖已安装: `npm install`

### 运行时错误
- 检查环境变量是否正确配置
- 确保 API 端点可访问
- 验证 WalletConnect Project ID

### 需要帮助？
查看完整文档: `VERCEL_DEPLOYMENT.md`