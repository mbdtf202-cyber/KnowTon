# 响应式设计快速开始指南

## 🚀 快速测试

### 1. 启动开发服务器
```bash
cd packages/frontend
npm run dev
```

### 2. 访问测试页面
打开浏览器访问：
```
http://localhost:5173/responsive-test
```

### 3. 测试响应式
- 按 `F12` 打开 Chrome DevTools
- 按 `Ctrl+Shift+M` (Windows) 或 `Cmd+Shift+M` (Mac) 切换设备模拟器
- 选择不同的设备预设或自定义尺寸

## 📱 常用响应式类

### 容器
```tsx
<div className="container-safe">
  {/* 自动添加安全内边距 */}
</div>
```

### 响应式文字
```tsx
<h1 className="text-xl sm:text-2xl lg:text-3xl">
  标题
</h1>
```

### 响应式网格
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1列 → 2列 → 3列 */}
</div>
```

### 触摸友好按钮
```tsx
<button className="btn-touch px-4 py-2 bg-blue-600 text-white rounded-lg">
  点击我
</button>
```

### 显示/隐藏
```tsx
{/* 移动端隐藏 */}
<div className="hidden lg:block">桌面端内容</div>

{/* 桌面端隐藏 */}
<div className="lg:hidden">移动端内容</div>
```

## 🎯 使用响应式组件

### ResponsiveGrid
```tsx
import { ResponsiveGrid } from '../components/ResponsiveContainer'

<ResponsiveGrid cols={{ default: 1, sm: 2, lg: 3 }}>
  <Card />
  <Card />
  <Card />
</ResponsiveGrid>
```

### ResponsiveStack
```tsx
import { ResponsiveStack } from '../components/ResponsiveContainer'

<ResponsiveStack direction="responsive" gap="gap-4">
  <div>项目 1</div>
  <div>项目 2</div>
</ResponsiveStack>
```

### TouchableCard
```tsx
import { TouchableCard } from '../components/ResponsiveContainer'

<TouchableCard onClick={() => console.log('clicked')}>
  <h3>卡片标题</h3>
  <p>卡片内容</p>
</TouchableCard>
```

## 👆 使用触摸手势

### 基础手势
```tsx
import { useSwipeGesture } from '../hooks/useTouchGestures'
import { useRef } from 'react'

function MyComponent() {
  const containerRef = useRef<HTMLDivElement>(null!)
  
  useSwipeGesture(containerRef, {
    onSwipeLeft: () => console.log('向左滑动'),
    onSwipeRight: () => console.log('向右滑动'),
    onDoubleTap: () => console.log('双击'),
  })
  
  return <div ref={containerRef}>滑动我</div>
}
```

### 设备检测
```tsx
import { useResponsive } from '../hooks/useTouchGestures'

function MyComponent() {
  const { isMobile, isTablet, isDesktop } = useResponsive()
  
  return (
    <div>
      {isMobile && <MobileView />}
      {isTablet && <TabletView />}
      {isDesktop && <DesktopView />}
    </div>
  )
}
```

## 🎨 响应式断点

| 断点 | 尺寸 | 设备 |
|------|------|------|
| `xs` | 475px | 大屏手机 |
| `sm` | 640px | 平板竖屏 |
| `md` | 768px | 平板横屏 |
| `lg` | 1024px | 笔记本 |
| `xl` | 1280px | 桌面 |
| `2xl` | 1536px | 2K 屏幕 |
| `3xl` | 1920px | 4K 屏幕 |

## 💡 最佳实践

### 1. 移动优先
```tsx
// ✅ 好的做法
<div className="text-sm md:text-base lg:text-lg">

// ❌ 避免
<div className="text-lg md:text-base sm:text-sm">
```

### 2. 触摸目标
```tsx
// ✅ 最小 44x44px
<button className="btn-touch min-h-[44px] min-w-[44px]">

// ❌ 太小
<button className="p-1">
```

### 3. 图片优化
```tsx
// ✅ 懒加载
<img src="..." loading="lazy" />

// ✅ 响应式
<img src="..." className="w-full h-auto" />
```

### 4. 安全区域
```tsx
// ✅ 使用 container-safe
<div className="container-safe">

// ✅ 或手动添加
<div className="px-4 sm:px-6 lg:px-8">
```

## 🧪 测试检查清单

- [ ] 在 iPhone SE (375px) 上测试
- [ ] 在 iPad (768px) 上测试
- [ ] 在桌面 (1920px) 上测试
- [ ] 测试横屏和竖屏
- [ ] 测试触摸手势
- [ ] 测试导航菜单
- [ ] 检查文字可读性
- [ ] 验证按钮可点击性

## 📚 更多资源

- 详细文档：`RESPONSIVE_DESIGN.md`
- 实施总结：`RESPONSIVE_IMPLEMENTATION_SUMMARY.md`
- 测试页面：`/responsive-test`

## 🆘 常见问题

### Q: 如何隐藏移动端的元素？
```tsx
<div className="hidden lg:block">
  {/* 只在桌面端显示 */}
</div>
```

### Q: 如何创建响应式间距？
```tsx
<div className="p-4 sm:p-6 lg:p-8">
  {/* 移动端 16px，平板 24px，桌面 32px */}
</div>
```

### Q: 如何处理长文本？
```tsx
<p className="truncate">
  {/* 单行截断 */}
</p>

<p className="line-clamp-3">
  {/* 3行截断（需要 @tailwindcss/line-clamp 插件）*/}
</p>
```

### Q: 如何优化移动端性能？
- 使用图片懒加载 `loading="lazy"`
- 使用 CSS 动画而非 JavaScript
- 避免大型库和组件
- 使用代码分割

## 🎉 开始使用

现在你已经了解了基础知识，可以开始在你的组件中使用响应式设计了！

记住：**移动优先，触摸友好，性能优化**
