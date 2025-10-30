// Network configurations
export const SUPPORTED_CHAINS = {
  ARBITRUM_ONE: {
    id: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
  },
  ARBITRUM_GOERLI: {
    id: 421613,
    name: 'Arbitrum Goerli',
    rpcUrl: 'https://goerli-rollup.arbitrum.io/rpc',
    blockExplorer: 'https://goerli.arbiscan.io',
  },
} as const

// Contract addresses (to be updated after deployment)
export const CONTRACT_ADDRESSES = {
  IP_NFT: '0x0000000000000000000000000000000000000000',
  FRACTIONALIZATION_VAULT: '0x0000000000000000000000000000000000000000',
  ROYALTY_DISTRIBUTOR: '0x0000000000000000000000000000000000000000',
  DAO_GOVERNANCE: '0x0000000000000000000000000000000000000000',
  STAKING_REWARDS: '0x0000000000000000000000000000000000000000',
  MARKETPLACE_AMM: '0x0000000000000000000000000000000000000000',
} as const

// API endpoints
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export const API_ENDPOINTS = {
  CREATORS: '/api/v1/creators',
  CONTENT: '/api/v1/content',
  NFT: '/api/v1/nfts',
  FRACTIONAL: '/api/v1/fractional',
  ROYALTY: '/api/v1/royalty',
  ORDERS: '/api/v1/orders',
  ANALYTICS: '/api/v1/analytics',
  MARKETPLACE: '/api/v1/marketplace',
} as const

// IPFS configuration
export const IPFS_GATEWAY = 'https://ipfs.io/ipfs/'
export const PINATA_API_URL = 'https://api.pinata.cloud'

// Content categories
export const CONTENT_CATEGORIES = [
  'music',
  'video',
  'ebook',
  'course',
  'software',
  'artwork',
  'research',
] as const

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  AUDIO: 50 * 1024 * 1024, // 50MB
  VIDEO: 500 * 1024 * 1024, // 500MB
  DOCUMENT: 20 * 1024 * 1024, // 20MB
} as const

// Royalty limits
export const ROYALTY_LIMITS = {
  MIN: 0,
  MAX: 30, // 30%
  DEFAULT: 10, // 10%
} as const
