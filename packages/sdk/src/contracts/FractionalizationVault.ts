import { ethers } from 'ethers';

const ABI = [
  'function createVault(address nftContract, uint256 tokenId, uint256 totalSupply, uint256 reservePrice, string name, string symbol) returns (uint256)',
  'function startRedeemVoting(uint256 vaultId)',
  'function vote(uint256 vaultId, bool support)',
  'function executeRedeem(uint256 vaultId) payable',
  'function getVaultInfo(uint256 vaultId) view returns (address nftContract, uint256 tokenId, address curator, uint256 totalSupply, uint256 reservePrice, uint8 state, uint256 createdAt)',
  'function getVotingInfo(uint256 vaultId) view returns (uint256 votingEndTime, uint256 yesVotes, uint256 noVotes, bool hasVoted)',
];

export class FractionalizationVaultClient {
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

  async createVault(params: {
    nftContract: string;
    tokenId: number;
    totalSupply: bigint;
    reservePrice: bigint;
    name: string;
    symbol: string;
  }) {
    if (!this.signer) throw new Error('Signer required');
    const tx = await this.contract.createVault(
      params.nftContract,
      params.tokenId,
      params.totalSupply,
      params.reservePrice,
      params.name,
      params.symbol
    );
    const receipt = await tx.wait();
    return receipt;
  }

  async startRedeemVoting(vaultId: number) {
    if (!this.signer) throw new Error('Signer required');
    const tx = await this.contract.startRedeemVoting(vaultId);
    return await tx.wait();
  }

  async vote(vaultId: number, support: boolean) {
    if (!this.signer) throw new Error('Signer required');
    const tx = await this.contract.vote(vaultId, support);
    return await tx.wait();
  }

  async executeRedeem(vaultId: number, payment: bigint) {
    if (!this.signer) throw new Error('Signer required');
    const tx = await this.contract.executeRedeem(vaultId, { value: payment });
    return await tx.wait();
  }

  async getVaultInfo(vaultId: number) {
    return await this.contract.getVaultInfo(vaultId);
  }

  async getVotingInfo(vaultId: number) {
    return await this.contract.getVotingInfo(vaultId);
  }
}
