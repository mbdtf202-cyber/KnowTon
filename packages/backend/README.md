# @knowton/backend

KnowTon 平台后端微服务

## 微服务架构

- **Creator Service**: 创作者注册和内容上传
- **Asset Tokenization Service**: NFT 铸造和碎片化
- **Royalty Distribution Service**: 版税自动分配
- **Marketplace Service**: 交易市场
- **Analytics Service**: 数据分析

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建
npm run build

# 运行测试
npm test
```

## 技术栈

- Node.js + TypeScript
- Express.js
- Prisma ORM
- Kafka (消息队列)
- Redis (缓存)
- PostgreSQL (数据库)
