# Vercel 部署指南

## 部署步骤

### 1. 准备工作

确保你已经：
- 安装了 Vercel CLI: `npm i -g vercel`
- 有 Vercel 账户
- 项目已推送到 Git 仓库（GitHub/GitLab/Bitbucket）

### 2. 环境变量配置

在 Vercel 项目设置中添加环境变量：

1. 进入 Vercel Dashboard > 选择项目 > Settings > Environment Variables
2. 参考 `vercel-env-template.txt` 文件中的配置
3. 至少需要配置以下必需变量：

#### 必需的环境变量：
- `VITE_API_BASE_URL`: 后端 API 地址
- `VITE_CHAIN_ID`: 区块链网络 ID (42161 为 Arbitrum 主网)
- `VITE_RPC_URL`: RPC 节点地址
- `VITE_WALLETCONNECT_PROJECT_ID`: WalletConnect 项目 ID

#### 获取 WalletConnect Project ID：
1. 访问 [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. 创建新项目
3. 复制 Project ID

#### 可选的环境变量：
- 智能合约地址（部署合约后配置）
- IPFS/Pinata 配置
- 功能开关

### 3. 部署方法

#### 方法一：使用部署脚本（推荐）
```bash
# 部署到预览环境
./scripts/deploy-vercel.sh

# 部署到生产环境
./scripts/deploy-vercel.sh --prod
```

#### 方法二：通过 Vercel Dashboard
1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "New Project"
3. 导入你的 Git 仓库
4. Vercel 会自动检测到 `vercel.json` 配置
5. 添加环境变量
6. 点击 "Deploy"

#### 方法三：通过 CLI
```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录 Vercel
vercel login

# 在项目根目录运行
vercel

# 或者直接部署到生产环境
vercel --prod
```

### 4. 自定义域名（可选）

1. 在 Vercel Dashboard 中进入项目设置
2. 点击 "Domains" 标签
3. 添加你的自定义域名
4. 按照提示配置 DNS 记录

### 5. 部署配置说明

项目使用以下配置文件：

- `vercel.json`: Vercel 部署配置
- `.vercelignore`: 忽略不需要部署的文件
- `packages/frontend/.env.production`: 生产环境变量模板

### 6. 构建过程

Vercel 将执行以下步骤：
1. 运行 `npm install` 安装依赖
2. 运行 `npm run build:frontend` 构建前端应用
3. 部署 `packages/frontend/dist` 目录中的静态文件

### 7. 故障排除

#### 构建失败
- 检查 Node.js 版本是否兼容（需要 >= 18.0.0）
- 确保所有依赖都已正确安装
- 检查环境变量是否正确设置

#### 运行时错误
- 检查浏览器控制台的错误信息
- 确保 API 端点可访问
- 验证智能合约地址是否正确

#### 网络问题
- 确保 RPC URL 可访问
- 检查 CORS 设置
- 验证 WalletConnect Project ID

### 8. 监控和日志

- 在 Vercel Dashboard 中查看部署日志
- 使用 Vercel Analytics 监控性能
- 设置错误监控（如 Sentry）

### 9. 自动部署

配置完成后，每次推送到主分支都会自动触发部署。

### 10. 回滚

如果需要回滚到之前的版本：
1. 在 Vercel Dashboard 中进入项目
2. 点击 "Deployments" 标签
3. 找到要回滚的版本
4. 点击 "Promote to Production"