/**
 * Image Optimization Utilities
 * Provides responsive image loading and WebP support
 */

export interface ImageSource {
  src: string
  srcSet?: string
  sizes?: string
  type?: string
}

/**
 * Generate responsive image sources with WebP support
 */
export function generateResponsiveImageSources(
  baseUrl: string,
  widths: number[] = [320, 640, 768, 1024, 1280, 1536]
): ImageSource[] {
  const sources: ImageSource[] = []

  // WebP sources
  const webpSrcSet = widths
    .map((width) => `${baseUrl}?w=${width}&fm=webp ${width}w`)
    .join(', ')

  sources.push({
    src: baseUrl,
    srcSet: webpSrcSet,
    type: 'image/webp',
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
  })

  // Fallback JPEG/PNG sources
  const fallbackSrcSet = widths
    .map((width) => `${baseUrl}?w=${width} ${width}w`)
    .join(', ')

  sources.push({
    src: baseUrl,
    srcSet: fallbackSrcSet,
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
  })

  return sources
}

/**
 * Check if browser supports WebP
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image()
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2)
    }
    webP.src =
      'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'
  })
}

/**
 * Lazy load image with intersection observer
 */
export function lazyLoadImage(
  img: HTMLImageElement,
  options: IntersectionObserverInit = {}
): void {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.01,
    ...options
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const lazyImage = entry.target as HTMLImageElement
        const src = lazyImage.dataset.src
        const srcset = lazyImage.dataset.srcset

        if (src) lazyImage.src = src
        if (srcset) lazyImage.srcset = srcset

        lazyImage.classList.remove('lazy')
        observer.unobserve(lazyImage)
      }
    })
  }, defaultOptions)

  observer.observe(img)
}

/**
 * Preload critical images
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })
}

/**
 * Convert image to WebP format (client-side)
 */
export async function convertToWebP(
  file: File,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to convert image'))
            }
          },
          'image/webp',
          quality
        )
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Get optimal image dimensions based on device pixel ratio
 */
export function getOptimalImageDimensions(
  baseWidth: number,
  baseHeight: number
): { width: number; height: number } {
  const dpr = window.devicePixelRatio || 1
  const maxDpr = 2 // Cap at 2x to avoid excessive file sizes

  const effectiveDpr = Math.min(dpr, maxDpr)

  return {
    width: Math.round(baseWidth * effectiveDpr),
    height: Math.round(baseHeight * effectiveDpr)
  }
}
