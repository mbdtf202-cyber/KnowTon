import { useTranslation } from 'react-i18next'
import type { Proposal } from '../types'

interface ProposalListProps {
  proposals: Proposal[]
  onSelectProposal: (proposalId: string) => void
  selectedProposalId?: string
}

export default function ProposalList({
  proposals,
  onSelectProposal,
  selectedProposalId,
}: ProposalListProps) {
  const { t } = useTranslation()

  const getStatusColor = (status: Proposal['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'SUCCEEDED':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'EXECUTED':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'DEFEATED':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getProposalTypeIcon = (type: Proposal['proposalType']) => {
    switch (type) {
      case 'PARAMETER_CHANGE':
        return '⚙️'
      case 'TREASURY_ALLOCATION':
        return '💰'
      case 'DISPUTE_RESOLUTION':
        return '⚖️'
      case 'CONTRACT_UPGRADE':
        return '🔧'
      default:
        return '📋'
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

  if (proposals.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t('governance.noProposals')}
        </h3>
        <p className="text-gray-600 text-sm">
          {t('governance.noProposalsDescription')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {proposals.map((proposal) => {
        const isSelected = proposal.id === selectedProposalId
        const totalVotes =
          Number(proposal.forVotes) +
          Number(proposal.againstVotes) +
          Number(proposal.abstainVotes)
        const forPercentage =
          totalVotes > 0 ? (Number(proposal.forVotes) / totalVotes) * 100 : 0

        return (
          <button
            key={proposal.id}
            onClick={() => onSelectProposal(proposal.id)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
              isSelected
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getProposalTypeIcon(proposal.proposalType)}</span>
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    {t('governance.proposalId')} #{proposal.id}
                  </div>
                  <div
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                      proposal.status
                    )}`}
                  >
                    {proposal.status}
                  </div>
                </div>
              </div>
            </div>

            {/* Type */}
            <div className="text-xs text-gray-600 mb-2">
              {getProposalTypeLabel(proposal.proposalType)}
            </div>

            {/* Description Preview */}
            <p className="text-sm text-gray-900 mb-3 line-clamp-2">
              {proposal.description}
            </p>

            {/* Vote Progress */}
            {totalVotes > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{t('governance.support')}</span>
                  <span>{forPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-green-500 h-full transition-all duration-300"
                    style={{ width: `${forPercentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Proposer */}
            <div className="mt-2 text-xs text-gray-500">
              {t('governance.proposedBy')}{' '}
              <span className="font-mono">{proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
