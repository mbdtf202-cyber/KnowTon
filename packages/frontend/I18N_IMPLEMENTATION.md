# 国际化 (i18n) 实现文档

## 概述

KnowTon 平台已成功集成 react-i18next 国际化解决方案，支持英文和中文两种语言。用户可以通过界面上的语言切换器轻松切换语言，语言偏好会自动保存到浏览器本地存储。

## 已实现功能

### 1. i18n 配置
- ✅ 安装并配置 `i18next`、`react-i18next` 和 `i18next-browser-languagedetector`
- ✅ 创建 i18n 配置文件 (`src/i18n/config.ts`)
- ✅ 配置语言检测器（优先使用 localStorage，其次使用浏览器语言）
- ✅ 设置英文为默认语言

### 2. 翻译文件
- ✅ 创建英文翻译文件 (`src/i18n/locales/en.json`)
- ✅ 创建中文翻译文件 (`src/i18n/locales/zh.json`)
- ✅ 涵盖所有主要功能模块的翻译：
  - 通用术语 (common)
  - 导航菜单 (nav)
  - 首页 (home)
  - 注册 (register)
  - 上传 (upload)
  - 铸造 (mint)
  - 市场 (marketplace)
  - NFT 详情 (nftDetails)
  - 交易 (trading)
  - 碎片化 (fractionalize)
  - 质押 (staking)
  - 治理 (governance)
  - 分析 (analytics)
  - 个人中心 (profile)
  - 页脚 (footer)
  - 钱包 (wallet)
  - 交易状态 (transaction)
  - 错误信息 (errors)

### 3. 语言切换器组件
- ✅ 创建 `LanguageSwitcher` 组件
- ✅ 支持英文 🇺🇸 和中文 🇨🇳 切换
- ✅ 下拉菜单显示可用语言
- ✅ 当前选中语言高亮显示
- ✅ 响应式设计，适配移动端和桌面端

### 4. 组件国际化
- ✅ Header 组件集成翻译
- ✅ Footer 组件集成翻译
- ✅ HomePage 组件集成翻译
- ✅ 所有导航链接使用翻译键

## 文件结构

```
packages/frontend/src/
├── i18n/
│   ├── config.ts              # i18n 配置
│   └── locales/
│       ├── en.json            # 英文翻译
│       └── zh.json            # 中文翻译
├── components/
│   ├── LanguageSwitcher.tsx   # 语言切换器组件
│   ├── Header.tsx             # 已更新使用翻译
│   └── Footer.tsx             # 已更新使用翻译
├── pages/
│   └── HomePage.tsx           # 已更新使用翻译
└── main.tsx                   # 已导入 i18n 配置
```

## 使用方法

### 在组件中使用翻译

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.loading')}</h1>
      <p>{t('home.description')}</p>
    </div>
  );
}
```

### 添加新的翻译键

1. 在 `src/i18n/locales/en.json` 中添加英文翻译
2. 在 `src/i18n/locales/zh.json` 中添加对应的中文翻译
3. 在组件中使用 `t('your.translation.key')`

### 语言切换

语言切换器已集成到 Header 组件中：
- 桌面端：显示在导航栏右侧
- 移动端：显示在移动菜单底部

用户选择的语言会自动保存到 `localStorage`，下次访问时会自动应用。

## 技术细节

### 语言检测顺序
1. localStorage 中保存的语言偏好
2. 浏览器语言设置
3. 默认语言（英文）

### 支持的语言
- `en` - English (英文)
- `zh` - 中文 (Chinese)

### 翻译命名空间
所有翻译使用单一命名空间 `translation`，通过嵌套对象组织不同模块的翻译。

## 后续优化建议

1. **添加更多语言**：可以轻松添加日语、韩语、西班牙语等
2. **翻译管理平台**：集成 Crowdin 或 Lokalise 进行协作翻译
3. **动态加载**：实现按需加载翻译文件以优化性能
4. **复数形式**：为需要复数形式的翻译添加支持
5. **日期和数字格式化**：根据语言自动格式化日期和数字
6. **RTL 支持**：为阿拉伯语等从右到左的语言添加支持

## 测试

### 手动测试步骤
1. 启动开发服务器：`npm run dev`
2. 打开浏览器访问应用
3. 点击语言切换器
4. 验证所有文本是否正确切换
5. 刷新页面，验证语言偏好是否保持
6. 测试移动端响应式布局

### 验证清单
- ✅ 语言切换器在桌面端和移动端都可见
- ✅ 点击语言选项后界面立即切换
- ✅ 刷新页面后语言偏好保持不变
- ✅ 所有主要页面的文本都已翻译
- ✅ 导航菜单文本已翻译
- ✅ 页脚文本已翻译
- ✅ 错误消息已翻译

## 相关文件

- `packages/frontend/src/i18n/config.ts` - i18n 配置
- `packages/frontend/src/i18n/locales/en.json` - 英文翻译
- `packages/frontend/src/i18n/locales/zh.json` - 中文翻译
- `packages/frontend/src/components/LanguageSwitcher.tsx` - 语言切换器
- `packages/frontend/src/main.tsx` - 应用入口（已导入 i18n）

## 依赖包

```json
{
  "i18next": "^23.x.x",
  "react-i18next": "^14.x.x",
  "i18next-browser-languagedetector": "^7.x.x"
}
```

## 总结

国际化功能已成功实现，为 KnowTon 平台提供了完整的多语言支持。用户可以在英文和中文之间无缝切换，所有主要功能模块都已完成翻译。系统会自动检测用户的语言偏好并保存，提供了良好的用户体验。
