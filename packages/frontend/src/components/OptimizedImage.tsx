import React, { useState, useEffect, useRef } from 'react'
import { generateResponsiveImageSources, lazyLoadImage } from '../utils/imageOptimization'

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  lazy?: boolean
  priority?: boolean
  onLoad?: () => void
  onError?: () => void
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  lazy = true,
  priority = false,
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (lazy && !priority && imgRef.current) {
      lazyLoadImage(imgRef.current)
    }
  }, [lazy, priority])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  // Generate responsive sources
  const sources = generateResponsiveImageSources(src)

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-200 dark:bg-gray-700 ${className}`}
        style={{ width, height }}
      >
        <span className="text-gray-500 dark:text-gray-400">Failed to load image</span>
      </div>
    )
  }

  return (
    <picture>
      {sources.map((source, index) => (
        <source
          key={index}
          srcSet={lazy && !priority ? undefined : source.srcSet}
          data-srcset={lazy && !priority ? source.srcSet : undefined}
          type={source.type}
          sizes={source.sizes}
        />
      ))}
      <img
        ref={imgRef}
        src={lazy && !priority ? undefined : src}
        data-src={lazy && !priority ? src : undefined}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${lazy && !priority ? 'lazy' : ''} ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-300`}
        loading={lazy && !priority ? 'lazy' : 'eager'}
        onLoad={handleLoad}
        onError={handleError}
        decoding="async"
      />
    </picture>
  )
}

export default OptimizedImage
