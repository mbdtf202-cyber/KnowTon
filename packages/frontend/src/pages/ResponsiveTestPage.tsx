import { useRef } from 'react'
import { useResponsive, useSwipeGesture } from '../hooks/useTouchGestures'
import { ResponsiveContainer, ResponsiveGrid, ResponsiveStack, TouchableCard } from '../components/ResponsiveContainer'

export default function ResponsiveTestPage() {
  const { isMobile, isTablet, isDesktop, screenWidth } = useResponsive()
  const swipeRef = useRef<HTMLDivElement>(null!)

  useSwipeGesture(swipeRef, {
    onSwipeLeft: () => alert('Swiped Left!'),
    onSwipeRight: () => alert('Swiped Right!'),
    onSwipeUp: () => alert('Swiped Up!'),
    onSwipeDown: () => alert('Swiped Down!'),
    onDoubleTap: () => alert('Double Tapped!'),
  })

  return (
    <ResponsiveContainer>
      <div className="space-y-8">
        {/* Device Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-2">设备信息</h2>
          <div className="space-y-1 text-sm">
            <p>屏幕宽度: {screenWidth}px</p>
            <p>设备类型: {isMobile ? '移动端' : isTablet ? '平板' : isDesktop ? '桌面' : '未知'}</p>
            <p>断点: 
              <span className="inline xs:hidden"> &lt;475px</span>
              <span className="hidden xs:inline sm:hidden"> 475-640px (xs)</span>
              <span className="hidden sm:inline md:hidden"> 640-768px (sm)</span>
              <span className="hidden md:inline lg:hidden"> 768-1024px (md)</span>
              <span className="hidden lg:inline xl:hidden"> 1024-1280px (lg)</span>
              <span className="hidden xl:inline 2xl:hidden"> 1280-1536px (xl)</span>
              <span className="hidden 2xl:inline"> ≥1536px (2xl)</span>
            </p>
          </div>
        </div>

        {/* Responsive Grid Demo */}
        <div>
          <h2 className="text-2xl font-bold mb-4">响应式网格</h2>
          <ResponsiveGrid>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
              <TouchableCard key={num} className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">{num}</div>
                <p className="text-sm text-gray-600">卡片 {num}</p>
              </TouchableCard>
            ))}
          </ResponsiveGrid>
        </div>

        {/* Responsive Stack Demo */}
        <div>
          <h2 className="text-2xl font-bold mb-4">响应式堆叠</h2>
          <ResponsiveStack>
            <TouchableCard className="flex-1">
              <h3 className="font-semibold mb-2">卡片 A</h3>
              <p className="text-sm text-gray-600">移动端垂直堆叠，桌面端水平排列</p>
            </TouchableCard>
            <TouchableCard className="flex-1">
              <h3 className="font-semibold mb-2">卡片 B</h3>
              <p className="text-sm text-gray-600">自动适应屏幕尺寸</p>
            </TouchableCard>
            <TouchableCard className="flex-1">
              <h3 className="font-semibold mb-2">卡片 C</h3>
              <p className="text-sm text-gray-600">响应式布局</p>
            </TouchableCard>
          </ResponsiveStack>
        </div>

        {/* Touch Gesture Demo */}
        <div>
          <h2 className="text-2xl font-bold mb-4">触摸手势测试</h2>
          <div
            ref={swipeRef}
            className="bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg p-8 text-white text-center min-h-[200px] flex items-center justify-center touch-pan-y"
          >
            <div>
              <p className="text-lg font-semibold mb-2">在此区域滑动或双击</p>
              <p className="text-sm opacity-90">支持上下左右滑动和双击手势</p>
            </div>
          </div>
        </div>

        {/* Responsive Typography */}
        <div>
          <h2 className="text-2xl font-bold mb-4">响应式排版</h2>
          <TouchableCard>
            <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold mb-2">
              响应式标题
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4">
              这段文字会根据屏幕尺寸自动调整大小，确保在所有设备上都有良好的可读性。
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-touch px-4 py-2 bg-blue-600 text-white rounded-lg text-sm sm:text-base">
                主要按钮
              </button>
              <button className="btn-touch px-4 py-2 border border-gray-300 rounded-lg text-sm sm:text-base">
                次要按钮
              </button>
            </div>
          </TouchableCard>
        </div>

        {/* Responsive Images */}
        <div>
          <h2 className="text-2xl font-bold mb-4">响应式图片</h2>
          <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 3 }}>
            {[1, 2, 3].map((num) => (
              <TouchableCard key={num}>
                <div className="aspect-video bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg mb-3 flex items-center justify-center text-white text-2xl font-bold">
                  {num}
                </div>
                <h3 className="font-semibold mb-1">图片 {num}</h3>
                <p className="text-sm text-gray-600">16:9 宽高比，自动适应容器</p>
              </TouchableCard>
            ))}
          </ResponsiveGrid>
        </div>

        {/* Mobile-specific Features */}
        <div>
          <h2 className="text-2xl font-bold mb-4">移动端特性</h2>
          <div className="space-y-4">
            <TouchableCard>
              <h3 className="font-semibold mb-2">✓ 触摸友好的按钮尺寸</h3>
              <p className="text-sm text-gray-600">所有交互元素最小 44x44px</p>
            </TouchableCard>
            <TouchableCard>
              <h3 className="font-semibold mb-2">✓ 平滑滚动</h3>
              <p className="text-sm text-gray-600">iOS 弹性滚动和平滑动画</p>
            </TouchableCard>
            <TouchableCard>
              <h3 className="font-semibold mb-2">✓ 安全区域支持</h3>
              <p className="text-sm text-gray-600">适配刘海屏和圆角屏幕</p>
            </TouchableCard>
            <TouchableCard>
              <h3 className="font-semibold mb-2">✓ 触摸反馈</h3>
              <p className="text-sm text-gray-600">点击时的视觉反馈</p>
            </TouchableCard>
          </div>
        </div>

        {/* Breakpoint Visibility */}
        <div>
          <h2 className="text-2xl font-bold mb-4">断点可见性测试</h2>
          <div className="space-y-2">
            <div className="block xs:hidden bg-red-100 border border-red-300 rounded p-3">
              <strong>&lt;475px:</strong> 超小屏幕（小手机）
            </div>
            <div className="hidden xs:block sm:hidden bg-orange-100 border border-orange-300 rounded p-3">
              <strong>475-640px (xs):</strong> 小屏幕（大手机）
            </div>
            <div className="hidden sm:block md:hidden bg-yellow-100 border border-yellow-300 rounded p-3">
              <strong>640-768px (sm):</strong> 中等屏幕（平板竖屏）
            </div>
            <div className="hidden md:block lg:hidden bg-green-100 border border-green-300 rounded p-3">
              <strong>768-1024px (md):</strong> 大屏幕（平板横屏）
            </div>
            <div className="hidden lg:block xl:hidden bg-blue-100 border border-blue-300 rounded p-3">
              <strong>1024-1280px (lg):</strong> 超大屏幕（笔记本）
            </div>
            <div className="hidden xl:block 2xl:hidden bg-indigo-100 border border-indigo-300 rounded p-3">
              <strong>1280-1536px (xl):</strong> 2K 屏幕（桌面）
            </div>
            <div className="hidden 2xl:block bg-purple-100 border border-purple-300 rounded p-3">
              <strong>≥1536px (2xl):</strong> 4K 屏幕（大桌面）
            </div>
          </div>
        </div>
      </div>
    </ResponsiveContainer>
  )
}
