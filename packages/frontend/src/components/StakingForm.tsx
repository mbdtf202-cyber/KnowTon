import { useState, useEffect } from 'react'
import { formatNumber } from '../utils/format'

interface StakingFormProps {
  onSubmit: (amount: string, lockPeriod: number) => void
  isSubmitting: boolean
  maxBalance?: string
  apy?: number
  calculateRewards: (amount: string, lockPeriod: number) => string
}

const LOCK_PERIODS = [
  { days: 30, label: '30 天', bonus: 0 },
  { days: 90, label: '90 天', bonus: 1.2 },
  { days: 180, label: '180 天', bonus: 1.5 },
  { days: 365, label: '365 天', bonus: 2.0 },
]

export default function StakingForm({
  onSubmit,
  isSubmitting,
  maxBalance = '0',
  apy = 0,
  calculateRewards,
}: StakingFormProps) {
  const [amount, setAmount] = useState('')
  const [lockPeriod, setLockPeriod] = useState(30)
  const [estimatedRewards, setEstimatedRewards] = useState('0')
  const [errors, setErrors] = useState<{ amount?: string }>({})

  // Calculate estimated rewards when amount or lock period changes
  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      const rewards = calculateRewards(amount, lockPeriod)
      setEstimatedRewards(rewards)
    } else {
      setEstimatedRewards('0')
    }
  }, [amount, lockPeriod, calculateRewards])

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value)
      setErrors({})
    }
  }

  const handleMaxClick = () => {
    setAmount(maxBalance)
    setErrors({})
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    const newErrors: { amount?: string } = {}
    
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = '请输入质押数量'
    } else if (parseFloat(amount) > parseFloat(maxBalance)) {
      newErrors.amount = '余额不足'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSubmit(amount, lockPeriod)
  }

  const selectedPeriod = LOCK_PERIODS.find(p => p.days === lockPeriod)
  const effectiveAPY = apy * (1 + (selectedPeriod?.bonus || 0))

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Amount Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          质押数量
        </label>
        <div className="relative">
          <input
            type="text"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.00"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.amount ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={handleMaxClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-blue-600 hover:text-blue-700"
            disabled={isSubmitting}
          >
            最大
          </button>
        </div>
        {errors.amount && (
          <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          可用余额: {formatNumber(maxBalance)} KNOW
        </p>
      </div>

      {/* Lock Period Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          锁定期限
        </label>
        <div className="grid grid-cols-2 gap-3">
          {LOCK_PERIODS.map((period) => (
            <button
              key={period.days}
              type="button"
              onClick={() => setLockPeriod(period.days)}
              className={`relative p-4 border-2 rounded-lg transition-all ${
                lockPeriod === period.days
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              disabled={isSubmitting}
            >
              <div className="text-left">
                <p className="font-semibold text-gray-900">{period.label}</p>
                {period.bonus > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    +{(period.bonus * 100).toFixed(0)}% APY 加成
                  </p>
                )}
              </div>
              {lockPeriod === period.days && (
                <div className="absolute top-2 right-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Rewards Summary */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">收益预估</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">基础 APY</span>
            <span className="font-semibold text-gray-900">{apy.toFixed(2)}%</span>
          </div>
          {selectedPeriod && selectedPeriod.bonus > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">锁定加成</span>
              <span className="font-semibold text-green-600">+{(selectedPeriod.bonus * 100).toFixed(0)}%</span>
            </div>
          )}
          <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
            <span className="text-gray-600">有效 APY</span>
            <span className="font-bold text-blue-600">{effectiveAPY.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="text-gray-700 font-medium">预计收益</span>
            <span className="font-bold text-gray-900 text-lg">
              {formatNumber(estimatedRewards)} KNOW
            </span>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">重要提示</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>质押期间代币将被锁定，无法转移</li>
              <li>提前解锁需要等待 7 天解绑期</li>
              <li>奖励每日自动计算并累积</li>
              <li>可随时领取已累积的奖励</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            处理中...
          </span>
        ) : (
          '确认质押'
        )}
      </button>
    </form>
  )
}
