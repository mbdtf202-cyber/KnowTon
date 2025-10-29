import { Request, Response } from 'express';
import { MarketplaceService } from '../services/marketplace.service';
import { logger } from '../utils/logger';

const marketplaceService = new MarketplaceService();

export class MarketplaceController {
  async placeOrder(req: Request, res: Response) {
    try {
      const { tokenId, type, price, amount, expiresAt } = req.body;
      const maker = (req as any).user?.address;

      if (!maker) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!tokenId || !type || !price || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await marketplaceService.placeOrder({
        tokenId,
        maker,
        type,
        price,
        amount: parseInt(amount),
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      res.json({
        success: true,
        orderId: result.orderId,
        status: result.status,
        matchesCount: result.matches.length,
        matches: result.matches.map((m) => ({
          buyOrderId: m.buyOrder.id,
          sellOrderId: m.sellOrder.id,
          price: m.price,
          amount: m.amount,
        })),
      });
    } catch (error) {
      logger.error('Error placing order:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async cancelOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const maker = (req as any).user?.address;

      if (!maker) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
      }

      await marketplaceService.cancelOrder(orderId, maker);

      res.json({
        success: true,
        message: 'Order cancelled successfully',
        orderId,
      });
    } catch (error) {
      logger.error('Error cancelling order:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getOrderBook(req: Request, res: Response) {
    try {
      const { tokenId } = req.params;

      if (!tokenId) {
        return res.status(400).json({ error: 'Token ID is required' });
      }

      const orderBook = await marketplaceService.getOrderBookSnapshot(tokenId);

      res.json({
        tokenId,
        bids: orderBook.bids,
        asks: orderBook.asks,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting order book:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getRecentTrades(req: Request, res: Response) {
    try {
      const { tokenId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!tokenId) {
        return res.status(400).json({ error: 'Token ID is required' });
      }

      const trades = await marketplaceService.getRecentTrades(tokenId, limit);

      res.json({
        tokenId,
        tradesCount: trades.length,
        trades: trades.map((t) => ({
          buyOrderId: t.buyOrderId,
          sellOrderId: t.sellOrderId,
          buyer: t.buyer,
          seller: t.seller,
          price: t.price,
          amount: t.amount,
          txHash: t.txHash,
          createdAt: t.createdAt,
        })),
      });
    } catch (error) {
      logger.error('Error getting recent trades:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
