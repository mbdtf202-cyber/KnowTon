# Header 导航栏快速指南

## 🎨 新设计亮点

### ✨ 主要特性

1. **Logo 在最左侧**
   - 带有渐变背景的 "K" 图标
   - "KnowTon" 文字使用渐变色
   - Beta 标签
   - 悬停时有动画效果

2. **网络选择集成到钱包**
   - 点击网络按钮查看所有可用网络
   - 支持 Arbitrum、Ethereum、Polygon
   - 实时显示当前网络状态
   - 一键切换网络

3. **优美的动画**
   - 滚动时背景模糊
   - 悬停渐变效果
   - 按钮发光动画
   - 平滑过渡

4. **改进的字体**
   - 使用 Inter 字体
   - 更大更清晰
   - 渐变文字效果

## 🚀 快速开始

### 查看新设计

1. 确保前端服务器正在运行：
   ```bash
   cd packages/frontend
   npm run dev
   ```

2. 打开浏览器访问：http://localhost:5173

3. 查看以下功能：
   - Logo 悬停效果
   - 滚动页面查看导航栏变化
   - 点击网络按钮查看下拉菜单
   - 连接钱包查看完整功能

### 主要组件

```
src/components/
├── Header.tsx              # 主导航栏组件
├── WalletWithNetwork.tsx   # 钱包 + 网络选择器
└── LanguageSwitcher.tsx    # 语言切换器
```

## 🎯 功能演示

### 1. Logo 动画

**效果**：
- 悬停时图标放大并旋转
- 背景出现渐变光晕
- 文字颜色渐变变化

**代码位置**：`Header.tsx` 第 50-75 行

### 2. 导航链接

**效果**：
- 图标 + 文字显示
- 活动页面有渐变背景
- 悬停时背景变化
- 底部有活动指示线

**代码位置**：`Header.tsx` 第 80-110 行

### 3. 网络选择器

**未连接钱包**：
- 显示 "连接钱包" 按钮
- 渐变背景
- 发光效果

**已连接钱包**：
- 左侧：网络选择按钮
- 右侧：账户按钮
- 点击网络按钮显示下拉菜单

**代码位置**：`WalletWithNetwork.tsx`

### 4. 移动端菜单

**效果**：
- 汉堡菜单图标动画
- 菜单从上滑入
- 每个链接依次出现
- 平滑的过渡效果

**代码位置**：`Header.tsx` 第 130-180 行

## 🎨 自定义样式

### 修改颜色

在 `Header.tsx` 中查找并修改：

```tsx
// 主色调
from-blue-600 via-purple-600 to-blue-600

// 改为其他颜色，例如：
from-green-600 via-teal-600 to-green-600
```

### 修改动画速度

在 `index.css` 中：

```css
.animate-gradient-x {
  animation: gradient-x 3s ease infinite; /* 修改 3s */
}
```

### 添加新网络

在 `WalletWithNetwork.tsx` 中：

```tsx
const networks = [
  // 添加新网络
  { 
    id: 10, 
    name: 'Optimism', 
    icon: '🔴', 
    color: 'from-red-500 to-red-600' 
  },
]
```

## 📱 响应式测试

### 桌面端 (>= 1024px)
- 完整导航栏
- 居中的导航链接
- 右侧钱包和语言

### 平板端 (768px - 1023px)
- 汉堡菜单
- 简化布局

### 移动端 (< 768px)
- 汉堡菜单
- 垂直菜单
- 优化的按钮尺寸

## 🔧 常见问题

### Q: 如何隐藏 Beta 标签？

A: 在 `Header.tsx` 中删除或注释：

```tsx
<span className="hidden sm:inline-block px-2 py-0.5 ...">
  Beta
</span>
```

### Q: 如何修改 Logo 图标？

A: 在 `Header.tsx` 中修改：

```tsx
<span className="text-white font-bold text-lg sm:text-xl">
  K  {/* 改为其他字母或图标 */}
</span>
```

### Q: 如何禁用滚动效果？

A: 在 `Header.tsx` 中删除 `useEffect` 中的滚动监听：

```tsx
// 注释或删除这部分
useEffect(() => {
  const handleScroll = () => {
    setScrolled(window.scrollY > 20)
  }
  window.addEventListener('scroll', handleScroll)
  return () => window.removeEventListener('scroll', handleScroll)
}, [])
```

### Q: 网络切换不工作？

A: 确保：
1. 钱包已连接
2. 钱包支持该网络
3. 检查 `useSwitchNetwork` hook 是否正确导入

## 🎯 性能提示

1. **减少动画**：如果性能不佳，可以减少或禁用某些动画
2. **优化图片**：使用 WebP 格式的 Logo
3. **懒加载**：大型组件使用 React.lazy
4. **防抖滚动**：滚动事件使用防抖函数

## 📚 相关文件

- `Header.tsx` - 主导航栏
- `WalletWithNetwork.tsx` - 钱包组件
- `LanguageSwitcher.tsx` - 语言切换
- `index.css` - 全局样式和动画
- `zh.json` / `en.json` - 翻译文件

## 🎉 享受新设计！

新的导航栏设计更加现代、优美，并且功能更强大。如果有任何问题或建议，请随时反馈！

---

**提示**: 在浏览器中打开开发者工具，可以实时调试和修改样式。
