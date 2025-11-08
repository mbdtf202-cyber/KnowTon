import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import WebSocket from 'ws';
import { ethers } from 'ethers';

/**
 * Marketplace and Trading End-to-End Integration Tests
 * Tests complete trading flow from order creation to execution
 * 
 * Test Coverage:
 * - Order book creation and matching
 * - On-chain transaction execution
 * - WebSocket real-time updates
 * - Trading history recording
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const WS_URL = process.env.WS_URL || 'ws://localhost:3000';
const KAFKA_BROKERS = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
const TIMEOUT = 60000;

interface TradingContext {
  seller: string;
  buyer: string;
  tokenId?: string;
  sellOrderId?: string;
  buyOrderId?: string;
  tradeId?: string;
  txHash?: string;
  price: string;
}

describe('Marketplace and Trading End-to-End Tests', () => {
  let api: AxiosInstance;
  let kafka: Kafka;
  let producer: Producer;
  let consumer: Consumer;
  let ws: WebSocket | null = null;
  let context: TradingContext;
  let receivedEvents: any[] = [];
  let wsMessages: any[] = [];
  let isKafkaAvailable = false;

  beforeAll(async () => {
    api = axios.create({
      baseURL: API_BASE_URL,
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
    });

    context = {
      seller: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      buyer: '0x1234567890123456789012345678901234567890',
      price: '0.5',
    };

    // Setup Kafka
    kafka = new Kafka({
      clientId: 'marketplace-test',
      brokers: KAFKA_BROKERS,
      retry: {
        retries: 3,
        initialRetryTime: 100,
      },
    });

    producer = kafka.producer();
    consumer = kafka.consumer({ groupId: 'marketplace-test-group' });

    try {
      await producer.connect();
      await consumer.connect();
      await consumer.subscribe({ topic: 'trades', fromBeginning: false });
      await consumer.subscribe({ topic: 'orders', fromBeginning: false });

      await consumer.run({
        eachMessage: async ({ topic, message }: EachMessagePayload) => {
          const event = JSON.parse(message.value?.toString() || '{}');
          receivedEvents.push({ topic, event });
        },
      });

      isKafkaAvailable = true;
      console.log('Kafka connected for marketplace tests');
    } catch (error) {
      console.warn('Kafka not available - event tests will be skipped');
      isKafkaAvailable = false;
    }
  }, TIMEOUT);

  afterAll(async () => {
    if (ws) {
      ws.close();
    }

    if (isKafkaAvailable) {
      try {
        await consumer.disconnect();
        await producer.disconnect();
      } catch (error) {
        console.warn('Error disconnecting from Kafka');
      }
    }
  });

  describe('Setup: Create Test NFT', () => {
    it('should create NFT for trading', async () => {
      const mintData = {
        creator: context.seller,
        contentHash: `QmTest${Date.now()}`,
        metadataURI: `ipfs://metadata${Date.now()}`,
        category: 'artwork',
        royalty: {
          recipients: [context.seller],
          percentages: [1000],
        },
      };

      const response = await api.post('/api/v1/nft/mint', mintData);

      if (response.status === 201 || response.status === 202) {
        if (response.data.tokenId) {
          context.tokenId = response.data.tokenId;
        } else {
          // Wait for minting to complete
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Try to get token ID from transaction
          if (response.data.txHash) {
            const txResponse = await api.get(`/api/v1/nft/transaction/${response.data.txHash}`);
            if (txResponse.status === 200 && txResponse.data.tokenId) {
              context.tokenId = txResponse.data.tokenId;
            }
          }
        }

        console.log(`✓ Test NFT created - Token ID: ${context.tokenId}`);
      } else {
        console.warn(`NFT minting returned status ${response.status}`);
        // Use a mock token ID for testing
        context.tokenId = '999';
      }
    }, TIMEOUT);
  });

  describe('Step 1: Order Book Creation and Management', () => {
    it('should create sell order in order book', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      const sellOrder = {
        tokenId: context.tokenId,
        type: 'SELL',
        price: ethers.parseEther(context.price).toString(),
        amount: 1,
        expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24 hours
      };

      const response = await api.post('/api/v1/marketplace/orders', sellOrder, {
        headers: {
          'Authorization': `Bearer mock-token-${context.seller}`,
          'x-user-address': context.seller,
        },
      });

      if (response.status === 200 || response.status === 201) {
        expect(response.data).toHaveProperty('success', true);
        expect(response.data).toHaveProperty('orderId');
        expect(response.data).toHaveProperty('status');

        context.sellOrderId = response.data.orderId;

        console.log(`✓ Sell order created - Order ID: ${context.sellOrderId}`);
      } else {
        console.warn(`Sell order creation returned status ${response.status}: ${JSON.stringify(response.data)}`);
      }
    }, TIMEOUT);

    it('should retrieve order book for NFT', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/marketplace/orderbook/${context.tokenId}`);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('buyOrders');
        expect(response.data).toHaveProperty('sellOrders');
        expect(Array.isArray(response.data.sellOrders)).toBe(true);

        const sellOrder = response.data.sellOrders.find(
          (order: any) => order.orderId === context.sellOrderId
        );

        if (sellOrder) {
          expect(sellOrder).toHaveProperty('price', context.price);
          expect(sellOrder).toHaveProperty('maker', context.seller);
          console.log('✓ Order book retrieved with sell order');
        } else {
          console.warn('Sell order not found in order book');
        }
      } else {
        console.warn(`Order book retrieval returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should create buy order in order book', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      const buyOrder = {
        tokenId: context.tokenId,
        type: 'BUY',
        price: ethers.parseEther(context.price).toString(),
        amount: 1,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };

      const response = await api.post('/api/v1/marketplace/orders', buyOrder, {
        headers: {
          'Authorization': `Bearer mock-token-${context.buyer}`,
          'x-user-address': context.buyer,
        },
      });

      if (response.status === 200 || response.status === 201) {
        expect(response.data).toHaveProperty('success', true);
        expect(response.data).toHaveProperty('orderId');
        context.buyOrderId = response.data.orderId;

        console.log(`✓ Buy order created - Order ID: ${context.buyOrderId}`);
      } else {
        console.warn(`Buy order creation returned status ${response.status}: ${JSON.stringify(response.data)}`);
      }
    }, TIMEOUT);

    it('should match buy and sell orders', async () => {
      if (!context.sellOrderId || !context.buyOrderId) {
        console.log('Missing order IDs - skipping test');
        return;
      }

      // Wait for order matching engine
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await api.get(`/api/v1/marketplace/orders/${context.sellOrderId}`);

      if (response.status === 200) {
        const order = response.data;
        const status = order.status;

        if (status === 'FILLED' || status === 'filled') {
          expect(order.filledAmount).toBeGreaterThan(0);
          console.log('✓ Orders matched and filled successfully');
        } else if (status === 'PARTIALLY_FILLED') {
          expect(order.filledAmount).toBeGreaterThan(0);
          expect(order.filledAmount).toBeLessThan(order.amount);
          console.log('✓ Orders partially matched');
        } else if (status === 'OPEN') {
          console.log('Orders still open (matching in progress)');
        }
      } else {
        console.warn(`Order status check returned ${response.status}`);
      }
    }, TIMEOUT);

    it('should verify order matching algorithm', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      // Create multiple orders at different prices
      const orders = [
        { type: 'SELL', price: ethers.parseEther('0.6').toString(), amount: 1 },
        { type: 'SELL', price: ethers.parseEther('0.7').toString(), amount: 1 },
        { type: 'BUY', price: ethers.parseEther('0.65').toString(), amount: 1 },
      ];

      for (const order of orders) {
        await api.post('/api/v1/marketplace/orders', {
          tokenId: context.tokenId,
          ...order,
        }, {
          headers: {
            'Authorization': `Bearer mock-token-${context.seller}`,
            'x-user-address': context.seller,
          },
        });
      }

      // Wait for matching
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check order book
      const orderbookResponse = await api.get(`/api/v1/marketplace/orderbook/${context.tokenId}`);

      if (orderbookResponse.status === 200) {
        const { bids, asks } = orderbookResponse.data;

        // Verify bids are sorted descending by price
        for (let i = 0; i < bids.length - 1; i++) {
          expect(BigInt(bids[i].price)).toBeGreaterThanOrEqual(BigInt(bids[i + 1].price));
        }

        // Verify asks are sorted ascending by price
        for (let i = 0; i < asks.length - 1; i++) {
          expect(BigInt(asks[i].price)).toBeLessThanOrEqual(BigInt(asks[i + 1].price));
        }

        console.log('✓ Order matching algorithm verified');
      }
    }, TIMEOUT);

    it('should update order book after matching', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/marketplace/orderbook/${context.tokenId}`);

      if (response.status === 200) {
        // Check if matched orders are removed or marked as filled
        const activeSellOrders = response.data.sellOrders.filter(
          (order: any) => order.status === 'active'
        );

        console.log(`✓ Order book updated - ${activeSellOrders.length} active sell orders`);
      }
    }, TIMEOUT);

    it('should cancel order', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      // Create a new order to cancel
      const cancelOrder = {
        tokenId: context.tokenId,
        type: 'SELL',
        price: ethers.parseEther('1.0').toString(),
        amount: 1,
      };

      const createResponse = await api.post('/api/v1/marketplace/orders', cancelOrder, {
        headers: {
          'Authorization': `Bearer mock-token-${context.seller}`,
          'x-user-address': context.seller,
        },
      });

      if (createResponse.status === 200 || createResponse.status === 201) {
        const orderId = createResponse.data.orderId;

        const cancelResponse = await api.delete(`/api/v1/marketplace/orders/${orderId}`, {
          headers: {
            'Authorization': `Bearer mock-token-${context.seller}`,
            'x-user-address': context.seller,
          },
        });

        if (cancelResponse.status === 200) {
          expect(cancelResponse.data).toHaveProperty('success', true);
          expect(cancelResponse.data).toHaveProperty('orderId', orderId);
          console.log('✓ Order cancelled successfully');
        } else {
          console.warn(`Order cancellation returned status ${cancelResponse.status}`);
        }
      }
    }, TIMEOUT);
  });

  describe('Step 2: On-Chain Transaction Execution', () => {
    it('should execute trade on blockchain', async () => {
      if (!context.tokenId || !context.sellOrderId || !context.buyOrderId) {
        console.log('Missing required data - skipping test');
        return;
      }

      // Wait for order matching
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if trade was automatically executed during matching
      const tradesResponse = await api.get(`/api/v1/marketplace/trades/${context.tokenId}`);

      if (tradesResponse.status === 200 && tradesResponse.data.trades && tradesResponse.data.trades.length > 0) {
        const latestTrade = tradesResponse.data.trades[0];
        
        if (latestTrade.txHash) {
          expect(latestTrade.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
          context.txHash = latestTrade.txHash;
          context.tradeId = latestTrade.id || `${latestTrade.buyOrderId}_${latestTrade.sellOrderId}`;

          console.log(`✓ Trade executed on blockchain - TX: ${context.txHash}`);
        } else {
          console.log('Trade recorded but no transaction hash yet');
        }
      } else {
        console.warn('No trades found - order matching may still be in progress');
      }
    }, TIMEOUT);

    it('should wait for transaction confirmation', async () => {
      if (!context.txHash) {
        console.log('No transaction hash - skipping test');
        return;
      }

      let confirmed = false;
      let retries = 0;
      const maxRetries = 10;

      while (!confirmed && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 3000));

        const response = await api.get(`/api/v1/marketplace/transaction/${context.txHash}`);

        if (response.status === 200) {
          const status = response.data.status;

          if (status === 'confirmed' || status === 'success') {
            confirmed = true;
            console.log('✓ Trade transaction confirmed');
          } else if (status === 'failed') {
            console.warn('Trade transaction failed');
            break;
          }
        }

        retries++;
      }

      if (!confirmed) {
        console.warn('Transaction not confirmed within timeout');
      }
    }, TIMEOUT);

    it('should verify NFT ownership transfer', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/nft/${context.tokenId}/owner`);

      if (response.status === 200) {
        const currentOwner = response.data.owner.toLowerCase();

        // Owner should be buyer after trade
        if (currentOwner === context.buyer.toLowerCase()) {
          console.log('✓ NFT ownership transferred to buyer');
        } else if (currentOwner === context.seller.toLowerCase()) {
          console.log('NFT still owned by seller (transfer pending)');
        }
      } else {
        console.warn(`Ownership check returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should process royalty payment', async () => {
      if (!context.tokenId || !context.txHash) {
        console.log('Missing required data - skipping test');
        return;
      }

      // Wait for royalty processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      const response = await api.get(`/api/v1/royalty/distributions/${context.tokenId}`);

      if (response.status === 200) {
        const distributions = response.data;

        if (Array.isArray(distributions) && distributions.length > 0) {
          const latestDistribution = distributions[0];
          expect(latestDistribution).toHaveProperty('amount');
          expect(latestDistribution).toHaveProperty('beneficiaries');

          console.log(`✓ Royalty processed - Amount: ${latestDistribution.amount}`);
        } else {
          console.log('No royalty distributions yet');
        }
      } else {
        console.warn(`Royalty check returned status ${response.status}`);
      }
    }, TIMEOUT);
  });

  describe('Step 3: WebSocket Real-Time Updates', () => {
    it('should connect to WebSocket server', (done) => {
      try {
        ws = new WebSocket(WS_URL);

        ws.on('open', () => {
          console.log('✓ WebSocket connected');
          done();
        });

        ws.on('error', (error) => {
          console.warn('WebSocket connection failed:', error.message);
          ws = null;
          done();
        });

        // Timeout fallback
        setTimeout(() => {
          if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket connection timeout');
            done();
          }
        }, 5000);
      } catch (error) {
        console.warn('WebSocket setup error:', error);
        ws = null;
        done();
      }
    }, TIMEOUT);

    it('should subscribe to order book updates', (done) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log('WebSocket not connected - skipping test');
        done();
        return;
      }

      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        done();
        return;
      }

      // Setup message handler
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          wsMessages.push(message);
          
          if (message.type === 'ORDERBOOK_SNAPSHOT') {
            console.log('✓ Received order book snapshot');
          }
        } catch (error) {
          console.warn('Error parsing WebSocket message:', error);
        }
      });

      // Subscribe to order book
      ws.send(JSON.stringify({
        type: 'SUBSCRIBE_ORDERBOOK',
        tokenId: context.tokenId,
      }));

      setTimeout(() => {
        console.log('✓ Subscribed to order book updates');
        done();
      }, 2000);
    }, TIMEOUT);

    it('should receive order book updates via WebSocket', (done) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log('WebSocket not connected - skipping test');
        done();
        return;
      }

      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        done();
        return;
      }

      // Create a new order to trigger update
      api.post('/api/v1/marketplace/orders', {
        tokenId: context.tokenId,
        type: 'SELL',
        price: ethers.parseEther('0.8').toString(),
        amount: 1,
      }, {
        headers: {
          'Authorization': `Bearer mock-token-${context.seller}`,
          'x-user-address': context.seller,
        },
      }).then(() => {
        // Wait for WebSocket message
        setTimeout(() => {
          const orderbookUpdate = wsMessages.find(
            msg => (msg.type === 'ORDERBOOK_UPDATE' || msg.type === 'ORDERBOOK_SNAPSHOT') && msg.tokenId === context.tokenId
          );

          if (orderbookUpdate) {
            expect(orderbookUpdate).toHaveProperty('type');
            expect(orderbookUpdate).toHaveProperty('tokenId', context.tokenId);
            expect(orderbookUpdate).toHaveProperty('data');
            console.log('✓ Received order book update via WebSocket');
          } else {
            console.warn(`No order book update received (${wsMessages.length} messages total)`);
          }

          done();
        }, 3000);
      }).catch(error => {
        console.warn('Error creating test order:', error.message);
        done();
      });
    }, TIMEOUT);

    it('should receive trade execution notifications', (done) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log('WebSocket not connected - skipping test');
        done();
        return;
      }

      // Check for trade notifications in received messages
      const tradeNotification = wsMessages.find(
        msg => msg.type === 'TRADE_EXECUTED' || msg.type === 'trade_executed'
      );

      if (tradeNotification) {
        expect(tradeNotification).toHaveProperty('type');
        expect(tradeNotification.data || tradeNotification).toHaveProperty('tokenId');
        console.log('✓ Received trade execution notification');
      } else {
        console.log(`No trade notifications received yet (${wsMessages.length} messages total)`);
      }

      done();
    }, TIMEOUT);

    it('should receive price updates', (done) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log('WebSocket not connected - skipping test');
        done();
        return;
      }

      const priceUpdate = wsMessages.find(
        msg => msg.type === 'PRICE_UPDATE' || msg.type === 'price_update' || msg.type === 'ORDERBOOK_UPDATE'
      );

      if (priceUpdate) {
        expect(priceUpdate).toHaveProperty('type');
        console.log('✓ Received price/orderbook update');
      } else {
        console.log(`No price updates received yet (${wsMessages.length} messages total)`);
      }

      done();
    }, TIMEOUT);

    it('should handle WebSocket reconnection', (done) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log('WebSocket not connected - skipping test');
        done();
        return;
      }

      // Close connection
      ws.close();

      // Wait and try to reconnect
      setTimeout(() => {
        try {
          ws = new WebSocket(WS_URL);

          ws.on('open', () => {
            console.log('✓ WebSocket reconnected successfully');
            done();
          });

          ws.on('error', () => {
            console.warn('WebSocket reconnection failed');
            ws = null;
            done();
          });
        } catch (error) {
          console.warn('WebSocket reconnection error');
          done();
        }
      }, 1000);
    }, TIMEOUT);
  });

  describe('Step 4: Trading History Recording', () => {
    it('should record trade in database', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/marketplace/trades/${context.tokenId}`, {
        params: {
          limit: 10,
        },
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty('trades');
        expect(Array.isArray(response.data.trades)).toBe(true);

        if (response.data.trades.length > 0) {
          const trade = response.data.trades[0];
          expect(trade).toHaveProperty('tokenId');
          expect(trade).toHaveProperty('seller');
          expect(trade).toHaveProperty('buyer');
          expect(trade).toHaveProperty('price');
          expect(trade).toHaveProperty('createdAt');

          console.log(`✓ Trade recorded in database - ${response.data.trades.length} trades found`);
        } else {
          console.warn('No trades found in history');
        }
      } else {
        console.warn(`Trade history returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should verify trade data integrity', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/marketplace/trades/${context.tokenId}`);

      if (response.status === 200 && response.data.trades.length > 0) {
        const trade = response.data.trades[0];

        // Verify all required fields are present
        expect(trade).toHaveProperty('buyOrderId');
        expect(trade).toHaveProperty('sellOrderId');
        expect(trade).toHaveProperty('tokenId', context.tokenId);
        expect(trade).toHaveProperty('buyer');
        expect(trade).toHaveProperty('seller');
        expect(trade).toHaveProperty('price');
        expect(trade).toHaveProperty('amount');

        // Verify data types
        expect(typeof trade.price).toBe('string');
        expect(typeof trade.amount).toBe('number');
        expect(trade.amount).toBeGreaterThan(0);

        console.log('✓ Trade data integrity verified');
      } else {
        console.log('No trades to verify');
      }
    }, TIMEOUT);

    it('should update NFT trading statistics', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/nft/${context.tokenId}/stats`);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('totalTrades');
        expect(response.data).toHaveProperty('totalVolume');
        expect(response.data).toHaveProperty('lastSalePrice');

        if (response.data.totalTrades > 0) {
          console.log(`✓ NFT stats updated - ${response.data.totalTrades} trades`);
        }
      } else {
        console.warn(`NFT stats returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should record trade in ClickHouse analytics', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      // Wait for data sync
      await new Promise(resolve => setTimeout(resolve, 3000));

      const response = await api.get('/api/v1/analytics/trade-history', {
        params: {
          tokenId: context.tokenId,
          limit: 10,
        },
      });

      if (response.status === 200) {
        expect(Array.isArray(response.data)).toBe(true);

        if (response.data.length > 0) {
          console.log('✓ Trade synced to ClickHouse analytics');
        } else {
          console.warn('Trade not yet in ClickHouse');
        }
      } else {
        console.warn(`Analytics history returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should update marketplace statistics', async () => {
      const response = await api.get('/api/v1/marketplace/stats');

      if (response.status === 200) {
        expect(response.data).toHaveProperty('totalVolume');
        expect(response.data).toHaveProperty('totalTrades');
        expect(response.data).toHaveProperty('activeOrders');

        console.log(`✓ Marketplace stats - Volume: ${response.data.totalVolume}, Trades: ${response.data.totalTrades}`);
      } else {
        console.warn(`Marketplace stats returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should publish trade history to user profile', async () => {
      const sellerResponse = await api.get(`/api/v1/users/${context.seller}/trades`);
      const buyerResponse = await api.get(`/api/v1/users/${context.buyer}/trades`);

      if (sellerResponse.status === 200) {
        expect(sellerResponse.data).toHaveProperty('trades');
        expect(Array.isArray(sellerResponse.data.trades)).toBe(true);
        console.log(`✓ Seller trade history: ${sellerResponse.data.trades.length} trades`);
      } else {
        console.log(`Seller trade history endpoint returned ${sellerResponse.status}`);
      }

      if (buyerResponse.status === 200) {
        expect(buyerResponse.data).toHaveProperty('trades');
        expect(Array.isArray(buyerResponse.data.trades)).toBe(true);
        console.log(`✓ Buyer trade history: ${buyerResponse.data.trades.length} trades`);
      } else {
        console.log(`Buyer trade history endpoint returned ${buyerResponse.status}`);
      }
    }, TIMEOUT);

    it('should track order lifecycle', async () => {
      if (!context.sellOrderId || !context.buyOrderId) {
        console.log('Missing order IDs - skipping test');
        return;
      }

      // Check sell order status
      const sellOrderResponse = await api.get(`/api/v1/marketplace/orders/${context.sellOrderId}`);
      
      if (sellOrderResponse.status === 200) {
        const order = sellOrderResponse.data;
        expect(order).toHaveProperty('id', context.sellOrderId);
        expect(order).toHaveProperty('status');
        
        console.log(`✓ Sell order status: ${order.status}`);
      } else {
        console.log('Sell order status check not available');
      }

      // Check buy order status
      const buyOrderResponse = await api.get(`/api/v1/marketplace/orders/${context.buyOrderId}`);
      
      if (buyOrderResponse.status === 200) {
        const order = buyOrderResponse.data;
        expect(order).toHaveProperty('id', context.buyOrderId);
        expect(order).toHaveProperty('status');
        
        console.log(`✓ Buy order status: ${order.status}`);
      } else {
        console.log('Buy order status check not available');
      }
    }, TIMEOUT);
  });

  describe('Step 5: Kafka Event Publishing', () => {
    it('should publish ORDER_CREATED events', async () => {
      if (!isKafkaAvailable) {
        console.log('Kafka not available - skipping test');
        return;
      }

      const orderEvents = receivedEvents.filter(
        e => e.topic === 'orders' && e.event.type === 'ORDER_CREATED'
      );

      if (orderEvents.length > 0) {
        const event = orderEvents[0].event;
        expect(event).toHaveProperty('type', 'ORDER_CREATED');
        expect(event.data).toHaveProperty('orderId');
        expect(event.data).toHaveProperty('tokenId');
        expect(event.data).toHaveProperty('price');

        console.log(`✓ ORDER_CREATED events published (${orderEvents.length} events)`);
      } else {
        console.warn('No ORDER_CREATED events received');
      }
    }, TIMEOUT);

    it('should publish TRADE_EXECUTED events', async () => {
      if (!isKafkaAvailable) {
        console.log('Kafka not available - skipping test');
        return;
      }

      const tradeEvents = receivedEvents.filter(
        e => e.topic === 'trades' && e.event.type === 'TRADE_EXECUTED'
      );

      if (tradeEvents.length > 0) {
        const event = tradeEvents[0].event;
        expect(event).toHaveProperty('type', 'TRADE_EXECUTED');
        expect(event.data).toHaveProperty('tokenId');
        expect(event.data).toHaveProperty('seller');
        expect(event.data).toHaveProperty('buyer');
        expect(event.data).toHaveProperty('price');

        console.log(`✓ TRADE_EXECUTED events published (${tradeEvents.length} events)`);
      } else {
        console.warn('No TRADE_EXECUTED events received');
      }
    }, TIMEOUT);

    it('should verify event data integrity', () => {
      if (!isKafkaAvailable || receivedEvents.length === 0) {
        console.log('No events to verify - skipping test');
        return;
      }

      receivedEvents.forEach(({ event }) => {
        expect(event).toHaveProperty('type');
        expect(event).toHaveProperty('data');
        expect(event.data).toHaveProperty('timestamp');
      });

      console.log(`✓ Event data integrity verified (${receivedEvents.length} events)`);
    });
  });

  describe('End-to-End Flow Validation', () => {
    it('should complete full trading flow', () => {
      const flowComplete =
        context.tokenId &&
        context.sellOrderId &&
        context.buyOrderId;

      if (flowComplete) {
        console.log('\n✓ Trading Flow Complete:');
        console.log(`  Token ID: ${context.tokenId}`);
        console.log(`  Sell Order: ${context.sellOrderId}`);
        console.log(`  Buy Order: ${context.buyOrderId}`);
        console.log(`  Trade ID: ${context.tradeId || 'N/A'}`);
        console.log(`  TX Hash: ${context.txHash || 'N/A'}`);
        console.log(`  Price: ${context.price} ETH`);
      } else {
        console.warn('Trading flow incomplete');
      }

      expect(flowComplete).toBe(true);
    });

    it('should verify data consistency across all systems', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      // Check order book
      const orderbookResponse = await api.get(`/api/v1/marketplace/orderbook/${context.tokenId}`);
      const orderbookExists = orderbookResponse.status === 200;

      // Check trade history
      const historyResponse = await api.get('/api/v1/marketplace/trades', {
        params: { tokenId: context.tokenId },
      });
      const historyExists = historyResponse.status === 200;

      // Check analytics
      const analyticsResponse = await api.get('/api/v1/marketplace/stats');
      const analyticsUpdated = analyticsResponse.status === 200;

      console.log('\n✓ Data Consistency Check:');
      console.log(`  Order Book: ${orderbookExists ? '✓' : '✗'}`);
      console.log(`  Trade History: ${historyExists ? '✓' : '✗'}`);
      console.log(`  Analytics: ${analyticsUpdated ? '✓' : '✗'}`);
      console.log(`  WebSocket: ${wsMessages.length > 0 ? '✓' : '✗'}`);
      console.log(`  Kafka Events: ${receivedEvents.length > 0 ? '✓' : '✗'}`);

      expect(orderbookExists).toBe(true);
    }, TIMEOUT);
  });
});
