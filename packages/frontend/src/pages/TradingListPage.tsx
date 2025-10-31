import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'

interface TradingPair {
  tokenId: string
  title: string
  image: string
  lastPrice: number
  priceChange24h: number
  volume24h: number
  high24h: number
  low24h: number
}

export default function TradingListPage() {
  const navigate = useNavigate()
  const { isConnected } = useAccount()
  const [pairs, setPairs] = useState<TradingPair[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'volume' | 'price' | 'change'>('volume')

  useEffect(() => {
    const fetchTradingPairs = async () => {
      try {
        // Fetch from API
        const response = await fetch('http://localhost:3000/api/trading/pairs')
        if (response.ok) {
          const data = await response.json()
          setPairs(data)
        } else {
          // Fallback to mock data
          const mockPairs: TradingPair[] = Array.from({ length: 20 }, (_, i) => ({
            tokenId: `${i + 1}`,
            title: `NFT #${i + 1}`,
            image: `https://picsum.photos/seed/${i}/200`,
            lastPrice: 1.5 + Math.random() * 3,
            priceChange24h: (Math.random() - 0.5) * 20,
            volume24h: Math.random() * 100 + 10,
            high24h: 2 + Math.random() * 2,
            low24h: 1 + Math.random(),
          }))
          setPairs(mockPairs)
        }
      } catch (error) {
        console.error('Failed to fetch trading pairs:', error)
        // Fallback to mock data
        const mockPairs: TradingPair[] = Array.from({ length: 20 }, (_, i) => ({
          tokenId: `${i + 1}`,
          title: `NFT #${i + 1}`,
          image: `https://picsum.photos/seed/${i}/200`,
          lastPrice: 1.5 + Math.random() * 3,
          priceChange24h: (Math.random() - 0.5) * 20,
          volume24h: Math.random() * 100 + 10,
          high24h: 2 + Math.random() * 2,
          low24h: 1 + Math.random(),
        }))
        setPairs(mockPairs)
      } finally {
        setLoading(false)
      }
    }
    
    fetchTradingPairs()
  }, [])

  const sortedPairs = [...pairs].sort((a, b) => {
    switch (sortBy) {
      case 'volume':
        return b.volume24h - a.volume24h
      case 'price':
        return b.lastPrice - a.lastPrice
      case 'change':
        return b.priceChange24h - a.priceChange24h
      default:
        return 0
    }
  })

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">NFT 交易市场</h1>
        <p className="text-gray-600">实时交易 NFT，查看订单簿和价格走势</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">24h 交易量</p>
          <p className="text-2xl font-bold">
            {pairs.reduce((sum, p) => sum + p.volume24h, 0).toFixed(2)} ETH
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">活跃交易对</p>
          <p className="text-2xl font-bold">{pairs.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">最高涨幅</p>
          <p className="text-2xl font-bold text-green-600">
            +{Math.max(...pairs.map(p => p.priceChange24h)).toFixed(2)}%
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">最高跌幅</p>
          <p className="text-2xl font-bold text-red-600">
            {Math.min(...pairs.map(p => p.priceChange24h)).toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('volume')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                sortBy === 'volume'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              按交易量
            </button>
            <button
              onClick={() => setSortBy('price')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                sortBy === 'price'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              按价格
            </button>
            <button
              onClick={() => setSortBy('change')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                sortBy === 'change'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              按涨跌幅
            </button>
          </div>
        </div>
      </div>

      {/* Trading pairs table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NFT
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最新价格
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  24h 涨跌
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  24h 最高
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  24h 最低
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  24h 成交量
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedPairs.map((pair) => (
                <tr
                  key={pair.tokenId}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/trade/${pair.tokenId}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <img
                        src={pair.image}
                        alt={pair.title}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{pair.title}</p>
                        <p className="text-sm text-gray-500">#{pair.tokenId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <p className="font-semibold text-gray-900">
                      {pair.lastPrice.toFixed(4)} ETH
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                        pair.priceChange24h >= 0
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {pair.priceChange24h >= 0 ? '+' : ''}
                      {pair.priceChange24h.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700">
                    {pair.high24h.toFixed(4)} ETH
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700">
                    {pair.low24h.toFixed(4)} ETH
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700">
                    {pair.volume24h.toFixed(2)} ETH
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/trade/${pair.tokenId}`)
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      交易
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connect wallet prompt */}
      {!isConnected && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-800 mb-4">连接钱包以开始交易</p>
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            连接钱包
          </button>
        </div>
      )}
    </div>
  )
}
