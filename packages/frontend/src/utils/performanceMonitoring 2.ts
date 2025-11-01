/**
 * Performance Monitoring Utilities
 * Track and report web vitals and custom metrics
 */

export interface PerformanceMetrics {
  FCP?: number // First Contentful Paint
  LCP?: number // Largest Contentful Paint
  FID?: number // First Input Delay
  CLS?: number // Cumulative Layout Shift
  TTFB?: number // Time to First Byte
  TTI?: number // Time to Interactive
}

/**
 * Report Web Vitals to analytics
 */
export function reportWebVitals(metric: PerformanceMetrics): void {
  // Send to analytics service
  if (import.meta.env.PROD) {
    console.log('Performance Metric:', metric)
    // Example: Send to Google Analytics, Sentry, or custom endpoint
    // gtag('event', 'web_vitals', metric)
  }
}

/**
 * Measure First Contentful Paint (FCP)
 */
export function measureFCP(): Promise<number | null> {
  return new Promise((resolve) => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const fcpEntry = entries.find((entry) => entry.name === 'first-contentful-paint')
        if (fcpEntry) {
          resolve(fcpEntry.startTime)
          observer.disconnect()
        }
      })
      observer.observe({ entryTypes: ['paint'] })

      // Timeout after 10 seconds
      setTimeout(() => {
        observer.disconnect()
        resolve(null)
      }, 10000)
    } else {
      resolve(null)
    }
  })
}

/**
 * Measure Largest Contentful Paint (LCP)
 */
export function measureLCP(): Promise<number | null> {
  return new Promise((resolve) => {
    if ('PerformanceObserver' in window) {
      let lcpValue: number | null = null

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
          renderTime?: number
          loadTime?: number
        }
        lcpValue = lastEntry.renderTime || lastEntry.loadTime || lastEntry.startTime
      })

      observer.observe({ entryTypes: ['largest-contentful-paint'] })

      // Report after page is fully loaded
      window.addEventListener('load', () => {
        setTimeout(() => {
          observer.disconnect()
          resolve(lcpValue)
        }, 0)
      })

      // Timeout after 10 seconds
      setTimeout(() => {
        observer.disconnect()
        resolve(lcpValue)
      }, 10000)
    } else {
      resolve(null)
    }
  })
}

/**
 * Measure Cumulative Layout Shift (CLS)
 */
export function measureCLS(): Promise<number> {
  return new Promise((resolve) => {
    if ('PerformanceObserver' in window) {
      let clsValue = 0

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value
          }
        }
      })

      observer.observe({ entryTypes: ['layout-shift'] })

      // Report after page is fully loaded
      window.addEventListener('load', () => {
        setTimeout(() => {
          observer.disconnect()
          resolve(clsValue)
        }, 0)
      })

      // Timeout after 10 seconds
      setTimeout(() => {
        observer.disconnect()
        resolve(clsValue)
      }, 10000)
    } else {
      resolve(0)
    }
  })
}

/**
 * Measure Time to First Byte (TTFB)
 */
export function measureTTFB(): number | null {
  if ('performance' in window && 'timing' in performance) {
    const timing = performance.timing
    return timing.responseStart - timing.requestStart
  }
  return null
}

/**
 * Track custom performance mark
 */
export function markPerformance(name: string): void {
  if ('performance' in window && 'mark' in performance) {
    performance.mark(name)
  }
}

/**
 * Measure time between two performance marks
 */
export function measurePerformance(name: string, startMark: string, endMark: string): number | null {
  if ('performance' in window && 'measure' in performance) {
    try {
      performance.measure(name, startMark, endMark)
      const measure = performance.getEntriesByName(name)[0]
      return measure ? measure.duration : null
    } catch (error) {
      console.error('Performance measurement error:', error)
      return null
    }
  }
  return null
}

/**
 * Get all performance metrics
 */
export async function getAllPerformanceMetrics(): Promise<PerformanceMetrics> {
  const [fcp, lcp, cls] = await Promise.all([
    measureFCP(),
    measureLCP(),
    measureCLS()
  ])

  const ttfb = measureTTFB()

  const metrics: PerformanceMetrics = {}

  if (fcp !== null) metrics.FCP = fcp
  if (lcp !== null) metrics.LCP = lcp
  if (cls !== null) metrics.CLS = cls
  if (ttfb !== null) metrics.TTFB = ttfb

  return metrics
}

/**
 * Monitor long tasks (tasks taking > 50ms)
 */
export function monitorLongTasks(callback: (duration: number) => void): void {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          callback(entry.duration)
        }
      }
    })

    try {
      observer.observe({ entryTypes: ['longtask'] })
    } catch (e) {
      // Long task API not supported
    }
  }
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring(): void {
  // Measure and report web vitals
  getAllPerformanceMetrics().then((metrics) => {
    reportWebVitals(metrics)
  })

  // Monitor long tasks
  monitorLongTasks((duration) => {
    console.warn(`Long task detected: ${duration.toFixed(2)}ms`)
  })
}
