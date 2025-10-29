import { useEffect, useState } from 'react'
import { useAnalytics } from '../hooks/useAnalytics'

interface RevenueChartProps {
  address: string
  timeRange: '7d' | '30d' | '90d' | '1y'
}

interface RevenueDataPoint {
  date: string
  revenue: number
  royalties: number
  sales: number
}

export default function RevenueChart({ address, timeRange }: RevenueChartProps) {
  const { getRevenueData, loading } = useAnalytics()
  const [data, setData] = useState<RevenueDataPoint[]>([])
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')

  useEffect(() => {
    loadRevenueData()
  }, [address, timeRange])

  const loadRevenueData = async () => {
    try {
      const revenueData = await getRevenueData(address, timeRange)
      setData(revenueData)
    } catch (error) {
      console.error('Failed to load revenue data:', error)
    }
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue), 0)
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
  const avgRevenue = data.length > 0 ? totalRevenue / data.length : 0

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-600">暂无收益数据</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Chart Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-sm text-gray-600">总收益</span>
            <p className="text-2xl font-bold text-gray-900">{totalRevenue.toFixed(4)} ETH</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">平均收益</span>
            <p className="text-2xl font-bold text-gray-900">{avgRevenue.toFixed(4)} ETH</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              chartType === 'line'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            折线图
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              chartType === 'bar'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            柱状图
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-64">
        <svg className="w-full h-full" viewBox="0 0 800 256">
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line
                x1="50"
                y1={50 + i * 50}
                x2="750"
                y2={50 + i * 50}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x="40"
                y={50 + i * 50 + 5}
                textAnchor="end"
                fontSize="12"
                fill="#6b7280"
              >
                {((maxRevenue * (4 - i)) / 4).toFixed(2)}
              </text>
            </g>
          ))}

          {/* Data visualization */}
          {chartType === 'line' ? (
            <>
              {/* Line path */}
              <path
                d={data
                  .map((point, i) => {
                    const x = 50 + (i * 700) / (data.length - 1 || 1)
                    const y = 250 - (point.revenue / maxRevenue) * 200
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                  })
                  .join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Data points */}
              {data.map((point, i) => {
                const x = 50 + (i * 700) / (data.length - 1 || 1)
                const y = 250 - (point.revenue / maxRevenue) * 200
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#3b82f6"
                    className="hover:r-6 transition-all cursor-pointer"
                  >
                    <title>{`${point.date}: ${point.revenue.toFixed(4)} ETH`}</title>
                  </circle>
                )
              })}
            </>
          ) : (
            /* Bar chart */
            data.map((point, i) => {
              const x = 50 + (i * 700) / data.length
              const barWidth = 700 / data.length - 10
              const height = (point.revenue / maxRevenue) * 200
              const y = 250 - height
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  fill="#3b82f6"
                  className="hover:fill-blue-700 transition-colors cursor-pointer"
                >
                  <title>{`${point.date}: ${point.revenue.toFixed(4)} ETH`}</title>
                </rect>
              )
            })
          )}

          {/* X-axis labels */}
          {data.map((point, i) => {
            if (i % Math.ceil(data.length / 8) === 0) {
              const x = 50 + (i * 700) / (data.length - 1 || 1)
              return (
                <text
                  key={i}
                  x={x}
                  y="270"
                  textAnchor="middle"
                  fontSize="12"
                  fill="#6b7280"
                >
                  {point.date}
                </text>
              )
            }
            return null
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          <span className="text-sm text-gray-600">总收益</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-600 rounded-full"></div>
          <span className="text-sm text-gray-600">版税收入</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
          <span className="text-sm text-gray-600">销售收入</span>
        </div>
      </div>
    </div>
  )
}
