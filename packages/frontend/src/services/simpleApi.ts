const API_BASE_URL = 'http://localhost:3000/api/v1';

export class APIError extends Error {
  status?: number;
  data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.message || `Request failed with status ${response.status}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(
      error instanceof Error ? error.message : 'Network request failed'
    );
  }
}

// Simple API functions
export const simpleAPI = {
  // Get creators
  getCreators: async () => {
    return apiRequest('/creators');
  },

  // Get creator by address
  getCreator: async (address: string) => {
    return apiRequest(`/creators/${address}`);
  },

  // Register creator
  registerCreator: async (data: {
    walletAddress: string;
    displayName: string;
    bio?: string;
  }) => {
    return apiRequest('/creators/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get NFTs
  getNFTs: async (params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const endpoint = queryParams.toString() ? `/nfts?${queryParams}` : '/nfts';
    return apiRequest(endpoint);
  },

  // Get NFT by token ID
  getNFT: async (tokenId: string) => {
    return apiRequest(`/nfts/${tokenId}`);
  },

  // Get content
  getContent: async () => {
    return apiRequest('/content');
  },

  // Upload content
  uploadContent: async (data: {
    title: string;
    description?: string;
    category?: string;
  }) => {
    return apiRequest('/content/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get analytics summary
  getAnalyticsSummary: async () => {
    return apiRequest('/analytics/summary');
  },

  // Get featured NFTs
  getFeaturedNFTs: async () => {
    return apiRequest('/marketplace/featured');
  },

  // Get staking stats
  getStakingStats: async () => {
    return apiRequest('/staking/stats');
  },

  // Get governance proposals
  getProposals: async () => {
    return apiRequest('/governance/proposals');
  },
};

export default simpleAPI;