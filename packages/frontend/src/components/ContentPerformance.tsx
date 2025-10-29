import { useEffect, useState } from 'react'
import { useAnalytics } from '../hooks/useAnalytics'
import { formatEther } from '../utils/format'

interface ContentPerformanceProps {
  address: string
  timeRange: '7d' | '30d' | '90d' | '1y'
  selectedContent: string | null
  onSelectContent: (contentId: string | null) => void
}

interface ContentMetrics {
  tokenId: string
  title: string
  category: string
  thumbnail: string
  views: number
  likes: number
  shares: number
  revenue: string
  royalties: string
  sales: number
  avgPrice: string
  holders: number
  engagement: number
}

export default function ContentPerformance({ 
  address, 
  timeRange, 
  selectedContent,
  onSelectContent 
}: ContentPerformanceProps) {
  const { getContentMetrics, loading } = useAnalytics()
  const [contents, setContents] = useState<ContentMetrics[]>([])
  const [sortBy, setSortBy] = useState<'revenue' | 'views' | 'engagement'>('revenue')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadContentMetrics()
  }, [address, timeRange])

  const loadContentMetrics = async () => {
    try {
      const data = await getContentMetrics(address, timeRange)
      setContents(data)
    } catch (error) {
      console.error('Failed to load content metrics:', error)
    }
  }

  const sortedContents = [...contents].sort((a, b) => {
    let aValue: number, bValue: number
    
    switch (sortBy) {
      case 'revenue':
        aValue = parseFloat(a.revenue)
        bValue = parseFloat(b.revenue)
        break
      case 'views':
        aValue = a.views
        bValue = b.views
        break
      case 'engagement':
        aValue = a.engagement
        bValue = b.engagement
        break
      default:
        return 0
    }
    
    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue
  })

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (contents.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
        <p className="text-gray-600">暂无内容数据</p>
      </div>
    )
  }

  return (
    <div>
      {/* Sort Controls */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm font-medium text-gray-700">排序:</span>
        <button
          onClick={() => handleSort('revenue')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            sortBy === 'revenue'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          收益 {sortBy === 'revenue' && (sortOrder === 'desc' ? '↓' : '↑')}
        </button>
        <button
          onClick={() => handleSort('views')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            sortBy === 'views'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          浏览量 {sortBy === 'views' && (sortOrder === 'desc' ? '↓' : '↑')}
        </button>
        <button
          onClick={() => handleSort('engagement')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            sortBy === 'engagement'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          互动率 {sortBy === 'engagement' && (sortOrder === 'desc' ? '↓' : '↑')}
        </button>
      </div>

      {/* Content List */}
      <div className="space-y-4">
        {sortedContents.map((content) => (
          <div
            key={content.tokenId}
            className={`border rounded-lg p-4 transition-all cursor-pointer hover:shadow-md ${
              selectedContent === content.tokenId
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onSelectContent(
              selectedContent === content.tokenId ? null : content.tokenId
            )}
          >
            <div className="flex items-start gap-4">
              {/* Thumbnail */}
              <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                {content.thumbnail ? (
                  <img
                    src={content.thumbnail}
                    alt={content.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate">{content.title}</h3>
                    <p className="text-sm text-gray-600">#{content.tokenId} · {content.category}</p>
                  </div>
                  <span className="text-lg font-bold text-blue-600 whitespace-nowrap ml-4">
                    {formatEther(content.revenue)} ETH
                  </span>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <span className="text-xs text-gray-600">浏览量</span>
                    <p className="text-sm font-semibold text-gray-900">{content.views.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600">销售次数</span>
                    <p className="text-sm font-semibold text-gray-900">{content.sales}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600">平均价格</span>
                    <p className="text-sm font-semibold text-gray-900">{formatEther(content.avgPrice)} ETH</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600">持有者</span>
                    <p className="text-sm font-semibold text-gray-900">{content.holders}</p>
                  </div>
                </div>

                {/* Engagement Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>互动率</span>
                    <span>{content.engagement.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(content.engagement, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Social Stats */}
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {content.likes.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    {content.shares.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {selectedContent === content.tokenId && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-gray-600">版税收入</span>
                    <p className="text-sm font-semibold text-gray-900">{formatEther(content.royalties)} ETH</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600">销售收入</span>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatEther((parseFloat(content.revenue) - parseFloat(content.royalties)).toString())} ETH
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600">版税占比</span>
                    <p className="text-sm font-semibold text-gray-900">
                      {((parseFloat(content.royalties) / parseFloat(content.revenue)) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
