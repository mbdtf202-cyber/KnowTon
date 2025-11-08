import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useGovernance } from '../hooks/useGovernance'
import ProposalList from '../components/ProposalList'
import ProposalDetails from '../components/ProposalDetails'
import CreateProposalForm from '../components/CreateProposalForm'
import VoteDelegation from '../components/VoteDelegation'
import VotingPowerCalculator from '../components/VotingPowerCalculator'
import { ExecutionQueue } from '../components/ExecutionQueue'
import TransactionModal from '../components/TransactionModal'

export default function GovernancePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isConnected, address } = useAuth()
  const {
    governanceState,
    proposals,
    votingPower,
    votingPowerBreakdown,
    currentDelegate,
    loadProposals,
    loadVotingPower,
    loadDelegationStatus,
    createProposal,
    castVote,
    executeProposal,
    delegateVotes,
    undelegateVotes,
    reset,
  } = useGovernance()

  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showDelegation, setShowDelegation] = useState(false)
  const [showVotingPower, setShowVotingPower] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending' | 'closed' | 'execution'>('all')

  useEffect(() => {
    loadProposals()
  }, [loadProposals])

  useEffect(() => {
    if (isConnected && address) {
      loadVotingPower(address)
      loadDelegationStatus(address)
    }
  }, [isConnected, address, loadVotingPower, loadDelegationStatus])

  // Redirect if not connected
  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <svg
            className="h-12 w-12 text-yellow-600 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.connectWalletRequired')}</h2>
          <p className="text-gray-600 mb-4">{t('pages.connectWalletMessage')}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {t('pages.backToHome')}
          </button>
        </div>
      </div>
    )
  }

  const handleCreateProposal = async (
    proposalType: any,
    description: string,
    callData?: string
  ) => {
    try {
      await createProposal(proposalType, description, callData)
      setShowCreateForm(false)
    } catch (error) {
      console.error('Failed to create proposal:', error)
    }
  }

  const handleVote = async (proposalId: string, support: 0 | 1 | 2) => {
    try {
      await castVote(proposalId, support)
    } catch (error) {
      console.error('Failed to cast vote:', error)
    }
  }

  const handleExecute = async (proposalId: string) => {
    try {
      await executeProposal(proposalId)
    } catch (error) {
      console.error('Failed to execute proposal:', error)
    }
  }

  const handleDelegate = async (delegatee: string) => {
    try {
      await delegateVotes(delegatee)
    } catch (error) {
      console.error('Failed to delegate:', error)
    }
  }

  const handleUndelegate = async () => {
    try {
      await undelegateVotes()
    } catch (error) {
      console.error('Failed to undelegate:', error)
    }
  }

  const handleRefreshVotingPower = async () => {
    if (address) {
      await loadVotingPower(address)
    }
  }

  const handleModalClose = () => {
    if (governanceState.status === 'complete') {
      reset()
      loadProposals()
      if (address) {
        loadDelegationStatus(address)
      }
    } else if (governanceState.status === 'error') {
      reset()
    }
  }

  const selectedProposal = proposals.find((p) => p.id === selectedProposalId)

  const filteredProposals = proposals.filter((proposal) => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'active') return proposal.status === 'ACTIVE'
    if (filterStatus === 'pending') return proposal.status === 'PENDING'
    if (filterStatus === 'closed')
      return ['SUCCEEDED', 'DEFEATED', 'EXECUTED', 'CANCELLED'].includes(proposal.status)
    return true
  })

  const stats = {
    total: proposals.length,
    active: proposals.filter((p) => p.status === 'ACTIVE').length,
    succeeded: proposals.filter((p) => p.status === 'SUCCEEDED').length,
    executed: proposals.filter((p) => p.status === 'EXECUTED').length,
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('governance.title')}</h1>
        <p className="text-gray-600">
          {t('governance.subtitle')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('pages.totalProposals')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('pages.active')}</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('pages.passed')}</p>
              <p className="text-2xl font-bold text-blue-600">{stats.succeeded}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('pages.executed')}</p>
              <p className="text-2xl font-bold text-purple-600">{stats.executed}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Voting Power Card */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-blue-100 mb-1">{t('pages.yourVotingPower')}</p>
            <p className="text-3xl font-bold">{Number(votingPower).toLocaleString()} {t('governance.votingPower')}</p>
            <p className="text-sm text-blue-100 mt-2">
              {t('pages.votingPowerDescription')}
            </p>
            {currentDelegate && (
              <div className="mt-3 flex items-center gap-2 text-sm text-blue-100">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{t('governance.votingPowerDelegated')}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-white text-blue-600 py-3 px-6 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center whitespace-nowrap"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('pages.createProposal')}
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setShowVotingPower(!showVotingPower)}
                className="bg-white/20 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                {t('governance.calculator')}
              </button>
              <button
                onClick={() => setShowDelegation(!showDelegation)}
                className="bg-white/20 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {t('governance.delegate')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Voting Power Calculator */}
      {showVotingPower && address && (
        <div className="mb-8">
          <VotingPowerCalculator
            address={address}
            votingPowerBreakdown={votingPowerBreakdown}
            onRefresh={handleRefreshVotingPower}
          />
        </div>
      )}

      {/* Vote Delegation */}
      {showDelegation && (
        <div className="mb-8">
          <VoteDelegation
            currentDelegate={currentDelegate}
            votingPower={votingPower}
            onDelegate={handleDelegate}
            onUndelegate={handleUndelegate}
            isDelegating={governanceState.isDelegating}
          />
        </div>
      )}

      {/* Create Proposal Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">{t('pages.createNewProposal')}</h2>
          <CreateProposalForm
            onSubmit={handleCreateProposal}
            onCancel={() => setShowCreateForm(false)}
            isSubmitting={governanceState.isCreating}
            votingPower={votingPower}
          />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setFilterStatus('all')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                filterStatus === 'all'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('pages.allProposals')}
              <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                {proposals.length}
              </span>
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                filterStatus === 'active'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('pages.active')}
              {stats.active > 0 && (
                <span className="ml-2 bg-green-100 text-green-600 py-0.5 px-2 rounded-full text-xs">
                  {stats.active}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                filterStatus === 'pending'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('pages.pending')}
            </button>
            <button
              onClick={() => setFilterStatus('closed')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                filterStatus === 'closed'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('pages.ended')}
            </button>
            <button
              onClick={() => setFilterStatus('execution')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                filterStatus === 'execution'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('governance.execution.queue')}
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      {filterStatus === 'execution' ? (
        <ExecutionQueue onRefresh={loadProposals} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Proposal List */}
          <div className="lg:col-span-1">
            <ProposalList
              proposals={filteredProposals}
              onSelectProposal={setSelectedProposalId}
              selectedProposalId={selectedProposalId || undefined}
            />
          </div>

          {/* Proposal Details or Info */}
          <div className="lg:col-span-2">
            {selectedProposal ? (
              <ProposalDetails
                proposal={selectedProposal}
                votingPower={votingPower}
                onVote={handleVote}
                onExecute={handleExecute}
                isVoting={governanceState.isVoting}
                isExecuting={governanceState.isExecuting}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <svg
                  className="mx-auto h-16 w-16 text-gray-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('pages.selectProposal')}</h3>
                <p className="text-gray-600">
                  {t('pages.selectProposalDescription')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {t('pages.whatIsDao')}
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              {t('pages.daoGovernanceDescription')}
            </p>
            <p>{t('pages.votingWeightFactors')}</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{t('pages.knownTokensHeld')}</li>
              <li>{t('pages.stakingDuration')}</li>
              <li>{t('pages.historicalParticipation')}</li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {t('pages.governanceProcess')}
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                1
              </span>
              <div>
                <p className="font-medium text-gray-900">{t('pages.createProposalStep')}</p>
                <p className="text-xs">{t('pages.minVotingPower')}</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                2
              </span>
              <div>
                <p className="font-medium text-gray-900">{t('pages.communityVoting')}</p>
                <p className="text-xs">{t('pages.votingPeriod')}</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                3
              </span>
              <div>
                <p className="font-medium text-gray-900">{t('pages.delayedExecution')}</p>
                <p className="text-xs">{t('pages.delayPeriod')}</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                4
              </span>
              <div>
                <p className="font-medium text-gray-900">{t('pages.executeProposal')}</p>
                <p className="text-xs">{t('pages.autoOrManualExecution')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      {governanceState.status !== 'idle' && (
        <TransactionModal
          isOpen={
            governanceState.isCreating ||
            governanceState.isVoting ||
            governanceState.isExecuting ||
            governanceState.status === 'complete' ||
            governanceState.status === 'error'
          }
          status={governanceState.status as 'preparing' | 'signing' | 'confirming' | 'complete' | 'error'}
          txHash={governanceState.txHash || null}
          tokenId={governanceState.proposalId || null}
          error={governanceState.error || null}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}
