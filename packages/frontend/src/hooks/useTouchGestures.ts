import { useEffect, useRef, useState } from 'react'

interface TouchGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onPinch?: (scale: number) => void
  onDoubleTap?: () => void
  threshold?: number
}

interface TouchPoint {
  x: number
  y: number
  time: number
}

export function useTouchGestures(options: TouchGestureOptions) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinch,
    onDoubleTap,
    threshold = 50,
  } = options

  const touchStart = useRef<TouchPoint | null>(null)
  const lastTap = useRef<number>(0)
  const initialDistance = useRef<number>(0)

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      }
    } else if (e.touches.length === 2 && onPinch) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      initialDistance.current = Math.sqrt(dx * dx + dy * dy)
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && onPinch && initialDistance.current > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const distance = Math.sqrt(dx * dx + dy * dy)
      const scale = distance / initialDistance.current
      onPinch(scale)
    }
  }

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart.current) return

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
      time: Date.now(),
    }

    const deltaX = touchEnd.x - touchStart.current.x
    const deltaY = touchEnd.y - touchStart.current.y
    const deltaTime = touchEnd.time - touchStart.current.time

    // Check for double tap
    if (onDoubleTap && deltaTime < 300) {
      const timeSinceLastTap = touchEnd.time - lastTap.current
      if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
        onDoubleTap()
        lastTap.current = 0
        touchStart.current = null
        return
      }
      lastTap.current = touchEnd.time
    }

    // Check for swipe gestures
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    if (absX > threshold || absY > threshold) {
      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight()
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft()
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown()
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp()
        }
      }
    }

    touchStart.current = null
    initialDistance.current = 0
  }

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  }
}

export function useSwipeGesture<T extends HTMLElement>(
  elementRef: React.RefObject<T>,
  options: TouchGestureOptions
) {
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchGestures(options)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd])
}

export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 0
  )

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setScreenWidth(width)
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
      setIsDesktop(width >= 1024)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    isMobile,
    isTablet,
    isDesktop,
    screenWidth,
  }
}
