import { useState, useEffect, useCallback } from 'react'
import type { IPNFT, IPMetadata } from '../types'

export interface MarketplaceFilters {
  category?: string
  minPrice?: number
  maxPrice?: number
  verified?: boolean
  sortBy?: 'newest' | 'price_low' | 'price_high' | 'popular'
  search?: string
}

export interface MarketplaceNFT extends IPNFT {
  metadata?: IPMetadata
}

export interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
}

export function useMarketplace(filters: MarketplaceFilters = {}, page: number = 1, itemsPerPage: number = 12) {
  const [nfts, setNfts] = useState<MarketplaceNFT[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: page,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage,
  })

  const fetchNFTs = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Mock data for now - will be replaced with actual API call
      const mockNFTs: MarketplaceNFT[] = generateMockNFTs(100)
      
      // Apply filters
      let filteredNFTs = mockNFTs

      if (filters.category) {
        filteredNFTs = filteredNFTs.filter(nft => nft.category === filters.category)
      }

      if (filters.verified !== undefined) {
        filteredNFTs = filteredNFTs.filter(nft => nft.verified === filters.verified)
      }

      if (filters.minPrice !== undefined) {
        filteredNFTs = filteredNFTs.filter(nft => 
          nft.floorPrice !== undefined && nft.floorPrice >= filters.minPrice!
        )
      }

      if (filters.maxPrice !== undefined) {
        filteredNFTs = filteredNFTs.filter(nft => 
          nft.floorPrice !== undefined && nft.floorPrice <= filters.maxPrice!
        )
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredNFTs = filteredNFTs.filter(nft => 
          nft.metadata?.title.toLowerCase().includes(searchLower) ||
          nft.metadata?.description.toLowerCase().includes(searchLower) ||
          nft.metadata?.tags.some(tag => tag.toLowerCase().includes(searchLower))
        )
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'newest':
          filteredNFTs.sort((a, b) => b.createdAt - a.createdAt)
          break
        case 'price_low':
          filteredNFTs.sort((a, b) => (a.floorPrice || 0) - (b.floorPrice || 0))
          break
        case 'price_high':
          filteredNFTs.sort((a, b) => (b.floorPrice || 0) - (a.floorPrice || 0))
          break
        case 'popular':
          filteredNFTs.sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
          break
        default:
          filteredNFTs.sort((a, b) => b.createdAt - a.createdAt)
      }

      // Pagination
      const totalItems = filteredNFTs.length
      const totalPages = Math.ceil(totalItems / itemsPerPage)
      const startIndex = (page - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      const paginatedNFTs = filteredNFTs.slice(startIndex, endIndex)

      setNfts(paginatedNFTs)
      setPagination({
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch NFTs')
    } finally {
      setLoading(false)
    }
  }, [filters, page, itemsPerPage])

  useEffect(() => {
    fetchNFTs()
  }, [fetchNFTs])

  return {
    nfts,
    loading,
    error,
    pagination,
    refetch: fetchNFTs,
  }
}

// Mock data generator
function generateMockNFTs(count: number): MarketplaceNFT[] {
  const categories = ['music', 'video', 'ebook', 'course', 'software', 'artwork', 'research']
  const titles = [
    '数字艺术作品',
    '音乐专辑',
    '在线课程',
    '研究论文',
    '软件源码',
    '电子书',
    '视频教程',
  ]
  const descriptions = [
    '这是一个精心创作的数字作品',
    '独特的创意内容',
    '高质量的知识产权资产',
    '经过验证的原创内容',
  ]

  return Array.from({ length: count }, (_, i) => {
    const category = categories[i % categories.length]
    const verified = Math.random() > 0.3
    const hasPrice = Math.random() > 0.2
    
    return {
      tokenId: String(i + 1),
      creator: `0x${Math.random().toString(16).slice(2, 42)}`,
      owner: `0x${Math.random().toString(16).slice(2, 42)}`,
      contentHash: `Qm${Math.random().toString(36).slice(2, 48)}`,
      metadataURI: `ipfs://Qm${Math.random().toString(36).slice(2, 48)}`,
      category,
      verified,
      createdAt: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      floorPrice: hasPrice ? Math.random() * 10 : undefined,
      lastSalePrice: hasPrice ? Math.random() * 10 : undefined,
      totalRevenue: Math.random() * 100,
      metadata: {
        title: `${titles[i % titles.length]} #${i + 1}`,
        description: descriptions[i % descriptions.length],
        category,
        tags: ['原创', '数字资产', category],
        contentType: 'application/octet-stream',
        fileSize: Math.floor(Math.random() * 10000000),
        language: 'zh-CN',
        license: 'CC BY-NC-SA 4.0',
      },
    }
  })
}
