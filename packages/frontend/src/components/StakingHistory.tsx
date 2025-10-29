import { formatNumber, formatDate } from '../utils/format'

interface StakeHistoryItem {
  id: string
  amount: string
  startTime: number
  lockPeriod: number
  rewardDebt: string
  isActive: boolean
  pendingRewards: string
  unlockTime: number
}

interface StakingHistoryProps {
  stakes: StakeHistoryItem[]
  onUnstake: (stakeId: string) => void
  onClaim: (stakeId: string) => void
  isProcessing: boolean
}

export default function StakingHistory({
  stakes,
  onUnstake,
  onClaim,
  isProcessing,
}: StakingHistoryProps) {
  if (stakes.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-gray-500 text-lg mb-2">暂无质押记录</p>
        <p className="text-gray-400 text-sm">开始质押以获得奖励</p>
      </div>
    )
  }

  const getTimeRemaining = (unlockTime: number) => {
    const now = Date.now()
    const diff = unlockTime - now
    
    if (diff <= 0) return '已解锁'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) {
      return `${days} 天 ${hours} 小时`
    }
    return `${hours} 小时`
  }

  const isUnlocked = (unlockTime: number) => {
    return Date.now() >= unlockTime
  }

  return (
    <div className="space-y-4">
      {stakes.map((stake) => {
        const unlocked = isUnlocked(stake.unlockTime)
        const hasPendingRewards = parseFloat(stake.pendingRewards) > 0

        return (
          <div
            key={stake.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {formatNumber(stake.amount)} KNOW
                  </h3>
                  {stake.isActive && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      活跃
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  质押于 {formatDate(stake.startTime)}
                </p>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">锁定期限</p>
                <p className="font-semibold text-gray-900">{stake.lockPeriod} 天</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>进度</span>
                <span>{unlocked ? '100%' : `${Math.min(100, ((Date.now() - stake.startTime) / (stake.unlockTime - stake.startTime)) * 100).toFixed(0)}%`}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    unlocked ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{
                    width: unlocked
                      ? '100%'
                      : `${Math.min(100, ((Date.now() - stake.startTime) / (stake.unlockTime - stake.startTime)) * 100)}%`,
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>开始</span>
                <span className={unlocked ? 'text-green-600 font-medium' : ''}>
                  {unlocked ? '已解锁' : getTimeRemaining(stake.unlockTime)}
                </span>
              </div>
            </div>

            {/* Rewards */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">待领取奖励</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(stake.pendingRewards)} KNOW
                  </p>
                </div>
                <button
                  onClick={() => onClaim(stake.id)}
                  disabled={!hasPendingRewards || isProcessing}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  领取奖励
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={() => onUnstake(stake.id)}
                disabled={!unlocked || isProcessing}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  unlocked
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {unlocked ? '解除质押' : '锁定中'}
              </button>
              
              <button
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                onClick={() => {
                  // TODO: View details
                  console.log('View stake details:', stake.id)
                }}
              >
                查看详情
              </button>
            </div>

            {/* Unlock Warning */}
            {!unlocked && (
              <div className="mt-3 flex items-start text-xs text-gray-500">
                <svg className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>提前解锁需要等待 7 天解绑期，期间不产生奖励</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
