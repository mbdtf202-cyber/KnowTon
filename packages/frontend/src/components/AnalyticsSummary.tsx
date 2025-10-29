import { useEffect, useState } from 'react'
import { useAnalytics } from '../hooks/useAnalytics'

interface AnalyticsSummaryProps {
  address: string
  timeRange: '7d' | '30d' | '90d' | '1y'
}

interface SummaryMetric {
  label: string
  value: string
  change: number
  icon: string
}

export default function AnalyticsSummary({ address, timeRange }: AnalyticsSummaryProps) {
  const { getSummaryMetrics, loading } = useAnalytics()
  const [metrics, setMetrics] = useState<SummaryMetric[]>([])

  useEffect(() => {
    loadMetrics()
  }, [address, timeRange])

  const loadMetrics = async () => {
    try {
      const data = await getSummaryMetrics(address, timeRange)
      setMetrics(data)
    } catch (error) {
      console.error('Failed to load summary metrics:', error)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-600">{metric.label}</span>
            <span className="text-2xl">{metric.icon}</span>
          </div>
          
          <div className="mb-2">
            <span className="text-3xl font-bold text-gray-900">{metric.value}</span>
          </div>
          
          <div className="flex items-center gap-1">
            {metric.change >= 0 ? (
              <>
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span className="text-sm font-medium text-green-600">+{metric.change.toFixed(1)}%</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="text-sm font-medium text-red-600">{metric.change.toFixed(1)}%</span>
              </>
            )}
            <span className="text-sm text-gray-500 ml-1">vs 上期</span>
          </div>
        </div>
      ))}
    </div>
  )
}
