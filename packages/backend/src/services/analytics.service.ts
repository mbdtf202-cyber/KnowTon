import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface TimeRange {
  startDate: Date;
  endDate: Date;
}

export class AnalyticsService {
  async getContentAnalytics(tokenId: string, timeRange?: TimeRange) {
    try {
      const cacheKey = `analytics:content:${tokenId}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const nft = await prisma.nFT.findUnique({
        where: { tokenId },
      });

      if (!nft) {
        throw new Error('NFT not found');
      }

      const trades = await prisma.trade.findMany({
        where: {
          tokenId,
          ...(timeRange && {
            createdAt: {
              gte: timeRange.startDate,
              lte: timeRange.endDate,
            },
          }),
        },
        orderBy: { createdAt: 'desc' },
      });

      const royaltyDistributions = await prisma.royaltyDistribution.findMany({
        where: {
          tokenId,
          ...(timeRange && {
            createdAt: {
              gte: timeRange.startDate,
              lte: timeRange.endDate,
            },
          }),
        },
      });

      const totalVolume = trades.reduce((sum: number, trade: any) => {
        return sum + parseFloat(trade.price) * trade.amount;
      }, 0);

      const totalRoyalties = royaltyDistributions.reduce((sum: number, dist: any) => {
        return sum + parseFloat(dist.salePrice) * 0.1;
      }, 0);

      const avgPrice = trades.length > 0 ? totalVolume / trades.reduce((sum: number, t: any) => sum + t.amount, 0) : 0;

      const priceHistory = trades.map((trade: any) => ({
        timestamp: trade.createdAt,
        price: trade.price,
        amount: trade.amount,
      }));

      const analytics = {
        tokenId,
        totalTrades: trades.length,
        totalVolume: totalVolume.toString(),
        avgPrice: avgPrice.toString(),
        totalRoyalties: totalRoyalties.toString(),
        priceHistory,
        lastTrade: trades[0] || null,
      };

      await redis.setex(cacheKey, 300, JSON.stringify(analytics));

      return analytics;
    } catch (error: any) {
      console.error('Error getting content analytics:', error);
      throw new Error(`Failed to get content analytics: ${error.message}`);
    }
  }

  async getCreatorAnalytics(creatorAddress: string, timeRange?: TimeRange) {
    try {
      const cacheKey = `analytics:creator:${creatorAddress}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const creator = await prisma.creator.findUnique({
        where: { walletAddress: creatorAddress },
        include: { contents: true },
      });

      if (!creator) {
        throw new Error('Creator not found');
      }

      const nfts = await prisma.nFT.findMany({
        where: { creatorAddress },
      });

      const tokenIds = nfts.map((nft: any) => nft.tokenId);

      const trades = await prisma.trade.findMany({
        where: {
          tokenId: { in: tokenIds },
          ...(timeRange && {
            createdAt: {
              gte: timeRange.startDate,
              lte: timeRange.endDate,
            },
          }),
        },
      });

      const royaltyDistributions = await prisma.royaltyDistribution.findMany({
        where: {
          tokenId: { in: tokenIds },
          ...(timeRange && {
            createdAt: {
              gte: timeRange.startDate,
              lte: timeRange.endDate,
            },
          }),
        },
      });

      const totalVolume = trades.reduce((sum: number, trade: any) => {
        return sum + parseFloat(trade.price) * trade.amount;
      }, 0);

      const totalRoyalties = royaltyDistributions.reduce((sum: number, dist: any) => {
        const distributions = dist.distributions as any;
        const creatorShare = distributions.find((d: any) => d.address.toLowerCase() === creatorAddress.toLowerCase());
        return sum + (creatorShare ? parseFloat(creatorShare.amount) : 0);
      }, 0);

      const analytics = {
        creatorAddress,
        totalContents: creator.contents.length,
        totalNFTs: nfts.length,
        totalTrades: trades.length,
        totalVolume: totalVolume.toString(),
        totalRoyalties: totalRoyalties.toString(),
        avgPricePerNFT: nfts.length > 0 ? (totalVolume / nfts.length).toString() : '0',
      };

      await redis.setex(cacheKey, 300, JSON.stringify(analytics));

      return analytics;
    } catch (error: any) {
      console.error('Error getting creator analytics:', error);
      throw new Error(`Failed to get creator analytics: ${error.message}`);
    }
  }

  async getPlatformAnalytics(timeRange?: TimeRange) {
    try {
      const cacheKey = 'analytics:platform';
      const cached = await redis.get(cacheKey);
      
      if (cached && !timeRange) {
        return JSON.parse(cached);
      }

      const totalCreators = await prisma.creator.count();
      const totalContents = await prisma.content.count();
      const totalNFTs = await prisma.nFT.count();

      const trades = await prisma.trade.findMany({
        where: timeRange ? {
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        } : undefined,
      });

      const totalVolume = trades.reduce((sum: number, trade: any) => {
        return sum + parseFloat(trade.price) * trade.amount;
      }, 0);

      const royaltyDistributions = await prisma.royaltyDistribution.findMany({
        where: timeRange ? {
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        } : undefined,
      });

      const totalRoyalties = royaltyDistributions.reduce((sum: number, dist: any) => {
        return sum + parseFloat(dist.salePrice) * 0.1;
      }, 0);

      const analytics = {
        totalCreators,
        totalContents,
        totalNFTs,
        totalTrades: trades.length,
        totalVolume: totalVolume.toString(),
        totalRoyalties: totalRoyalties.toString(),
        avgTradeValue: trades.length > 0 ? (totalVolume / trades.length).toString() : '0',
      };

      if (!timeRange) {
        await redis.setex(cacheKey, 300, JSON.stringify(analytics));
      }

      return analytics;
    } catch (error: any) {
      console.error('Error getting platform analytics:', error);
      throw new Error(`Failed to get platform analytics: ${error.message}`);
    }
  }

  async getTopCreators(limit: number = 10) {
    try {
      const cacheKey = `analytics:top-creators:${limit}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const creators = await prisma.creator.findMany({
        include: {
          contents: true,
        },
      });

      const creatorStats = await Promise.all(
        creators.map(async (creator: any) => {
          const nfts = await prisma.nFT.findMany({
            where: { creatorAddress: creator.walletAddress },
          });

          const tokenIds = nfts.map((nft: any) => nft.tokenId);

          const trades = await prisma.trade.findMany({
            where: { tokenId: { in: tokenIds } },
          });

          const totalVolume = trades.reduce((sum: number, trade: any) => {
            return sum + parseFloat(trade.price) * trade.amount;
          }, 0);

          return {
            address: creator.walletAddress,
            displayName: creator.displayName,
            avatar: creator.avatar,
            totalContents: creator.contents.length,
            totalNFTs: nfts.length,
            totalVolume,
          };
        })
      );

      const topCreators = creatorStats
        .sort((a, b) => b.totalVolume - a.totalVolume)
        .slice(0, limit);

      await redis.setex(cacheKey, 600, JSON.stringify(topCreators));

      return topCreators;
    } catch (error: any) {
      console.error('Error getting top creators:', error);
      throw new Error(`Failed to get top creators: ${error.message}`);
    }
  }

  async getTrendingNFTs(limit: number = 10) {
    try {
      const cacheKey = `analytics:trending-nfts:${limit}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const recentTrades = await prisma.trade.findMany({
        where: {
          createdAt: { gte: last24Hours },
        },
      });

      const nftTradeCount = recentTrades.reduce((acc: any, trade: any) => {
        acc[trade.tokenId] = (acc[trade.tokenId] || 0) + 1;
        return acc;
      }, {});

      const trendingTokenIds = Object.entries(nftTradeCount)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, limit)
        .map(([tokenId]) => tokenId);

      const trendingNFTs = await Promise.all(
        trendingTokenIds.map(async (tokenId: string) => {
          const nft = await prisma.nFT.findUnique({
            where: { tokenId },
          });

          const trades = recentTrades.filter((t: any) => t.tokenId === tokenId);
          const volume = trades.reduce((sum: number, trade: any) => {
            return sum + parseFloat(trade.price) * trade.amount;
          }, 0);

          return {
            ...nft,
            tradeCount: trades.length,
            volume24h: volume.toString(),
          };
        })
      );

      await redis.setex(cacheKey, 300, JSON.stringify(trendingNFTs));

      return trendingNFTs;
    } catch (error: any) {
      console.error('Error getting trending NFTs:', error);
      throw new Error(`Failed to get trending NFTs: ${error.message}`);
    }
  }
}
