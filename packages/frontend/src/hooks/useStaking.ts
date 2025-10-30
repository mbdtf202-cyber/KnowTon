import { useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import type { StakeInfo } from '../types'

interface StakingState {
  isStaking: boolean
  isUnstaking: boolean
  isClaiming: boolean
  status: 'idle' | 'preparing' | 'signing' | 'confirming' | 'complete' | 'error'
  txHash?: string
  error?: string
  stakeId?: string
}

interface StakingStats {
  totalStaked: string
  userStaked: string
  apy: number
  rewardRate: string
  pendingRewards: string
}

interface StakeHistoryItem extends StakeInfo {
  id: string
  pendingRewards: string
  unlockTime: number
}

export function useStaking() {
  const { address } = useAccount()
  const [stakingState, setStakingState] = useState<StakingState>({
    isStaking: false,
    isUnstaking: false,
    isClaiming: false,
    status: 'idle',
  })
  const [stakingStats, setStakingStats] = useState<StakingStats | null>(null)
  const [stakeHistory, setStakeHistory] = useState<StakeHistoryItem[]>([])

  // Load staking statistics
  const loadStakingStats = useCallback(async () => {
    if (!address) return

    try {
      // TODO: Replace with actual contract calls
      // Mock data for now
      const mockStats: StakingStats = {
        totalStaked: '1000000',
        userStaked: '5000',
        apy: 15.5,
        rewardRate: '0.0001',
        pendingRewards: '125.50',
      }
      setStakingStats(mockStats)
    } catch (error) {
      console.error('Failed to load staking stats:', error)
    }
  }, [address])

  // Load user's stake history
  const loadStakeHistory = useCallback(async () => {
    if (!address) return

    try {
      // TODO: Replace with actual contract calls
      // Mock data for now
      const mockHistory: StakeHistoryItem[] = [
        {
          id: '1',
          amount: '1000',
          startTime: Date.now() - 86400000 * 15, // 15 days ago
          lockPeriod: 30, // 30 days
          rewardDebt: '0',
          isActive: true,
          pendingRewards: '41.67',
          unlockTime: Date.now() + 86400000 * 15, // 15 days from now
        },
        {
          id: '2',
          amount: '2000',
          startTime: Date.now() - 86400000 * 45, // 45 days ago
          lockPeriod: 90, // 90 days
          rewardDebt: '0',
          isActive: true,
          pendingRewards: '250.00',
          unlockTime: Date.now() + 86400000 * 45, // 45 days from now
        },
      ]
      setStakeHistory(mockHistory)
    } catch (error) {
      console.error('Failed to load stake history:', error)
    }
  }, [address])

  // Stake tokens
  const stake = useCallback(async (_amount: string, _lockPeriod: number) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    setStakingState({
      isStaking: true,
      isUnstaking: false,
      isClaiming: false,
      status: 'preparing',
    })

    try {
      // TODO: Replace with actual contract interaction
      // 1. Approve tokens
      setStakingState(prev => ({ ...prev, status: 'signing' }))
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 2. Stake tokens
      setStakingState(prev => ({ ...prev, status: 'confirming' }))
      await new Promise(resolve => setTimeout(resolve, 2000))

      const mockTxHash = '0x' + Math.random().toString(16).slice(2)
      const mockStakeId = String(stakeHistory.length + 1)

      setStakingState({
        isStaking: false,
        isUnstaking: false,
        isClaiming: false,
        status: 'complete',
        txHash: mockTxHash,
        stakeId: mockStakeId,
      })

      // Reload data
      await loadStakingStats()
      await loadStakeHistory()

      return mockStakeId
    } catch (error: any) {
      setStakingState({
        isStaking: false,
        isUnstaking: false,
        isClaiming: false,
        status: 'error',
        error: error.message || 'Staking failed',
      })
      throw error
    }
  }, [address, stakeHistory.length, loadStakingStats, loadStakeHistory])

  // Unstake tokens
  const unstake = useCallback(async (_stakeId: string) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    setStakingState({
      isStaking: false,
      isUnstaking: true,
      isClaiming: false,
      status: 'preparing',
    })

    try {
      // TODO: Replace with actual contract interaction
      setStakingState(prev => ({ ...prev, status: 'signing' }))
      await new Promise(resolve => setTimeout(resolve, 1000))

      setStakingState(prev => ({ ...prev, status: 'confirming' }))
      await new Promise(resolve => setTimeout(resolve, 2000))

      const mockTxHash = '0x' + Math.random().toString(16).slice(2)

      setStakingState({
        isStaking: false,
        isUnstaking: false,
        isClaiming: false,
        status: 'complete',
        txHash: mockTxHash,
      })

      // Reload data
      await loadStakingStats()
      await loadStakeHistory()
    } catch (error: any) {
      setStakingState({
        isStaking: false,
        isUnstaking: false,
        isClaiming: false,
        status: 'error',
        error: error.message || 'Unstaking failed',
      })
      throw error
    }
  }, [address, loadStakingStats, loadStakeHistory])

  // Claim rewards
  const claimRewards = useCallback(async (_stakeId: string) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    setStakingState({
      isStaking: false,
      isUnstaking: false,
      isClaiming: true,
      status: 'preparing',
    })

    try {
      // TODO: Replace with actual contract interaction
      setStakingState(prev => ({ ...prev, status: 'signing' }))
      await new Promise(resolve => setTimeout(resolve, 1000))

      setStakingState(prev => ({ ...prev, status: 'confirming' }))
      await new Promise(resolve => setTimeout(resolve, 2000))

      const mockTxHash = '0x' + Math.random().toString(16).slice(2)

      setStakingState({
        isStaking: false,
        isUnstaking: false,
        isClaiming: false,
        status: 'complete',
        txHash: mockTxHash,
      })

      // Reload data
      await loadStakingStats()
      await loadStakeHistory()
    } catch (error: any) {
      setStakingState({
        isStaking: false,
        isUnstaking: false,
        isClaiming: false,
        status: 'error',
        error: error.message || 'Claiming rewards failed',
      })
      throw error
    }
  }, [address, loadStakingStats, loadStakeHistory])

  // Calculate estimated rewards
  const calculateRewards = useCallback((amount: string, lockPeriod: number): string => {
    if (!stakingStats) return '0'
    
    // Simple APY calculation
    const principal = parseFloat(amount)
    const apy = stakingStats.apy / 100
    const days = lockPeriod
    const estimatedRewards = principal * apy * (days / 365)
    
    return estimatedRewards.toFixed(2)
  }, [stakingStats])

  // Reset state
  const reset = useCallback(() => {
    setStakingState({
      isStaking: false,
      isUnstaking: false,
      isClaiming: false,
      status: 'idle',
    })
  }, [])

  return {
    stakingState,
    stakingStats,
    stakeHistory,
    stake,
    unstake,
    claimRewards,
    calculateRewards,
    loadStakingStats,
    loadStakeHistory,
    reset,
  }
}
