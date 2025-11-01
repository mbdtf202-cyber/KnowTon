import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useTranslation } from 'react-i18next'
import { useOrderBook } from '../hooks/useOrderBook'
import { useNFTDetails } from '../hooks/useNFTDetails'
import OrderBook from '../components/OrderBook'
import OrderForm from '../components/OrderForm'
import RecentTrades from '../components/RecentTrades'
import PriceChart from '../components/PriceChart'
import { formatAddress } from '../utils/format'
import TradingListPage from './TradingListPage'

export default function TradingPage() {
  const { tokenId } = useParams<{ tokenId: string }>()
  const navigate = useNavigate()
  const { isConnected } = useAccount()
  const { t } = useTranslation()
  
  // If no tokenId, show NFT list for trading
  if (!tokenId) {
    return <TradingListPage />
  }
  
  const { nft, loading: nftLoading } = useNFTDetails(tokenId || '')
  const {
    orderBook,
    recentTrades,
    loading: orderBookLoading,
    error,
    connected,
    placeOrder,
  } = useOrderBook({ tokenId: tokenId || '', autoConnect: true })

  const [activeTab, setActiveTab] = useState<'chart' | 'depth'>('chart')

  if (nftLoading || orderBookLoading) {
    return (
      <div className="max-w-7xl mx-auto py-12">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    )
  }

  const priceChange = orderBook?.priceChange24h || 0
  const priceChangePercent = orderBook?.lastPrice
    ? (priceChange / orderBook.lastPrice) * 100
    : 0

  return (
    <div className="max-w-[1920px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/nft/${tokenId}`)}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('trading.backToDetails')}
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{nft?.metadata?.title || `NFT #${tokenId}`}</h1>
              {nft?.verified && (
                <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  已验证
                </span>
              )}
            </div>

            {nft?.creator && (
              <button
                onClick={() => navigate(`/profile/${nft.creator}`)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                创作者: <span className="text-blue-600">{formatAddress(nft.creator)}</span>
              </button>
            )}
          </div>

          {/* WebSocket status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {connected ? '实时连接' : '已断开'}
            </span>
          </div>
        </div>
      </div>

      {/* Price ticker */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">最新价格</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">
                {orderBook?.lastPrice?.toFixed(4) || '0.0000'} ETH
              </p>
              <span
                className={`text-sm font-medium ${
                  priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {priceChange >= 0 ? '+' : ''}
                {priceChangePercent.toFixed(2)}%
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">24h 最高</p>
            <p className="text-xl font-semibold">
              {orderBook?.high24h?.toFixed(4) || '0.0000'} ETH
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">24h 最低</p>
            <p className="text-xl font-semibold">
              {orderBook?.low24h?.toFixed(4) || '0.0000'} ETH
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">24h 成交量</p>
            <p className="text-xl font-semibold">
              {orderBook?.volume24h?.toFixed(2) || '0.00'} ETH
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">24h 成交笔数</p>
            <p className="text-xl font-semibold">{recentTrades.length}</p>
          </div>
        </div>
      </div>

      {/* Main trading interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column - Chart and trades */}
        <div className="lg:col-span-8 space-y-6">
          {/* Chart tabs */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('chart')}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === 'chart'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  价格图表
                </button>
                <button
                  onClick={() => setActiveTab('depth')}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === 'depth'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  深度图
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'chart' && nft?.priceHistory && (
                <PriceChart priceHistory={nft.priceHistory} currency="ETH" />
              )}

              {activeTab === 'depth' && (
                <div className="h-96 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <svg
                      className="w-16 h-16 mx-auto mb-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <p>深度图功能开发中</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent trades */}
          <RecentTrades trades={recentTrades} />
        </div>

        {/* Right column - Order book and order form */}
        <div className="lg:col-span-4 space-y-6">
          {/* Order form */}
          <OrderForm
            tokenId={tokenId}
            lastPrice={orderBook?.lastPrice}
            onPlaceOrder={placeOrder}
          />

          {/* Order book */}
          {orderBook && (
            <OrderBook
              bids={orderBook.bids}
              asks={orderBook.asks}
              lastPrice={orderBook.lastPrice}
              onOrderClick={(order) => {
                console.log('Order clicked:', order)
                // Could auto-fill the order form with this price
              }}
            />
          )}
        </div>
      </div>

      {/* My orders section */}
      {isConnected && (
        <div className="mt-6">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">我的订单</h3>
            </div>

            <div className="p-6">
              <div className="text-center text-gray-500 py-8">
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
                <p>暂无活跃订单</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
