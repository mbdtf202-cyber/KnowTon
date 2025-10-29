import { ethers } from 'ethers';

const ABI = [
  'function mintIPNFT(address to, string metadataURI, bytes32 contentHash, bytes32 aiFingerprint, uint8 category, uint96 royaltyPercentage) returns (uint256)',
  'function getIPMetadata(uint256 tokenId) view returns (tuple(address creator, bytes32 contentHash, bytes32 aiFingerprint, uint8 category, uint256 mintTimestamp, uint96 royaltyPercentage, address royaltyRecipient, bool isVerified))',
  'function isContentRegistered(bytes32 contentHash) view returns (bool)',
  'function findSimilarContent(bytes32 aiFingerprint) view returns (uint256[])',
  'function getCreatorTokens(address creator) view returns (uint256[])',
  'function updateRoyalty(uint256 tokenId, uint96 newRoyaltyPercentage, address newRecipient)',
  'function verifyIP(uint256 tokenId)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'event IPNFTMinted(uint256 indexed tokenId, address indexed creator, bytes32 contentHash, bytes32 aiFingerprint, uint8 category, uint96 royaltyPercentage)',
];

export class CopyrightRegistryClient {
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

  async mintIPNFT(params: {
    to: string;
    metadataURI: string;
    contentHash: string;
    aiFingerprint: string;
    category: number;
    royaltyPercentage: number;
  }) {
    if (!this.signer) throw new Error('Signer required');
    
    const tx = await this.contract.mintIPNFT(
      params.to,
      params.metadataURI,
      params.contentHash,
      params.aiFingerprint,
      params.category,
      params.royaltyPercentage
    );
    
    const receipt = await tx.wait();
    const event = receipt.logs.find((log: any) => 
      log.topics[0] === ethers.id('IPNFTMinted(uint256,address,bytes32,bytes32,uint8,uint96)')
    );
    
    return {
      tokenId: ethers.toNumber(event.topics[1]),
      txHash: receipt.hash,
    };
  }

  async getIPMetadata(tokenId: number) {
    return await this.contract.getIPMetadata(tokenId);
  }

  async isContentRegistered(contentHash: string): Promise<boolean> {
    return await this.contract.isContentRegistered(contentHash);
  }

  async findSimilarContent(aiFingerprint: string): Promise<number[]> {
    const tokenIds = await this.contract.findSimilarContent(aiFingerprint);
    return tokenIds.map((id: bigint) => Number(id));
  }

  async getCreatorTokens(creator: string): Promise<number[]> {
    const tokenIds = await this.contract.getCreatorTokens(creator);
    return tokenIds.map((id: bigint) => Number(id));
  }

  async updateRoyalty(
    tokenId: number,
    newRoyaltyPercentage: number,
    newRecipient: string
  ) {
    if (!this.signer) throw new Error('Signer required');
    const tx = await this.contract.updateRoyalty(
      tokenId,
      newRoyaltyPercentage,
      newRecipient
    );
    return await tx.wait();
  }

  async ownerOf(tokenId: number): Promise<string> {
    return await this.contract.ownerOf(tokenId);
  }

  async tokenURI(tokenId: number): Promise<string> {
    return await this.contract.tokenURI(tokenId);
  }
}
