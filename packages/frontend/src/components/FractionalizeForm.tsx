import { useState } from 'react'
import { validateRequired, validatePositiveNumber } from '../utils/validation'

interface FractionalizeFormProps {
  tokenId: string
  onSubmit: (data: any) => void
  isSubmitting: boolean
}

export default function FractionalizeForm({ tokenId, onSubmit, isSubmitting }: FractionalizeFormProps) {
  const [formData, setFormData] = useState({
    tokenId,
    totalSupply: '1000000',
    tokenName: '',
    tokenSymbol: '',
    reservePrice: '',
    initialLiquidity: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Token name
    const tokenNameError = validateRequired(formData.tokenName, '代币名称')
    if (tokenNameError) newErrors.tokenName = tokenNameError

    // Token symbol
    const tokenSymbolError = validateRequired(formData.tokenSymbol, '代币符号')
    if (tokenSymbolError) {
      newErrors.tokenSymbol = tokenSymbolError
    } else if (formData.tokenSymbol.length > 10) {
      newErrors.tokenSymbol = '代币符号不能超过 10 个字符'
    }

    // Total supply
    const supplyError = validatePositiveNumber(formData.totalSupply, '总供应量')
    if (supplyError) {
      newErrors.totalSupply = supplyError
    } else if (parseFloat(formData.totalSupply) < 1000) {
      newErrors.totalSupply = '总供应量至少为 1000'
    }

    // Reserve price
    const priceError = validatePositiveNumber(formData.reservePrice, '赎回价格')
    if (priceError) newErrors.reservePrice = priceError

    // Initial liquidity
    const liquidityError = validatePositiveNumber(formData.initialLiquidity, '初始流动性')
    if (liquidityError) newErrors.initialLiquidity = liquidityError

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validate()) {
      onSubmit(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">碎片化配置</h2>
        <p className="text-sm text-gray-600 mb-6">
          配置您的 NFT 碎片化参数。碎片化后，原始 NFT 将被锁定在金库中。
        </p>
      </div>

      {/* Token Name */}
      <div>
        <label htmlFor="tokenName" className="block text-sm font-medium text-gray-700 mb-2">
          代币名称 *
        </label>
        <input
          type="text"
          id="tokenName"
          name="tokenName"
          value={formData.tokenName}
          onChange={handleChange}
          placeholder="例如: My Artwork Shares"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.tokenName ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={isSubmitting}
        />
        {errors.tokenName && (
          <p className="mt-1 text-sm text-red-600">{errors.tokenName}</p>
        )}
      </div>

      {/* Token Symbol */}
      <div>
        <label htmlFor="tokenSymbol" className="block text-sm font-medium text-gray-700 mb-2">
          代币符号 *
        </label>
        <input
          type="text"
          id="tokenSymbol"
          name="tokenSymbol"
          value={formData.tokenSymbol}
          onChange={handleChange}
          placeholder="例如: MYART"
          maxLength={10}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.tokenSymbol ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={isSubmitting}
        />
        {errors.tokenSymbol && (
          <p className="mt-1 text-sm text-red-600">{errors.tokenSymbol}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          代币符号通常为 3-5 个大写字母
        </p>
      </div>

      {/* Total Supply */}
      <div>
        <label htmlFor="totalSupply" className="block text-sm font-medium text-gray-700 mb-2">
          总供应量 *
        </label>
        <input
          type="number"
          id="totalSupply"
          name="totalSupply"
          value={formData.totalSupply}
          onChange={handleChange}
          placeholder="1000000"
          min="1000"
          step="1"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.totalSupply ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={isSubmitting}
        />
        {errors.totalSupply && (
          <p className="mt-1 text-sm text-red-600">{errors.totalSupply}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          将铸造的碎片代币总数量（最少 1000）
        </p>
      </div>

      {/* Reserve Price */}
      <div>
        <label htmlFor="reservePrice" className="block text-sm font-medium text-gray-700 mb-2">
          赎回价格 (ETH) *
        </label>
        <input
          type="number"
          id="reservePrice"
          name="reservePrice"
          value={formData.reservePrice}
          onChange={handleChange}
          placeholder="10.0"
          min="0"
          step="0.01"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.reservePrice ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={isSubmitting}
        />
        {errors.reservePrice && (
          <p className="mt-1 text-sm text-red-600">{errors.reservePrice}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          持有者可以用此价格赎回原始 NFT 的最低价格
        </p>
      </div>

      {/* Initial Liquidity */}
      <div>
        <label htmlFor="initialLiquidity" className="block text-sm font-medium text-gray-700 mb-2">
          初始流动性 (ETH) *
        </label>
        <input
          type="number"
          id="initialLiquidity"
          name="initialLiquidity"
          value={formData.initialLiquidity}
          onChange={handleChange}
          placeholder="1.0"
          min="0"
          step="0.01"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.initialLiquidity ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={isSubmitting}
        />
        {errors.initialLiquidity && (
          <p className="mt-1 text-sm text-red-600">{errors.initialLiquidity}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          用于创建 Uniswap 流动性池的 ETH 数量
        </p>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">配置摘要</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">代币名称:</span>
            <span className="font-medium text-gray-900">
              {formData.tokenName || '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">代币符号:</span>
            <span className="font-medium text-gray-900">
              {formData.tokenSymbol || '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">总供应量:</span>
            <span className="font-medium text-gray-900">
              {formData.totalSupply ? parseFloat(formData.totalSupply).toLocaleString() : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">赎回价格:</span>
            <span className="font-medium text-gray-900">
              {formData.reservePrice ? `${formData.reservePrice} ETH` : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">初始流动性:</span>
            <span className="font-medium text-gray-900">
              {formData.initialLiquidity ? `${formData.initialLiquidity} ETH` : '-'}
            </span>
          </div>
          {formData.totalSupply && formData.initialLiquidity && (
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-gray-600">初始代币价格:</span>
              <span className="font-medium text-gray-900">
                {(parseFloat(formData.initialLiquidity) / parseFloat(formData.totalSupply)).toFixed(8)} ETH
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <svg className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">重要提示</p>
            <ul className="list-disc list-inside space-y-1">
              <li>碎片化后，原始 NFT 将被锁定在金库中</li>
              <li>只有当所有碎片代币持有者同意时才能赎回</li>
              <li>您需要支付 gas 费用来执行碎片化和创建流动性池</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isSubmitting ? '处理中...' : '开始碎片化'}
      </button>
    </form>
  )
}
