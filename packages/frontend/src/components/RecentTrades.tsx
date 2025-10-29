import { useNavigate } from 'react-router-dom'
import type { Trade } from '../types'
import { formatAddress, formatDate } from '../utils/format'

interface RecentTradesProps {
  trades: Trade[]
}

export default function RecentTrades({ trades }: RecentTradesProps) {
  const navigate = useNavigate()

  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) {
      return '刚刚'
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`
    } else {
      return formatDate(timestamp)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900">最近成交</h3>
      </div>

      {/* Table header */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-500">
          <div className="text-left">价格 (ETH)</div>
          <div className="text-right">数量</div>
          <div className="text-right">时间</div>
          <div className="text-right">类型</div>
        </div>
      </div>

      {/* Trades list */}
      <div className="max-h-96 overflow-y-auto">
        {trades.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {trades.map((trade) => {
              const isBuy = Math.random() > 0.5 // In real app, determine from order side
              
              return (
                <div
                  key={trade.id}
                  className="px-4 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => window.open(`https://arbiscan.io/tx/${trade.txHash}`, '_blank')}
                >
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className={`text-left font-medium ${isBuy ? 'text-green-600' : 'text-red-600'}`}>
                      {trade.price.toFixed(4)}
                    </div>
                    <div className="text-right text-gray-700">
                      {trade.amount.toFixed(3)}
                    </div>
                    <div className="text-right text-gray-500 text-xs">
                      {formatTime(trade.timestamp)}
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          isBuy
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {isBuy ? '买入' : '卖出'}
                      </span>
                    </div>
                  </div>

                  {/* Expandable details */}
                  <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                    <div className="flex justify-between">
                      <span>买家:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/profile/${trade.buyer}`)
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {formatAddress(trade.buyer)}
                      </button>
                    </div>
                    <div className="flex justify-between">
                      <span>卖家:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/profile/${trade.seller}`)
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {formatAddress(trade.seller)}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <p>暂无成交记录</p>
          </div>
        )}
      </div>
    </div>
  )
}
