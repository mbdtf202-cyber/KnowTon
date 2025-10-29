import { API_BASE_URL, API_ENDPOINTS } from '../utils/constants'

export class APIError extends Error {
  status?: number
  data?: any

  constructor(message: string, status?: number, data?: any) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.data = data
  }
}

// Generic API request handler
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new APIError(
        errorData.message || `Request failed with status ${response.status}`,
        response.status,
        errorData
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }
    throw new APIError(
      error instanceof Error ? error.message : 'Network request failed'
    )
  }
}

// Creator Service API
export const creatorAPI = {
  // Register creator
  register: async (data: {
    address: string
    did: string
    username: string
    bio: string
    email?: string
    avatar?: string
    socialLinks?: {
      twitter?: string
      discord?: string
      website?: string
    }
    signature: string
  }) => {
    return apiRequest(`${API_ENDPOINTS.CREATORS}/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Create DID
  createDID: async (data: { address: string; signature: string }) => {
    return apiRequest<{ did: string }>(`${API_ENDPOINTS.CREATORS}/did`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Get creator profile
  getProfile: async (address: string) => {
    return apiRequest(`${API_ENDPOINTS.CREATORS}/${address}`, {
      method: 'GET',
    })
  },

  // Update creator profile
  updateProfile: async (
    address: string,
    data: {
      username?: string
      bio?: string
      email?: string
      avatar?: string
      socialLinks?: {
        twitter?: string
        discord?: string
        website?: string
      }
    }
  ) => {
    return apiRequest(`${API_ENDPOINTS.CREATORS}/${address}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
}

// Content Service API
export const contentAPI = {
  // Upload content to IPFS
  uploadToIPFS: async (file: File): Promise<{ contentHash: string }> => {
    const formData = new FormData()
    formData.append('file', file)

    const url = `${API_BASE_URL}${API_ENDPOINTS.CONTENT}/upload`
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new APIError('Failed to upload file', response.status)
    }

    return await response.json()
  },

  // Get content metadata
  getMetadata: async (contentHash: string) => {
    return apiRequest(`${API_ENDPOINTS.CONTENT}/${contentHash}`, {
      method: 'GET',
    })
  },
}

// NFT Service API
export const nftAPI = {
  // Mint NFT
  mint: async (data: {
    contentHash: string
    metadataURI: string
    category: string
    royalty: {
      recipients: string[]
      percentages: number[]
    }
  }): Promise<{ tokenId: string; txHash: string }> => {
    return apiRequest(`${API_ENDPOINTS.NFT}/mint`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Get NFT details
  getDetails: async (tokenId: string) => {
    return apiRequest(`${API_ENDPOINTS.NFT}/${tokenId}`, {
      method: 'GET',
    })
  },

  // Get user's NFTs
  getUserNFTs: async (address: string) => {
    return apiRequest(`${API_ENDPOINTS.NFT}/user/${address}`, {
      method: 'GET',
    })
  },
}

// Marketplace Service API
export const marketplaceAPI = {
  // Get marketplace NFTs with filters
  getNFTs: async (params: {
    page?: number
    limit?: number
    category?: string
    minPrice?: number
    maxPrice?: number
    verified?: boolean
    sortBy?: string
    search?: string
  }) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })
    
    return apiRequest(`${API_ENDPOINTS.MARKETPLACE}/nfts?${queryParams}`, {
      method: 'GET',
    })
  },

  // Get orderbook
  getOrderbook: async (tokenId: string) => {
    return apiRequest(`${API_ENDPOINTS.ORDERS}/orderbook/${tokenId}`, {
      method: 'GET',
    })
  },

  // Create order
  createOrder: async (data: {
    tokenId: string
    type: 'buy' | 'sell'
    price: string
    amount: string
  }) => {
    return apiRequest(`${API_ENDPOINTS.ORDERS}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Cancel order
  cancelOrder: async (orderId: string) => {
    return apiRequest(`${API_ENDPOINTS.ORDERS}/${orderId}`, {
      method: 'DELETE',
    })
  },
}

// Analytics Service API
export const analyticsAPI = {
  // Get content analytics
  getContentAnalytics: async (tokenId: string) => {
    return apiRequest(`${API_ENDPOINTS.ANALYTICS}/content/${tokenId}`, {
      method: 'GET',
    })
  },

  // Get creator analytics
  getCreatorAnalytics: async (address: string) => {
    return apiRequest(`${API_ENDPOINTS.ANALYTICS}/creator/${address}`, {
      method: 'GET',
    })
  },
}

// Fractionalization Service API
export const fractionalAPI = {
  // Fractionalize NFT
  fractionalize: async (data: {
    nftContract: string
    tokenId: string
    supply: string
    tokenName: string
    tokenSymbol: string
    reservePrice: string
  }): Promise<{
    vaultId: string
    fractionalToken: string
    txHash: string
  }> => {
    return apiRequest(`${API_ENDPOINTS.FRACTIONAL}/create`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Create liquidity pool
  createPool: async (data: {
    vaultId: string
    fractionalToken: string
    initialLiquidity: string
  }): Promise<{
    poolAddress: string
    txHash: string
  }> => {
    return apiRequest(`${API_ENDPOINTS.FRACTIONAL}/pool`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Get vault info
  getVaultInfo: async (vaultId: string) => {
    return apiRequest(`${API_ENDPOINTS.FRACTIONAL}/${vaultId}`, {
      method: 'GET',
    })
  },

  // Get vault holders
  getHolders: async (vaultId: string) => {
    return apiRequest(`${API_ENDPOINTS.FRACTIONAL}/${vaultId}/holders`, {
      method: 'GET',
    })
  },

  // Initiate redemption
  initiateRedemption: async (data: {
    vaultId: string
    buyoutPrice: string
  }) => {
    return apiRequest(`${API_ENDPOINTS.FRACTIONAL}/${data.vaultId}/redeem`, {
      method: 'POST',
      body: JSON.stringify({ buyoutPrice: data.buyoutPrice }),
    })
  },

  // Vote on redemption
  voteRedemption: async (data: {
    vaultId: string
    approve: boolean
  }) => {
    return apiRequest(`${API_ENDPOINTS.FRACTIONAL}/${data.vaultId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ approve: data.approve }),
    })
  },
}
