import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Proposal } from '../types'
import ProposalDiscussion from './ProposalDiscussion'

interface ProposalDetailsProps {
  proposal: Proposal
  votingPower: string
  onVote: (proposalId: string, support: 0 | 1 | 2) => Promise<void>
  onExecute: (proposalId: string) => Promise<void>
  isVoting: boolean
  isExecuting: boolean
}

export default function ProposalDetails({
  proposal,
  votingPower,
  onVote,
  onExecute,
  isVoting,
  isExecuting,
}: ProposalDetailsProps) {
  const { t } = useTranslation()
  const [selectedVote, setSelectedVote] = useState<0 | 1 | 2 | null>(null)
  const [showDiscussion, setShowDiscussion] = useState(false)

  const totalVotes =
    Number(proposal.forVotes) +
    Number(proposal.againstVotes) +
    Number(proposal.abstainVotes)

  const forPercentage = totalVotes > 0 ? (Number(proposal.forVotes) / totalVotes) * 100 : 0
  const againstPercentage =
    totalVotes > 0 ? (Number(proposal.againstVotes) / totalVotes) * 100 : 0
  const abstainPercentage =
    totalVotes > 0 ? (Number(proposal.abstainVotes) / totalVotes) * 100 : 0

  const canVote = proposal.status === 'ACTIVE' && Number(votingPower) > 0
  const canExecute = proposal.status === 'SUCCEEDED'

  const getStatusColor = (status: Proposal['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'SUCCEEDED':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'EXECUTED':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'DEFEATED':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getProposalTypeLabel = (type: Proposal['proposalType']) => {
    switch (type) {
      case 'PARAMETER_CHANGE':
        return t('governance.parameterChange')
      case 'TREASURY_ALLOCATION':
        return t('governance.treasuryAllocation')
      case 'DISPUTE_RESOLUTION':
        return t('governance.disputeResolution')
      case 'CONTRACT_UPGRADE':
        return t('governance.contractUpgrade')
      default:
        return type
    }
  }

  const handleVote = async () => {
    if (selectedVote === null) return
    await onVote(proposal.id, selectedVote)
    setSelectedVote(null)
  }

  const handleExecute = async () => {
    await onExecute(proposal.id)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">
                {t('governance.proposalId')} #{proposal.id}
              </h2>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border-2 ${getStatusColor(
                  proposal.status
                )}`}
              >
                {proposal.status}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {getProposalTypeLabel(proposal.proposalType)}
            </div>
          </div>
        </div>

        {/* Proposer Info */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span>
            {t('governance.proposedBy')}{' '}
            <span className="font-mono font-medium">
              {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
            </span>
          </span>
        </div>

        {/* Block Range */}
        <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              {t('governance.blocks')}: {proposal.startBlock.toLocaleString()} -{' '}
              {proposal.endBlock.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          {t('governance.description')}
        </h3>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
          {proposal.description}
        </p>
      </div>

      {/* Voting Results */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('governance.votingResults')}
        </h3>

        <div className="space-y-4">
          {/* For Votes */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  {t('governance.for')}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  {Number(proposal.forVotes).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">{forPercentage.toFixed(1)}%</div>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-green-500 h-full transition-all duration-300"
                style={{ width: `${forPercentage}%` }}
              />
            </div>
          </div>

          {/* Against Votes */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  {t('governance.against')}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  {Number(proposal.againstVotes).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">{againstPercentage.toFixed(1)}%</div>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-red-500 h-full transition-all duration-300"
                style={{ width: `${againstPercentage}%` }}
              />
            </div>
          </div>

          {/* Abstain Votes */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  {t('governance.abstain')}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  {Number(proposal.abstainVotes).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">{abstainPercentage.toFixed(1)}%</div>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gray-400 h-full transition-all duration-300"
                style={{ width: `${abstainPercentage}%` }}
              />
            </div>
          </div>

          {/* Total */}
          <div className="pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                {t('governance.totalVotes')}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {totalVotes.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Voting Actions */}
      {canVote && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('governance.castYourVote')}
          </h3>

          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                {t('governance.yourVotingPower')}: {Number(votingPower).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <button
              onClick={() => setSelectedVote(1)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedVote === 1
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-green-400 bg-white'
              }`}
            >
              <div className="text-2xl mb-2">✅</div>
              <div className="text-sm font-medium text-gray-900">{t('governance.for')}</div>
            </button>

            <button
              onClick={() => setSelectedVote(0)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedVote === 0
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300 hover:border-red-400 bg-white'
              }`}
            >
              <div className="text-2xl mb-2">❌</div>
              <div className="text-sm font-medium text-gray-900">{t('governance.against')}</div>
            </button>

            <button
              onClick={() => setSelectedVote(2)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedVote === 2
                  ? 'border-gray-500 bg-gray-50'
                  : 'border-gray-300 hover:border-gray-400 bg-white'
              }`}
            >
              <div className="text-2xl mb-2">⚪</div>
              <div className="text-sm font-medium text-gray-900">{t('governance.abstain')}</div>
            </button>
          </div>

          <button
            onClick={handleVote}
            disabled={selectedVote === null || isVoting}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isVoting ? t('governance.voting') : t('governance.submitVote')}
          </button>
        </div>
      )}

      {/* Execute Action */}
      {canExecute && (
        <div className="p-6 border-b border-gray-200 bg-green-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {t('governance.readyToExecute')}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {t('governance.executeDescription')}
          </p>
          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isExecuting ? t('governance.executing') : t('governance.executeProposal')}
          </button>
        </div>
      )}

      {/* Discussion Tab */}
      <div className="p-6">
        <button
          onClick={() => setShowDiscussion(!showDiscussion)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {t('governance.discussion')}
          </h3>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${
              showDiscussion ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDiscussion && (
          <div className="mt-4">
            <ProposalDiscussion proposalId={proposal.id} />
          </div>
        )}
      </div>
    </div>
  )
}
