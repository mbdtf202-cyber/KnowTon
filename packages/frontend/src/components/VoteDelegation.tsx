import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface VoteDelegationProps {
  currentDelegate: string | null
  votingPower: string
  onDelegate: (delegatee: string) => Promise<void>
  onUndelegate: () => Promise<void>
  isDelegating: boolean
}

export default function VoteDelegation({
  currentDelegate,
  votingPower,
  onDelegate,
  onUndelegate,
  isDelegating,
}: VoteDelegationProps) {
  const { t } = useTranslation()
  const [delegateeAddress, setDelegateeAddress] = useState('')
  const [showDelegateForm, setShowDelegateForm] = useState(false)

  const handleDelegate = async () => {
    if (!delegateeAddress || !delegateeAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert(t('governance.invalidAddress'))
      return
    }

    try {
      await onDelegate(delegateeAddress)
      setDelegateeAddress('')
      setShowDelegateForm(false)
    } catch (error) {
      console.error('Failed to delegate:', error)
    }
  }

  const handleUndelegate = async () => {
    try {
      await onUndelegate()
    } catch (error) {
      console.error('Failed to undelegate:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          {t('governance.voteDelegation')}
        </h3>
      </div>

      {/* Current Delegation Status */}
      <div className="mb-6">
        {currentDelegate ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 mb-1">
                  {t('governance.currentlyDelegatedTo')}
                </p>
                <p className="text-sm font-mono text-blue-700 break-all">
                  {currentDelegate}
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  {t('governance.delegatedVotingPower')}: {Number(votingPower).toLocaleString()}
                </p>
              </div>
              <button
                onClick={handleUndelegate}
                disabled={isDelegating}
                className="ml-4 text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
              >
                {t('governance.undelegate')}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              {t('governance.notDelegated')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t('governance.yourVotingPower')}: {Number(votingPower).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Delegation Info */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">{t('governance.aboutDelegation')}</p>
            <p className="text-xs">
              {t('governance.delegationDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* Delegate Form */}
      {!currentDelegate && (
        <>
          {!showDelegateForm ? (
            <button
              onClick={() => setShowDelegateForm(true)}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t('governance.delegateVotes')}
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('governance.delegateeAddress')}
                </label>
                <input
                  type="text"
                  value={delegateeAddress}
                  onChange={(e) => setDelegateeAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('governance.enterValidAddress')}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDelegate}
                  disabled={isDelegating || !delegateeAddress}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isDelegating ? t('governance.delegating') : t('governance.confirmDelegate')}
                </button>
                <button
                  onClick={() => {
                    setShowDelegateForm(false)
                    setDelegateeAddress('')
                  }}
                  disabled={isDelegating}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delegation Benefits */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          {t('governance.whyDelegate')}
        </h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{t('governance.delegateBenefit1')}</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{t('governance.delegateBenefit2')}</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{t('governance.delegateBenefit3')}</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
