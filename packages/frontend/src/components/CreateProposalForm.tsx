import { useState } from 'react'
import type { Proposal } from '../types'

interface CreateProposalFormProps {
  onSubmit: (
    proposalType: Proposal['proposalType'],
    description: string,
    callData?: string
  ) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
  votingPower: string
}

export default function CreateProposalForm({
  onSubmit,
  onCancel,
  isSubmitting,
  votingPower,
}: CreateProposalFormProps) {
  const [proposalType, setProposalType] = useState<Proposal['proposalType']>('PARAMETER_CHANGE')
  const [description, setDescription] = useState('')
  const [callData, setCallData] = useState('')
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const minProposalThreshold = 10000 // Mock threshold

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!description.trim()) {
      newErrors.description = '请输入提案说明'
    } else if (description.length < 50) {
      newErrors.description = '提案说明至少需要 50 个字符'
    } else if (description.length > 2000) {
      newErrors.description = '提案说明不能超过 2000 个字符'
    }

    if (Number(votingPower) < minProposalThreshold) {
      newErrors.votingPower = `创建提案需要至少 ${minProposalThreshold.toLocaleString()} 投票权`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(proposalType, description, callData || undefined)
    } catch (error) {
      console.error('Failed to create proposal:', error)
    }
  }

  const proposalTypes = [
    {
      value: 'PARAMETER_CHANGE' as const,
      label: '参数变更',
      description: '修改平台参数，如手续费率、质押要求等',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
      ),
    },
    {
      value: 'DISPUTE_RESOLUTION' as const,
      label: '争议解决',
      description: '裁决版权争议、纠纷仲裁等',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
          />
        </svg>
      ),
    },
    {
      value: 'TREASURY_ALLOCATION' as const,
      label: '资金分配',
      description: 'DAO 金库资金使用、拨款申请等',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      value: 'CONTRACT_UPGRADE' as const,
      label: '合约升级',
      description: '智能合约升级、新功能部署等',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      ),
    },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Voting Power Check */}
      <div
        className={`rounded-lg p-4 ${
          Number(votingPower) >= minProposalThreshold
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}
      >
        <div className="flex items-start">
          <svg
            className={`w-5 h-5 mr-2 flex-shrink-0 mt-0.5 ${
              Number(votingPower) >= minProposalThreshold ? 'text-green-600' : 'text-red-600'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {Number(votingPower) >= minProposalThreshold ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            )}
          </svg>
          <div className="text-sm">
            <p className="font-medium text-gray-900 mb-1">
              您的投票权重: {Number(votingPower).toLocaleString()} 票
            </p>
            <p className="text-gray-600">
              {Number(votingPower) >= minProposalThreshold
                ? '您有足够的投票权创建提案'
                : `创建提案需要至少 ${minProposalThreshold.toLocaleString()} 投票权`}
            </p>
          </div>
        </div>
      </div>

      {/* Proposal Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">提案类型</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {proposalTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setProposalType(type.value)}
              className={`flex items-start p-4 rounded-lg border-2 transition-all text-left ${
                proposalType === type.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex-shrink-0 text-blue-600 mr-3">{type.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 mb-1">{type.label}</p>
                <p className="text-xs text-gray-600">{type.description}</p>
              </div>
              {proposalType === type.value && (
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          提案说明 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={8}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
            errors.description ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="详细描述您的提案内容、目的、预期效果等。请确保提案清晰、具体，便于社区成员理解和投票。"
        />
        <div className="flex items-center justify-between mt-2">
          {errors.description ? (
            <p className="text-sm text-red-600">{errors.description}</p>
          ) : (
            <p className="text-sm text-gray-500">至少 50 个字符，最多 2000 个字符</p>
          )}
          <p className="text-sm text-gray-500">{description.length} / 2000</p>
        </div>
      </div>

      {/* Call Data (Optional) */}
      <div>
        <label htmlFor="callData" className="block text-sm font-medium text-gray-700 mb-2">
          执行数据 (可选)
        </label>
        <input
          type="text"
          id="callData"
          value={callData}
          onChange={(e) => setCallData(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="0x..."
        />
        <p className="text-sm text-gray-500 mt-2">
          如果提案需要执行链上操作，请提供编码后的调用数据（十六进制格式）
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg
            className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">提案流程说明</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>提案创建后将进入待开始状态</li>
              <li>投票期为 7 天，需要达到法定人数</li>
              <li>通过的提案将在 7 天延迟后可执行</li>
              <li>提案人可在投票开始前取消提案</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={isSubmitting || Number(votingPower) < minProposalThreshold}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              创建中...
            </>
          ) : (
            '创建提案'
          )}
        </button>
      </div>
    </form>
  )
}
