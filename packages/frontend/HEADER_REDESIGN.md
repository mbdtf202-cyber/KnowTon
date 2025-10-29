# Header 导航栏重新设计文档

## 🎨 设计更新概览

### 主要改进

1. **Logo 位置优化**
   - Logo 移至最左侧
   - 添加渐变背景和动画效果
   - 悬停时有缩放和旋转动画
   - 添加发光效果和 Beta 标签

2. **网络选择集成**
   - 网络选择器集成到钱包按钮组件中
   - 创建新的 `WalletWithNetwork` 组件
   - 下拉菜单显示所有可用网络
   - 实时显示当前连接的网络

3. **UI 和字体优化**
   - 使用 Inter 字体系列
   - 渐变色彩方案（蓝色到紫色）
   - 更大更清晰的字体
   - 改进的间距和对齐

4. **动画和特效**
   - 滚动时导航栏背景模糊效果
   - 悬停时的渐变动画
   - 平滑的过渡效果
   - 移动菜单滑入动画
   - 按钮发光和闪光效果

## 📁 新增/修改的文件

### 新增文件

1. **`src/components/WalletWithNetwork.tsx`**
   - 集成钱包连接和网络选择的组件
   - 支持多个网络（Arbitrum, Ethereum, Polygon）
   - 美观的下拉菜单
   - 实时网络状态显示

### 修改文件

1. **`src/components/Header.tsx`**
   - 完全重新设计的导航栏
   - Logo 移至最左侧
   - 导航链接居中显示
   - 钱包和语言切换器在右侧
   - 添加滚动效果
   - 改进的移动端菜单

2. **`src/index.css`**
   - 添加自定义动画关键帧
   - 渐变动画效果
   - 滑入动画
   - 浮动和发光效果
   - 自定义滚动条样式
   - 文本渐变工具类

3. **`src/i18n/locales/zh.json` & `en.json`**
   - 添加网络选择相关翻译
   - `wallet.selectNetwork`
   - `wallet.networkTip`

## 🎯 设计特点

### 1. Logo 设计

```tsx
<Link to="/" className="group flex items-center gap-2 sm:gap-3">
  {/* 渐变背景 */}
  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-xl opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500 animate-gradient-x" />
  
  {/* Logo 图标 */}
  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-blue-500/30">
    <span className="text-white font-bold text-lg sm:text-xl">K</span>
  </div>
  
  {/* Logo 文字 */}
  <span className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
    KnowTon
  </span>
  
  {/* Beta 标签 */}
  <span className="px-2 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full">
    Beta
  </span>
</Link>
```

### 2. 导航链接

- 居中对齐
- 图标 + 文字
- 活动状态指示器
- 悬停渐变效果
- 底部边框动画

### 3. 钱包按钮

**未连接状态：**
- 渐变背景按钮
- 发光效果
- 闪光动画
- 脉冲图标

**已连接状态：**
- 网络选择按钮（左侧）
- 账户按钮（右侧）
- 在线状态指示器
- 余额显示

### 4. 网络选择器

```tsx
<button onClick={() => setShowNetworkMenu(!showNetworkMenu)}>
  <span>{currentNetwork.icon}</span>
  <span>{currentNetwork.name}</span>
  <svg>下拉箭头</svg>
</button>

{/* 下拉菜单 */}
<div className="dropdown-menu">
  {networks.map(network => (
    <button onClick={() => switchNetwork(network.id)}>
      <div className="network-icon">{network.icon}</div>
      <div className="network-info">
        <div>{network.name}</div>
        <div>Chain ID: {network.id}</div>
      </div>
      {isActive && <CheckIcon />}
    </button>
  ))}
</div>
```

## 🎨 颜色方案

### 主色调
- **蓝色**: `#3B82F6` (blue-600)
- **紫色**: `#8B5CF6` (purple-600)
- **渐变**: `from-blue-600 via-purple-600 to-blue-600`

### 状态颜色
- **成功/在线**: `#10B981` (green-500)
- **警告**: `#F59E0B` (amber-500)
- **错误**: `#EF4444` (red-500)

### 背景
- **主背景**: `white/95` + `backdrop-blur-md`
- **滚动后**: `white/80` + `backdrop-blur-xl`
- **悬停**: `gray-50` 或渐变背景

## 🎬 动画效果

### CSS 关键帧动画

1. **gradient-x** - 渐变横向移动
2. **slideInFromRight** - 从右侧滑入
3. **float** - 浮动效果
4. **glow** - 发光效果
5. **shimmer** - 闪光效果

### Tailwind 动画类

- `animate-gradient-x` - 渐变动画
- `animate-pulse` - 脉冲动画
- `animate-ping` - 扩散动画
- `transition-all duration-300` - 平滑过渡

## 📱 响应式设计

### 断点

- **Mobile**: < 1024px
  - 汉堡菜单
  - 简化的钱包按钮
  - 垂直导航菜单

- **Desktop**: >= 1024px
  - 完整导航栏
  - 居中的导航链接
  - 右侧钱包和语言切换

### 移动端优化

- 触摸友好的按钮尺寸（最小 44x44px）
- 滑动菜单动画
- 优化的间距
- 简化的布局

## 🚀 使用方法

### 基本使用

```tsx
import Header from './components/Header'

function App() {
  return (
    <>
      <Header />
      {/* 其他内容 */}
    </>
  )
}
```

### 自定义网络

在 `WalletWithNetwork.tsx` 中修改 `networks` 数组：

```tsx
const networks = [
  { 
    id: 42161, 
    name: 'Arbitrum One', 
    icon: '🔷', 
    color: 'from-blue-500 to-blue-600' 
  },
  // 添加更多网络...
]
```

## 🎯 性能优化

1. **懒加载**: 使用 React.lazy 加载大型组件
2. **防抖**: 滚动事件使用防抖
3. **CSS 动画**: 使用 CSS 而非 JS 动画
4. **条件渲染**: 仅在需要时渲染下拉菜单

## 🔧 配置选项

### 滚动阈值

在 `Header.tsx` 中修改：

```tsx
const handleScroll = () => {
  setScrolled(window.scrollY > 20) // 修改这个值
}
```

### 动画持续时间

在 CSS 中修改：

```css
@keyframes gradient-x {
  /* 修改动画时长 */
}

.animate-gradient-x {
  animation: gradient-x 3s ease infinite; /* 修改这里 */
}
```

## 📝 待办事项

- [ ] 添加深色模式支持
- [ ] 添加更多网络选项
- [ ] 优化移动端性能
- [ ] 添加键盘导航支持
- [ ] 添加无障碍功能改进

## 🐛 已知问题

无

## 📚 相关文档

- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [RainbowKit 文档](https://www.rainbowkit.com/docs)
- [Wagmi 文档](https://wagmi.sh)
- [React Router 文档](https://reactrouter.com)

---

**更新日期**: 2024-10-29
**版本**: 2.0.0
