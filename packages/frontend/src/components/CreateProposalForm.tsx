import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const [proposalType, setProposalType] = useState<Proposal['proposalType']>('PARAMETER_CHANGE')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [callData, setCallData] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const PROPOSAL_THRESHOLD = 1000
  const STAKE_AMOUNT = 5000
  const hasEnoughVotingPower = Number(votingPower) >= PROPOSAL_THRESHOLD

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasEnoughVotingPower) return

    const fullDescription = title ? `${title}\n\n${description}` : description
    await onSubmit(proposalType, fullDescription, callData || undefined)
  }

  const proposalTypes: Array<{
    value: Proposal['proposalType']
    label: string
    description: string
    icon: string
  }> = [
    {
      value: 'PARAMETER_CHANGE',
      label: t('governance.parameterChange'),
      description: t('governance.parameterChangeDesc'),
      icon: '⚙️',
    },
    {
      value: 'TREASURY_ALLOCATION',
      label: t('governance.treasuryAllocation'),
      description: t('governance.treasuryAllocationDesc'),
      icon: '💰',
    },
    {
      value: 'DISPUTE_RESOLUTION',
      label: t('governance.disputeResolution'),
      description: t('governance.disputeResolutionDesc'),
      icon: '⚖️',
    },
    {
      value: 'CONTRACT_UPGRADE',
      label: t('governance.contractUpgrade'),
      description: t('governance.contractUpgradeDesc'),
      icon: '🔧',
    },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Requirements Notice */}
      <div
        className={`p-4 rounded-lg border-2 ${
          hasEnoughVotingPower
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {hasEnoughVotingPower ? (
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h4
              className={`font-semibold mb-1 ${
                hasEnoughVotingPower ? 'text-green-900' : 'text-red-900'
              }`}
            >
              {hasEnoughVotingPower
                ? t('governance.eligibleToPropose')
                : t('governance.notEligibleToPropose')}
            </h4>
            <div className={`text-sm ${hasEnoughVotingPower ? 'text-green-800' : 'text-red-800'}`}>
              <p className="mb-2">{t('governance.proposalRequirements')}</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  {t('governance.minVotingPowerRequired')}: {PROPOSAL_THRESHOLD.toLocaleString()}{' '}
                  {t('governance.votingPower')} (
                  {hasEnoughVotingPower ? '✓' : `${t('governance.youHave')} ${Number(votingPower).toLocaleString()}`}
                  )
                </li>
                <li>
                  {t('governance.stakeRequired')}: {STAKE_AMOUNT.toLocaleString()} KNOW{' '}
                  {t('governance.tokens')}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Proposal Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {t('governance.proposalType')} *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {proposalTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setProposalType(type.value)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                proposalType === type.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{type.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 mb-1">{type.label}</div>
                  <div className="text-xs text-gray-600">{type.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          {t('governance.proposalTitle')} *
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('governance.titlePlaceholder')}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          {t('governance.proposalDescription')} *
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('governance.descriptionPlaceholder')}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={8}
          required
        />
        <p className="mt-2 text-sm text-gray-500">
          {t('governance.descriptionHint')}
        </p>
      </div>

      {/* Advanced Options */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {t('governance.advancedOptions')}
        </button>

        {showAdvanced && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label htmlFor="callData" className="block text-sm font-medium text-gray-700 mb-2">
              {t('governance.callData')} ({t('governance.optional')})
            </label>
            <textarea
              id="callData"
              value={callData}
              onChange={(e) => setCallData(e.target.value)}
              placeholder={t('governance.callDataPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
              rows={4}
            />
            <p className="mt-2 text-xs text-gray-500">
              {t('governance.callDataHint')}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={!hasEnoughVotingPower || !title.trim() || !description.trim() || isSubmitting}
          className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {t('governance.creating')}
            </span>
          ) : (
            t('governance.createProposal')
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t('governance.cancel')}
        </button>
      </div>
    </form>
  )
}
