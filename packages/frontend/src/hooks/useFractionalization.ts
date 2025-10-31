import { useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { fractionalAPI } from '../services/api'
import type { FractionalVault } from '../types'

export interface FractionalizeFormData {
  tokenId: string
  totalSupply: string
  tokenName: string
  tokenSymbol: string
  reservePrice: string
  initialLiquidity: string
}

export interface FractionalizeState {
  isFractionalizing: boolean
  status: 'idle' | 'preparing' | 'signing' | 'confirming' | 'creating_pool' | 'complete' | 'error'
  error: string | null
  vaultId: string | null
  fractionalToken: string | null
  totalSupply: string | null
  poolAddress: string | null
  txHash: string | null
}

export interface VaultInfo extends FractionalVault {
  holders?: Array<{
    address: string
    balance: string
    percentage: number
  }>
  poolInfo?: {
    address: string
    liquidity: string
    price: string
    volume24h: string
  }
}

export function useFractionalization() {
  const { address } = useAccount()
  
  const [fractionalizeState, setFractionalizeState] = useState<FractionalizeState>({
    isFractionalizing: false,
    status: 'idle',
    error: null,
    vaultId: null,
    fractionalToken: null,
    totalSupply: null,
    poolAddress: null,
    txHash: null,
  })

  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null)

  const fractionalize = useCallback(async (formData: FractionalizeFormData) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    setFractionalizeState({
      isFractionalizing: true,
      status: 'preparing',
      error: null,
      vaultId: null,
      fractionalToken: null,
      totalSupply: null,
      poolAddress: null,
      txHash: null,
    })

    try {
      // Step 1: Prepare fractionalization
      setFractionalizeState(prev => ({ ...prev, status: 'preparing' }))
      
      // Step 2: Sign transaction
      setFractionalizeState(prev => ({ ...prev, status: 'signing' }))
      
      const fractionalizeResult = await fractionalAPI.fractionalize({
        nftContract: '0x...', // Should come from config
        tokenId: formData.tokenId,
        supply: formData.totalSupply,
        tokenName: formData.tokenName,
        tokenSymbol: formData.tokenSymbol,
        reservePrice: formData.reservePrice,
      })

      const txHash = fractionalizeResult.data?.txHash || ''
      const vaultId = fractionalizeResult.data?.vaultId || ''
      const fractionalToken = fractionalizeResult.data?.fractionalToken || ''

      // Step 3: Wait for confirmation
      setFractionalizeState(prev => ({ 
        ...prev, 
        status: 'confirming',
        txHash,
        vaultId,
        fractionalToken,
      }))

      // Simulate waiting for confirmation
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Step 4: Create liquidity pool
      setFractionalizeState(prev => ({ ...prev, status: 'creating_pool' }))
      
      const poolResult = await fractionalAPI.createPool({
        vaultId,
        fractionalToken,
        initialLiquidity: formData.initialLiquidity,
      })

      const poolAddress = poolResult.data?.poolAddress || ''

      // Wait for pool creation
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Step 5: Complete
      setFractionalizeState({
        isFractionalizing: false,
        status: 'complete',
        error: null,
        vaultId,
        fractionalToken,
        totalSupply: formData.totalSupply,
        poolAddress,
        txHash,
      })

      return {
        vaultId,
        fractionalToken,
        poolAddress,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '碎片化失败'
      setFractionalizeState({
        isFractionalizing: false,
        status: 'error',
        error: errorMessage,
        vaultId: null,
        fractionalToken: null,
        totalSupply: null,
        poolAddress: null,
        txHash: null,
      })
      throw error
    }
  }, [address])

  const loadVaultInfo = useCallback(async (vaultId: string) => {
    try {
      const info = await fractionalAPI.getVaultInfo(vaultId)
      setVaultInfo(info.data as VaultInfo)
    } catch (error) {
      console.error('Failed to load vault info:', error)
    }
  }, [])

  const reset = useCallback(() => {
    setFractionalizeState({
      isFractionalizing: false,
      status: 'idle',
      error: null,
      vaultId: null,
      fractionalToken: null,
      totalSupply: null,
      poolAddress: null,
      txHash: null,
    })
  }, [])

  return {
    fractionalizeState,
    vaultInfo,
    fractionalize,
    loadVaultInfo,
    reset,
  }
}
