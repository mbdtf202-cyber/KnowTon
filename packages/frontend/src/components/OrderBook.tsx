import { useMemo } from 'react'
import type { Order } from '../types'
import { formatAddress } from '../utils/format'

interface OrderBookProps {
  bids: Order[]
  asks: Order[]
  lastPrice?: number
  onOrderClick?: (order: Order) => void
}

export default function OrderBook({ bids, asks, lastPrice, onOrderClick }: OrderBookProps) {
  // Calculate cumulative amounts and max for visualization
  const { bidsWithCumulative, asksWithCumulative, maxCumulativeAmount } = useMemo(() => {
    let bidsCumulative = 0
    const bidsData = bids.map(bid => {
      bidsCumulative += bid.amount
      return { ...bid, cumulative: bidsCumulative }
    })

    let asksCumulative = 0
    const asksData = asks.map(ask => {
      asksCumulative += ask.amount
      return { ...ask, cumulative: asksCumulative }
    })

    const maxAmount = Math.max(bidsCumulative, asksCumulative)

    return {
      bidsWithCumulative: bidsData,
      asksWithCumulative: asksData,
      maxCumulativeAmount: maxAmount,
    }
  }, [bids, asks])

  const getDepthPercentage = (cumulative: number) => {
    return (cumulative / maxCumulativeAmount) * 100
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900">订单簿</h3>
        {lastPrice && (
          <p className="text-sm text-gray-500 mt-1">
            最新成交价: <span className="font-medium text-gray-900">{lastPrice.toFixed(4)} ETH</span>
          </p>
        )}
      </div>

      <div className="divide-y divide-gray-200">
        {/* Asks (Sell Orders) */}
        <div className="p-4">
          <div className="mb-2">
            <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-500 mb-2">
              <div className="text-left">价格 (ETH)</div>
              <div className="text-right">数量</div>
              <div className="text-right">累计</div>
            </div>
          </div>

          <div className="space-y-1 max-h-64 overflow-y-auto">
            {asksWithCumulative.slice(0, 10).reverse().map((ask) => (
              <button
                key={ask.id}
                onClick={() => onOrderClick?.(ask)}
                className="w-full relative group hover:bg-red-50 transition-colors rounded"
              >
                {/* Depth visualization */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-red-100 opacity-30 transition-all"
                  style={{ width: `${getDepthPercentage(ask.cumulative)}%` }}
                />

                {/* Order data */}
                <div className="relative grid grid-cols-3 gap-2 py-1.5 px-2 text-sm">
                  <div className="text-left font-medium text-red-600">
                    {ask.price.toFixed(4)}
                  </div>
                  <div className="text-right text-gray-700">
                    {ask.amount.toFixed(3)}
                  </div>
                  <div className="text-right text-gray-500 text-xs">
                    {ask.cumulative.toFixed(3)}
                  </div>
                </div>

                {/* Tooltip on hover */}
                <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  卖家: {formatAddress(ask.maker)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Spread */}
        {bids.length > 0 && asks.length > 0 && (
          <div className="px-4 py-2 bg-gray-50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">价差</span>
              <span className="font-medium text-gray-900">
                {(asks[0].price - bids[0].price).toFixed(4)} ETH
                <span className="text-xs text-gray-500 ml-2">
                  ({(((asks[0].price - bids[0].price) / bids[0].price) * 100).toFixed(2)}%)
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Bids (Buy Orders) */}
        <div className="p-4">
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {bidsWithCumulative.slice(0, 10).map((bid) => (
              <button
                key={bid.id}
                onClick={() => onOrderClick?.(bid)}
                className="w-full relative group hover:bg-green-50 transition-colors rounded"
              >
                {/* Depth visualization */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-green-100 opacity-30 transition-all"
                  style={{ width: `${getDepthPercentage(bid.cumulative)}%` }}
                />

                {/* Order data */}
                <div className="relative grid grid-cols-3 gap-2 py-1.5 px-2 text-sm">
                  <div className="text-left font-medium text-green-600">
                    {bid.price.toFixed(4)}
                  </div>
                  <div className="text-right text-gray-700">
                    {bid.amount.toFixed(3)}
                  </div>
                  <div className="text-right text-gray-500 text-xs">
                    {bid.cumulative.toFixed(3)}
                  </div>
                </div>

                {/* Tooltip on hover */}
                <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  买家: {formatAddress(bid.maker)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {bids.length === 0 && asks.length === 0 && (
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p>暂无订单</p>
        </div>
      )}
    </div>
  )
}
