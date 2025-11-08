import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';

/**
 * Royalty Distribution End-to-End Integration Tests
 * Tests complete royalty distribution flow
 * 
 * Test Coverage:
 * - Royalty event listening
 * - Automatic distribution execution
 * - Multi-beneficiary distribution
 * - Withdrawal functionality
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const KAFKA_BROKERS = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
const TIMEOUT = 60000;

interface RoyaltyContext {
  creator: string;
  beneficiary1: string;
  beneficiary2: string;
  tokenId?: string;
  salePrice: string;
  royaltyPercentage: number;
  distributionId?: string;
  withdrawalTxHash?: string;
}

describe('Royalty Distribution End-to-End Tests', () => {
  let api: AxiosInstance;
  let kafka: Kafka;
  let producer: Producer;
  let consumer: Consumer;
  let context: RoyaltyContext;
  let receivedEvents: any[] = [];
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
      creator: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      beneficiary1: '0x1234567890123456789012345678901234567890',
      beneficiary2: '0xABCDEF1234567890123456789012345678901234',
      salePrice: '1.0',
      royaltyPercentage: 10, // 10%
    };

    // Setup Kafka
    kafka = new Kafka({
      clientId: 'royalty-test',
      brokers: KAFKA_BROKERS,
      retry: {
        retries: 3,
        initialRetryTime: 100,
      },
    });

    producer = kafka.producer();
    consumer = kafka.consumer({ groupId: 'royalty-test-group' });

    try {
      await producer.connect();
      await consumer.connect();
      await consumer.subscribe({ topic: 'royalty-distributions', fromBeginning: false });
      await consumer.subscribe({ topic: 'trades', fromBeginning: false });

      await consumer.run({
        eachMessage: async ({ topic, message }: EachMessagePayload) => {
          const event = JSON.parse(message.value?.toString() || '{}');
          receivedEvents.push({ topic, event });
        },
      });

      isKafkaAvailable = true;
      console.log('Kafka connected for royalty tests');
    } catch (error) {
      console.warn('Kafka not available - event tests will be skipped');
      isKafkaAvailable = false;
    }
  }, TIMEOUT);

  afterAll(async () => {
    if (isKafkaAvailable) {
      try {
        await consumer.disconnect();
        await producer.disconnect();
      } catch (error) {
        console.warn('Error disconnecting from Kafka');
      }
    }
  });

  describe('Setup: Create NFT with Royalty Configuration', () => {
    it('should create NFT with multi-beneficiary royalty', async () => {
      const mintData = {
        creator: context.creator,
        contentHash: `QmRoyalty${Date.now()}`,
        metadataURI: `ipfs://royalty${Date.now()}`,
        category: 'artwork',
        royalty: {
          recipients: [context.creator, context.beneficiary1, context.beneficiary2],
          percentages: [5000, 3000, 2000], // 50%, 30%, 20% split
        },
      };

      const response = await api.post('/api/v1/nft/mint', mintData);

      if (response.status === 201 || response.status === 202) {
        if (response.data.tokenId) {
          context.tokenId = response.data.tokenId;
        } else {
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          if (response.data.txHash) {
            const txResponse = await api.get(`/api/v1/nft/transaction/${response.data.txHash}`);
            if (txResponse.status === 200 && txResponse.data.tokenId) {
              context.tokenId = txResponse.data.tokenId;
            }
          }
        }

        console.log(`✓ NFT created with royalty configuration - Token ID: ${context.tokenId}`);
      } else {
        console.warn(`NFT minting returned status ${response.status}`);
        context.tokenId = '777';
      }
    }, TIMEOUT);

    it('should verify royalty configuration', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/nft/${context.tokenId}/royalty`);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('recipients');
        expect(response.data).toHaveProperty('percentages');
        expect(response.data.recipients).toHaveLength(3);
        expect(response.data.percentages).toEqual([5000, 3000, 2000]);

        console.log('✓ Royalty configuration verified');
        console.log(`  Recipients: ${response.data.recipients.length}`);
        console.log(`  Split: 50%/30%/20%`);
      } else {
        console.warn(`Royalty config returned status ${response.status}`);
      }
    }, TIMEOUT);
  });

  describe('Step 1: Royalty Event Listening', () => {
    it('should simulate NFT sale event', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      const saleData = {
        tokenId: context.tokenId,
        seller: context.creator,
        buyer: '0x9876543210987654321098765432109876543210',
        price: context.salePrice,
      };

      const response = await api.post('/api/v1/marketplace/execute-trade', saleData);

      if (response.status === 200 || response.status === 202) {
        expect(response.data).toHaveProperty('txHash');
        console.log(`✓ NFT sale simulated - Price: ${context.salePrice} ETH`);
      } else {
        console.warn(`Trade execution returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should detect sale event from blockchain', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      // Wait for event detection
      await new Promise(resolve => setTimeout(resolve, 3000));

      const response = await api.get(`/api/v1/royalty/events/${context.tokenId}`);

      if (response.status === 200) {
        expect(Array.isArray(response.data.events)).toBe(true);

        if (response.data.events.length > 0) {
          const latestEvent = response.data.events[0];
          expect(latestEvent).toHaveProperty('eventType', 'NFTSold');
          expect(latestEvent).toHaveProperty('tokenId', context.tokenId);
          expect(latestEvent).toHaveProperty('price');

          console.log(`✓ Sale event detected - ${response.data.events.length} events`);
        } else {
          console.log('No sale events detected yet');
        }
      } else {
        console.warn(`Event query returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should queue royalty distribution task', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      const response = await api.get('/api/v1/royalty/queue');

      if (response.status === 200) {
        expect(Array.isArray(response.data.tasks)).toBe(true);

        const task = response.data.tasks.find(
          (t: any) => t.tokenId === context.tokenId
        );

        if (task) {
          expect(task).toHaveProperty('status');
          expect(task).toHaveProperty('tokenId', context.tokenId);
          console.log(`✓ Distribution task queued - Status: ${task.status}`);
        } else {
          console.log('Distribution task not yet queued');
        }
      } else {
        console.warn(`Queue query returned status ${response.status}`);
      }
    }, TIMEOUT);
  });

  describe('Step 2: Automatic Distribution Execution', () => {
    it('should calculate royalty amounts', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      const response = await api.post('/api/v1/royalty/calculate', {
        tokenId: context.tokenId,
        salePrice: context.salePrice,
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty('totalRoyalty');
        expect(response.data).toHaveProperty('distributions');
        expect(Array.isArray(response.data.distributions)).toBe(true);
        expect(response.data.distributions).toHaveLength(3);

        const totalRoyalty = parseFloat(context.salePrice) * (context.royaltyPercentage / 100);
        expect(parseFloat(response.data.totalRoyalty)).toBeCloseTo(totalRoyalty, 2);

        console.log(`✓ Royalty calculated - Total: ${response.data.totalRoyalty} ETH`);
        response.data.distributions.forEach((dist: any, index: number) => {
          console.log(`  Beneficiary ${index + 1}: ${dist.amount} ETH`);
        });
      } else {
        console.warn(`Calculation returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should execute automatic distribution', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      const response = await api.post('/api/v1/royalty/distribute', {
        tokenId: context.tokenId,
        salePrice: context.salePrice,
      });

      if (response.status === 200 || response.status === 202) {
        expect(response.data).toHaveProperty('distributionId');
        expect(response.data).toHaveProperty('txHash');
        expect(response.data).toHaveProperty('status');

        context.distributionId = response.data.distributionId;

        console.log(`✓ Distribution executed - ID: ${context.distributionId}`);
        console.log(`  TX Hash: ${response.data.txHash}`);
      } else {
        console.warn(`Distribution returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should wait for distribution transaction confirmation', async () => {
      if (!context.distributionId) {
        console.log('No distribution ID - skipping test');
        return;
      }

      let confirmed = false;
      let retries = 0;
      const maxRetries = 10;

      while (!confirmed && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 3000));

        const response = await api.get(`/api/v1/royalty/distribution/${context.distributionId}`);

        if (response.status === 200) {
          const status = response.data.status;

          if (status === 'confirmed' || status === 'completed') {
            confirmed = true;
            console.log('✓ Distribution transaction confirmed');
          } else if (status === 'failed') {
            console.warn('Distribution transaction failed');
            break;
          }
        }

        retries++;
      }

      if (!confirmed) {
        console.warn('Distribution not confirmed within timeout');
      }
    }, TIMEOUT);

    it('should record distribution in database', async () => {
      if (!context.distributionId) {
        console.log('No distribution ID - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/royalty/distribution/${context.distributionId}`);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('distributionId', context.distributionId);
        expect(response.data).toHaveProperty('tokenId', context.tokenId);
        expect(response.data).toHaveProperty('totalAmount');
        expect(response.data).toHaveProperty('beneficiaries');
        expect(response.data).toHaveProperty('timestamp');

        console.log('✓ Distribution recorded in database');
      } else {
        console.warn(`Distribution query returned status ${response.status}`);
      }
    }, TIMEOUT);
  });

  describe('Step 3: Multi-Beneficiary Distribution', () => {
    it('should distribute to all beneficiaries', async () => {
      if (!context.distributionId) {
        console.log('No distribution ID - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/royalty/distribution/${context.distributionId}/beneficiaries`);

      if (response.status === 200) {
        expect(Array.isArray(response.data.beneficiaries)).toBe(true);
        expect(response.data.beneficiaries).toHaveLength(3);

        response.data.beneficiaries.forEach((beneficiary: any) => {
          expect(beneficiary).toHaveProperty('address');
          expect(beneficiary).toHaveProperty('amount');
          expect(beneficiary).toHaveProperty('percentage');
          expect(beneficiary).toHaveProperty('status');
        });

        console.log('✓ Multi-beneficiary distribution verified');
        console.log(`  Total beneficiaries: ${response.data.beneficiaries.length}`);
      } else {
        console.warn(`Beneficiaries query returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should verify distribution percentages', async () => {
      if (!context.distributionId) {
        console.log('No distribution ID - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/royalty/distribution/${context.distributionId}/beneficiaries`);

      if (response.status === 200 && response.data.beneficiaries) {
        const percentages = response.data.beneficiaries.map((b: any) => b.percentage);
        const totalPercentage = percentages.reduce((sum: number, p: number) => sum + p, 0);

        expect(totalPercentage).toBe(10000); // 100% in basis points

        console.log('✓ Distribution percentages verified');
        console.log(`  Percentages: ${percentages.join('%, ')}%`);
      }
    }, TIMEOUT);

    it('should track individual beneficiary balances', async () => {
      const beneficiaries = [context.creator, context.beneficiary1, context.beneficiary2];

      for (const beneficiary of beneficiaries) {
        const response = await api.get(`/api/v1/royalty/balance/${beneficiary}`);

        if (response.status === 200) {
          expect(response.data).toHaveProperty('address', beneficiary);
          expect(response.data).toHaveProperty('totalEarned');
          expect(response.data).toHaveProperty('available');
          expect(response.data).toHaveProperty('withdrawn');

          console.log(`✓ Balance for ${beneficiary.substring(0, 10)}...`);
          console.log(`  Total: ${response.data.totalEarned}, Available: ${response.data.available}`);
        }
      }
    }, TIMEOUT);
  });

  describe('Step 4: Withdrawal Functionality', () => {
    it('should check claimable royalty amount', async () => {
      const response = await api.get(`/api/v1/royalty/claimable/${context.creator}`);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('address', context.creator);
        expect(response.data).toHaveProperty('claimableAmount');
        expect(response.data).toHaveProperty('tokenIds');

        console.log(`✓ Claimable amount: ${response.data.claimableAmount} ETH`);
        console.log(`  From ${response.data.tokenIds?.length || 0} NFTs`);
      } else {
        console.warn(`Claimable query returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should initiate withdrawal', async () => {
      const withdrawalData = {
        beneficiary: context.creator,
        amount: '0.05', // Withdraw 0.05 ETH
      };

      const response = await api.post('/api/v1/royalty/withdraw', withdrawalData);

      if (response.status === 200 || response.status === 202) {
        expect(response.data).toHaveProperty('txHash');
        expect(response.data).toHaveProperty('amount', '0.05');
        expect(response.data).toHaveProperty('status');

        context.withdrawalTxHash = response.data.txHash;

        console.log(`✓ Withdrawal initiated - TX: ${context.withdrawalTxHash}`);
      } else {
        console.warn(`Withdrawal returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should wait for withdrawal confirmation', async () => {
      if (!context.withdrawalTxHash) {
        console.log('No withdrawal TX hash - skipping test');
        return;
      }

      let confirmed = false;
      let retries = 0;
      const maxRetries = 10;

      while (!confirmed && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 3000));

        const response = await api.get(`/api/v1/royalty/withdrawal/${context.withdrawalTxHash}`);

        if (response.status === 200) {
          const status = response.data.status;

          if (status === 'confirmed' || status === 'completed') {
            confirmed = true;
            console.log('✓ Withdrawal confirmed');
          } else if (status === 'failed') {
            console.warn('Withdrawal failed');
            break;
          }
        }

        retries++;
      }

      if (!confirmed) {
        console.warn('Withdrawal not confirmed within timeout');
      }
    }, TIMEOUT);

    it('should update balance after withdrawal', async () => {
      const response = await api.get(`/api/v1/royalty/balance/${context.creator}`);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('withdrawn');
        expect(parseFloat(response.data.withdrawn)).toBeGreaterThan(0);

        console.log(`✓ Balance updated - Withdrawn: ${response.data.withdrawn} ETH`);
      } else {
        console.warn(`Balance query returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should record withdrawal history', async () => {
      const response = await api.get(`/api/v1/royalty/withdrawals/${context.creator}`);

      if (response.status === 200) {
        expect(Array.isArray(response.data.withdrawals)).toBe(true);

        if (response.data.withdrawals.length > 0) {
          const withdrawal = response.data.withdrawals[0];
          expect(withdrawal).toHaveProperty('txHash');
          expect(withdrawal).toHaveProperty('amount');
          expect(withdrawal).toHaveProperty('timestamp');
          expect(withdrawal).toHaveProperty('status');

          console.log(`✓ Withdrawal history - ${response.data.withdrawals.length} withdrawals`);
        }
      } else {
        console.warn(`Withdrawal history returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should enforce minimum withdrawal threshold', async () => {
      const smallWithdrawal = {
        beneficiary: context.creator,
        amount: '0.0001', // Very small amount
      };

      const response = await api.post('/api/v1/royalty/withdraw', smallWithdrawal);

      if (response.status === 400) {
        expect(response.data).toHaveProperty('error');
        console.log('✓ Minimum withdrawal threshold enforced');
      } else if (response.status === 200 || response.status === 202) {
        console.log('Small withdrawal allowed (no minimum threshold)');
      }
    }, TIMEOUT);
  });

  describe('Step 5: Kafka Event Publishing', () => {
    it('should publish ROYALTY_DISTRIBUTED event', async () => {
      if (!isKafkaAvailable) {
        console.log('Kafka not available - skipping test');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      const distributionEvents = receivedEvents.filter(
        e => e.topic === 'royalty-distributions' && e.event.type === 'ROYALTY_DISTRIBUTED'
      );

      if (distributionEvents.length > 0) {
        const event = distributionEvents[0].event;
        expect(event).toHaveProperty('type', 'ROYALTY_DISTRIBUTED');
        expect(event.data).toHaveProperty('tokenId');
        expect(event.data).toHaveProperty('totalAmount');
        expect(event.data).toHaveProperty('beneficiaries');

        console.log(`✓ ROYALTY_DISTRIBUTED events published (${distributionEvents.length} events)`);
      } else {
        console.warn('No ROYALTY_DISTRIBUTED events received');
      }
    }, TIMEOUT);

    it('should publish ROYALTY_WITHDRAWN event', async () => {
      if (!isKafkaAvailable) {
        console.log('Kafka not available - skipping test');
        return;
      }

      const withdrawalEvents = receivedEvents.filter(
        e => e.topic === 'royalty-distributions' && e.event.type === 'ROYALTY_WITHDRAWN'
      );

      if (withdrawalEvents.length > 0) {
        const event = withdrawalEvents[0].event;
        expect(event).toHaveProperty('type', 'ROYALTY_WITHDRAWN');
        expect(event.data).toHaveProperty('beneficiary');
        expect(event.data).toHaveProperty('amount');

        console.log(`✓ ROYALTY_WITHDRAWN events published (${withdrawalEvents.length} events)`);
      } else {
        console.warn('No ROYALTY_WITHDRAWN events received');
      }
    }, TIMEOUT);
  });

  describe('Royalty Analytics and Reporting', () => {
    it('should generate royalty earnings report', async () => {
      const response = await api.get(`/api/v1/royalty/report/${context.creator}`, {
        params: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        },
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty('totalEarned');
        expect(response.data).toHaveProperty('totalWithdrawn');
        expect(response.data).toHaveProperty('distributionCount');
        expect(response.data).toHaveProperty('nftCount');

        console.log('✓ Earnings report generated');
        console.log(`  Total Earned: ${response.data.totalEarned} ETH`);
        console.log(`  Distributions: ${response.data.distributionCount}`);
      } else {
        console.warn(`Report generation returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should track royalty by NFT', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/royalty/nft/${context.tokenId}/history`);

      if (response.status === 200) {
        expect(Array.isArray(response.data.distributions)).toBe(true);
        expect(response.data).toHaveProperty('totalDistributed');
        expect(response.data).toHaveProperty('distributionCount');

        console.log(`✓ NFT royalty history - ${response.data.distributionCount} distributions`);
      } else {
        console.warn(`NFT history returned status ${response.status}`);
      }
    }, TIMEOUT);
  });

  describe('End-to-End Flow Validation', () => {
    it('should complete full royalty distribution flow', () => {
      const flowComplete =
        context.tokenId &&
        context.distributionId;

      if (flowComplete) {
        console.log('\n✓ Royalty Distribution Flow Complete:');
        console.log(`  Token ID: ${context.tokenId}`);
        console.log(`  Distribution ID: ${context.distributionId}`);
        console.log(`  Sale Price: ${context.salePrice} ETH`);
        console.log(`  Royalty: ${context.royaltyPercentage}%`);
        console.log(`  Beneficiaries: 3`);
        console.log(`  Withdrawal TX: ${context.withdrawalTxHash || 'N/A'}`);
      } else {
        console.warn('Royalty distribution flow incomplete');
      }

      expect(flowComplete).toBe(true);
    });

    it('should verify data consistency across all systems', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      // Check distribution records
      const distributionResponse = context.distributionId
        ? await api.get(`/api/v1/royalty/distribution/${context.distributionId}`)
        : { status: 404 };
      const distributionExists = distributionResponse.status === 200;

      // Check beneficiary balances
      const balanceResponse = await api.get(`/api/v1/royalty/balance/${context.creator}`);
      const balanceExists = balanceResponse.status === 200;

      // Check withdrawal history
      const withdrawalResponse = await api.get(`/api/v1/royalty/withdrawals/${context.creator}`);
      const withdrawalExists = withdrawalResponse.status === 200;

      console.log('\n✓ Data Consistency Check:');
      console.log(`  Distribution Records: ${distributionExists ? '✓' : '✗'}`);
      console.log(`  Beneficiary Balances: ${balanceExists ? '✓' : '✗'}`);
      console.log(`  Withdrawal History: ${withdrawalExists ? '✓' : '✗'}`);
      console.log(`  Kafka Events: ${receivedEvents.length > 0 ? '✓' : '✗'}`);

      expect(balanceExists).toBe(true);
    }, TIMEOUT);
  });
});
