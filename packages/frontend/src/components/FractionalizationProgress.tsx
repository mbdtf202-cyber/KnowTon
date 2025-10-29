import { useEffect, useState } from 'react'

interface FractionalizationProgressProps {
  vaultId: string
  status: 'idle' | 'preparing' | 'signing' | 'confirming' | 'creating_pool' | 'complete' | 'error'
}

interface ProgressStep {
  id: string
  label: string
  description: string
  status: 'pending' | 'active' | 'complete' | 'error'
}

export default function FractionalizationProgress({ vaultId, status }: FractionalizationProgressProps) {
  const [steps, setSteps] = useState<ProgressStep[]>([
    {
      id: 'lock',
      label: '锁定 NFT',
      description: '将 NFT 转移到金库合约',
      status: 'pending',
    },
    {
      id: 'mint',
      label: '铸造碎片代币',
      description: '创建 ERC-20 碎片代币',
      status: 'pending',
    },
    {
      id: 'pool',
      label: '创建流动性池',
      description: '在 Uniswap 上创建交易池',
      status: 'pending',
    },
    {
      id: 'complete',
      label: '完成',
      description: '碎片化成功完成',
      status: 'pending',
    },
  ])

  useEffect(() => {
    setSteps(prevSteps => {
      const newSteps = [...prevSteps]
      
      switch (status) {
        case 'idle':
          // Keep all pending
          break
        case 'preparing':
        case 'signing':
          newSteps[0].status = 'active'
          break
        case 'confirming':
          newSteps[0].status = 'complete'
          newSteps[1].status = 'active'
          break
        case 'creating_pool':
          newSteps[0].status = 'complete'
          newSteps[1].status = 'complete'
          newSteps[2].status = 'active'
          break
        case 'complete':
          newSteps[0].status = 'complete'
          newSteps[1].status = 'complete'
          newSteps[2].status = 'complete'
          newSteps[3].status = 'complete'
          break
        case 'error':
          const activeIndex = newSteps.findIndex(s => s.status === 'active')
          if (activeIndex !== -1) {
            newSteps[activeIndex].status = 'error'
          }
          break
      }
      
      return newSteps
    })
  }, [status])

  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">正在碎片化</h2>
        <p className="text-gray-600">
          请耐心等待，这可能需要几分钟时间
        </p>
      </div>

      {/* Progress Steps */}
      <div className="space-y-6">
        {steps.map((step, index) => (
          <div key={step.id} className="relative">
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-12 bg-gray-200">
                {step.status === 'complete' && (
                  <div className="w-full bg-green-500 transition-all duration-500" style={{ height: '100%' }} />
                )}
              </div>
            )}

            {/* Step Content */}
            <div className="flex items-start">
              {/* Icon */}
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                step.status === 'complete'
                  ? 'bg-green-50 border-green-500'
                  : step.status === 'active'
                  ? 'bg-blue-50 border-blue-500'
                  : step.status === 'error'
                  ? 'bg-red-50 border-red-500'
                  : 'bg-gray-50 border-gray-300'
              }`}>
                {step.status === 'complete' ? (
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : step.status === 'active' ? (
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : step.status === 'error' ? (
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <div className="w-3 h-3 bg-gray-300 rounded-full" />
                )}
              </div>

              {/* Text */}
              <div className="ml-4 flex-1">
                <h3 className={`font-semibold ${
                  step.status === 'complete'
                    ? 'text-green-900'
                    : step.status === 'active'
                    ? 'text-blue-900'
                    : step.status === 'error'
                    ? 'text-red-900'
                    : 'text-gray-500'
                }`}>
                  {step.label}
                </h3>
                <p className={`text-sm mt-1 ${
                  step.status === 'complete'
                    ? 'text-green-600'
                    : step.status === 'active'
                    ? 'text-blue-600'
                    : step.status === 'error'
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}>
                  {step.description}
                </p>
                
                {step.status === 'active' && (
                  <div className="mt-2">
                    <div className="flex items-center text-xs text-gray-600">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse mr-2" />
                      处理中...
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Vault ID Display */}
      {vaultId && (
        <div className="mt-8 bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">金库 ID</p>
              <p className="font-mono text-sm font-semibold text-gray-900">{vaultId}</p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(vaultId)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              复制
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">请勿关闭此页面</p>
            <p>碎片化过程需要多个区块链交易确认，请保持页面打开直到完成。</p>
          </div>
        </div>
      </div>
    </div>
  )
}
