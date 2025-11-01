import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/trading/pairs
 * Get all trading pairs with 24h stats
 */
router.get('/pairs', async (_req, res) => {
  try {
    // Try to get from database, fallback to mock data
    let tradingPairs;
    
    try {
      const nfts = await prisma.nFT.findMany({
        take: 50,
        orderBy: {
          createdAt: 'desc',
        },
      }) as any;

      if (nfts && nfts.length > 0) {
        tradingPairs = nfts.map((nft: any) => {
          const lastPrice = parseFloat(nft.price || '1.5');
          const priceChange24h = (Math.random() - 0.5) * 20;
          const volume24h = Math.random() * 100 + 10;

          return {
            tokenId: nft.tokenId,
            title: nft.title || `NFT #${nft.tokenId}`,
            image: nft.metadataUri || `https://picsum.photos/seed/${nft.tokenId}/200`,
            lastPrice,
            priceChange24h,
            volume24h,
            high24h: lastPrice * 1.1,
            low24h: lastPrice * 0.9,
          };
        });
      } else {
        throw new Error('No NFTs in database');
      }
    } catch (dbError) {
      // Database not ready or empty, return mock data
      console.log('Using mock data for trading pairs');
      tradingPairs = Array.from({ length: 20 }, (_, i) => ({
        tokenId: `${i + 1}`,
        title: `NFT #${i + 1}`,
        image: `https://picsum.photos/seed/${i}/200`,
        lastPrice: 1.5 + Math.random() * 3,
        priceChange24h: (Math.random() - 0.5) * 20,
        volume24h: Math.random() * 100 + 10,
        high24h: 2 + Math.random() * 2,
        low24h: 1 + Math.random(),
      }));
    }

    res.json(tradingPairs);
  } catch (error) {
    console.error('Error fetching trading pairs:', error);
    res.status(500).json({ error: 'Failed to fetch trading pairs' });
  }
});

/**
 * GET /api/trading/:tokenId/orderbook
 * Get order book for a specific NFT
 */
router.get('/:tokenId/orderbook', async (req, res) => {
  try {
    const { tokenId } = req.params;

    // Get NFT
    const nft = await prisma.nFT.findFirst({
      where: { tokenId },
    });

    if (!nft) {
      return res.status(404).json({ error: 'NFT not found' });
    }

    // Mock order book - replace with actual marketplace orders
    const basePrice = parseFloat(nft.price || '1.5');
    const spread = 0.01;

    const bids = Array.from({ length: 15 }, (_, i) => ({
      id: `bid_${i}`,
      tokenId,
      maker: `0x${Math.random().toString(16).slice(2, 42)}`,
      side: 'buy',
      price: basePrice - spread - i * 0.01,
      amount: Math.random() * 5 + 0.1,
      filled: 0,
      status: 'open',
      timestamp: Date.now() - Math.random() * 3600000,
    }));

    const asks = Array.from({ length: 15 }, (_, i) => ({
      id: `ask_${i}`,
      tokenId,
      maker: `0x${Math.random().toString(16).slice(2, 42)}`,
      side: 'sell',
      price: basePrice + spread + i * 0.01,
      amount: Math.random() * 5 + 0.1,
      filled: 0,
      status: 'open',
      timestamp: Date.now() - Math.random() * 3600000,
    }));

    res.json({
      tokenId,
      bids: bids.sort((a, b) => b.price - a.price),
      asks: asks.sort((a, b) => a.price - b.price),
      lastPrice: basePrice,
      priceChange24h: (Math.random() - 0.5) * 0.2,
      volume24h: Math.random() * 100 + 10,
      high24h: basePrice * 1.1,
      low24h: basePrice * 0.9,
    });
  } catch (error) {
    console.error('Error fetching order book:', error);
    res.status(500).json({ error: 'Failed to fetch order book' });
  }
});

export default router;
