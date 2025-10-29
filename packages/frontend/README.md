# KnowTon Frontend

Web3 知识产权平台前端应用

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: TailwindCSS
- **路由**: React Router v6
- **状态管理**: Zustand
- **Web3**: RainbowKit + Wagmi (待集成)
- **国际化**: react-i18next (待集成)

## 项目结构

```
src/
├── components/       # 可复用组件
│   ├── Layout.tsx
│   ├── Header.tsx
│   └── Footer.tsx
├── pages/           # 页面组件
│   ├── HomePage.tsx
│   ├── MarketplacePage.tsx
│   ├── MintPage.tsx
│   └── ProfilePage.tsx
├── store/           # Zustand 状态管理
│   └── useAppStore.ts
├── types/           # TypeScript 类型定义
│   └── index.ts
├── utils/           # 工具函数
│   ├── constants.ts
│   ├── format.ts
│   └── validation.ts
├── App.tsx          # 应用入口
└── main.tsx         # React 入口
```

## 开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 环境变量

复制 `.env.example` 到 `.env` 并配置相应的环境变量：

```bash
cp .env.example .env
```

## 功能模块

### 已完成 (Task 12.1)

- ✅ React + TypeScript 项目基础
- ✅ TailwindCSS 样式配置
- ✅ React Router 路由配置
- ✅ Zustand 状态管理
- ✅ 基础布局组件 (Header, Footer, Layout)
- ✅ 基础页面结构
- ✅ TypeScript 类型定义
- ✅ 工具函数 (格式化、验证)

### 待实现

- ⏳ 钱包连接 (RainbowKit + Wagmi) - Task 12.2
- ⏳ 创作者注册页面 - Task 12.3
- ⏳ 内容上传页面 - Task 12.4
- ⏳ NFT 铸造页面 - Task 12.5
- ⏳ 市场浏览页面 - Task 12.6
- ⏳ NFT 详情页面 - Task 12.7
- ⏳ 交易页面 - Task 12.8
- ⏳ 碎片化页面 - Task 12.9
- ⏳ 质押页面 - Task 12.10
- ⏳ 治理页面 - Task 12.11
- ⏳ 分析仪表板 - Task 12.12
- ⏳ 用户个人中心 - Task 12.13
- ⏳ 响应式设计 - Task 12.14
- ⏳ 国际化 (i18n) - Task 12.15

## 代码规范

- 使用 TypeScript 严格模式
- 遵循 React Hooks 最佳实践
- 组件使用函数式组件
- 使用 TailwindCSS 进行样式开发
- 保持组件单一职责原则

## License

MIT
