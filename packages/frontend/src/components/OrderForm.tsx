import { useState, useEffect } from 'react'
import { useAccount, useBalance } from 'wagmi'
import type { Order } from '../types'

interface OrderFormProps {
  tokenId: string
  lastPrice?: number
  onPlaceOrder: (order: Omit<Order, 'id' | 'timestamp' | 'filled' | 'status'>) => Promise<{ success: boolean; order?: Order; error?: string }>
}

export default function OrderForm({ tokenId, lastPrice, onPlaceOrder }: OrderFormProps) {
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address })

  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit')
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [total, setTotal] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Update price when lastPrice changes
  useEffect(() => {
    if (lastPrice && !price) {
      setPrice(lastPrice.toFixed(4))
    }
  }, [lastPrice, price])

  // Calculate total when price or amount changes
  useEffect(() => {
    const priceNum = parseFloat(price)
    const amountNum = parseFloat(amount)
    
    if (!isNaN(priceNum) && !isNaN(amountNum)) {
      setTotal((priceNum * amountNum).toFixed(4))
    } else {
      setTotal('')
    }
  }, [price, amount])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !address) {
      setError('请先连接钱包')
      return
    }

    setError(null)
    setSuccess(false)
    setIsSubmitting(true)

    try {
      const priceNum = parseFloat(price)
      const amountNum = parseFloat(amount)

      if (isNaN(priceNum) || priceNum <= 0) {
        throw new Error('请输入有效的价格')
      }

      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('请输入有效的数量')
      }

      // Check balance for buy orders
      if (side === 'buy' && balance) {
        const totalCost = priceNum * amountNum
        const balanceNum = parseFloat(balance.formatted)
        
        if (totalCost > balanceNum) {
          throw new Error('余额不足')
        }
      }

      const result = await onPlaceOrder({
        tokenId,
        maker: address,
        side,
        price: priceNum,
        amount: amountNum,
      })

      if (result.success) {
        setSuccess(true)
        setPrice('')
        setAmount('')
        setTotal('')
        
        setTimeout(() => setSuccess(false), 3000)
      } else {
        throw new Error(result.error || '下单失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '下单失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePercentageClick = (percentage: number) => {
    if (!balance) return
    
    const balanceNum = parseFloat(balance.formatted)
    const priceNum = parseFloat(price) || 1
    
    if (side === 'buy') {
      const totalAmount = (balanceNum * percentage) / 100
      const amountNum = totalAmount / priceNum
      setAmount(amountNum.toFixed(4))
    } else {
      // For sell orders, would need to check NFT balance
      const amountNum = (balanceNum * percentage) / 100
      setAmount(amountNum.toFixed(4))
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">下单</h3>

        {/* Side selector */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setSide('buy')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              side === 'buy'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            买入
          </button>
          <button
            onClick={() => setSide('sell')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              side === 'sell'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            卖出
          </button>
        </div>

        {/* Order type selector */}
        <div className="flex gap-4 text-sm">
          <button
            onClick={() => setOrderType('limit')}
            className={`pb-2 border-b-2 transition-colors ${
              orderType === 'limit'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            限价单
          </button>
          <button
            onClick={() => setOrderType('market')}
            className={`pb-2 border-b-2 transition-colors ${
              orderType === 'market'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            市价单
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Price input (only for limit orders) */}
        {orderType === 'limit' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              价格 (ETH)
            </label>
            <input
              type="number"
              step="0.0001"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.0000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {lastPrice && (
              <p className="text-xs text-gray-500 mt-1">
                市场价: {lastPrice.toFixed(4)} ETH
              </p>
            )}
          </div>
        )}

        {/* Amount input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            数量
          </label>
          <input
            type="number"
            step="0.001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.000"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />

          {/* Percentage buttons */}
          <div className="flex gap-2 mt-2">
            {[25, 50, 75, 100].map((percentage) => (
              <button
                key={percentage}
                type="button"
                onClick={() => handlePercentageClick(percentage)}
                className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                {percentage}%
              </button>
            ))}
          </div>
        </div>

        {/* Total */}
        {orderType === 'limit' && total && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              总计 (ETH)
            </label>
            <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
              {total}
            </div>
          </div>
        )}

        {/* Balance */}
        {balance && (
          <div className="text-sm text-gray-600">
            可用余额: {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">订单已提交！</p>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={!isConnected || isSubmitting}
          className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            side === 'buy'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {!isConnected
            ? '请先连接钱包'
            : isSubmitting
            ? '提交中...'
            : side === 'buy'
            ? '买入'
            : '卖出'}
        </button>
      </form>

      {/* Info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>交易手续费</span>
            <span>0.3%</span>
          </div>
          <div className="flex justify-between">
            <span>预计 Gas 费</span>
            <span>~0.001 ETH</span>
          </div>
        </div>
      </div>
    </div>
  )
}
