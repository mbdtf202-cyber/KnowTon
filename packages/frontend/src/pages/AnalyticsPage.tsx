import { useState } from 'react'
import { useAccount } from 'wagmi'
import RevenueChart from '../components/RevenueChart'
import ContentPerformance from '../components/ContentPerformance'
import AnalyticsSummary from '../components/AnalyticsSummary'
import ReportExport from '../components/ReportExport'

export default function AnalyticsPage() {
  const { address, isConnected } = useAccount()
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [selectedContent, setSelectedContent] = useState<string | null>(null)

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">连接钱包查看分析</h2>
          <p className="text-gray-600">请连接您的钱包以查看创作者分析仪表板</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">创作者分析仪表板</h1>
          <p className="text-gray-600 mt-2">查看您的内容表现和收益数据</p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">时间范围:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">最近 7 天</option>
            <option value="30d">最近 30 天</option>
            <option value="90d">最近 90 天</option>
            <option value="1y">最近 1 年</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <AnalyticsSummary address={address!} timeRange={timeRange} />

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">收益趋势</h2>
          <ReportExport address={address!} timeRange={timeRange} />
        </div>
        <RevenueChart address={address!} timeRange={timeRange} />
      </div>

      {/* Content Performance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">内容表现</h2>
        <ContentPerformance 
          address={address!} 
          timeRange={timeRange}
          selectedContent={selectedContent}
          onSelectContent={setSelectedContent}
        />
      </div>
    </div>
  )
}
