import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// NFT APIs
export const nftApi = {
  getAll: (params?: { category?: string; limit?: number; offset?: number }) =>
    api.get('/api/v1/nfts', { params }),
  
  getById: (tokenId: string) =>
    api.get(`/api/v1/nfts/${tokenId}`),
  
  mint: (data: { contentHash: string; metadataUri: string; category: string; royalty: number }) =>
    api.post('/api/v1/nfts/mint', data),
  
  transfer: (tokenId: string, to: string) =>
    api.post(`/api/v1/nfts/${tokenId}/transfer`, { to }),
}

export const nftAPI = nftApi

// Creator APIs
export const creatorAPI = {
  getProfile: (address: string) =>
    api.get(`/api/v1/creators/${address}`),
  
  register: (data: { address: string; username: string; bio?: string }) =>
    api.post('/api/v1/creators/register', data),
  
  update: (address: string, data: { username?: string; bio?: string; avatar?: string }) =>
    api.put(`/api/v1/creators/${address}`, data),
}

// Trading APIs
export const tradingAPI = {
  getPairs: () =>
    api.get('/api/trading/pairs'),
  
  getOrderBook: (tokenId: string) =>
    api.get(`/api/trading/${tokenId}/orderbook`),
}

export default api

// Content APIs
export const contentAPI = {
  upload: (data: FormData) =>
    api.post('/api/v1/content/upload', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  getById: (contentId: string) =>
    api.get(`/api/v1/content/${contentId}`),
  
  verify: (contentId: string) =>
    api.post(`/api/v1/content/${contentId}/verify`),
}

// Marketplace APIs
export const marketplaceAPI = {
  listNFT: (tokenId: string, price: string) =>
    api.post(`/api/v1/marketplace/list`, { tokenId, price }),
  
  buyNFT: (tokenId: string) =>
    api.post(`/api/v1/marketplace/buy`, { tokenId }),
  
  cancelListing: (tokenId: string) =>
    api.post(`/api/v1/marketplace/cancel`, { tokenId }),
}

// Uniswap V3 APIs
export const uniswapAPI = {
  getPoolInfo: (vaultId: string) =>
    api.get(`/api/v1/uniswap/pools/${vaultId}`),
  
  createPool: (data: {
    vaultId: string;
    fractionalToken: string;
    fee: number;
    initialPrice: string;
  }) =>
    api.post('/api/v1/uniswap/pools', data),
  
  getSwapQuote: (data: {
    vaultId: string;
    tokenIn: string;
    amountIn: string;
    slippageBps: number;
  }) =>
    api.post('/api/v1/uniswap/quote', data),
  
  executeSwap: (data: {
    vaultId: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippageBps: number;
  }) =>
    api.post('/api/v1/uniswap/swap', data),
  
  addLiquidity: (data: {
    vaultId: string;
    amount0Desired: string;
    amount1Desired: string;
    slippageBps: number;
  }) =>
    api.post('/api/v1/uniswap/liquidity/add', data),
  
  removeLiquidity: (data: {
    vaultId: string;
    positionId: string;
    liquidity: string;
    slippageBps: number;
  }) =>
    api.post('/api/v1/uniswap/liquidity/remove', data),
  
  getPositions: (vaultId: string) =>
    api.get(`/api/v1/uniswap/positions/${vaultId}`),
  
  approveToken: (data: {
    token: string;
    spender: string;
    amount: string;
  }) =>
    api.post('/api/v1/uniswap/approve', data),
}

// Staking APIs
export const stakingAPI = {
  stake: (amount: string, poolId: string) =>
    api.post('/api/v1/staking/stake', { amount, poolId }),
  
  unstake: (amount: string, poolId: string) =>
    api.post('/api/v1/staking/unstake', { amount, poolId }),
  
  getRewards: (address: string) =>
    api.get(`/api/v1/staking/rewards/${address}`),
}

// Governance APIs
export const governanceAPI = {
  createProposal: (data: any) =>
    api.post('/api/v1/governance/proposals', data),
  
  vote: (proposalId: string, support: boolean) =>
    api.post(`/api/v1/governance/proposals/${proposalId}/vote`, { support }),
  
  getProposals: () =>
    api.get('/api/v1/governance/proposals'),
}

// Bond APIs
export const bondAPI = {
  getAll: () =>
    api.get('/api/bonds'),
  
  getById: (bondId: string) =>
    api.get(`/api/bonds/${bondId}`),
  
  create: (data: {
    txHash: string
    bondId: number
    issuer: string
    principal: string
    interestRate: number
    duration: number
  }) =>
    api.post('/api/bonds', data),
  
  recordInvestment: (bondId: string, data: {
    investor: string
    amount: string
    txHash: string
  }) =>
    api.post(`/api/bonds/${bondId}/invest`, data),
  
  recordRedemption: (bondId: string, data: {
    investor: string
    amount: string
    txHash: string
  }) =>
    api.post(`/api/bonds/${bondId}/redeem`, data),
  
  getStats: (bondId: string) =>
    api.get(`/api/bonds/${bondId}/stats`),
}

// Fractionalization APIs
export const fractionalAPI = {
  fractionalize: (data: {
    nftContract: string
    tokenId: string
    supply: string
    tokenName: string
    tokenSymbol: string
    reservePrice: string
  }) =>
    api.post('/api/v1/fractional/create', data),
  
  createPool: (data: {
    vaultId: string
    fractionalToken: string
    initialLiquidity: string
  }) =>
    api.post('/api/v1/fractional/pool', data),
  
  getVaultInfo: (vaultId: string) =>
    api.get(`/api/v1/fractional/vault/${vaultId}`),
  
  redeem: (vaultId: string, amount: string) =>
    api.post(`/api/v1/fractional/redeem`, { vaultId, amount }),
}
