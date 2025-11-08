import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface VotingPowerBreakdown {
  tokenBalance: string
  quadraticWeight: string
  activityScore: number
  activityMultiplier: number
  totalVotingPower: string
}

interface VotingPowerCalculatorProps {
  address: string
  votingPowerBreakdown: VotingPowerBreakdown
  onRefresh: () => Promise<void>
}

export default function VotingPowerCalculator({
  address,
  votingPowerBreakdown,
  onRefresh,
}: VotingPowerCalculatorProps) {
  const { t } = useTranslation()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  const formatNumber = (value: string | number) => {
    return Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }

  const getActivityLevel = (score: number) => {
    if (score >= 800) return { label: t('governance.veryActive'), color: 'text-green-600', bgColor: 'bg-green-100' }
    if (score >= 500) return { label: t('governance.active'), color: 'text-blue-600', bgColor: 'bg-blue-100' }
    if (score >= 200) return { label: t('governance.moderate'), color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
    return { label: t('governance.lowActivity'), color: 'text-gray-600', bgColor: 'bg-gray-100' }
  }

  const activityLevel = getActivityLevel(votingPowerBreakdown.activityScore)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          {t('governance.votingPowerCalculator')}
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 flex items-center gap-1"
        >
          <svg
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {t('common.refresh')}
        </button>
      </div>

      {/* Total Voting Power Display */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 mb-6 text-white">
        <p className="text-blue-100 text-sm mb-1">{t('governance.yourTotalVotingPower')}</p>
        <p className="text-4xl font-bold mb-2">
          {formatNumber(votingPowerBreakdown.totalVotingPower)}
        </p>
        <p className="text-sm text-blue-100">
          {t('governance.basedOnTokensAndActivity')}
        </p>
      </div>

      {/* Toggle Details Button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors mb-4"
      >
        <span className="text-sm font-medium text-gray-700">
          {showDetails ? t('governance.hideCalculation') : t('governance.showCalculation')}
        </span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${showDetails ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Detailed Breakdown */}
      {showDetails && (
        <div className="space-y-4">
          {/* Token Balance */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {t('governance.tokenBalance')}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {formatNumber(votingPowerBreakdown.tokenBalance)}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {t('governance.knownTokensHeld')}
            </div>
          </div>

          {/* Quadratic Weight */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {t('governance.quadraticWeight')}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {formatNumber(votingPowerBreakdown.quadraticWeight)}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {t('governance.sqrtOfTokenBalance')}
            </div>
            <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
              <strong>{t('governance.formula')}:</strong> √{formatNumber(votingPowerBreakdown.tokenBalance)} = {formatNumber(votingPowerBreakdown.quadraticWeight)}
            </div>
          </div>

          {/* Activity Score */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {t('governance.activityScore')}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${activityLevel.bgColor} ${activityLevel.color}`}>
                  {activityLevel.label}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {votingPowerBreakdown.activityScore}
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mb-2">
              {t('governance.basedOnParticipation')}
            </div>
            
            {/* Activity Score Progress Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>0</span>
                <span>1000</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((votingPowerBreakdown.activityScore / 1000) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Activity Multiplier */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {t('governance.activityMultiplier')}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {votingPowerBreakdown.activityMultiplier}%
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {t('governance.bonusFromActivity')}
            </div>
            <div className="mt-2 p-2 bg-purple-50 rounded text-xs text-purple-700">
              <strong>{t('governance.calculation')}:</strong> {t('governance.activityMultiplierFormula', {
                score: votingPowerBreakdown.activityScore,
                multiplier: votingPowerBreakdown.activityMultiplier
              })}
            </div>
          </div>

          {/* Final Calculation */}
          <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
            <div className="text-sm font-medium text-gray-900 mb-3">
              {t('governance.finalCalculation')}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('governance.baseVotingPower')}:</span>
                <span className="font-mono">{formatNumber(votingPowerBreakdown.quadraticWeight)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('governance.activityBonus')}:</span>
                <span className="font-mono">× (1 + {votingPowerBreakdown.activityMultiplier / 100})</span>
              </div>
              <div className="border-t border-blue-300 pt-2 flex justify-between font-semibold">
                <span className="text-gray-900">{t('governance.totalVotingPower')}:</span>
                <span className="font-mono text-blue-700">{formatNumber(votingPowerBreakdown.totalVotingPower)}</span>
              </div>
            </div>
          </div>

          {/* How to Increase Voting Power */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              {t('governance.howToIncrease')}
            </h4>
            <ul className="space-y-1 text-xs text-yellow-800">
              <li className="flex items-start gap-2">
                <span className="text-yellow-600">•</span>
                <span>{t('governance.increaseTokens')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600">•</span>
                <span>{t('governance.participateInVoting')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600">•</span>
                <span>{t('governance.createProposals')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600">•</span>
                <span>{t('governance.engageInDiscussions')}</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
