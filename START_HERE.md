# 🚀 从这里开始 - KnowTon Platform

## 👋 欢迎！

恭喜你获得了 KnowTon Platform 的完整代码！这是一个功能完整的 Web3 知识产权平台。

---

## ⚡ 3 步快速开始

### 1️⃣ 运行部署脚本

```bash
./deploy.sh
```

### 2️⃣ 选择部署选项

- 选择 **1** - 快速部署（推荐首次使用）
- 等待 3-5 分钟

### 3️⃣ 访问应用

打开浏览器访问: **http://localhost:5173**

---

## 🎯 就这么简单！

部署脚本会自动：
- ✅ 检查环境
- ✅ 安装依赖
- ✅ 启动数据库
- ✅ 部署智能合约
- ✅ 启动前端和后端
- ✅ 验证部署

---

## 📚 需要更多帮助？

### 快速参考
```bash
cat QUICK_DEPLOY.md
```

### 完整指南
```bash
cat DEPLOYMENT_GUIDE.md
```

### 查看所有命令
```bash
make help
```

---

## 🔍 验证部署

```bash
./scripts/verify-deployment.sh
```

---

## 🛑 停止服务

```bash
./scripts/stop-services.sh
```

或

```bash
make stop
```

---

## 🌐 访问地址

部署完成后：

- 🎨 **前端**: http://localhost:5173
- 🔧 **后端**: http://localhost:3000
- 📖 **API 文档**: http://localhost:3000/api-docs
- 📊 **监控**: http://localhost:3001 (admin/admin)

---

## 💡 提示

### 首次使用
1. 使用快速部署（选项 1）
2. 不需要配置任何东西
3. 使用本地区块链（无需真实 ETH）

### 测试网部署
1. 获取测试网 ETH: https://faucet.quicknode.com/arbitrum/sepolia
2. 配置私钥: `echo "PRIVATE_KEY=0x你的私钥" >> .env`
3. 运行: `./deploy.sh` 选择选项 3

---

## 🆘 遇到问题？

### 查看日志
```bash
make docker-logs
```

### 重新部署
```bash
make stop
make quick-deploy
```

### 查看故障排除
```bash
cat DEPLOYMENT_GUIDE.md
# 跳转到 "故障排除" 部分
```

---

## 📖 文档导航

| 文档 | 用途 |
|------|------|
| **START_HERE.md** | 👈 你在这里 |
| **DEPLOYMENT_READY.md** | 快速开始指南 |
| **QUICK_DEPLOY.md** | 快速参考卡片 |
| **DEPLOYMENT_GUIDE.md** | 完整部署指南 |
| **DEPLOYMENT_CHECKLIST.md** | 部署检查清单 |
| **README.md** | 项目概述 |

---

## 🎉 准备好了吗？

### 立即开始：

```bash
./deploy.sh
```

### 或使用 Make：

```bash
make deploy
```

---

## 🤝 获取支持

- 📖 文档: 查看上面的文档列表
- 🐛 问题: https://github.com/mbdtf202-cyber/KnowTon/issues
- 💬 Discord: https://discord.gg/knowton
- 🐦 Twitter: https://twitter.com/knowton_io

---

**🎊 祝你使用愉快！**

**现在就开始**: `./deploy.sh` 🚀
