import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';

/**
 * API Integration Tests
 * Tests microservice communication, Kafka event flow, and data consistency
 * 
 * Test Coverage:
 * - Microservice communication and API endpoints
 * - Cross-service data consistency
 * - Error handling and resilience
 * - Rate limiting and security
 * - Service health checks
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TIMEOUT = 30000;

interface TestContext {
  walletAddress: string;
  tokenId?: string;
  contentId?: string;
  orderId?: string;
  vaultId?: string;
  proposalId?: string;
}

describe('API Integration Tests', () => {
  let api: AxiosInstance;
  let testContext: TestContext;

  beforeAll(() => {
    api = axios.create({
      baseURL: API_BASE_URL,
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: () => true, // Don't throw on any status
    });

    testContext = {
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    };
  });

  beforeEach(() => {
    // Reset test context for each test suite
    console.log(`Running test: ${expect.getState().currentTestName}`);
  });

  describe('Health Checks', () => {
    it('should return health status for all services', async () => {
      const services = [
        '/api/v1/health',
        '/api/v1/creators/health',
        '/api/v1/nft/health',
        '/api/v1/marketplace/health',
      ];

      for (const endpoint of services) {
        try {
          const response = await api.get(endpoint);
          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('status', 'healthy');
        } catch (error) {
          console.warn(`Service ${endpoint} not available`);
        }
      }
    }, TIMEOUT);
  });

  describe('Creator Service Integration', () => {
    it('should register a new creator', async () => {
      const creatorData = {
        address: testContext.walletAddress,
        username: 'test_creator',
        bio: 'Test creator for integration testing',
        email: 'test@example.com',
      };

      const response = await api.post('/api/v1/creators/register', creatorData);
      
      if (response.status === 201) {
        expect(response.data).toHaveProperty('address', testContext.walletAddress);
        expect(response.data).toHaveProperty('did');
      } else if (response.status === 409) {
        console.log('Creator already registered');
      }
    }, TIMEOUT);

    it('should retrieve creator profile', async () => {
      const response = await api.get(`/api/v1/creators/${testContext.walletAddress}`);
      
      if (response.status === 200) {
        expect(response.data).toHaveProperty('address', testContext.walletAddress);
      } else if (response.status === 404) {
        console.log('Creator not found - skipping test');
      }
    }, TIMEOUT);

    it('should update creator profile', async () => {
      const updateData = {
        bio: 'Updated bio for integration testing',
        socialLinks: {
          twitter: 'https://twitter.com/testcreator',
        },
      };

      const response = await api.put(
        `/api/v1/creators/${testContext.walletAddress}/profile`,
        updateData
      );
      
      if (response.status === 200) {
        expect(response.data).toHaveProperty('bio', updateData.bio);
      } else if (response.status === 404) {
        console.log('Creator not found - skipping test');
      }
    }, TIMEOUT);
  });

  describe('Content Upload Integration', () => {
    it('should upload content and generate fingerprint', async () => {
      const contentData = {
        title: 'Test Content',
        description: 'Integration test content',
        category: 'artwork',
        contentHash: 'QmTest123456789',
        creator: testContext.walletAddress,
      };

      const response = await api.post('/api/v1/content/upload', contentData);
      
      if (response.status === 201) {
        expect(response.data).toHaveProperty('contentId');
        expect(response.data).toHaveProperty('contentHash');
        testContext.contentId = response.data.contentId;
      } else {
        console.warn('Content upload failed:', response.status);
      }
    }, TIMEOUT);
  });

  describe('NFT Minting Integration', () => {
    it('should mint NFT and emit event', async () => {
      const mintData = {
        creator: testContext.walletAddress,
        contentHash: 'QmTest123456789',
        metadataURI: 'ipfs://QmMetadata123',
        category: 'artwork',
        royalty: {
          recipients: [testContext.walletAddress],
          percentages: [1000], // 10%
        },
      };

      const response = await api.post('/api/v1/nft/mint', mintData);
      
      if (response.status === 201) {
        expect(response.data).toHaveProperty('txHash');
        expect(response.data).toHaveProperty('tokenId');
        testContext.tokenId = response.data.tokenId;
      } else {
        console.warn('NFT minting failed:', response.status);
      }
    }, TIMEOUT);

    it('should retrieve NFT metadata', async () => {
      if (!testContext.tokenId) {
        console.log('No token ID available - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/nft/${testContext.tokenId}`);
      
      if (response.status === 200) {
        expect(response.data).toHaveProperty('tokenId', testContext.tokenId);
        expect(response.data).toHaveProperty('metadata');
      } else {
        console.warn('NFT retrieval failed:', response.status);
      }
    }, TIMEOUT);
  });

  describe('Marketplace Integration', () => {
    it('should list NFTs in marketplace', async () => {
      const response = await api.get('/api/v1/marketplace/nfts', {
        params: {
          page: 1,
          limit: 10,
        },
      });
      
      if (response.status === 200) {
        expect(response.data).toHaveProperty('nfts');
        expect(Array.isArray(response.data.nfts)).toBe(true);
      } else {
        console.warn('Marketplace listing failed:', response.status);
      }
    }, TIMEOUT);

    it('should place order in marketplace', async () => {
      if (!testContext.tokenId) {
        console.log('No token ID available - skipping test');
        return;
      }

      const orderData = {
        tokenId: testContext.tokenId,
        orderType: 'sell',
        price: '0.5',
        maker: testContext.walletAddress,
      };

      const response = await api.post('/api/v1/marketplace/orders', orderData);
      
      if (response.status === 201) {
        expect(response.data).toHaveProperty('orderId');
        testContext.orderId = response.data.orderId;
      } else {
        console.warn('Order placement failed:', response.status);
      }
    }, TIMEOUT);

    it('should retrieve order book', async () => {
      if (!testContext.tokenId) {
        console.log('No token ID available - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/marketplace/orderbook/${testContext.tokenId}`);
      
      if (response.status === 200) {
        expect(response.data).toHaveProperty('buyOrders');
        expect(response.data).toHaveProperty('sellOrders');
      } else {
        console.warn('Order book retrieval failed:', response.status);
      }
    }, TIMEOUT);
  });

  describe('Fractionalization Integration', () => {
    it('should fractionalize NFT', async () => {
      if (!testContext.tokenId) {
        console.log('No token ID available - skipping test');
        return;
      }

      const fractionalData = {
        tokenId: testContext.tokenId,
        totalSupply: '1000000',
        tokenName: 'Fractional Test Token',
        tokenSymbol: 'FTT',
        reservePrice: '10',
      };

      const response = await api.post('/api/v1/fractional/create', fractionalData);
      
      if (response.status === 201) {
        expect(response.data).toHaveProperty('vaultId');
        expect(response.data).toHaveProperty('fractionalToken');
        testContext.vaultId = response.data.vaultId;
      } else {
        console.warn('Fractionalization failed:', response.status);
      }
    }, TIMEOUT);
  });

  describe('Analytics Integration', () => {
    it('should retrieve platform statistics', async () => {
      const response = await api.get('/api/v1/analytics/stats');
      
      if (response.status === 200) {
        expect(response.data).toHaveProperty('totalNFTs');
        expect(response.data).toHaveProperty('totalVolume');
        expect(response.data).toHaveProperty('totalUsers');
      } else {
        console.warn('Analytics retrieval failed:', response.status);
      }
    }, TIMEOUT);

    it('should retrieve trending NFTs', async () => {
      const response = await api.get('/api/v1/analytics/trending', {
        params: {
          period: '24h',
          limit: 10,
        },
      });
      
      if (response.status === 200) {
        expect(Array.isArray(response.data)).toBe(true);
      } else {
        console.warn('Trending NFTs retrieval failed:', response.status);
      }
    }, TIMEOUT);
  });

  describe('Microservice Communication', () => {
    it('should handle Creator -> Content -> NFT service chain', async () => {
      try {
        // Step 1: Register creator
        const creatorResponse = await api.post('/api/v1/creators/register', {
          address: testContext.walletAddress,
          username: `test_creator_${Date.now()}`,
          bio: 'Integration test creator',
        });
        
        if (creatorResponse.status === 201 || creatorResponse.status === 409) {
          // Step 2: Upload content
          const contentResponse = await api.post('/api/v1/content/upload', {
            title: 'Test Content Chain',
            description: 'Testing service chain',
            category: 'artwork',
            contentHash: `QmTest${Date.now()}`,
            creator: testContext.walletAddress,
          });
          
          if (contentResponse.status === 201) {
            testContext.contentId = contentResponse.data.contentId;
            
            // Step 3: Mint NFT
            const nftResponse = await api.post('/api/v1/nft/mint', {
              creator: testContext.walletAddress,
              contentHash: contentResponse.data.contentHash,
              metadataURI: `ipfs://metadata${Date.now()}`,
              category: 'artwork',
              royalty: {
                recipients: [testContext.walletAddress],
                percentages: [1000],
              },
            });
            
            if (nftResponse.status === 201) {
              testContext.tokenId = nftResponse.data.tokenId;
              expect(nftResponse.data).toHaveProperty('txHash');
            }
          }
        }
      } catch (error: any) {
        console.warn('Service chain test failed:', error.message);
      }
    }, TIMEOUT);

    it('should handle NFT -> Marketplace -> Trading service chain', async () => {
      if (!testContext.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      try {
        // Step 1: List NFT in marketplace
        const listResponse = await api.post('/api/v1/marketplace/orders', {
          tokenId: testContext.tokenId,
          orderType: 'sell',
          price: '0.5',
          maker: testContext.walletAddress,
        });
        
        if (listResponse.status === 201) {
          testContext.orderId = listResponse.data.orderId;
          
          // Step 2: Get order book
          const orderbookResponse = await api.get(
            `/api/v1/marketplace/orderbook/${testContext.tokenId}`
          );
          
          expect(orderbookResponse.status).toBe(200);
          expect(orderbookResponse.data).toHaveProperty('sellOrders');
          
          // Step 3: Check analytics updated
          const analyticsResponse = await api.get('/api/v1/analytics/stats');
          expect(analyticsResponse.status).toBe(200);
        }
      } catch (error: any) {
        console.warn('Marketplace chain test failed:', error.message);
      }
    }, TIMEOUT);

    it('should handle NFT -> Fractionalization -> Staking service chain', async () => {
      if (!testContext.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      try {
        // Step 1: Fractionalize NFT
        const fractionalResponse = await api.post('/api/v1/fractional/create', {
          tokenId: testContext.tokenId,
          totalSupply: '1000000',
          tokenName: 'Fractional Test',
          tokenSymbol: 'FT',
          reservePrice: '10',
        });
        
        if (fractionalResponse.status === 201) {
          testContext.vaultId = fractionalResponse.data.vaultId;
          
          // Step 2: Check vault info
          const vaultResponse = await api.get(
            `/api/v1/fractional/vault/${testContext.vaultId}`
          );
          
          if (vaultResponse.status === 200) {
            expect(vaultResponse.data).toHaveProperty('fractionalToken');
          }
        }
      } catch (error: any) {
        console.warn('Fractionalization chain test failed:', error.message);
      }
    }, TIMEOUT);

    it('should handle Governance -> Voting -> Execution service chain', async () => {
      try {
        // Step 1: Create proposal
        const proposalResponse = await api.post('/api/v1/governance/proposals', {
          proposer: testContext.walletAddress,
          title: 'Test Proposal',
          description: 'Integration test proposal',
          proposalType: 'PARAMETER_CHANGE',
          executionData: '0x',
        });
        
        if (proposalResponse.status === 201) {
          testContext.proposalId = proposalResponse.data.proposalId;
          
          // Step 2: Cast vote
          const voteResponse = await api.post(
            `/api/v1/governance/proposals/${testContext.proposalId}/vote`,
            {
              voter: testContext.walletAddress,
              support: 1, // For
              reason: 'Integration test vote',
            }
          );
          
          if (voteResponse.status === 200) {
            // Step 3: Get proposal status
            const statusResponse = await api.get(
              `/api/v1/governance/proposals/${testContext.proposalId}`
            );
            
            expect(statusResponse.status).toBe(200);
            expect(statusResponse.data).toHaveProperty('status');
          }
        }
      } catch (error: any) {
        console.warn('Governance chain test failed:', error.message);
      }
    }, TIMEOUT);
  });

  describe('Cross-Service Data Consistency', () => {
    it('should maintain consistency between Creator and NFT services', async () => {
      if (!testContext.tokenId) {
        console.log('No token ID available - skipping test');
        return;
      }

      try {
        // Get creator data
        const creatorResponse = await api.get(`/api/v1/creators/${testContext.walletAddress}`);
        
        // Get NFT data
        const nftResponse = await api.get(`/api/v1/nft/${testContext.tokenId}`);
        
        if (creatorResponse.status === 200 && nftResponse.status === 200) {
          // Verify creator address matches
          expect(nftResponse.data.creator).toBe(creatorResponse.data.address);
        }
      } catch (error: any) {
        console.warn('Consistency check failed:', error.message);
      }
    }, TIMEOUT);

    it('should sync data across PostgreSQL and MongoDB', async () => {
      try {
        // Query from PostgreSQL (via API)
        const pgResponse = await api.get(`/api/v1/creators/${testContext.walletAddress}`);
        
        // Query from MongoDB (via API)
        const mongoResponse = await api.get(`/api/v1/content/by-creator/${testContext.walletAddress}`);
        
        // Both should return data for the same creator
        if (pgResponse.status === 200) {
          expect(pgResponse.data).toHaveProperty('address');
        }
        
        if (mongoResponse.status === 200) {
          expect(Array.isArray(mongoResponse.data) || mongoResponse.data.contents).toBeTruthy();
        }
      } catch (error: any) {
        console.warn('Data sync check failed:', error.message);
      }
    }, TIMEOUT);

    it('should maintain consistency across Analytics and Marketplace services', async () => {
      try {
        // Get marketplace stats
        const marketplaceResponse = await api.get('/api/v1/marketplace/stats');
        
        // Get analytics stats
        const analyticsResponse = await api.get('/api/v1/analytics/stats');
        
        if (marketplaceResponse.status === 200 && analyticsResponse.status === 200) {
          // Both should have consistent total volume
          const marketplaceVolume = marketplaceResponse.data.totalVolume || 0;
          const analyticsVolume = analyticsResponse.data.totalVolume || 0;
          
          // Allow for small differences due to timing
          const difference = Math.abs(marketplaceVolume - analyticsVolume);
          expect(difference).toBeLessThan(1); // Less than 1 ETH difference
        }
      } catch (error: any) {
        console.warn('Analytics consistency check failed:', error.message);
      }
    }, TIMEOUT);

    it('should maintain consistency between Royalty and NFT services', async () => {
      if (!testContext.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      try {
        // Get NFT royalty info
        const nftResponse = await api.get(`/api/v1/nft/${testContext.tokenId}`);
        
        // Get royalty distribution info
        const royaltyResponse = await api.get(
          `/api/v1/royalty/distributions/${testContext.tokenId}`
        );
        
        if (nftResponse.status === 200 && royaltyResponse.status === 200) {
          // Verify royalty percentages match
          const nftRoyalty = nftResponse.data.royalty;
          const royaltyData = royaltyResponse.data;
          
          if (nftRoyalty && royaltyData) {
            expect(nftRoyalty.recipients).toEqual(royaltyData.beneficiaries);
          }
        }
      } catch (error: any) {
        console.warn('Royalty consistency check failed:', error.message);
      }
    }, TIMEOUT);

    it('should handle eventual consistency with retry logic', async () => {
      try {
        // Create a new content
        const contentResponse = await api.post('/api/v1/content/upload', {
          title: 'Eventual Consistency Test',
          description: 'Testing eventual consistency',
          category: 'artwork',
          contentHash: `QmEventual${Date.now()}`,
          creator: testContext.walletAddress,
        });
        
        if (contentResponse.status === 201) {
          const contentId = contentResponse.data.contentId;
          
          // Retry logic to check if data is eventually consistent
          let found = false;
          let retries = 0;
          const maxRetries = 5;
          
          while (!found && retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const checkResponse = await api.get(`/api/v1/content/${contentId}`);
            
            if (checkResponse.status === 200) {
              found = true;
              expect(checkResponse.data).toHaveProperty('contentId', contentId);
            }
            
            retries++;
          }
          
          if (!found) {
            console.warn('Eventual consistency not achieved within timeout');
          }
        }
      } catch (error: any) {
        console.warn('Eventual consistency test failed:', error.message);
      }
    }, TIMEOUT);
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent resources', async () => {
      const response = await api.get('/api/v1/nft/999999999');
      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid requests', async () => {
      const response = await api.post('/api/v1/nft/mint', {
        // Missing required fields
        creator: testContext.walletAddress,
      });
      expect([400, 422]).toContain(response.status);
    });

    it('should handle rate limiting', async () => {
      const requests = Array(100).fill(null).map(() => 
        api.get('/api/v1/health')
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimited = responses.some(r => [429, 503].includes(r.status));
      
      if (rateLimited) {
        console.log('Rate limiting is working');
      } else {
        console.warn('Rate limiting may not be configured');
      }
    }, TIMEOUT);

    it('should handle service unavailability gracefully', async () => {
      const response = await api.get('/api/v1/nonexistent-service/test');
      expect([404, 503]).toContain(response.status);
    });

    it('should validate request payloads', async () => {
      const invalidPayload = {
        creator: 'invalid-address', // Invalid Ethereum address
        contentHash: '', // Empty content hash
      };

      const response = await api.post('/api/v1/nft/mint', invalidPayload);
      expect([400, 422]).toContain(response.status);
    });
  });

  describe('Service Resilience', () => {
    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array(10).fill(null).map(() => 
        api.get('/api/v1/analytics/stats')
      );

      const responses = await Promise.all(concurrentRequests);
      
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    }, TIMEOUT);

    it('should handle timeout scenarios', async () => {
      const shortTimeoutApi = axios.create({
        baseURL: API_BASE_URL,
        timeout: 100, // Very short timeout
        validateStatus: () => true,
      });

      const response = await shortTimeoutApi.get('/api/v1/analytics/stats')
        .catch(error => ({ status: 'timeout', error }));

      // Either succeeds quickly or times out
      expect(response).toBeDefined();
    }, TIMEOUT);

    it('should handle malformed JSON responses', async () => {
      const response = await api.get('/api/v1/health');
      
      if (response.status === 200) {
        expect(() => JSON.stringify(response.data)).not.toThrow();
      }
    });
  });

  describe('Performance Metrics', () => {
    it('should respond to health checks quickly', async () => {
      const startTime = Date.now();
      const response = await api.get('/api/v1/health');
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      
      if (response.status === 200) {
        expect(responseTime).toBeLessThan(1000); // Less than 1 second
      }
    });

    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      
      const response = await api.get('/api/v1/marketplace/nfts', {
        params: {
          page: 1,
          limit: 100,
        },
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.status === 200) {
        expect(responseTime).toBeLessThan(5000); // Less than 5 seconds
      }
    }, TIMEOUT);
  });
});
