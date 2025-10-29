import { useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { nftAPI } from '../services/api'
import type { RoyaltyInfo } from '../types'

export interface MintFormData {
  contentHash: string
  title: string
  description: string
  category: string
  tags: string[]
  price: string
  royalty: RoyaltyInfo
}

export interface MintState {
  isMinting: boolean
  status: 'idle' | 'preparing' | 'signing' | 'confirming' | 'complete' | 'error'
  error: string | null
  tokenId: string | null
  txHash: string | null
}

export function useNFTMint() {
  const { address } = useAccount()
  
  const [mintState, setMintState] = useState<MintState>({
    isMinting: false,
    status: 'idle',
    error: null,
    tokenId: null,
    txHash: null,
  })

  const mintNFT = useCallback(async (formData: MintFormData) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    setMintState({
      isMinting: true,
      status: 'preparing',
      error: null,
      tokenId: null,
      txHash: null,
    })

    try {
      // Step 1: Prepare metadata
      setMintState(prev => ({ ...prev, status: 'preparing' }))
      
      // Create metadata URI (in production, this would be uploaded to IPFS)
      const metadataURI = `ipfs://${formData.contentHash}/metadata.json`

      // Step 2: Call backend API to mint NFT
      setMintState(prev => ({ ...prev, status: 'signing' }))
      
      const mintResult = await nftAPI.mint({
        contentHash: formData.contentHash,
        metadataURI,
        category: formData.category,
        royalty: formData.royalty,
      })

      // Step 3: Wait for transaction confirmation
      setMintState(prev => ({ 
        ...prev, 
        status: 'confirming',
        txHash: mintResult.txHash 
      }))

      // Simulate waiting for confirmation (in production, use useWaitForTransactionReceipt)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Step 4: Complete
      setMintState({
        isMinting: false,
        status: 'complete',
        error: null,
        tokenId: mintResult.tokenId,
        txHash: mintResult.txHash,
      })

      return {
        tokenId: mintResult.tokenId,
        txHash: mintResult.txHash,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '铸造失败'
      setMintState({
        isMinting: false,
        status: 'error',
        error: errorMessage,
        tokenId: null,
        txHash: null,
      })
      throw error
    }
  }, [address])

  const reset = useCallback(() => {
    setMintState({
      isMinting: false,
      status: 'idle',
      error: null,
      tokenId: null,
      txHash: null,
    })
  }, [])

  return {
    mintState,
    mintNFT,
    reset,
  }
}
