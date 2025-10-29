import { useState } from 'react'
import type { Proposal } from '../types'

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
  const [selectedVote, setSelectedVote] = useState<0 | 1 | 2 | null>(null)

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

  const calculateVotePercentage = () => {
    const total =
      Number(proposal.forVotes) + Number(proposal.againstVotes) + Number(proposal.abstainVotes)
    if (total === 0) return { for: 0, against: 0, abstain: 0 }

    return {
      for: (Number(proposal.forVotes) / total) * 100,
      against: (Number(proposal.againstVotes) / total) * 100,
      abstain: (Number(proposal.abstainVotes) / total) * 100,
    }
  }

  const handleVote = async () => {
    if (selectedVote === null) return
    await onVote(proposal.id, selectedVote)
    setSelectedVote(null)
  }

  const percentages = calculateVotePercentage()
  const totalVotes =
    Number(proposal.forVotes) + Number(proposal.againstVotes) + Number(proposal.abstainVotes)
  const quorumRequired = 100000 // Mock quorum
  const quorumPercentage = (totalVotes / quorumRequired) * 100

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-gray-500">
                {getTypeText(proposal.proposalType)}
              </span>
              <span className="text-sm text-gray-400">•</span>
              <span className="text-sm text-gray-500">提案 #{proposal.id}</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">提案详情</h2>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
              proposal.status
            )}`}
          >
            {getStatusText(proposal.status)}
          </span>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>提案人: {proposal.proposer}</span>
          </div>
          {proposal.status === 'ACTIVE' && (
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                区块 {proposal.startBlock.toLocaleString()} - {proposal.endBlock.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">提案说明</h3>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{proposal.description}</p>
      </div>

      {/* Voting Results */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">投票结果</h3>

        {/* Quorum Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>法定人数进度</span>
            <span>
              {totalVotes.toLocaleString()} / {quorumRequired.toLocaleString()} 票 (
              {quorumPercentage.toFixed(1)}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-full rounded-full transition-all ${
                quorumPercentage >= 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(quorumPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Vote Breakdown */}
        <div className="space-y-4">
          {/* For Votes */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                <span className="font-medium text-gray-900">赞成</span>
              </div>
              <span className="text-gray-600">
                {Number(proposal.forVotes).toLocaleString()} 票 ({percentages.for.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-full rounded-full transition-all"
                style={{ width: `${percentages.for}%` }}
              />
            </div>
          </div>

          {/* Against Votes */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                <span className="font-medium text-gray-900">反对</span>
              </div>
              <span className="text-gray-600">
                {Number(proposal.againstVotes).toLocaleString()} 票 ({percentages.against.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-500 h-full rounded-full transition-all"
                style={{ width: `${percentages.against}%` }}
              />
            </div>
          </div>

          {/* Abstain Votes */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full mr-2" />
                <span className="font-medium text-gray-900">弃权</span>
              </div>
              <span className="text-gray-600">
                {Number(proposal.abstainVotes).toLocaleString()} 票 ({percentages.abstain.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gray-400 h-full rounded-full transition-all"
                style={{ width: `${percentages.abstain}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Voting Actions */}
      {proposal.status === 'ACTIVE' && (
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">投票</h3>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-blue-600 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm">
                <span className="font-medium text-gray-900">您的投票权重: </span>
                <span className="text-gray-700">{Number(votingPower).toLocaleString()} 票</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <button
              onClick={() => setSelectedVote(1)}
              disabled={isVoting}
              className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                selectedVote === 1
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-green-300'
              } ${isVoting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center">
                <div
                  className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                    selectedVote === 1 ? 'border-green-500 bg-green-500' : 'border-gray-300'
                  }`}
                >
                  {selectedVote === 1 && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <span className="font-medium text-gray-900">赞成提案</span>
              </div>
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>

            <button
              onClick={() => setSelectedVote(0)}
              disabled={isVoting}
              className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                selectedVote === 0
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-red-300'
              } ${isVoting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center">
                <div
                  className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                    selectedVote === 0 ? 'border-red-500 bg-red-500' : 'border-gray-300'
                  }`}
                >
                  {selectedVote === 0 && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <span className="font-medium text-gray-900">反对提案</span>
              </div>
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <button
              onClick={() => setSelectedVote(2)}
              disabled={isVoting}
              className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                selectedVote === 2
                  ? 'border-gray-500 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${isVoting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center">
                <div
                  className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                    selectedVote === 2 ? 'border-gray-500 bg-gray-500' : 'border-gray-300'
                  }`}
                >
                  {selectedVote === 2 && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <span className="font-medium text-gray-900">弃权</span>
              </div>
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
          </div>

          <button
            onClick={handleVote}
            disabled={selectedVote === null || isVoting}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVoting ? '投票中...' : '提交投票'}
          </button>
        </div>
      )}

      {/* Execute Action */}
      {proposal.status === 'SUCCEEDED' && (
        <div className="p-6">
          <button
            onClick={() => onExecute(proposal.id)}
            disabled={isExecuting}
            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isExecuting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                执行中...
              </>
            ) : (
              '执行提案'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
