import type { ReactNode } from 'react'

interface ResponsiveContainerProps {
  children: ReactNode
  className?: string
}

export function ResponsiveContainer({ children, className = '' }: ResponsiveContainerProps) {
  return (
    <div className={`container-safe ${className}`}>
      {children}
    </div>
  )
}

interface ResponsiveGridProps {
  children: ReactNode
  cols?: {
    default?: number
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
  }
  gap?: string
  className?: string
}

export function ResponsiveGrid({ 
  children, 
  cols = { default: 1, sm: 2, lg: 3, xl: 4 },
  gap = 'gap-4 sm:gap-6',
  className = ''
}: ResponsiveGridProps) {
  const gridCols = [
    cols.default && `grid-cols-${cols.default}`,
    cols.xs && `xs:grid-cols-${cols.xs}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    cols['2xl'] && `2xl:grid-cols-${cols['2xl']}`,
  ].filter(Boolean).join(' ')

  return (
    <div className={`grid ${gridCols} ${gap} ${className}`}>
      {children}
    </div>
  )
}

interface ResponsiveStackProps {
  children: ReactNode
  direction?: 'vertical' | 'horizontal' | 'responsive'
  gap?: string
  className?: string
}

export function ResponsiveStack({ 
  children, 
  direction = 'responsive',
  gap = 'gap-4',
  className = ''
}: ResponsiveStackProps) {
  const directionClass = {
    vertical: 'flex flex-col',
    horizontal: 'flex flex-row',
    responsive: 'flex flex-col sm:flex-row'
  }[direction]

  return (
    <div className={`${directionClass} ${gap} ${className}`}>
      {children}
    </div>
  )
}

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  position?: 'left' | 'right' | 'bottom'
}

export function MobileDrawer({ 
  isOpen, 
  onClose, 
  children, 
  title,
  position = 'bottom'
}: MobileDrawerProps) {
  if (!isOpen) return null

  const positionClasses = {
    left: 'left-0 top-0 h-full w-80 max-w-[85vw]',
    right: 'right-0 top-0 h-full w-80 max-w-[85vw]',
    bottom: 'bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl'
  }[position]

  const slideClasses = {
    left: 'animate-in slide-in-from-left',
    right: 'animate-in slide-in-from-right',
    bottom: 'animate-in slide-in-from-bottom'
  }[position]

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed ${positionClasses} ${slideClasses} bg-white z-50 shadow-xl lg:hidden overflow-y-auto`}>
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="btn-touch p-2 text-gray-500 hover:text-gray-700"
              aria-label="关闭"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-4">
          {children}
        </div>
      </div>
    </>
  )
}

interface TouchableCardProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}

export function TouchableCard({ 
  children, 
  onClick, 
  className = '',
  disabled = false
}: TouchableCardProps) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`
        card-mobile bg-white p-4 
        ${onClick && !disabled ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
