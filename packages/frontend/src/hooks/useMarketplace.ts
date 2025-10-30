import { useState, useEffect, useCallback } from 'react'
import { simpleAPI } from '../services/simpleApi'
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
      // Call real API
      const response = await simpleAPI.getNFTs({
        page,
        limit: itemsPerPage,
        sortBy: filters.sortBy,
      }) as any

      if (response.success) {
        // Transform API data to match our interface
        const transformedNFTs: MarketplaceNFT[] = response.data.map((nft: any) => ({
          tokenId: nft.tokenId,
          creator: nft.creator.walletAddress,
          owner: nft.creator.walletAddress, // Assuming creator is owner for now
          contentHash: `hash_${nft.tokenId}`,
          metadataURI: `ipfs://metadata_${nft.tokenId}`,
          category: 'artwork', // Default category
          verified: true,
          createdAt: new Date(nft.createdAt).getTime(),
          floorPrice: parseFloat(nft.price),
          lastSalePrice: parseFloat(nft.price),
          totalRevenue: parseFloat(nft.price) * 2,
          metadata: {
            title: nft.title,
            description: nft.description,
            category: 'artwork',
            tags: ['数字艺术', 'NFT'],
            contentType: 'image/jpeg',
            fileSize: 1024000,
            language: 'zh-CN',
            license: 'CC BY-NC-SA 4.0',
          },
        }))

        setNfts(transformedNFTs)
        setPagination({
          currentPage: (response as any).pagination?.page || page,
          totalPages: (response as any).pagination?.totalPages || 1,
          totalItems: (response as any).pagination?.total || transformedNFTs.length,
          itemsPerPage: (response as any).pagination?.limit || itemsPerPage,
        })
      } else {
        throw new Error('Failed to fetch NFTs from API')
      }
    } catch (err) {
      console.error('Error fetching NFTs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch NFTs')
      
      // Fallback to mock data if API fails
      const mockNFTs: MarketplaceNFT[] = generateMockNFTs(6)
      setNfts(mockNFTs.slice(0, itemsPerPage))
      setPagination({
        currentPage: page,
        totalPages: 1,
        totalItems: mockNFTs.length,
        itemsPerPage,
      })
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
