// User types
export interface User {
  address: string
  did?: string
  username?: string
  avatar?: string
  bio?: string
  email?: string
  walletType?: 'metamask' | 'walletconnect' | 'coinbase' | 'other'
  role?: 'user' | 'creator' | 'admin'
  socialLinks?: {
    twitter?: string
    discord?: string
    website?: string
  }
  reputation?: {
    score: number
    level: number
    badges: string[]
  }
  createdAt?: Date
}

// NFT types
export interface IPNFT {
  tokenId: string
  creator: string
  owner: string
  contentHash: string
  metadataURI: string
  category: string
  fingerprint?: string
  verified: boolean
  createdAt: number
  totalRevenue?: number
  floorPrice?: number
  lastSalePrice?: number
}

export interface IPMetadata {
  title: string
  description: string
  category: string
  tags: string[]
  contentType: string
  fileSize: number
  duration?: number
  language: string
  license: string
  thumbnailHash?: string
}

// Transaction types
export interface Transaction {
  id: string
  txHash: string
  blockNumber: number
  timestamp: Date
  from: string
  to: string
  tokenId: string
  type: 'mint' | 'transfer' | 'sale' | 'fractionalize' | 'redeem'
  amount: string
  currency: string
  status: 'pending' | 'confirmed' | 'failed'
}

// Fractionalization types
export interface FractionalVault {
  id: string
  nftTokenId: string
  nftContract: string
  fractionalToken: string
  totalSupply: string
  reservePrice: string
  isRedeemable: boolean
  createdAt: number
}

// Royalty types
export interface RoyaltyInfo {
  recipients: string[]
  percentages: number[]
}

export interface RoyaltyPayment {
  id: string
  tokenId: string
  amount: string
  beneficiaries: string[]
  percentages: number[]
  timestamp: number
  transactionHash: string
}

// Staking types
export interface StakeInfo {
  amount: string
  startTime: number
  lockPeriod: number
  rewardDebt: string
  isActive: boolean
}

// Governance types
export interface Proposal {
  id: string
  proposer: string
  proposalType: 'PARAMETER_CHANGE' | 'DISPUTE_RESOLUTION' | 'TREASURY_ALLOCATION' | 'CONTRACT_UPGRADE'
  description: string
  status: 'PENDING' | 'ACTIVE' | 'SUCCEEDED' | 'DEFEATED' | 'EXECUTED' | 'CANCELLED'
  forVotes: string
  againstVotes: string
  abstainVotes: string
  startBlock: number
  endBlock: number
}

// Trading types
export interface Order {
  id: string
  tokenId: string
  maker: string
  side: 'buy' | 'sell'
  price: number
  amount: number
  filled: number
  status: 'open' | 'filled' | 'cancelled' | 'expired'
  timestamp: number
  expiresAt?: number
}

export interface OrderBook {
  tokenId: string
  bids: Order[]
  asks: Order[]
  lastPrice?: number
  priceChange24h?: number
  volume24h?: number
  high24h?: number
  low24h?: number
}

export interface Trade {
  id: string
  tokenId: string
  buyer: string
  seller: string
  price: number
  amount: number
  timestamp: number
  txHash: string
}

export interface OrderBookUpdate {
  type: 'order_added' | 'order_cancelled' | 'order_filled' | 'trade_executed'
  tokenId: string
  order?: Order
  trade?: Trade
  timestamp: number
}
