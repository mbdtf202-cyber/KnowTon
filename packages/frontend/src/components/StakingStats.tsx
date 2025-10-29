import { formatNumber } from '../utils/format'

interface StakingStatsProps {
  totalStaked: string
  userStaked: string
  apy: number
  pendingRewards: string
}

export default function StakingStats({
  totalStaked,
  userStaked,
  apy,
  pendingRewards,
}: StakingStatsProps) {
  const userStakePercentage = parseFloat(totalStaked) > 0
    ? (parseFloat(userStaked) / parseFloat(totalStaked)) * 100
    : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Staked */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <p className="text-blue-100 text-sm font-medium">总质押量</p>
          <svg className="w-8 h-8 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-3xl font-bold mb-1">{formatNumber(totalStaked)}</p>
        <p className="text-blue-100 text-sm">KNOW</p>
      </div>

      {/* Your Stake */}
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <p className="text-purple-100 text-sm font-medium">我的质押</p>
          <svg className="w-8 h-8 text-purple-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <p className="text-3xl font-bold mb-1">{formatNumber(userStaked)}</p>
        <p className="text-purple-100 text-sm">
          {userStakePercentage > 0 ? `${userStakePercentage.toFixed(2)}% 占比` : 'KNOW'}
        </p>
      </div>

      {/* APY */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <p className="text-green-100 text-sm font-medium">年化收益率</p>
          <svg className="w-8 h-8 text-green-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <p className="text-3xl font-bold mb-1">{apy.toFixed(2)}%</p>
        <p className="text-green-100 text-sm">基础 APY</p>
      </div>

      {/* Pending Rewards */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <p className="text-orange-100 text-sm font-medium">待领取奖励</p>
          <svg className="w-8 h-8 text-orange-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        </div>
        <p className="text-3xl font-bold mb-1">{formatNumber(pendingRewards)}</p>
        <p className="text-orange-100 text-sm">KNOW</p>
      </div>
    </div>
  )
}
