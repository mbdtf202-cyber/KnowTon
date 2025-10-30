import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useFractionalization } from '../hooks/useFractionalization'
import FractionalizeForm from '../components/FractionalizeForm'
import FractionalizationProgress from '../components/FractionalizationProgress'
import FractionalHolders from '../components/FractionalHolders'
import TransactionModal from '../components/TransactionModal'

export default function FractionalizePage() {
  const { t } = useTranslation()
  const { tokenId } = useParams<{ tokenId: string }>()
  const navigate = useNavigate()
  const { isConnected } = useAuth()
  const { 
    fractionalizeState, 
    vaultInfo, 
    fractionalize, 
    loadVaultInfo,
    reset 
  } = useFractionalization()
  
  const [step, setStep] = useState<'form' | 'progress' | 'complete'>('form')

  useEffect(() => {
    if (tokenId && vaultInfo === null) {
      loadVaultInfo(tokenId)
    }
  }, [tokenId, vaultInfo, loadVaultInfo])

  // Redirect if not connected
  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <svg className="h-12 w-12 text-yellow-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.connectWalletRequired')}</h2>
          <p className="text-gray-600 mb-4">
            {t('pages.connectWalletMessage')}
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {t('pages.backToHome')}
          </button>
        </div>
      </div>
    )
  }

  const handleFractionalizeSubmit = async (formData: any) => {
    try {
      await fractionalize(formData)
      setStep('progress')
    } catch (error) {
      console.error('Fractionalization error:', error)
    }
  }

  const handleModalClose = () => {
    if (fractionalizeState.status === 'complete') {
      setStep('complete')
      reset()
    } else if (fractionalizeState.status === 'error') {
      reset()
    }
  }

  const handleViewVault = () => {
    if (fractionalizeState.vaultId) {
      navigate(`/vault/${fractionalizeState.vaultId}`)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('pages.back')}
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('fractionalize.title')}</h1>
        <p className="text-gray-600">
          {t('fractionalize.subtitle')}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center ${step === 'form' ? 'text-blue-600' : 'text-green-600'}`}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              step === 'form' ? 'border-blue-600 bg-blue-50' : 'border-green-600 bg-green-50'
            }`}>
              {step !== 'form' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-sm font-semibold">1</span>
              )}
            </div>
            <span className="ml-2 font-medium">配置参数</span>
          </div>
          
          <div className="w-16 h-0.5 bg-gray-300"></div>
          
          <div className={`flex items-center ${step === 'progress' ? 'text-blue-600' : step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              step === 'progress' ? 'border-blue-600 bg-blue-50' : step === 'complete' ? 'border-green-600 bg-green-50' : 'border-gray-300'
            }`}>
              {step === 'complete' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-sm font-semibold">2</span>
              )}
            </div>
            <span className="ml-2 font-medium">执行碎片化</span>
          </div>
          
          <div className="w-16 h-0.5 bg-gray-300"></div>
          
          <div className={`flex items-center ${step === 'complete' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              step === 'complete' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
            }`}>
              <span className="text-sm font-semibold">3</span>
            </div>
            <span className="ml-2 font-medium">完成</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {step === 'form' && (
              <FractionalizeForm
                tokenId={tokenId || ''}
                onSubmit={handleFractionalizeSubmit}
                isSubmitting={fractionalizeState.isFractionalizing}
              />
            )}

            {step === 'progress' && fractionalizeState.vaultId && (
              <FractionalizationProgress
                vaultId={fractionalizeState.vaultId}
                status={fractionalizeState.status}
              />
            )}

            {step === 'complete' && fractionalizeState.vaultId && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">碎片化成功！</h2>
                <p className="text-gray-600 mb-6">
                  您的 NFT 已成功碎片化，流动性池已创建
                </p>
                
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">金库 ID</p>
                      <p className="font-mono text-sm font-semibold text-gray-900">
                        {fractionalizeState.vaultId}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">代币地址</p>
                      <p className="font-mono text-sm font-semibold text-gray-900">
                        {fractionalizeState.fractionalToken?.slice(0, 10)}...
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">总供应量</p>
                      <p className="font-semibold text-gray-900">
                        {fractionalizeState.totalSupply}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">流动性池</p>
                      <p className="font-semibold text-gray-900">
                        {fractionalizeState.poolAddress ? '已创建' : '待创建'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center space-x-4">
                  <button
                    onClick={handleViewVault}
                    className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    查看金库详情
                  </button>
                  <button
                    onClick={() => navigate('/marketplace')}
                    className="bg-gray-100 text-gray-700 py-2 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    前往市场
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">什么是碎片化？</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                碎片化将您的 NFT 锁定在金库中，并铸造可交易的 ERC-20 代币份额。
              </p>
              <p>
                这样可以：
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>降低投资门槛</li>
                <li>提供流动性</li>
                <li>允许部分所有权</li>
                <li>创建交易市场</li>
              </ul>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">碎片化优势</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900 text-sm">流动性提升</p>
                  <p className="text-xs text-gray-600">更容易买卖您的资产份额</p>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900 text-sm">价格发现</p>
                  <p className="text-xs text-gray-600">市场决定真实价值</p>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900 text-sm">社区参与</p>
                  <p className="text-xs text-gray-600">让更多人参与您的作品</p>
                </div>
              </div>
            </div>
          </div>

          {/* Holders Distribution (if vault exists) */}
          {vaultInfo && vaultInfo.holders && (
            <FractionalHolders holders={vaultInfo.holders} />
          )}
        </div>
      </div>

      {/* Transaction Modal */}
      {fractionalizeState.status !== 'idle' && fractionalizeState.status !== 'creating_pool' && step !== 'complete' && (
        <TransactionModal
          isOpen={fractionalizeState.isFractionalizing || fractionalizeState.status === 'complete' || fractionalizeState.status === 'error'}
          status={fractionalizeState.status as 'preparing' | 'signing' | 'confirming' | 'complete' | 'error'}
          txHash={fractionalizeState.txHash}
          tokenId={fractionalizeState.vaultId}
          error={fractionalizeState.error}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}
