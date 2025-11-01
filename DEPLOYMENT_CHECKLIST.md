# 🚀 KnowTon Platform - 部署检查清单

## 📋 部署前检查

### 环境准备
- [ ] Node.js >= 18.0.0 已安装
- [ ] npm >= 9.0.0 已安装
- [ ] Docker >= 20.10.0 已安装
- [ ] Docker Compose >= 2.0.0 已安装
- [ ] Git 已安装（可选）

### 配置文件
- [ ] `.env` 文件已创建（从 `.env.example` 复制）
- [ ] 数据库密码已配置
- [ ] Redis 密码已配置
- [ ] JWT 密钥已更新
- [ ] CORS 源已配置

### 测试网部署额外要求
- [ ] 钱包私钥已配置（`PRIVATE_KEY`）
- [ ] 测试网 ETH 已获取
- [ ] Arbiscan API Key 已配置（可选）
- [ ] RPC URL 已配置

### 端口检查
- [ ] 端口 5173 未被占用（前端）
- [ ] 端口 3000 未被占用（后端）
- [ ] 端口 8545 未被占用（区块链）
- [ ] 端口 5432 未被占用（PostgreSQL）
- [ ] 端口 27017 未被占用（MongoDB）
- [ ] 端口 6379 未被占用（Redis）

## 🚀 部署步骤

### 1. 克隆仓库
```bash
git clone https://github.com/mbdtf202-cyber/KnowTon.git
cd KnowTon
```
- [ ] 仓库已克隆
- [ ] 进入项目目录

### 2. 配置环境
```bash
cp .env.example .env
# 编辑 .env 文件
```
- [ ] 环境文件已创建
- [ ] 必要配置已填写

### 3. 运行部署
```bash
./deploy.sh
# 或
make deploy
```
- [ ] 部署脚本已执行
- [ ] 选择了部署选项
- [ ] 部署过程无错误

### 4. 验证部署
```bash
./scripts/verify-deployment.sh
# 或
make verify
```
- [ ] 所有服务状态正常
- [ ] 合约已成功部署
- [ ] 数据库连接正常

## ✅ 部署后验证

### 服务可访问性
- [ ] 前端可访问: http://localhost:5173
- [ ] 后端可访问: http://localhost:3000
- [ ] API 文档可访问: http://localhost:3000/api-docs
- [ ] Grafana 可访问: http://localhost:3001
- [ ] Prometheus 可访问: http://localhost:9090

### 功能测试
- [ ] 前端页面正常加载
- [ ] 可以连接 MetaMask 钱包
- [ ] API 健康检查通过
- [ ] 数据库查询正常
- [ ] 合约交互正常

### 智能合约
- [ ] 合约地址已生成
- [ ] `deployed-contracts.json` 文件存在
- [ ] 合约 ABI 已导出
- [ ] 合约可以调用

### 数据库
- [ ] PostgreSQL 运行正常
- [ ] MongoDB 运行正常
- [ ] Redis 运行正常
- [ ] 数据库连接池正常

### 监控
- [ ] Prometheus 收集指标
- [ ] Grafana 面板显示数据
- [ ] 日志正常输出

## 🧪 测试清单

### 单元测试
```bash
npm test
```
- [ ] 所有单元测试通过

### 合约测试
```bash
cd packages/contracts && npm test
```
- [ ] 所有合约测试通过

### E2E 测试
```bash
npm run test:e2e
```
- [ ] E2E 测试通过

### 集成测试
```bash
npm run test:integration
```
- [ ] 集成测试通过

## 📊 性能检查

### 响应时间
- [ ] 前端首次加载 < 3 秒
- [ ] API 响应时间 < 500ms
- [ ] 数据库查询 < 100ms

### 资源使用
- [ ] CPU 使用率 < 70%
- [ ] 内存使用率 < 80%
- [ ] 磁盘空间充足

### 并发测试
```bash
npm run test:load
```
- [ ] 负载测试通过
- [ ] 系统稳定性良好

## 🔒 安全检查

### 配置安全
- [ ] 生产环境密钥已更新
- [ ] 默认密码已修改
- [ ] CORS 正确配置
- [ ] 速率限制已启用

### 合约安全
```bash
cd packages/contracts && npm run audit
```
- [ ] 合约安全审计通过
- [ ] 无高危漏洞

### 依赖安全
```bash
npm audit
```
- [ ] 无高危依赖漏洞
- [ ] 依赖版本最新

## 📝 文档检查

- [ ] README.md 已更新
- [ ] DEPLOYMENT_GUIDE.md 已阅读
- [ ] API 文档已生成
- [ ] 合约文档已生成

## 🔄 回滚计划

### 准备回滚
- [ ] 备份当前配置
- [ ] 记录合约地址
- [ ] 保存数据库快照

### 回滚步骤
```bash
# 停止服务
./scripts/stop-services.sh

# 恢复配置
cp .env.backup .env

# 重新部署
./deploy.sh
```

## 📞 支持联系

如果遇到问题：
- [ ] 查看日志文件
- [ ] 运行验证脚本
- [ ] 查看故障排除文档
- [ ] 联系技术支持

## 🎉 部署完成

所有检查项都完成后：
- [ ] 部署信息已记录
- [ ] 团队已通知
- [ ] 监控已设置
- [ ] 文档已更新

---

**部署日期**: _______________  
**部署人员**: _______________  
**环境**: [ ] 本地 [ ] 测试网 [ ] 主网  
**版本**: _______________  

**签名**: _______________
