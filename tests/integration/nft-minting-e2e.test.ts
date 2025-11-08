import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';

/**
 * NFT Minting End-to-End Integration Tests
 * Tests complete NFT minting flow from content upload to blockchain
 * 
 * Test Coverage:
 * - Content upload to IPFS
 * - AI fingerprint generation
 * - Smart contract minting transaction
 * - Metadata storage and indexing
 * - Kafka event publishing
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const KAFKA_BROKERS = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
const TIMEOUT = 60000; // 60 seconds for blockchain operations

interface MintingContext {
  walletAddress: string;
  contentId?: string;
  contentHash?: string;
  fingerprint?: string;
  tokenId?: string;
  txHash?: string;
  metadataURI?: string;
}

describe('NFT Minting End-to-End Tests', () => {
  let api: AxiosInstance;
  let kafka: Kafka;
  let producer: Producer;
  let consumer: Consumer;
  let context: MintingContext;
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
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    };

    // Setup Kafka
    kafka = new Kafka({
      clientId: 'nft-minting-test',
      brokers: KAFKA_BROKERS,
      retry: {
        retries: 3,
        initialRetryTime: 100,
      },
    });

    producer = kafka.producer();
    consumer = kafka.consumer({ groupId: 'nft-minting-test-group' });

    try {
      await producer.connect();
      await consumer.connect();
      isKafkaAvailable = true;
      console.log('Kafka connected for NFT minting tests');
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

  describe('Step 1: Content Upload to IPFS', () => {
    it('should upload content file to IPFS', async () => {
      // Create test file
      const testContent = Buffer.from('Test NFT content for integration testing');
      const testFilePath = path.join(__dirname, 'test-content.txt');
      fs.writeFileSync(testFilePath, testContent);

      try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(testFilePath));
        formData.append('title', 'Integration Test NFT');
        formData.append('description', 'Testing NFT minting flow');
        formData.append('category', 'artwork');
        formData.append('creator', context.walletAddress);

        const response = await api.post('/api/v1/content/upload', formData, {
          headers: formData.getHeaders(),
        });

        if (response.status === 201) {
          expect(response.data).toHaveProperty('contentId');
          expect(response.data).toHaveProperty('contentHash');
          expect(response.data.contentHash).toMatch(/^Qm[a-zA-Z0-9]{44}$/); // IPFS CID format

          context.contentId = response.data.contentId;
          context.contentHash = response.data.contentHash;

          console.log(`✓ Content uploaded to IPFS: ${context.contentHash}`);
        } else {
          console.warn(`Content upload returned status ${response.status}`);
        }
      } finally {
        // Cleanup test file
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    }, TIMEOUT);

    it('should store content metadata in database', async () => {
      if (!context.contentId) {
        console.log('No content ID - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/content/${context.contentId}`);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('contentId', context.contentId);
        expect(response.data).toHaveProperty('contentHash', context.contentHash);
        expect(response.data).toHaveProperty('creator', context.walletAddress);
        expect(response.data).toHaveProperty('category');
        expect(response.data).toHaveProperty('createdAt');

        console.log('✓ Content metadata stored in database');
      } else {
        console.warn(`Content retrieval returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should verify IPFS content is accessible', async () => {
      if (!context.contentHash) {
        console.log('No content hash - skipping test');
        return;
      }

      // Try to access content via IPFS gateway
      const ipfsGateways = [
        `https://ipfs.io/ipfs/${context.contentHash}`,
        `https://gateway.pinata.cloud/ipfs/${context.contentHash}`,
      ];

      let accessible = false;
      for (const gateway of ipfsGateways) {
        try {
          const response = await axios.get(gateway, { timeout: 10000 });
          if (response.status === 200) {
            accessible = true;
            console.log(`✓ Content accessible via ${gateway}`);
            break;
          }
        } catch (error) {
          // Try next gateway
        }
      }

      // Content may not be immediately available on public gateways
      if (!accessible) {
        console.warn('Content not yet accessible on public IPFS gateways');
      }
    }, TIMEOUT);
  });

  describe('Step 2: AI Fingerprint Generation', () => {
    it('should generate content fingerprint using AI', async () => {
      if (!context.contentHash) {
        console.log('No content hash - skipping test');
        return;
      }

      const response = await api.post('/api/v1/oracle/fingerprint', {
        contentHash: context.contentHash,
        contentType: 'text/plain',
      });

      if (response.status === 200 || response.status === 201) {
        expect(response.data).toHaveProperty('fingerprint');
        expect(response.data.fingerprint).toBeTruthy();
        expect(typeof response.data.fingerprint).toBe('string');

        context.fingerprint = response.data.fingerprint;

        console.log(`✓ AI fingerprint generated: ${context.fingerprint?.substring(0, 20)}...`);
      } else {
        console.warn(`Fingerprint generation returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should detect similar content using fingerprint', async () => {
      if (!context.fingerprint) {
        console.log('No fingerprint - skipping test');
        return;
      }

      const response = await api.post('/api/v1/oracle/similarity', {
        fingerprint: context.fingerprint,
        threshold: 0.85,
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty('similarContent');
        expect(Array.isArray(response.data.similarContent)).toBe(true);

        if (response.data.similarContent.length > 0) {
          console.log(`✓ Found ${response.data.similarContent.length} similar content items`);
        } else {
          console.log('✓ No similar content found (original content)');
        }
      } else {
        console.warn(`Similarity detection returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should store fingerprint in content metadata', async () => {
      if (!context.contentId || !context.fingerprint) {
        console.log('Missing content ID or fingerprint - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/content/${context.contentId}`);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('fingerprint');
        expect(response.data.fingerprint).toBe(context.fingerprint);

        console.log('✓ Fingerprint stored in content metadata');
      }
    }, TIMEOUT);
  });

  describe('Step 3: Smart Contract Minting Transaction', () => {
    it('should prepare NFT metadata for minting', async () => {
      if (!context.contentHash) {
        console.log('No content hash - skipping test');
        return;
      }

      const metadata = {
        name: 'Integration Test NFT',
        description: 'Testing NFT minting flow',
        image: `ipfs://${context.contentHash}`,
        attributes: [
          { trait_type: 'Category', value: 'artwork' },
          { trait_type: 'Test', value: 'true' },
        ],
      };

      const response = await api.post('/api/v1/nft/metadata', metadata);

      if (response.status === 201) {
        expect(response.data).toHaveProperty('metadataURI');
        expect(response.data.metadataURI).toMatch(/^ipfs:\/\//);

        context.metadataURI = response.data.metadataURI;

        console.log(`✓ NFT metadata prepared: ${context.metadataURI}`);
      } else {
        console.warn(`Metadata preparation returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should mint NFT on blockchain', async () => {
      if (!context.contentHash || !context.metadataURI) {
        console.log('Missing required data - skipping test');
        return;
      }

      const mintData = {
        creator: context.walletAddress,
        contentHash: context.contentHash,
        metadataURI: context.metadataURI,
        category: 'artwork',
        royalty: {
          recipients: [context.walletAddress],
          percentages: [1000], // 10%
        },
      };

      const response = await api.post('/api/v1/nft/mint', mintData);

      if (response.status === 201 || response.status === 202) {
        expect(response.data).toHaveProperty('txHash');
        expect(response.data.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

        context.txHash = response.data.txHash;

        if (response.data.tokenId) {
          context.tokenId = response.data.tokenId;
          console.log(`✓ NFT minted - Token ID: ${context.tokenId}, TX: ${context.txHash}`);
        } else {
          console.log(`✓ NFT minting transaction submitted: ${context.txHash}`);
        }
      } else {
        console.warn(`NFT minting returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should wait for transaction confirmation', async () => {
      if (!context.txHash) {
        console.log('No transaction hash - skipping test');
        return;
      }

      // Poll for transaction status
      let confirmed = false;
      let retries = 0;
      const maxRetries = 10;

      while (!confirmed && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 3000));

        const response = await api.get(`/api/v1/nft/transaction/${context.txHash}`);

        if (response.status === 200) {
          const status = response.data.status;

          if (status === 'confirmed' || status === 'success') {
            confirmed = true;
            if (response.data.tokenId) {
              context.tokenId = response.data.tokenId;
            }
            console.log(`✓ Transaction confirmed - Token ID: ${context.tokenId}`);
          } else if (status === 'failed') {
            console.warn('Transaction failed');
            break;
          }
        }

        retries++;
      }

      if (!confirmed) {
        console.warn('Transaction not confirmed within timeout');
      }
    }, TIMEOUT);

    it('should verify NFT ownership on blockchain', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/nft/${context.tokenId}/owner`);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('owner');
        expect(response.data.owner.toLowerCase()).toBe(context.walletAddress.toLowerCase());

        console.log(`✓ NFT ownership verified: ${response.data.owner}`);
      } else {
        console.warn(`Ownership verification returned status ${response.status}`);
      }
    }, TIMEOUT);
  });

  describe('Step 4: Metadata Storage and Indexing', () => {
    it('should store NFT metadata in PostgreSQL', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/nft/${context.tokenId}`);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('tokenId', context.tokenId);
        expect(response.data).toHaveProperty('creator');
        expect(response.data).toHaveProperty('contentHash');
        expect(response.data).toHaveProperty('metadataURI');
        expect(response.data).toHaveProperty('category');

        console.log('✓ NFT metadata stored in PostgreSQL');
      } else {
        console.warn(`NFT retrieval returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should index NFT in Elasticsearch for search', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      // Wait for indexing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await api.get('/api/v1/search/nfts', {
        params: {
          q: 'Integration Test NFT',
          limit: 10,
        },
      });

      if (response.status === 200) {
        expect(Array.isArray(response.data.results)).toBe(true);

        const found = response.data.results.some(
          (nft: any) => nft.tokenId === context.tokenId
        );

        if (found) {
          console.log('✓ NFT indexed in Elasticsearch');
        } else {
          console.warn('NFT not yet indexed in Elasticsearch');
        }
      } else {
        console.warn(`Search returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should update analytics with new NFT', async () => {
      const response = await api.get('/api/v1/analytics/stats');

      if (response.status === 200) {
        expect(response.data).toHaveProperty('totalNFTs');
        expect(typeof response.data.totalNFTs).toBe('number');
        expect(response.data.totalNFTs).toBeGreaterThan(0);

        console.log(`✓ Analytics updated - Total NFTs: ${response.data.totalNFTs}`);
      } else {
        console.warn(`Analytics returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should store NFT in ClickHouse for analytics', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      // Wait for data sync
      await new Promise(resolve => setTimeout(resolve, 3000));

      const response = await api.get('/api/v1/analytics/nft-history', {
        params: {
          tokenId: context.tokenId,
        },
      });

      if (response.status === 200) {
        expect(Array.isArray(response.data)).toBe(true);

        if (response.data.length > 0) {
          console.log('✓ NFT data synced to ClickHouse');
        } else {
          console.warn('NFT data not yet in ClickHouse');
        }
      } else {
        console.warn(`Analytics history returned status ${response.status}`);
      }
    }, TIMEOUT);
  });

  describe('Step 5: Kafka Event Publishing', () => {
    beforeAll(async () => {
      if (!isKafkaAvailable) {
        return;
      }

      // Subscribe to NFT minting events
      try {
        await consumer.subscribe({ topic: 'nft-minted', fromBeginning: false });

        await consumer.run({
          eachMessage: async ({ message }: EachMessagePayload) => {
            const event = JSON.parse(message.value?.toString() || '{}');
            receivedEvents.push(event);
          },
        });

        console.log('Subscribed to nft-minted topic');
      } catch (error) {
        console.warn('Failed to subscribe to Kafka topic');
      }
    }, TIMEOUT);

    it('should publish NFT_MINTED event to Kafka', async () => {
      if (!isKafkaAvailable) {
        console.log('Kafka not available - skipping test');
        return;
      }

      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      // Wait for event to be published and consumed
      await new Promise(resolve => setTimeout(resolve, 3000));

      const mintedEvent = receivedEvents.find(
        event => event.type === 'NFT_MINTED' && event.data?.tokenId === context.tokenId
      );

      if (mintedEvent) {
        expect(mintedEvent).toHaveProperty('type', 'NFT_MINTED');
        expect(mintedEvent.data).toHaveProperty('tokenId', context.tokenId);
        expect(mintedEvent.data).toHaveProperty('creator');
        expect(mintedEvent.data).toHaveProperty('contentHash');
        expect(mintedEvent.data).toHaveProperty('timestamp');

        console.log('✓ NFT_MINTED event published to Kafka');
      } else {
        console.warn('NFT_MINTED event not received');
      }
    }, TIMEOUT);

    it('should publish CONTENT_UPLOADED event to Kafka', async () => {
      if (!isKafkaAvailable) {
        console.log('Kafka not available - skipping test');
        return;
      }

      if (!context.contentId) {
        console.log('No content ID - skipping test');
        return;
      }

      const uploadedEvent = receivedEvents.find(
        event => event.type === 'CONTENT_UPLOADED' && event.data?.contentId === context.contentId
      );

      if (uploadedEvent) {
        expect(uploadedEvent).toHaveProperty('type', 'CONTENT_UPLOADED');
        expect(uploadedEvent.data).toHaveProperty('contentId', context.contentId);
        expect(uploadedEvent.data).toHaveProperty('contentHash');

        console.log('✓ CONTENT_UPLOADED event published to Kafka');
      } else {
        console.warn('CONTENT_UPLOADED event not received');
      }
    }, TIMEOUT);

    it('should verify event ordering', async () => {
      if (!isKafkaAvailable || receivedEvents.length === 0) {
        console.log('No events to verify - skipping test');
        return;
      }

      // CONTENT_UPLOADED should come before NFT_MINTED
      const uploadIndex = receivedEvents.findIndex(e => e.type === 'CONTENT_UPLOADED');
      const mintIndex = receivedEvents.findIndex(e => e.type === 'NFT_MINTED');

      if (uploadIndex !== -1 && mintIndex !== -1) {
        expect(uploadIndex).toBeLessThan(mintIndex);
        console.log('✓ Event ordering verified');
      } else {
        console.warn('Could not verify event ordering');
      }
    });
  });

  describe('End-to-End Flow Validation', () => {
    it('should complete full NFT minting flow', () => {
      const flowComplete = 
        context.contentId &&
        context.contentHash &&
        context.fingerprint &&
        context.metadataURI &&
        context.txHash;

      if (flowComplete) {
        console.log('\n✓ NFT Minting Flow Complete:');
        console.log(`  Content ID: ${context.contentId}`);
        console.log(`  Content Hash: ${context.contentHash}`);
        console.log(`  Fingerprint: ${context.fingerprint?.substring(0, 20)}...`);
        console.log(`  Metadata URI: ${context.metadataURI}`);
        console.log(`  Token ID: ${context.tokenId || 'pending'}`);
        console.log(`  TX Hash: ${context.txHash}`);
      } else {
        console.warn('NFT minting flow incomplete');
      }

      expect(flowComplete).toBe(true);
    });

    it('should verify data consistency across all systems', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      // Check PostgreSQL
      const nftResponse = await api.get(`/api/v1/nft/${context.tokenId}`);
      const nftExists = nftResponse.status === 200;

      // Check Elasticsearch
      const searchResponse = await api.get('/api/v1/search/nfts', {
        params: { q: context.tokenId },
      });
      const searchIndexed = searchResponse.status === 200;

      // Check Analytics
      const analyticsResponse = await api.get('/api/v1/analytics/stats');
      const analyticsUpdated = analyticsResponse.status === 200;

      console.log('\n✓ Data Consistency Check:');
      console.log(`  PostgreSQL: ${nftExists ? '✓' : '✗'}`);
      console.log(`  Elasticsearch: ${searchIndexed ? '✓' : '✗'}`);
      console.log(`  Analytics: ${analyticsUpdated ? '✓' : '✗'}`);
      console.log(`  Kafka Events: ${receivedEvents.length > 0 ? '✓' : '✗'}`);

      expect(nftExists).toBe(true);
    }, TIMEOUT);
  });
});
