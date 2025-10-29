import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { KafkaProducer } from '../utils/kafka';
import { IPFSClient } from '../utils/ipfs';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const kafka = new KafkaProducer();
// const ipfs = new IPFSClient(); // TODO: Implement IPFS integration

interface MintNFTInput {
  creatorAddress: string;
  contentId: string;
  metadataURI: string;
  royaltyPercentage: number;
  price?: string;
}

export class NFTService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'
    );
    
    this.wallet = new ethers.Wallet(
      process.env.PRIVATE_KEY || '',
      this.provider
    );

    const contractAddress = process.env.COPYRIGHT_REGISTRY_ADDRESS || '';
    const abi = [
      'function mintIPNFT(address to, string metadataURI, bytes32 contentHash, bytes32 aiFingerprint, uint8 category, uint96 royaltyPercentage) returns (uint256)',
      'function batchMintIPNFT(address[] recipients, string[] metadataURIs, bytes32[] contentHashes, bytes32[] aiFingerprints, uint8[] categories, uint96[] royaltyPercentages) returns (uint256[])',
      'function getIPMetadata(uint256 tokenId) view returns (tuple(address creator, bytes32 contentHash, bytes32 aiFingerprint, uint8 category, uint256 mintTimestamp, uint96 royaltyPercentage, address royaltyRecipient, bool isVerified))',
      'function tokenURI(uint256 tokenId) view returns (string)',
    ];

    this.contract = new ethers.Contract(contractAddress, abi, this.wallet);
  }

  async mintNFT(input: MintNFTInput) {
    const { creatorAddress, contentId, metadataURI, royaltyPercentage, price } = input;

    // 1. Get content from database
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new Error('Content not found');
    }

    if (content.creatorAddress !== creatorAddress) {
      throw new Error('Unauthorized');
    }

    // 2. Call smart contract to mint NFT
    const tx = await this.contract.mintIPNFT(
      creatorAddress,
      metadataURI,
      content.contentHash,
      content.aiFingerprint,
      this.getCategoryEnum(content.category),
      royaltyPercentage
    );

    logger.info(`Minting NFT, tx: ${tx.hash}`);

    // 3. Wait for transaction confirmation
    const receipt = await tx.wait();

    // 4. Extract tokenId from event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed?.name === 'IPNFTMinted';
      } catch {
        return false;
      }
    });

    const tokenId = event ? ethers.toNumber(event.topics[1]) : null;

    if (!tokenId) {
      throw new Error('Failed to extract tokenId from transaction');
    }

    // 5. Store NFT record in database
    const nft = await prisma.nFT.create({
      data: {
        tokenId: tokenId.toString(),
        contractAddress: await this.contract.getAddress(),
        creatorAddress,
        ownerAddress: creatorAddress,
        contentId,
        metadataUri: metadataURI,
        royaltyPercent: royaltyPercentage,
        price,
        status: 'minted',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 6. Emit event to Kafka
    await kafka.send({
      topic: 'nft-minted',
      messages: [
        {
          key: tokenId.toString(),
          value: JSON.stringify({
            tokenId,
            creatorAddress,
            contentId,
            txHash: receipt.hash,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });

    logger.info(`NFT minted successfully: tokenId=${tokenId}, tx=${receipt.hash}`);

    return {
      tokenId,
      txHash: receipt.hash,
      nft,
    };
  }

  async batchMintNFTs(creatorAddress: string, nfts: any[]) {
    const recipients: string[] = [];
    const metadataURIs: string[] = [];
    const contentHashes: string[] = [];
    const aiFingerprints: string[] = [];
    const categories: number[] = [];
    const royaltyPercentages: number[] = [];

    for (const nft of nfts) {
      const content = await prisma.content.findUnique({
        where: { id: nft.contentId },
      });

      if (!content || content.creatorAddress !== creatorAddress) {
        throw new Error(`Invalid content: ${nft.contentId}`);
      }

      recipients.push(creatorAddress);
      metadataURIs.push(nft.metadataURI);
      contentHashes.push(content.contentHash);
      aiFingerprints.push(content.aiFingerprint);
      categories.push(this.getCategoryEnum(content.category));
      royaltyPercentages.push(nft.royaltyPercentage);
    }

    const tx = await this.contract.batchMintIPNFT(
      recipients,
      metadataURIs,
      contentHashes,
      aiFingerprints,
      categories,
      royaltyPercentages
    );

    const receipt = await tx.wait();

    logger.info(`Batch minted ${nfts.length} NFTs, tx: ${receipt.hash}`);

    return {
      txHash: receipt.hash,
      count: nfts.length,
    };
  }

  async getNFTMetadata(tokenId: string) {
    const nft = await prisma.nFT.findUnique({
      where: { tokenId },
      include: {
        content: true,
      },
    });

    if (!nft) {
      throw new Error('NFT not found');
    }

    // Get on-chain metadata
    const onChainMetadata = await this.contract.getIPMetadata(tokenId);
    const tokenURI = await this.contract.tokenURI(tokenId);

    return {
      ...nft,
      onChain: {
        creator: onChainMetadata.creator,
        contentHash: onChainMetadata.contentHash,
        aiFingerprint: onChainMetadata.aiFingerprint,
        category: onChainMetadata.category,
        mintTimestamp: Number(onChainMetadata.mintTimestamp),
        royaltyPercentage: Number(onChainMetadata.royaltyPercentage),
        royaltyRecipient: onChainMetadata.royaltyRecipient,
        isVerified: onChainMetadata.isVerified,
        tokenURI,
      },
    };
  }

  async updateNFTMetadata(tokenId: string, creatorAddress: string, updates: any) {
    const nft = await prisma.nFT.findUnique({
      where: { tokenId },
    });

    if (!nft) {
      throw new Error('NFT not found');
    }

    if (nft.creatorAddress !== creatorAddress) {
      throw new Error('Unauthorized');
    }

    // Update off-chain metadata
    const updated = await prisma.nFT.update({
      where: { tokenId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });

    return updated;
  }

  async getNFTStatus(tokenId: string) {
    const nft = await prisma.nFT.findUnique({
      where: { tokenId },
    });

    if (!nft) {
      throw new Error('NFT not found');
    }

    return {
      tokenId: nft.tokenId,
      status: nft.status,
      owner: nft.ownerAddress,
      createdAt: nft.createdAt,
    };
  }

  private getCategoryEnum(category: string): number {
    const categories: Record<string, number> = {
      Music: 0,
      Video: 1,
      Image: 2,
      Text: 3,
      Software: 4,
      Other: 5,
    };
    return categories[category] || 5;
  }
}
