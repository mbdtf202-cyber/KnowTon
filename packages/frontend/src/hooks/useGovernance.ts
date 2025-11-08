import { useState, useCallback } from 'react'
import type { Proposal } from '../types'

interface GovernanceState {
  isCreating: boolean
  isVoting: boolean
  isExecuting: boolean
  isDelegating: boolean
  status: 'idle' | 'preparing' | 'signing' | 'confirming' | 'complete' | 'error'
  txHash: string | null
  proposalId: string | null
  error: string | null
}

interface VotingPowerBreakdown {
  tokenBalance: string
  quadraticWeight: string
  activityScore: number
  activityMultiplier: number
  totalVotingPower: string
}

export function useGovernance() {
  const [governanceState, setGovernanceState] = useState<GovernanceState>({
    isCreating: false,
    isVoting: false,
    isExecuting: false,
    isDelegating: false,
    status: 'idle',
    txHash: null,
    proposalId: null,
    error: null,
  })

  const [proposals, setProposals] = useState<Proposal[]>([])
  const [votingPower, setVotingPower] = useState<string>('0')
  const [votingPowerBreakdown, setVotingPowerBreakdown] = useState<VotingPowerBreakdown>({
    tokenBalance: '0',
    quadraticWeight: '0',
    activityScore: 0,
    activityMultiplier: 0,
    totalVotingPower: '0',
  })
  const [currentDelegate, setCurrentDelegate] = useState<string | null>(null)

  // Load proposals
  const loadProposals = useCallback(async () => {
    try {
      // Mock data - replace with actual API call
      const mockProposals: Proposal[] = [
        {
          id: '1',
          proposer: '0x1234...5678',
          proposalType: 'PARAMETER_CHANGE',
          description: '提议将平台交易手续费从 2.5% 降低至 2.0%，以提高市场竞争力并吸引更多用户。此变更将在投票通过后 7 天生效。',
          status: 'ACTIVE',
          forVotes: '125000',
          againstVotes: '45000',
          abstainVotes: '10000',
          startBlock: 1000000,
          endBlock: 1050000,
        },
        {
          id: '2',
          proposer: '0xabcd...efgh',
          proposalType: 'TREASURY_ALLOCATION',
          description: '提议从 DAO 金库中拨款 100,000 USDC 用于市场营销活动，包括社交媒体推广、KOL 合作和社区活动。预计将在 Q2 执行。',
          status: 'ACTIVE',
          forVotes: '200000',
          againstVotes: '80000',
          abstainVotes: '20000',
          startBlock: 1020000,
          endBlock: 1070000,
        },
        {
          id: '3',
          proposer: '0x9876...5432',
          proposalType: 'DISPUTE_RESOLUTION',
          description: '关于 Token ID #12345 的版权争议裁决。经 AI 预言机检测，相似度达到 92%，建议撤销该 NFT 并补偿原创作者。',
          status: 'SUCCEEDED',
          forVotes: '300000',
          againstVotes: '50000',
          abstainVotes: '15000',
          startBlock: 980000,
          endBlock: 1030000,
        },
        {
          id: '4',
          proposer: '0xdef0...1234',
          proposalType: 'CONTRACT_UPGRADE',
          description: '提议升级 RoyaltyDistributor 智能合约至 v2.0，新增批量分配功能和 gas 优化，预计可降低 30% 的 gas 费用。',
          status: 'PENDING',
          forVotes: '0',
          againstVotes: '0',
          abstainVotes: '0',
          startBlock: 1100000,
          endBlock: 1150000,
        },
      ]

      setProposals(mockProposals)
    } catch (error) {
      console.error('Failed to load proposals:', error)
    }
  }, [])

  // Load voting power
  const loadVotingPower = useCallback(async (_address: string) => {
    try {
      // Mock data - replace with actual contract call
      const tokenBalance = '100000'
      const quadraticWeight = Math.sqrt(Number(tokenBalance)).toFixed(2)
      const activityScore = 750
      const activityMultiplier = activityScore > 1000 ? 50 : (activityScore * 50) / 1000
      const totalVotingPower = (Number(quadraticWeight) * (1 + activityMultiplier / 100)).toFixed(2)

      setVotingPower(totalVotingPower)
      setVotingPowerBreakdown({
        tokenBalance,
        quadraticWeight,
        activityScore,
        activityMultiplier,
        totalVotingPower,
      })
    } catch (error) {
      console.error('Failed to load voting power:', error)
    }
  }, [])

  // Load delegation status
  const loadDelegationStatus = useCallback(async (_address: string) => {
    try {
      // Mock data - replace with actual contract call
      // For demo, randomly set delegation status
      const isDelegated = Math.random() > 0.7
      if (isDelegated) {
        setCurrentDelegate('0x' + Math.random().toString(16).substring(2, 42))
      } else {
        setCurrentDelegate(null)
      }
    } catch (error) {
      console.error('Failed to load delegation status:', error)
    }
  }, [])

  // Create proposal
  const createProposal = useCallback(
    async (
      _proposalType: Proposal['proposalType'],
      _description: string,
      _callData?: string
    ) => {
      try {
        setGovernanceState({
          isCreating: true,
          isVoting: false,
          isExecuting: false,
          status: 'preparing',
          txHash: null,
          proposalId: null,
          error: null,
        })

        // Simulate transaction preparation
        await new Promise((resolve) => setTimeout(resolve, 1000))

        setGovernanceState((prev) => ({ ...prev, status: 'signing' }))

        // Simulate signing
        await new Promise((resolve) => setTimeout(resolve, 1500))

        const mockTxHash = '0x' + Math.random().toString(16).substring(2, 66)
        const mockProposalId = String(proposals.length + 1)

        setGovernanceState((prev) => ({
          ...prev,
          status: 'confirming',
          txHash: mockTxHash,
          proposalId: mockProposalId,
        }))

        // Simulate confirmation
        await new Promise((resolve) => setTimeout(resolve, 2000))

        setGovernanceState((prev) => ({ ...prev, status: 'complete', isCreating: false }))

        // Reload proposals
        await loadProposals()

        return { txHash: mockTxHash, proposalId: mockProposalId }
      } catch (error: any) {
        setGovernanceState({
          isCreating: false,
          isVoting: false,
          isExecuting: false,
          status: 'error',
          txHash: null,
          proposalId: null,
          error: error.message || 'Failed to create proposal',
        })
        throw error
      }
    },
    [proposals.length, loadProposals]
  )

  // Cast vote
  const castVote = useCallback(
    async (proposalId: string, support: 0 | 1 | 2) => {
      try {
        setGovernanceState({
          isCreating: false,
          isVoting: true,
          isExecuting: false,
          status: 'preparing',
          txHash: null,
          proposalId,
          error: null,
        })

        // Simulate transaction preparation
        await new Promise((resolve) => setTimeout(resolve, 800))

        setGovernanceState((prev) => ({ ...prev, status: 'signing' }))

        // Simulate signing
        await new Promise((resolve) => setTimeout(resolve, 1200))

        const mockTxHash = '0x' + Math.random().toString(16).substring(2, 66)

        setGovernanceState((prev) => ({
          ...prev,
          status: 'confirming',
          txHash: mockTxHash,
        }))

        // Simulate confirmation
        await new Promise((resolve) => setTimeout(resolve, 1500))

        setGovernanceState((prev) => ({ ...prev, status: 'complete', isVoting: false }))

        // Update proposal votes
        setProposals((prev) =>
          prev.map((p) => {
            if (p.id === proposalId) {
              const voteAmount = votingPower
              if (support === 1) {
                return { ...p, forVotes: String(Number(p.forVotes) + Number(voteAmount)) }
              } else if (support === 0) {
                return { ...p, againstVotes: String(Number(p.againstVotes) + Number(voteAmount)) }
              } else {
                return { ...p, abstainVotes: String(Number(p.abstainVotes) + Number(voteAmount)) }
              }
            }
            return p
          })
        )

        return { txHash: mockTxHash }
      } catch (error: any) {
        setGovernanceState({
          isCreating: false,
          isVoting: false,
          isExecuting: false,
          status: 'error',
          txHash: null,
          proposalId,
          error: error.message || 'Failed to cast vote',
        })
        throw error
      }
    },
    [votingPower]
  )

  // Execute proposal
  const executeProposal = useCallback(async (proposalId: string) => {
    try {
      setGovernanceState({
        isCreating: false,
        isVoting: false,
        isExecuting: true,
        status: 'preparing',
        txHash: null,
        proposalId,
        error: null,
      })

      // Simulate transaction preparation
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setGovernanceState((prev) => ({ ...prev, status: 'signing' }))

      // Simulate signing
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const mockTxHash = '0x' + Math.random().toString(16).substring(2, 66)

      setGovernanceState((prev) => ({
        ...prev,
        status: 'confirming',
        txHash: mockTxHash,
      }))

      // Simulate confirmation
      await new Promise((resolve) => setTimeout(resolve, 2000))

      setGovernanceState((prev) => ({ ...prev, status: 'complete', isExecuting: false }))

      // Update proposal status
      setProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, status: 'EXECUTED' as const } : p))
      )

      return { txHash: mockTxHash }
    } catch (error: any) {
      setGovernanceState({
        isCreating: false,
        isVoting: false,
        isExecuting: false,
        status: 'error',
        txHash: null,
        proposalId,
        error: error.message || 'Failed to execute proposal',
      })
      throw error
    }
  }, [])

  // Cancel proposal
  const cancelProposal = useCallback(async (proposalId: string) => {
    try {
      // Simulate cancellation
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, status: 'CANCELLED' as const } : p))
      )
    } catch (error) {
      console.error('Failed to cancel proposal:', error)
      throw error
    }
  }, [])

  // Delegate votes
  const delegateVotes = useCallback(async (delegatee: string) => {
    try {
      setGovernanceState({
        isCreating: false,
        isVoting: false,
        isExecuting: false,
        isDelegating: true,
        status: 'preparing',
        txHash: null,
        proposalId: null,
        error: null,
      })

      // Simulate transaction preparation
      await new Promise((resolve) => setTimeout(resolve, 800))

      setGovernanceState((prev) => ({ ...prev, status: 'signing' }))

      // Simulate signing
      await new Promise((resolve) => setTimeout(resolve, 1200))

      const mockTxHash = '0x' + Math.random().toString(16).substring(2, 66)

      setGovernanceState((prev) => ({
        ...prev,
        status: 'confirming',
        txHash: mockTxHash,
      }))

      // Simulate confirmation
      await new Promise((resolve) => setTimeout(resolve, 1500))

      setGovernanceState((prev) => ({ ...prev, status: 'complete', isDelegating: false }))

      // Update delegation status
      setCurrentDelegate(delegatee)

      return { txHash: mockTxHash }
    } catch (error: any) {
      setGovernanceState({
        isCreating: false,
        isVoting: false,
        isExecuting: false,
        isDelegating: false,
        status: 'error',
        txHash: null,
        proposalId: null,
        error: error.message || 'Failed to delegate votes',
      })
      throw error
    }
  }, [])

  // Undelegate votes
  const undelegateVotes = useCallback(async () => {
    try {
      setGovernanceState({
        isCreating: false,
        isVoting: false,
        isExecuting: false,
        isDelegating: true,
        status: 'preparing',
        txHash: null,
        proposalId: null,
        error: null,
      })

      // Simulate transaction
      await new Promise((resolve) => setTimeout(resolve, 800))

      setGovernanceState((prev) => ({ ...prev, status: 'signing' }))
      await new Promise((resolve) => setTimeout(resolve, 1200))

      const mockTxHash = '0x' + Math.random().toString(16).substring(2, 66)

      setGovernanceState((prev) => ({
        ...prev,
        status: 'confirming',
        txHash: mockTxHash,
      }))

      await new Promise((resolve) => setTimeout(resolve, 1500))

      setGovernanceState((prev) => ({ ...prev, status: 'complete', isDelegating: false }))

      // Clear delegation
      setCurrentDelegate(null)

      return { txHash: mockTxHash }
    } catch (error: any) {
      setGovernanceState({
        isCreating: false,
        isVoting: false,
        isExecuting: false,
        isDelegating: false,
        status: 'error',
        txHash: null,
        proposalId: null,
        error: error.message || 'Failed to undelegate votes',
      })
      throw error
    }
  }, [])

  // Reset state
  const reset = useCallback(() => {
    setGovernanceState({
      isCreating: false,
      isVoting: false,
      isExecuting: false,
      isDelegating: false,
      status: 'idle',
      txHash: null,
      proposalId: null,
      error: null,
    })
  }, [])

  return {
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
    cancelProposal,
    delegateVotes,
    undelegateVotes,
    reset,
  }
}
