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
  const getStatusColor = (status: Proposal['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'SUCCEEDED':
        return 'bg-blue-100 text-blue-800'
      case 'EXECUTED':
        return 'bg-purple-100 text-purple-800'
      case 'DEFEATED':
        return 'bg-red-100 text-red-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: Proposal['status']) => {
    switch (status) {
      case 'ACTIVE':
        return '进行中'
      case 'PENDING':
        return '待开始'
      case 'SUCCEEDED':
        return '已通过'
      case 'EXECUTED':
        return '已执行'
      case 'DEFEATED':
        return '未通过'
      case 'CANCELLED':
        return '已取消'
      default:
        return status
    }
  }

  const getTypeText = (type: Proposal['proposalType']) => {
    switch (type) {
      case 'PARAMETER_CHANGE':
        return '参数变更'
      case 'DISPUTE_RESOLUTION':
        return '争议解决'
      case 'TREASURY_ALLOCATION':
        return '资金分配'
      case 'CONTRACT_UPGRADE':
        return '合约升级'
      default:
        return type
    }
  }

  const getTypeIcon = (type: Proposal['proposalType']) => {
    switch (type) {
      case 'PARAMETER_CHANGE':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
        )
      case 'DISPUTE_RESOLUTION':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
            />
          </svg>
        )
      case 'TREASURY_ALLOCATION':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      case 'CONTRACT_UPGRADE':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        )
    }
  }

  const calculateVotePercentage = (proposal: Proposal) => {
    const total =
      Number(proposal.forVotes) + Number(proposal.againstVotes) + Number(proposal.abstainVotes)
    if (total === 0) return { for: 0, against: 0, abstain: 0 }

    return {
      for: (Number(proposal.forVotes) / total) * 100,
      against: (Number(proposal.againstVotes) / total) * 100,
      abstain: (Number(proposal.abstainVotes) / total) * 100,
    }
  }

  if (proposals.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">暂无提案</h3>
        <p className="mt-1 text-sm text-gray-500">开始创建第一个治理提案</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {proposals.map((proposal) => {
        const percentages = calculateVotePercentage(proposal)
        const isSelected = selectedProposalId === proposal.id

        return (
          <div
            key={proposal.id}
            onClick={() => onSelectProposal(proposal.id)}
            className={`bg-white rounded-lg border-2 p-6 cursor-pointer transition-all hover:shadow-md ${
              isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-3 flex-1">
                <div className="flex-shrink-0 text-gray-400">{getTypeIcon(proposal.proposalType)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-500">
                      {getTypeText(proposal.proposalType)}
                    </span>
                    <span className="text-sm text-gray-400">•</span>
                    <span className="text-sm text-gray-500">提案 #{proposal.id}</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{proposal.description}</p>
                </div>
              </div>
              <span
                className={`ml-4 flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                  proposal.status
                )}`}
              >
                {getStatusText(proposal.status)}
              </span>
            </div>

            {/* Vote Progress */}
            {(proposal.status === 'ACTIVE' || proposal.status === 'SUCCEEDED' || proposal.status === 'DEFEATED') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>投票进度</span>
                  <span>
                    {(
                      Number(proposal.forVotes) +
                      Number(proposal.againstVotes) +
                      Number(proposal.abstainVotes)
                    ).toLocaleString()}{' '}
                    票
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="h-full flex">
                    <div
                      className="bg-green-500"
                      style={{ width: `${percentages.for}%` }}
                      title={`赞成: ${percentages.for.toFixed(1)}%`}
                    />
                    <div
                      className="bg-red-500"
                      style={{ width: `${percentages.against}%` }}
                      title={`反对: ${percentages.against.toFixed(1)}%`}
                    />
                    <div
                      className="bg-gray-400"
                      style={{ width: `${percentages.abstain}%` }}
                      title={`弃权: ${percentages.abstain.toFixed(1)}%`}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-1" />
                      <span className="text-gray-600">
                        赞成 {percentages.for.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-1" />
                      <span className="text-gray-600">
                        反对 {percentages.against.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-400 rounded-full mr-1" />
                      <span className="text-gray-600">
                        弃权 {percentages.abstain.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>提案人: {proposal.proposer}</span>
              {proposal.status === 'ACTIVE' && (
                <span>区块 {proposal.startBlock.toLocaleString()} - {proposal.endBlock.toLocaleString()}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
