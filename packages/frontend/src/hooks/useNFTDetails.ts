import { useState, useEffect, useCallback } from 'react'
import type { IPNFT, IPMetadata, Transaction } from '../types'

export interface NFTDetails extends IPNFT {
  metadata: IPMetadata
  priceHistory: PricePoint[]
  holders: HolderInfo[]
  transactions: Transaction[]
  statistics: {
    views: number
    uniqueViewers: number
    totalRevenue: number
    holderCount: number
  }
}

export interface PricePoint {
  timestamp: number
  price: number
  type: 'sale' | 'listing'
}

export interface HolderInfo {
  address: string
  balance: string
  percentage: number
  since: number
}

export function useNFTDetails(tokenId: string) {
  const [nft, setNft] = useState<NFTDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNFTDetails = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Mock data for now - will be replaced with actual API/blockchain calls
      const mockNFT = generateMockNFTDetails(tokenId)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setNft(mockNFT)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch NFT details')
    } finally {
      setLoading(false)
    }
  }, [tokenId])

  useEffect(() => {
    if (tokenId) {
      fetchNFTDetails()
    }
  }, [tokenId, fetchNFTDetails])

  return {
    nft,
    loading,
    error,
    refetch: fetchNFTDetails,
  }
}

// Mock data generator
function generateMockNFTDetails(tokenId: string): NFTDetails {
  const categories = ['music', 'video', 'ebook', 'course', 'software', 'artwork', 'research']
  const category = categories[parseInt(tokenId) % categories.length]
  const creatorAddress = `0x${Math.random().toString(16).slice(2, 42)}`
  const ownerAddress = `0x${Math.random().toString(16).slice(2, 42)}`
  
  // Generate price history
  const priceHistory: PricePoint[] = []
  const now = Date.now()
  for (let i = 30; i >= 0; i--) {
    const basePrice = 1 + Math.random() * 5
    priceHistory.push({
      timestamp: now - i * 24 * 60 * 60 * 1000,
      price: basePrice + Math.sin(i / 5) * 0.5,
      type: Math.random() > 0.5 ? 'sale' : 'listing',
    })
  }

  // Generate holders
  const holderCount = Math.floor(Math.random() * 10) + 1
  const holders: HolderInfo[] = []
  let remainingPercentage = 100
  
  for (let i = 0; i < holderCount; i++) {
    const percentage = i === holderCount - 1 
      ? remainingPercentage 
      : Math.floor(Math.random() * (remainingPercentage / (holderCount - i)))
    
    holders.push({
      address: `0x${Math.random().toString(16).slice(2, 42)}`,
      balance: String(percentage),
      percentage,
      since: now - Math.random() * 60 * 24 * 60 * 60 * 1000,
    })
    
    remainingPercentage -= percentage
  }

  // Generate transactions
  const transactions: Transaction[] = Array.from({ length: 10 }, (_, i) => ({
    id: `tx-${tokenId}-${i}`,
    txHash: `0x${Math.random().toString(16).slice(2, 66)}`,
    blockNumber: 1000000 + i,
    timestamp: new Date(now - i * 5 * 24 * 60 * 60 * 1000),
    from: `0x${Math.random().toString(16).slice(2, 42)}`,
    to: `0x${Math.random().toString(16).slice(2, 42)}`,
    tokenId,
    type: ['mint', 'transfer', 'sale'][Math.floor(Math.random() * 3)] as any,
    amount: String(Math.random() * 10),
    currency: 'ETH',
    status: 'confirmed' as const,
  }))

  return {
    tokenId,
    creator: creatorAddress,
    owner: ownerAddress,
    contentHash: `Qm${Math.random().toString(36).slice(2, 48)}`,
    metadataURI: `ipfs://Qm${Math.random().toString(36).slice(2, 48)}`,
    category,
    fingerprint: `fp_${Math.random().toString(36).slice(2, 20)}`,
    verified: Math.random() > 0.3,
    createdAt: now - Math.random() * 90 * 24 * 60 * 60 * 1000,
    totalRevenue: Math.random() * 100,
    floorPrice: priceHistory[priceHistory.length - 1].price,
    lastSalePrice: priceHistory.find(p => p.type === 'sale')?.price,
    metadata: {
      title: `知识产权资产 #${tokenId}`,
      description: `这是一个高质量的${category}类型知识产权资产。经过AI验证，确保原创性和独特性。该资产已在区块链上永久记录，具有完整的版权保护和收益分配机制。`,
      category,
      tags: ['原创', '数字资产', category, 'Web3', 'NFT'],
      contentType: 'application/octet-stream',
      fileSize: Math.floor(Math.random() * 10000000),
      duration: category === 'music' || category === 'video' ? Math.floor(Math.random() * 600) : undefined,
      language: 'zh-CN',
      license: 'CC BY-NC-SA 4.0',
      thumbnailHash: `Qm${Math.random().toString(36).slice(2, 48)}`,
    },
    priceHistory,
    holders,
    transactions,
    statistics: {
      views: Math.floor(Math.random() * 10000),
      uniqueViewers: Math.floor(Math.random() * 5000),
      totalRevenue: Math.random() * 100,
      holderCount: holders.length,
    },
  }
}
