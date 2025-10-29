import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useStaking } from '../hooks/useStaking'
import StakingForm from '../components/StakingForm'
import StakingStats from '../components/StakingStats'
import StakingHistory from '../components/StakingHistory'
import TransactionModal from '../components/TransactionModal'

export default function StakingPage() {
  const navigate = useNavigate()
  const { isConnected } = useAuth()
  const {
    stakingState,
    stakingStats,
    stakeHistory,
    stake,
    unstake,
    claimRewards,
    calculateRewards,
    loadStakingStats,
    loadStakeHistory,
    reset,
  } = useStaking()

  const [activeTab, setActiveTab] = useState<'stake' | 'history'>('stake')

  useEffect(() => {
    if (isConnected) {
      loadStakingStats()
      loadStakeHistory()
    }
  }, [isConnected, loadStakingStats, loadStakeHistory])

  // Redirect if not connected
  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <svg className="h-12 w-12 text-yellow-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">需要连接钱包</h2>
          <p className="text-gray-600 mb-4">
            请先连接您的 Web3 钱包以使用质押功能
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const handleStakeSubmit = async (amount: string, lockPeriod: number) => {
    try {
      await stake(amount, lockPeriod)
    } catch (error) {
      console.error('Staking error:', error)
    }
  }

  const handleUnstake = async (stakeId: string) => {
    try {
      await unstake(stakeId)
    } catch (error) {
      console.error('Unstaking error:', error)
    }
  }

  const handleClaimRewards = async (stakeId: string) => {
    try {
      await claimRewards(stakeId)
    } catch (error) {
      console.error('Claim rewards error:', error)
    }
  }

  const handleModalClose = () => {
    if (stakingState.status === 'complete') {
      reset()
      // Reload data
      loadStakingStats()
      loadStakeHistory()
    } else if (stakingState.status === 'error') {
      reset()
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">代币质押</h1>
        <p className="text-gray-600">
          质押 KNOW 代币以获得奖励，支持平台治理并享受被动收入
        </p>
      </div>

      {/* Stats */}
      {stakingStats && (
        <div className="mb-8">
          <StakingStats
            totalStaked={stakingStats.totalStaked}
            userStaked={stakingStats.userStaked}
            apy={stakingStats.apy}
            pendingRewards={stakingStats.pendingRewards}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('stake')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'stake'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              质押代币
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              质押历史
              {stakeHistory.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                  {stakeHistory.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {activeTab === 'stake' && stakingStats && (
              <StakingForm
                onSubmit={handleStakeSubmit}
                isSubmitting={stakingState.isStaking}
                maxBalance="10000" // TODO: Get from wallet
                apy={stakingStats.apy}
                calculateRewards={calculateRewards}
              />
            )}

            {activeTab === 'history' && (
              <StakingHistory
                stakes={stakeHistory}
                onUnstake={handleUnstake}
                onClaim={handleClaimRewards}
                isProcessing={stakingState.isUnstaking || stakingState.isClaiming}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">什么是质押？</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                质押是将您的 KNOW 代币锁定在智能合约中，以支持网络安全和治理，并获得奖励的过程。
              </p>
              <p>
                质押收益来自：
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>平台交易手续费分成</li>
                <li>协议收入分配</li>
                <li>通胀奖励</li>
                <li>治理参与奖励</li>
              </ul>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">质押优势</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900 text-sm">被动收入</p>
                  <p className="text-xs text-gray-600">持续获得质押奖励</p>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900 text-sm">治理权力</p>
                  <p className="text-xs text-gray-600">参与平台决策投票</p>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900 text-sm">锁定加成</p>
                  <p className="text-xs text-gray-600">更长锁定期获得更高收益</p>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900 text-sm">复利增长</p>
                  <p className="text-xs text-gray-600">奖励可再次质押</p>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-1">风险提示</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>质押代币存在智能合约风险</li>
                  <li>锁定期内无法转移代币</li>
                  <li>APY 会根据市场条件波动</li>
                  <li>请仔细阅读条款后再质押</li>
                </ul>
              </div>
            </div>
          </div>

          {/* FAQ Link */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <button className="w-full text-left flex items-center justify-between text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
              <span>查看常见问题</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      {stakingState.status !== 'idle' && (
        <TransactionModal
          isOpen={
            stakingState.isStaking ||
            stakingState.isUnstaking ||
            stakingState.isClaiming ||
            stakingState.status === 'complete' ||
            stakingState.status === 'error'
          }
          status={stakingState.status as 'preparing' | 'signing' | 'confirming' | 'complete' | 'error'}
          txHash={stakingState.txHash || null}
          tokenId={stakingState.stakeId || null}
          error={stakingState.error || null}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}
