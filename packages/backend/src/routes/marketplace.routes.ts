import { Router } from 'express';
import { MarketplaceController } from '../controllers/marketplace.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const marketplaceController = new MarketplaceController();

// Place order
router.post('/orders', authMiddleware, marketplaceController.placeOrder.bind(marketplaceController));

// Cancel order
router.delete(
  '/orders/:orderId',
  authMiddleware,
  marketplaceController.cancelOrder.bind(marketplaceController)
);

// Get order book
router.get('/orderbook/:tokenId', marketplaceController.getOrderBook.bind(marketplaceController));

// Get recent trades
router.get('/trades/:tokenId', marketplaceController.getRecentTrades.bind(marketplaceController));

export default router;
