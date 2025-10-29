import { ethers } from 'ethers';

const ABI = [
  'function configureRoyalty(uint256 tokenId, tuple(address payable recipient, uint96 percentage)[] beneficiaries)',
  'function distributeRoyalty(uint256 tokenId) payable',
  'function withdraw(uint256 tokenId)',
  'function batchWithdraw(uint256[] tokenIds)',
  'function getPendingWithdrawal(uint256 tokenId, address beneficiary) view returns (uint256)',
  'function getTotalEarned(address beneficiary) view returns (uint256)',
  'function getRoyaltyConfig(uint256 tokenId) view returns (tuple(address payable recipient, uint96 percentage)[] beneficiaries, uint256 totalDistributed, bool isActive)',
];

export class RoyaltyDistributorClient {
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

  async configureRoyalty(
    tokenId: number,
    beneficiaries: Array<{ recipient: string; percentage: number }>
  ) {
    if (!this.signer) throw new Error('Signer required');
    const tx = await this.contract.configureRoyalty(tokenId, beneficiaries);
    return await tx.wait();
  }

  async distributeRoyalty(tokenId: number, amount: bigint) {
    if (!this.signer) throw new Error('Signer required');
    const tx = await this.contract.distributeRoyalty(tokenId, { value: amount });
    return await tx.wait();
  }

  async withdraw(tokenId: number) {
    if (!this.signer) throw new Error('Signer required');
    const tx = await this.contract.withdraw(tokenId);
    return await tx.wait();
  }

  async batchWithdraw(tokenIds: number[]) {
    if (!this.signer) throw new Error('Signer required');
    const tx = await this.contract.batchWithdraw(tokenIds);
    return await tx.wait();
  }

  async getPendingWithdrawal(tokenId: number, beneficiary: string): Promise<bigint> {
    return await this.contract.getPendingWithdrawal(tokenId, beneficiary);
  }

  async getTotalEarned(beneficiary: string): Promise<bigint> {
    return await this.contract.getTotalEarned(beneficiary);
  }

  async getRoyaltyConfig(tokenId: number) {
    return await this.contract.getRoyaltyConfig(tokenId);
  }
}
