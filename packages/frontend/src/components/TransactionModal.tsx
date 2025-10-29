import { useEffect } from 'react'

interface TransactionModalProps {
  isOpen: boolean
  status: 'preparing' | 'signing' | 'confirming' | 'complete' | 'error'
  txHash: string | null
  tokenId: string | null
  error: string | null
  onClose: () => void
}

export default function TransactionModal({
  isOpen,
  status,
  txHash,
  tokenId,
  error,
  onClose,
}: TransactionModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const getStatusIcon = () => {
    switch (status) {
      case 'preparing':
      case 'signing':
      case 'confirming':
        return (
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        )
      case 'complete':
        return (
          <div className="rounded-full bg-green-100 p-4">
            <svg className="h-16 w-16 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      case 'error':
        return (
          <div className="rounded-full bg-red-100 p-4">
            <svg className="h-16 w-16 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )
    }
  }

  const getStatusTitle = () => {
    switch (status) {
      case 'preparing':
        return '准备交易'
      case 'signing':
        return '等待签名'
      case 'confirming':
        return '确认交易'
      case 'complete':
        return '铸造成功！'
      case 'error':
        return '铸造失败'
    }
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'preparing':
        return '正在准备您的 NFT 元数据...'
      case 'signing':
        return '请在钱包中确认交易签名'
      case 'confirming':
        return '交易已提交，等待区块链确认...'
      case 'complete':
        return '您的 IP-NFT 已成功铸造到区块链上'
      case 'error':
        return error || '铸造过程中发生错误，请重试'
    }
  }

  const canClose = status === 'complete' || status === 'error'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={canClose ? onClose : undefined}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Close button (only when transaction is complete or failed) */}
          {canClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Content */}
          <div className="text-center">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {getStatusTitle()}
            </h3>

            {/* Message */}
            <p className="text-gray-600 mb-6">
              {getStatusMessage()}
            </p>

            {/* Transaction details */}
            {txHash && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">交易哈希</p>
                <a
                  href={`https://arbiscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 font-mono break-all"
                >
                  {txHash}
                </a>
              </div>
            )}

            {/* Token ID */}
            {tokenId && status === 'complete' && (
              <div className="bg-green-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Token ID</p>
                <p className="text-lg font-semibold text-green-600">{tokenId}</p>
              </div>
            )}

            {/* Action buttons */}
            {status === 'complete' && (
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  关闭
                </button>
                <button
                  onClick={() => {
                    // Navigate to NFT detail page
                    window.location.href = `/nft/${tokenId}`
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  查看 NFT
                </button>
              </div>
            )}

            {status === 'error' && (
              <button
                onClick={onClose}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                关闭
              </button>
            )}

            {/* Loading state info */}
            {(status === 'preparing' || status === 'signing' || status === 'confirming') && (
              <p className="text-xs text-gray-500 mt-4">
                请勿关闭此窗口
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
