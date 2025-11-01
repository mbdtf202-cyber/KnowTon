import { NFTService } from '../../services/nft.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client');
const mockPrisma = {
  nFT: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
} as any;

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    Contract: jest.fn(),
    JsonRpcProvider: jest.fn(),
    parseEther: jest.fn((value) => value),
    formatEther: jest.fn((value) => value),
  },
}));

describe('NFTService', () => {
  let nftService: NFTService;

  beforeEach(() => {
    nftService = new NFTService();
    (nftService as any).prisma = mockPrisma;
    jest.clearAllMocks();
  });

  describe('mintNFT', () => {
    it('should mint NFT successfully', async () => {
      const mockNFT = {
        id: '1',
        tokenId: 123,
        title: 'Test NFT',
        description: 'Test Description',
        ipfsHash: 'QmTest123',
        creatorId: 'creator1',
        contractAddress: '0x123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.nFT.create.mockResolvedValue(mockNFT);

      const result = await nftService.mintNFT({
        title: 'Test NFT',
        description: 'Test Description',
        ipfsHash: 'QmTest123',
        creatorId: 'creator1',
        royaltyPercentage: 10,
      });

      expect(result).toEqual(mockNFT);
      expect(mockPrisma.nFT.create).toHaveBeenCalledWith({
        data: {
          title: 'Test NFT',
          description: 'Test Description',
          ipfsHash: 'QmTest123',
          creatorId: 'creator1',
          royaltyPercentage: 10,
          tokenId: expect.any(Number),
          contractAddress: expect.any(String),
        },
      });
    });

    it('should handle minting errors', async () => {
      mockPrisma.nFT.create.mockRejectedValue(new Error('Database error'));

      await expect(nftService.mintNFT({
        title: 'Test NFT',
        description: 'Test Description',
        ipfsHash: 'QmTest123',
        creatorId: 'creator1',
        royaltyPercentage: 10,
      })).rejects.toThrow('Database error');
    });
  });

  describe('getNFT', () => {
    it('should retrieve NFT by id', async () => {
      const mockNFT = {
        id: '1',
        tokenId: 123,
        title: 'Test NFT',
        description: 'Test Description',
        ipfsHash: 'QmTest123',
        creatorId: 'creator1',
        contractAddress: '0x123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.nFT.findUnique.mockResolvedValue(mockNFT);

      const result = await nftService.getNFT('1');

      expect(result).toEqual(mockNFT);
      expect(mockPrisma.nFT.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          creator: true,
          content: true,
        },
      });
    });

    it('should return null for non-existent NFT', async () => {
      mockPrisma.nFT.findUnique.mockResolvedValue(null);

      const result = await nftService.getNFT('999');

      expect(result).toBeNull();
    });
  });

  describe('getAllNFTs', () => {
    it('should retrieve all NFTs with pagination', async () => {
      const mockNFTs = [
        {
          id: '1',
          tokenId: 123,
          title: 'NFT 1',
          description: 'Description 1',
          ipfsHash: 'QmTest123',
          creatorId: 'creator1',
          contractAddress: '0x123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          tokenId: 124,
          title: 'NFT 2',
          description: 'Description 2',
          ipfsHash: 'QmTest456',
          creatorId: 'creator2',
          contractAddress: '0x456',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.nFT.findMany.mockResolvedValue(mockNFTs);

      const result = await nftService.getAllNFTs(1, 10);

      expect(result).toEqual(mockNFTs);
      expect(mockPrisma.nFT.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        include: {
          creator: true,
          content: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should handle pagination correctly', async () => {
      mockPrisma.nFT.findMany.mockResolvedValue([]);

      await nftService.getAllNFTs(3, 5);

      expect(mockPrisma.nFT.findMany).toHaveBeenCalledWith({
        skip: 10, // (3-1) * 5
        take: 5,
        include: {
          creator: true,
          content: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('updateNFT', () => {
    it('should update NFT successfully', async () => {
      const mockUpdatedNFT = {
        id: '1',
        tokenId: 123,
        title: 'Updated NFT',
        description: 'Updated Description',
        ipfsHash: 'QmTest123',
        creatorId: 'creator1',
        contractAddress: '0x123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.nFT.update.mockResolvedValue(mockUpdatedNFT);

      const result = await nftService.updateNFT('1', {
        title: 'Updated NFT',
        description: 'Updated Description',
      });

      expect(result).toEqual(mockUpdatedNFT);
      expect(mockPrisma.nFT.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          title: 'Updated NFT',
          description: 'Updated Description',
        },
      });
    });
  });

  describe('deleteNFT', () => {
    it('should delete NFT successfully', async () => {
      const mockDeletedNFT = {
        id: '1',
        tokenId: 123,
        title: 'Test NFT',
        description: 'Test Description',
        ipfsHash: 'QmTest123',
        creatorId: 'creator1',
        contractAddress: '0x123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.nFT.delete.mockResolvedValue(mockDeletedNFT);

      const result = await nftService.deleteNFT('1');

      expect(result).toEqual(mockDeletedNFT);
      expect(mockPrisma.nFT.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });

  describe('getNFTsByCreator', () => {
    it('should get NFTs by creator', async () => {
      const mockNFTs = [
        {
          id: '1',
          tokenId: 123,
          title: 'Creator NFT 1',
          description: 'Description 1',
          ipfsHash: 'QmTest123',
          creatorId: 'creator1',
          contractAddress: '0x123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.nFT.findMany.mockResolvedValue(mockNFTs);

      const result = await nftService.getNFTsByCreator('creator1');

      expect(result).toEqual(mockNFTs);
      expect(mockPrisma.nFT.findMany).toHaveBeenCalledWith({
        where: { creatorId: 'creator1' },
        include: {
          creator: true,
          content: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('transferNFT', () => {
    it('should transfer NFT ownership', async () => {
      const mockTransferResult = {
        success: true,
        transactionHash: '0xabc123',
        blockNumber: 12345,
      };

      // Mock the blockchain interaction
      const mockTransfer = jest.fn().mockResolvedValue(mockTransferResult);
      (nftService as any).transferOnChain = mockTransfer;

      const result = await nftService.transferNFT('1', 'newOwner', 'currentOwner');

      expect(result).toEqual(mockTransferResult);
      expect(mockTransfer).toHaveBeenCalledWith('1', 'newOwner', 'currentOwner');
    });

    it('should handle transfer errors', async () => {
      const mockTransfer = jest.fn().mockRejectedValue(new Error('Transfer failed'));
      (nftService as any).transferOnChain = mockTransfer;

      await expect(nftService.transferNFT('1', 'newOwner', 'currentOwner'))
        .rejects.toThrow('Transfer failed');
    });
  });

  describe('setRoyalty', () => {
    it('should set royalty percentage', async () => {
      const mockUpdatedNFT = {
        id: '1',
        tokenId: 123,
        title: 'Test NFT',
        description: 'Test Description',
        ipfsHash: 'QmTest123',
        creatorId: 'creator1',
        contractAddress: '0x123',
        royaltyPercentage: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.nFT.update.mockResolvedValue(mockUpdatedNFT);

      const result = await nftService.setRoyalty('1', 15);

      expect(result).toEqual(mockUpdatedNFT);
      expect(mockPrisma.nFT.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { royaltyPercentage: 15 },
      });
    });

    it('should validate royalty percentage', async () => {
      await expect(nftService.setRoyalty('1', 101))
        .rejects.toThrow('Royalty percentage must be between 0 and 100');

      await expect(nftService.setRoyalty('1', -1))
        .rejects.toThrow('Royalty percentage must be between 0 and 100');
    });
  });
});