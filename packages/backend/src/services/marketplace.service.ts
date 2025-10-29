import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { WebSocket, WebSocketServer } from 'ws';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

enum OrderType {
  BUY = 'BUY',
  SELL = 'SELL',
}

enum OrderStatus {
  OPEN = 'OPEN',
  FILLED = 'FILLED',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  CANCELLED = 'CANCELLED',
}

interface Order {
  id: string;
  tokenId: string;
  maker: string;
  type: OrderType;
  price: string;
  amount: number;
  filledAmount: number;
  status: OrderStatus;
  createdAt: Date;
  expiresAt?: Date;
}

interface OrderMatch {
  buyOrder: Order;
  sellOrder: Order;
  price: string;
  amount: number;
}

class OrderBook {
  private buyOrders: Order[] = [];
  private sellOrders: Order[] = [];

  addOrder(order: Order) {
    if (order.type === OrderType.BUY) {
      this.buyOrders.push(order);
      this.buyOrders.sort((a, b) => Number(BigInt(b.price) - BigInt(a.price))); // Descending
    } else {
      this.sellOrders.push(order);
      this.sellOrders.sort((a, b) => Number(BigInt(a.price) - BigInt(b.price))); // Ascending
    }
  }

  removeOrder(orderId: string) {
    this.buyOrders = this.buyOrders.filter((o) => o.id !== orderId);
    this.sellOrders = this.sellOrders.filter((o) => o.id !== orderId);
  }

  matchOrders(): OrderMatch[] {
    const matches: OrderMatch[] = [];

    while (this.buyOrders.length > 0 && this.sellOrders.length > 0) {
      const buyOrder = this.buyOrders[0];
      const sellOrder = this.sellOrders[0];

      // Check if orders can be matched
      if (BigInt(buyOrder.price) < BigInt(sellOrder.price)) {
        break;
      }

      // Calculate match amount
      const buyRemaining = buyOrder.amount - buyOrder.filledAmount;
      const sellRemaining = sellOrder.amount - sellOrder.filledAmount;
      const matchAmount = Math.min(buyRemaining, sellRemaining);

      // Create match
      matches.push({
        buyOrder,
        sellOrder,
        price: sellOrder.price, // Use sell price
        amount: matchAmount,
      });

      // Update filled amounts
      buyOrder.filledAmount += matchAmount;
      sellOrder.filledAmount += matchAmount;

      // Remove fully filled orders
      if (buyOrder.filledAmount >= buyOrder.amount) {
        this.buyOrders.shift();
      }
      if (sellOrder.filledAmount >= sellOrder.amount) {
        this.sellOrders.shift();
      }
    }

    return matches;
  }

  getBuyOrders(): Order[] {
    return [...this.buyOrders];
  }

  getSellOrders(): Order[] {
    return [...this.sellOrders];
  }

  getOrderBookSnapshot() {
    return {
      bids: this.buyOrders.map((o) => ({
        price: o.price,
        amount: o.amount - o.filledAmount,
      })),
      asks: this.sellOrders.map((o) => ({
        price: o.price,
        amount: o.amount - o.filledAmount,
      })),
    };
  }
}

export class MarketplaceService {
  private orderBooks: Map<string, OrderBook> = new Map();
  private redis: Redis;
  private wsServer?: WebSocketServer;
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private marketplaceContract: ethers.Contract;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    this.provider = new ethers.JsonRpcProvider(
      process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'
    );

    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', this.provider);

    const contractAddress = process.env.MARKETPLACE_CONTRACT_ADDRESS || '';
    const abi = [
      'function executeTrade(string buyOrderId, string sellOrderId, uint256 price, uint256 amount) external payable',
      'function cancelOrder(string orderId) external',
    ];

    this.marketplaceContract = new ethers.Contract(contractAddress, abi, this.wallet);

    this.loadOrderBooksFromRedis();
  }

  async loadOrderBooksFromRedis() {
    const keys = await this.redis.keys('orderbook:*');
    for (const key of keys) {
      const tokenId = key.split(':')[1];
      const data = await this.redis.get(key);
      if (data) {
        const orderBook = new OrderBook();
        const orders = JSON.parse(data);
        orders.forEach((order: Order) => orderBook.addOrder(order));
        this.orderBooks.set(tokenId, orderBook);
      }
    }
    logger.info(`Loaded ${this.orderBooks.size} order books from Redis`);
  }

  getOrderBook(tokenId: string): OrderBook {
    if (!this.orderBooks.has(tokenId)) {
      this.orderBooks.set(tokenId, new OrderBook());
    }
    return this.orderBooks.get(tokenId)!;
  }

  async placeOrder(order: Omit<Order, 'id' | 'filledAmount' | 'status' | 'createdAt'>): Promise<{
    orderId: string;
    status: OrderStatus;
    matches: OrderMatch[];
  }> {
    // Validate order
    await this.validateOrder(order);

    // Create order
    const fullOrder: Order = {
      ...order,
      id: this.generateOrderId(),
      filledAmount: 0,
      status: OrderStatus.OPEN,
      createdAt: new Date(),
    };

    // Add to order book
    const orderBook = this.getOrderBook(order.tokenId);
    orderBook.addOrder(fullOrder);

    // Try to match orders
    const matches = orderBook.matchOrders();

    // Execute matched trades
    for (const match of matches) {
      await this.executeTrade(match);
    }

    // Update order status
    if (fullOrder.filledAmount >= fullOrder.amount) {
      fullOrder.status = OrderStatus.FILLED;
    } else if (fullOrder.filledAmount > 0) {
      fullOrder.status = OrderStatus.PARTIALLY_FILLED;
    }

    // Save to database
    await this.saveOrder(fullOrder);

    // Persist to Redis
    await this.persistOrderBook(order.tokenId);

    // Broadcast updates
    this.broadcastOrderBookUpdate(order.tokenId);

    return {
      orderId: fullOrder.id,
      status: fullOrder.status,
      matches,
    };
  }

  async validateOrder(order: Omit<Order, 'id' | 'filledAmount' | 'status' | 'createdAt'>) {
    // Check balance/allowance
    if (order.type === OrderType.BUY) {
      // Check if user has enough ETH
      const balance = await this.provider.getBalance(order.maker);
      const totalCost = BigInt(order.price) * BigInt(order.amount);
      if (balance < totalCost) {
        throw new Error('Insufficient balance');
      }
    } else {
      // Check if user owns the NFT
      // TODO: Implement NFT ownership check
    }
  }

  async executeTrade(match: OrderMatch) {
    try {
      const tx = await this.marketplaceContract.executeTrade(
        match.buyOrder.id,
        match.sellOrder.id,
        match.price,
        match.amount,
        {
          value: BigInt(match.price) * BigInt(match.amount),
          gasLimit: 500000,
        }
      );

      await tx.wait();

      // Record trade
      await this.recordTrade({
        buyOrderId: match.buyOrder.id,
        sellOrderId: match.sellOrder.id,
        tokenId: match.buyOrder.tokenId,
        buyer: match.buyOrder.maker,
        seller: match.sellOrder.maker,
        price: match.price,
        amount: match.amount,
        txHash: tx.hash,
      });

      logger.info(`Trade executed: ${match.buyOrder.id} <-> ${match.sellOrder.id}, tx=${tx.hash}`);
    } catch (error) {
      logger.error('Error executing trade:', error);
      throw error;
    }
  }

  async cancelOrder(orderId: string, maker: string) {
    // Find order
    let order: Order | undefined;
    let tokenId: string | undefined;

    for (const [tid, orderBook] of this.orderBooks.entries()) {
      const buyOrders = orderBook.getBuyOrders();
      const sellOrders = orderBook.getSellOrders();
      order = [...buyOrders, ...sellOrders].find((o) => o.id === orderId);
      if (order) {
        tokenId = tid;
        break;
      }
    }

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.maker !== maker) {
      throw new Error('Unauthorized');
    }

    // Remove from order book
    const orderBook = this.getOrderBook(tokenId!);
    orderBook.removeOrder(orderId);

    // Update status
    order.status = OrderStatus.CANCELLED;
    await this.updateOrderStatus(orderId, OrderStatus.CANCELLED);

    // Persist to Redis
    await this.persistOrderBook(tokenId!);

    // Broadcast updates
    this.broadcastOrderBookUpdate(tokenId!);

    logger.info(`Order cancelled: ${orderId}`);
  }

  async getOrderBookSnapshot(tokenId: string) {
    const orderBook = this.getOrderBook(tokenId);
    return orderBook.getOrderBookSnapshot();
  }

  async getRecentTrades(tokenId: string, limit: number = 50) {
    return await prisma.trade.findMany({
      where: { tokenId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private generateOrderId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveOrder(order: Order) {
    await prisma.order.create({
      data: {
        id: order.id,
        tokenId: order.tokenId,
        maker: order.maker,
        type: order.type,
        price: order.price,
        amount: order.amount,
        filledAmount: order.filledAmount,
        status: order.status,
        createdAt: order.createdAt,
        expiresAt: order.expiresAt,
      },
    });
  }

  private async updateOrderStatus(orderId: string, status: OrderStatus) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  }

  private async recordTrade(data: {
    buyOrderId: string;
    sellOrderId: string;
    tokenId: string;
    buyer: string;
    seller: string;
    price: string;
    amount: number;
    txHash: string;
  }) {
    await prisma.trade.create({
      data: {
        ...data,
        createdAt: new Date(),
      },
    });
  }

  private async persistOrderBook(tokenId: string) {
    const orderBook = this.getOrderBook(tokenId);
    const orders = [...orderBook.getBuyOrders(), ...orderBook.getSellOrders()];
    await this.redis.set(`orderbook:${tokenId}`, JSON.stringify(orders));
  }

  private broadcastOrderBookUpdate(tokenId: string) {
    if (!this.wsServer) return;

    const snapshot = this.getOrderBookSnapshot(tokenId);
    const message = JSON.stringify({
      type: 'ORDERBOOK_UPDATE',
      tokenId,
      data: snapshot,
    });

    this.wsServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  setupWebSocket(server: any) {
    this.wsServer = new WebSocketServer({ server });

    this.wsServer.on('connection', (ws: WebSocket, req: any) => {
      logger.info('WebSocket client connected');

      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message.toString());

          switch (data.type) {
            case 'SUBSCRIBE_ORDERBOOK':
              // Send initial snapshot
              const snapshot = await this.getOrderBookSnapshot(data.tokenId);
              ws.send(
                JSON.stringify({
                  type: 'ORDERBOOK_SNAPSHOT',
                  tokenId: data.tokenId,
                  data: snapshot,
                })
              );
              break;

            case 'PLACE_ORDER':
              await this.placeOrder(data.order);
              break;

            case 'CANCEL_ORDER':
              await this.cancelOrder(data.orderId, data.maker);
              break;
          }
        } catch (error) {
          logger.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ type: 'ERROR', message: (error as Error).message }));
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
      });
    });

    logger.info('WebSocket server initialized');
  }
}
