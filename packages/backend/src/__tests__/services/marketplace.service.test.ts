import { MarketplaceService } from '../../services/marketplace.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client');
const mockPrisma = {
  listing: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  trade: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
} as any;

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    hGet: jest.fn(),
    hSet: jest.fn(),
    hDel: jest.fn(),
  })),
}));

describe('MarketplaceService', () => {
  let marketplaceService: MarketplaceService;

  beforeEach(() => {
    marketplaceService = new MarketplaceService();
    (marketplaceService as any).prisma = mockPrisma;
    jest.clearAllMocks();
  });

  describe('createListing', () => {
    it('should create listing successfully', async () => {
      const mockListing = {
        id: '1',
        nftId: 'nft1',
        sellerId: 'seller1',
        price: '1.5',
        currency: 'ETH',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.listing.create.mockResolvedValue(mockListing);

      const result = await marketplaceService.createListing({
        nftId: 'nft1',
        sellerId: 'seller1',
        price: '1.5',
        currency: 'ETH',
      });

      expect(result).toEqual(mockListing);
      expect(mockPrisma.listing.create).toHaveBeenCalledWith({
        data: {
          nftId: 'nft1',
          sellerId: 'seller1',
          price: '1.5',
          currency: 'ETH',
          status: 'active',
        },
      });
    });

    it('should handle creation errors', async () => {
      mockPrisma.listing.create.mockRejectedValue(new Error('Database error'));

      await expect(marketplaceService.createListing({
        nftId: 'nft1',
        sellerId: 'seller1',
        price: '1.5',
        currency: 'ETH',
      })).rejects.toThrow('Database error');
    });
  });

  describe('getListings', () => {
    it('should retrieve active listings', async () => {
      const mockListings = [
        {
          id: '1',
          nftId: 'nft1',
          sellerId: 'seller1',
          price: '1.5',
          currency: 'ETH',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          nftId: 'nft2',
          sellerId: 'seller2',
          price: '2.0',
          currency: 'ETH',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.listing.findMany.mockResolvedValue(mockListings);

      const result = await marketplaceService.getListings({ status: 'active' });

      expect(result).toEqual(mockListings);
      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith({
        where: { status: 'active' },
        include: {
          nft: true,
          seller: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should filter by price range', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([]);

      await marketplaceService.getListings({
        minPrice: '1.0',
        maxPrice: '5.0',
      });

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith({
        where: {
          price: {
            gte: '1.0',
            lte: '5.0',
          },
        },
        include: {
          nft: true,
          seller: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('executeTrade', () => {
    it('should execute trade successfully', async () => {
      const mockListing = {
        id: '1',
        nftId: 'nft1',
        sellerId: 'seller1',
        price: '1.5',
        currency: 'ETH',
        status: 'active',
      };

      const mockTrade = {
        id: '1',
        listingId: '1',
        buyerId: 'buyer1',
        sellerId: 'seller1',
        price: '1.5',
        currency: 'ETH',
        transactionHash: '0xabc123',
        createdAt: new Date(),
      };

      mockPrisma.listing.findUnique.mockResolvedValue(mockListing);
      mockPrisma.trade.create.mockResolvedValue(mockTrade);
      mockPrisma.listing.update.mockResolvedValue({ ...mockListing, status: 'sold' });

      const result = await marketplaceService.executeTrade('1', 'buyer1');

      expect(result).toEqual(mockTrade);
      expect(mockPrisma.listing.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'sold' },
      });
    });

    it('should handle non-existent listing', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(null);

      await expect(marketplaceService.executeTrade('999', 'buyer1'))
        .rejects.toThrow('Listing not found');
    });

    it('should handle inactive listing', async () => {
      const mockListing = {
        id: '1',
        nftId: 'nft1',
        sellerId: 'seller1',
        price: '1.5',
        currency: 'ETH',
        status: 'sold',
      };

      mockPrisma.listing.findUnique.mockResolvedValue(mockListing);

      await expect(marketplaceService.executeTrade('1', 'buyer1'))
        .rejects.toThrow('Listing is not active');
    });
  });

  describe('cancelListing', () => {
    it('should cancel listing successfully', async () => {
      const mockListing = {
        id: '1',
        nftId: 'nft1',
        sellerId: 'seller1',
        price: '1.5',
        currency: 'ETH',
        status: 'active',
      };

      mockPrisma.listing.findUnique.mockResolvedValue(mockListing);
      mockPrisma.listing.update.mockResolvedValue({ ...mockListing, status: 'cancelled' });

      const result = await marketplaceService.cancelListing('1', 'seller1');

      expect(result.status).toBe('cancelled');
      expect(mockPrisma.listing.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'cancelled' },
      });
    });

    it('should prevent unauthorized cancellation', async () => {
      const mockListing = {
        id: '1',
        nftId: 'nft1',
        sellerId: 'seller1',
        price: '1.5',
        currency: 'ETH',
        status: 'active',
      };

      mockPrisma.listing.findUnique.mockResolvedValue(mockListing);

      await expect(marketplaceService.cancelListing('1', 'unauthorized'))
        .rejects.toThrow('Unauthorized to cancel this listing');
    });
  });

  describe('getMarketStats', () => {
    it('should return market statistics', async () => {
      const mockStats = {
        totalListings: 100,
        activeListings: 75,
        totalVolume: '1000.5',
        averagePrice: '5.2',
      };

      // Mock the database queries for stats
      mockPrisma.listing.count = jest.fn()
        .mockResolvedValueOnce(100) // total listings
        .mockResolvedValueOnce(75); // active listings

      mockPrisma.trade.aggregate = jest.fn().mockResolvedValue({
        _sum: { price: '1000.5' },
        _avg: { price: '5.2' },
      });

      const result = await marketplaceService.getMarketStats();

      expect(result).toEqual(mockStats);
    });
  });

  describe('searchListings', () => {
    it('should search listings by title', async () => {
      const mockListings = [
        {
          id: '1',
          nftId: 'nft1',
          sellerId: 'seller1',
          price: '1.5',
          currency: 'ETH',
          status: 'active',
          nft: {
            title: 'Amazing Art',
            description: 'Beautiful artwork',
          },
        },
      ];

      mockPrisma.listing.findMany.mockResolvedValue(mockListings);

      const result = await marketplaceService.searchListings('Amazing');

      expect(result).toEqual(mockListings);
      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith({
        where: {
          status: 'active',
          nft: {
            OR: [
              {
                title: {
                  contains: 'Amazing',
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: 'Amazing',
                  mode: 'insensitive',
                },
              },
            ],
          },
        },
        include: {
          nft: true,
          seller: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('updateListingPrice', () => {
    it('should update listing price', async () => {
      const mockListing = {
        id: '1',
        nftId: 'nft1',
        sellerId: 'seller1',
        price: '1.5',
        currency: 'ETH',
        status: 'active',
      };

      mockPrisma.listing.findUnique.mockResolvedValue(mockListing);
      mockPrisma.listing.update.mockResolvedValue({ ...mockListing, price: '2.0' });

      const result = await marketplaceService.updateListingPrice('1', '2.0', 'seller1');

      expect(result.price).toBe('2.0');
      expect(mockPrisma.listing.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { price: '2.0' },
      });
    });

    it('should prevent unauthorized price updates', async () => {
      const mockListing = {
        id: '1',
        nftId: 'nft1',
        sellerId: 'seller1',
        price: '1.5',
        currency: 'ETH',
        status: 'active',
      };

      mockPrisma.listing.findUnique.mockResolvedValue(mockListing);

      await expect(marketplaceService.updateListingPrice('1', '2.0', 'unauthorized'))
        .rejects.toThrow('Unauthorized to update this listing');
    });
  });
});