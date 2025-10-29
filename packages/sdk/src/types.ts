export enum ContentCategory {
  Music = 0,
  Video = 1,
  Image = 2,
  Text = 3,
  Software = 4,
  Other = 5,
}

export enum VaultState {
  Inactive = 0,
  Fractionalized = 1,
  RedeemVoting = 2,
  Redeemed = 3,
}

export interface IPMetadata {
  creator: string;
  contentHash: string;
  aiFingerprint: string;
  category: ContentCategory;
  mintTimestamp: number;
  royaltyPercentage: number;
  royaltyRecipient: string;
  isVerified: boolean;
}

export interface Beneficiary {
  recipient: string;
  percentage: number;
}

export interface VaultInfo {
  nftContract: string;
  tokenId: number;
  curator: string;
  totalSupply: bigint;
  reservePrice: bigint;
  state: VaultState;
  createdAt: number;
}

export interface StakeInfo {
  amount: bigint;
  startTime: number;
  lockPeriod: number;
  apy: number;
  rewardsClaimed: bigint;
}
