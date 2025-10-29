import { ethers } from 'ethers';

const ABI = [
  'function stake(uint256 amount, uint256 lockPeriod)',
  'function unstake(uint256 stakeIndex)',
  'function claimRewards(uint256 stakeIndex)',
  'function calculateRewards(address user, uint256 stakeIndex) view returns (uint256)',
  'function getUserStakeCount(address user) view returns (uint256)',
  'function getUserTotalStaked(address user) view returns (uint256)',
  'function getUserTotalPendingRewards(address user) view returns (uint256)',
];

export class StakingRewardsClient {
  private contract: ethers.Contract;
  private signer?: ethers.Signer;

  constructor(
    address: string,
    provider: ethers.Provider,
    signer?: ethers.Signer
  ) {
    this.contract = new ethers.Contract(address, ABI, provider);
    this.signer = signer;
  }

  connect(signer: ethers.Signer) {
    this.signer = signer;
    this.contract = this.contract.connect(signer);
  }

  async stake(amount: bigint, lockPeriod: number) {
    if (!this.signer) throw new Error('Signer required');
    const tx = await this.contract.stake(amount, lockPeriod);
    return await tx.wait();
  }

  async unstake(stakeIndex: number) {
    if (!this.signer) throw new Error('Signer required');
    const tx = await this.contract.unstake(stakeIndex);
    return await tx.wait();
  }

  async claimRewards(stakeIndex: number) {
    if (!this.signer) throw new Error('Signer required');
    const tx = await this.contract.claimRewards(stakeIndex);
    return await tx.wait();
  }

  async calculateRewards(user: string, stakeIndex: number): Promise<bigint> {
    return await this.contract.calculateRewards(user, stakeIndex);
  }

  async getUserStakeCount(user: string): Promise<number> {
    const count = await this.contract.getUserStakeCount(user);
    return Number(count);
  }

  async getUserTotalStaked(user: string): Promise<bigint> {
    return await this.contract.getUserTotalStaked(user);
  }

  async getUserTotalPendingRewards(user: string): Promise<bigint> {
    return await this.contract.getUserTotalPendingRewards(user);
  }
}
