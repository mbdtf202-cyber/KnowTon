import { useMemo } from 'react'
import type { PricePoint } from '../hooks/useNFTDetails'

interface PriceChartProps {
  priceHistory: PricePoint[]
  currency?: string
}

export default function PriceChart({ priceHistory, currency = 'ETH' }: PriceChartProps) {
  const { chartData, minPrice, maxPrice, priceRange } = useMemo(() => {
    if (priceHistory.length === 0) {
      return { chartData: [], minPrice: 0, maxPrice: 0, priceRange: 0 }
    }

    const prices = priceHistory.map(p => p.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const range = max - min || 1

    return {
      chartData: priceHistory,
      minPrice: min,
      maxPrice: max,
      priceRange: range,
    }
  }, [priceHistory])

  const getYPosition = (price: number) => {
    const percentage = (price - minPrice) / priceRange
    return 100 - percentage * 80 // 80% of height for chart, 20% for padding
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const formatPrice = (price: number) => {
    return price.toFixed(4)
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-500">暂无价格历史数据</p>
      </div>
    )
  }

  const currentPrice = chartData[chartData.length - 1].price
  const firstPrice = chartData[0].price
  const priceChange = currentPrice - firstPrice
  const priceChangePercent = (priceChange / firstPrice) * 100

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-3xl font-bold">
            {formatPrice(currentPrice)} {currency}
          </span>
          <span
            className={`text-sm font-medium ${
              priceChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {priceChange >= 0 ? '+' : ''}
            {formatPrice(priceChange)} ({priceChangePercent.toFixed(2)}%)
          </span>
        </div>
        <p className="text-sm text-gray-500">过去 30 天</p>
      </div>

      {/* Chart */}
      <div className="relative h-64">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1="20" x2="100" y2="20" stroke="#e5e7eb" strokeWidth="0.2" />
          <line x1="0" y1="40" x2="100" y2="40" stroke="#e5e7eb" strokeWidth="0.2" />
          <line x1="0" y1="60" x2="100" y2="60" stroke="#e5e7eb" strokeWidth="0.2" />
          <line x1="0" y1="80" x2="100" y2="80" stroke="#e5e7eb" strokeWidth="0.2" />

          {/* Price line */}
          <polyline
            points={chartData
              .map((point, index) => {
                const x = (index / (chartData.length - 1)) * 100
                const y = getYPosition(point.price)
                return `${x},${y}`
              })
              .join(' ')}
            fill="none"
            stroke="#2563eb"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />

          {/* Area fill */}
          <polygon
            points={`
              ${chartData
                .map((point, index) => {
                  const x = (index / (chartData.length - 1)) * 100
                  const y = getYPosition(point.price)
                  return `${x},${y}`
                })
                .join(' ')}
              100,100 0,100
            `}
            fill="url(#gradient)"
            opacity="0.2"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Data points */}
          {chartData.map((point, index) => {
            const x = (index / (chartData.length - 1)) * 100
            const y = getYPosition(point.price)
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="0.5"
                fill={point.type === 'sale' ? '#10b981' : '#2563eb'}
                vectorEffect="non-scaling-stroke"
              >
                <title>
                  {formatDate(point.timestamp)}: {formatPrice(point.price)} {currency}
                </title>
              </circle>
            )
          })}
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 -ml-12">
          <span>{formatPrice(maxPrice)}</span>
          <span>{formatPrice(minPrice + priceRange * 0.75)}</span>
          <span>{formatPrice(minPrice + priceRange * 0.5)}</span>
          <span>{formatPrice(minPrice + priceRange * 0.25)}</span>
          <span>{formatPrice(minPrice)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-600">成交价</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-600"></div>
          <span className="text-gray-600">挂单价</span>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div>
          <p className="text-xs text-gray-500 mb-1">最高价</p>
          <p className="text-sm font-semibold">
            {formatPrice(maxPrice)} {currency}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">最低价</p>
          <p className="text-sm font-semibold">
            {formatPrice(minPrice)} {currency}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">平均价</p>
          <p className="text-sm font-semibold">
            {formatPrice(chartData.reduce((sum, p) => sum + p.price, 0) / chartData.length)}{' '}
            {currency}
          </p>
        </div>
      </div>
    </div>
  )
}
