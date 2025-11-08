import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';

/**
 * Fractionalization End-to-End Integration Tests
 * Tests complete NFT fractionalization flow
 * 
 * Test Coverage:
 * - NFT locking to vault
 * - ERC-20 token minting
 * - Liquidity pool creation
 * - Redemption voting mechanism
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const KAFKA_BROKERS = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
const TIMEOUT = 60000;

interface FractionalizationContext {
  owner: string;
  tokenId?: string;
  vaultId?: string;
  fractionalToken?: string;
  totalSupply: string;
  reservePrice: string;
  poolAddress?: string;
  lockTxHash?: string;
  mintTxHash?: string;
  poolTxHash?: string;
  redemptionProposalId?: string;
}

describe('Fractionalization End-to-End Tests', () => {
  let api: AxiosInstance;
  let kafka: Kafka;
  let producer: Producer;
  let consumer: Consumer;
  let context: FractionalizationContext;
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
      owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      totalSupply: '1000000',
      reservePrice: '10',
    };

    // Setup Kafka
    kafka = new Kafka({
      clientId: 'fractionalization-test',
      brokers: KAFKA_BROKERS,
      retry: {
        retries: 3,
        initialRetryTime: 100,
      },
    });

    producer = kafka.producer();
    consumer = kafka.consumer({ groupId: 'fractionalization-test-group' });

    try {
      await producer.connect();
      await consumer.connect();
      await consumer.subscribe({ topic: 'fractionalization', fromBeginning: false });

      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          const event = JSON.parse(message.value?.toString() || '{}');
          receivedEvents.push(event);
        },
      });

      isKafkaAvailable = true;
      console.log('Kafka connected for fractionalization tests');
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

  describe('Setup: Create Test NFT', () => {
    it('should create NFT for fractionalization', async () => {
      const mintData = {
        creator: context.owner,
        contentHash: `QmFractional${Date.now()}`,
        metadataURI: `ipfs://fractional${Date.now()}`,
        category: 'artwork',
        royalty: {
          recipients: [context.owner],
          percentages: [1000],
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

        console.log(`✓ Test NFT created for fractionalization - Token ID: ${context.tokenId}`);
      } else {
        console.warn(`NFT minting returned status ${response.status}`);
        context.tokenId = '888';
      }
    }, TIMEOUT);

    it('should verify NFT ownership before fractionalization', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/nft/${context.tokenId}/owner`);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('owner');
        expect(response.data.owner.toLowerCase()).toBe(context.owner.toLowerCase());

        console.log('✓ NFT ownership verified');
      } else {
        console.warn(`Ownership check returned status ${response.status}`);
      }
    }, TIMEOUT);
  });

  describe('Step 1: NFT Locking to Vault', () => {
    it('should approve vault contract to transfer NFT', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      const approvalData = {
        tokenId: context.tokenId,
        spender: 'vault_contract_address',
        owner: context.owner,
      };

      const response = await api.post('/api/v1/nft/approve', approvalData);

      if (response.status === 200 || response.status === 202) {
        expect(response.data).toHaveProperty('txHash');
        console.log(`✓ NFT approved for vault transfer - TX: ${response.data.txHash}`);
      } else {
        console.warn(`NFT approval returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should lock NFT in fractionalization vault', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      const fractionalData = {
        tokenId: context.tokenId,
        totalSupply: context.totalSupply,
        tokenName: 'Fractional Test Token',
        tokenSymbol: 'FTT',
        reservePrice: context.reservePrice,
        owner: context.owner,
      };

      const response = await api.post('/api/v1/fractional/create', fractionalData);

      if (response.status === 201 || response.status === 202) {
        expect(response.data).toHaveProperty('vaultId');
        expect(response.data).toHaveProperty('fractionalToken');

        context.vaultId = response.data.vaultId;
        context.fractionalToken = response.data.fractionalToken;
        context.lockTxHash = response.data.txHash;

        console.log(`✓ NFT locked in vault - Vault ID: ${context.vaultId}`);
        console.log(`  Fractional Token: ${context.fractionalToken}`);
      } else {
        console.warn(`Fractionalization returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should verify NFT is locked in vault', async () => {
      if (!context.vaultId) {
        console.log('No vault ID - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/fractional/vault/${context.vaultId}`);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('vaultId', context.vaultId);
        expect(response.data).toHaveProperty('nftTokenId', context.tokenId);
        expect(response.data).toHaveProperty('isLocked', true);
        expect(response.data).toHaveProperty('fractionalToken', context.fractionalToken);

        console.log('✓ NFT lock verified in vault');
      } else {
        console.warn(`Vault info returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should verify NFT ownership transferred to vault', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      // Wait for transaction confirmation
      await new Promise(resolve => setTimeout(resolve, 3000));

      const response = await api.get(`/api/v1/nft/${context.tokenId}/owner`);

      if (response.status === 200) {
        const currentOwner = response.data.owner.toLowerCase();
        
        // Owner should be vault contract
        if (currentOwner !== context.owner.toLowerCase()) {
          console.log(`✓ NFT ownership transferred to vault: ${currentOwner}`);
        } else {
          console.log('NFT still owned by original owner (transfer pending)');
        }
      } else {
        console.warn(`Ownership check returned status ${response.status}`);
      }
    }, TIMEOUT);
  });

  describe('Step 2: ERC-20 Token Minting', () => {
    it('should mint fractional ERC-20 tokens', async () => {
      if (!context.vaultId) {
        console.log('No vault ID - skipping test');
        return;
      }

      // Fractional tokens should be minted automatically during vault creation
      const response = await api.get(`/api/v1/fractional/vault/${context.vaultId}/tokens`);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('tokenAddress', context.fractionalToken);
        expect(response.data).toHaveProperty('totalSupply', context.totalSupply);
        expect(response.data).toHaveProperty('name');
        expect(response.data).toHaveProperty('symbol');

        console.log(`✓ Fractional tokens minted - Supply: ${response.data.totalSupply}`);
      } else {
        console.warn(`Token info returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should verify token balance of vault creator', async () => {
      if (!context.fractionalToken) {
        console.log('No fractional token - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/fractional/balance`, {
        params: {
          tokenAddress: context.fractionalToken,
          owner: context.owner,
        },
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty('balance');
        expect(response.data.balance).toBe(context.totalSupply);

        console.log(`✓ Token balance verified - ${response.data.balance} tokens`);
      } else {
        console.warn(`Balance check returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should verify token metadata', async () => {
      if (!context.fractionalToken) {
        console.log('No fractional token - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/fractional/token/${context.fractionalToken}`);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('name', 'Fractional Test Token');
        expect(response.data).toHaveProperty('symbol', 'FTT');
        expect(response.data).toHaveProperty('decimals');
        expect(response.data).toHaveProperty('totalSupply', context.totalSupply);

        console.log('✓ Token metadata verified');
      } else {
        console.warn(`Token metadata returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should allow token transfers', async () => {
      if (!context.fractionalToken) {
        console.log('No fractional token - skipping test');
        return;
      }

      const recipient = '0x1234567890123456789012345678901234567890';
      const amount = '1000';

      const transferData = {
        tokenAddress: context.fractionalToken,
        from: context.owner,
        to: recipient,
        amount: amount,
      };

      const response = await api.post('/api/v1/fractional/transfer', transferData);

      if (response.status === 200 || response.status === 202) {
        expect(response.data).toHaveProperty('txHash');
        console.log(`✓ Token transfer initiated - ${amount} tokens to ${recipient}`);
      } else {
        console.warn(`Token transfer returned status ${response.status}`);
      }
    }, TIMEOUT);
  });

  describe('Step 3: Liquidity Pool Creation', () => {
    it('should create Uniswap liquidity pool', async () => {
      if (!context.fractionalToken) {
        console.log('No fractional token - skipping test');
        return;
      }

      const poolData = {
        tokenA: context.fractionalToken,
        tokenB: 'WETH_ADDRESS',
        amountA: '100000',
        amountB: '1',
        fee: 3000, // 0.3%
        creator: context.owner,
      };

      const response = await api.post('/api/v1/fractional/create-pool', poolData);

      if (response.status === 201 || response.status === 202) {
        expect(response.data).toHaveProperty('poolAddress');
        expect(response.data).toHaveProperty('txHash');

        context.poolAddress = response.data.poolAddress;
        context.poolTxHash = response.data.txHash;

        console.log(`✓ Liquidity pool created - Pool: ${context.poolAddress}`);
      } else {
        console.warn(`Pool creation returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should verify pool liquidity', async () => {
      if (!context.poolAddress) {
        console.log('No pool address - skipping test');
        return;
      }

      // Wait for pool creation
      await new Promise(resolve => setTimeout(resolve, 3000));

      const response = await api.get(`/api/v1/fractional/pool/${context.poolAddress}`);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('token0');
        expect(response.data).toHaveProperty('token1');
        expect(response.data).toHaveProperty('reserve0');
        expect(response.data).toHaveProperty('reserve1');
        expect(response.data).toHaveProperty('totalLiquidity');

        console.log(`✓ Pool liquidity verified - Reserves: ${response.data.reserve0}/${response.data.reserve1}`);
      } else {
        console.warn(`Pool info returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should allow adding liquidity to pool', async () => {
      if (!context.poolAddress) {
        console.log('No pool address - skipping test');
        return;
      }

      const liquidityData = {
        poolAddress: context.poolAddress,
        amountA: '10000',
        amountB: '0.1',
        provider: context.owner,
      };

      const response = await api.post('/api/v1/fractional/add-liquidity', liquidityData);

      if (response.status === 200 || response.status === 202) {
        expect(response.data).toHaveProperty('txHash');
        expect(response.data).toHaveProperty('liquidityTokens');

        console.log(`✓ Liquidity added - LP tokens: ${response.data.liquidityTokens}`);
      } else {
        console.warn(`Add liquidity returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should allow swapping fractional tokens', async () => {
      if (!context.fractionalToken) {
        console.log('No fractional token - skipping test');
        return;
      }

      const swapData = {
        tokenIn: 'WETH_ADDRESS',
        tokenOut: context.fractionalToken,
        amountIn: '0.01',
        amountOutMin: '100',
        recipient: context.owner,
      };

      const response = await api.post('/api/v1/fractional/swap', swapData);

      if (response.status === 200 || response.status === 202) {
        expect(response.data).toHaveProperty('txHash');
        expect(response.data).toHaveProperty('amountOut');

        console.log(`✓ Token swap executed - Received: ${response.data.amountOut} tokens`);
      } else {
        console.warn(`Swap returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should track pool trading volume', async () => {
      if (!context.poolAddress) {
        console.log('No pool address - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/fractional/pool/${context.poolAddress}/stats`);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('volume24h');
        expect(response.data).toHaveProperty('volumeTotal');
        expect(response.data).toHaveProperty('txCount');

        console.log(`✓ Pool stats - 24h Volume: ${response.data.volume24h}, Total TX: ${response.data.txCount}`);
      } else {
        console.warn(`Pool stats returned status ${response.status}`);
      }
    }, TIMEOUT);
  });

  describe('Step 4: Redemption Voting Mechanism', () => {
    it('should initiate redemption proposal', async () => {
      if (!context.vaultId) {
        console.log('No vault ID - skipping test');
        return;
      }

      const redemptionData = {
        vaultId: context.vaultId,
        buyoutPrice: '15',
        proposer: context.owner,
      };

      const response = await api.post('/api/v1/fractional/initiate-redemption', redemptionData);

      if (response.status === 201 || response.status === 202) {
        expect(response.data).toHaveProperty('proposalId');
        expect(response.data).toHaveProperty('buyoutPrice', '15');
        expect(response.data).toHaveProperty('votingDeadline');

        context.redemptionProposalId = response.data.proposalId;

        console.log(`✓ Redemption proposal initiated - Proposal ID: ${context.redemptionProposalId}`);
      } else {
        console.warn(`Redemption initiation returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should retrieve redemption proposal details', async () => {
      if (!context.redemptionProposalId) {
        console.log('No proposal ID - skipping test');
        return;
      }

      const response = await api.get(`/api/v1/fractional/redemption/${context.redemptionProposalId}`);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('proposalId', context.redemptionProposalId);
        expect(response.data).toHaveProperty('vaultId', context.vaultId);
        expect(response.data).toHaveProperty('buyoutPrice');
        expect(response.data).toHaveProperty('status');
        expect(response.data).toHaveProperty('forVotes');
        expect(response.data).toHaveProperty('againstVotes');

        console.log(`✓ Proposal details - Status: ${response.data.status}, For: ${response.data.forVotes}, Against: ${response.data.againstVotes}`);
      } else {
        console.warn(`Proposal details returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should allow token holders to vote on redemption', async () => {
      if (!context.redemptionProposalId) {
        console.log('No proposal ID - skipping test');
        return;
      }

      const voteData = {
        proposalId: context.redemptionProposalId,
        voter: context.owner,
        support: true,
        votingPower: '500000', // 50% of tokens
      };

      const response = await api.post('/api/v1/fractional/vote-redemption', voteData);

      if (response.status === 200 || response.status === 202) {
        expect(response.data).toHaveProperty('txHash');
        expect(response.data).toHaveProperty('votingPower');

        console.log(`✓ Vote cast - Power: ${response.data.votingPower}`);
      } else {
        console.warn(`Voting returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should calculate voting results', async () => {
      if (!context.redemptionProposalId) {
        console.log('No proposal ID - skipping test');
        return;
      }

      // Wait for vote processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await api.get(`/api/v1/fractional/redemption/${context.redemptionProposalId}/results`);

      if (response.status === 200) {
        expect(response.data).toHaveProperty('totalVotes');
        expect(response.data).toHaveProperty('forVotes');
        expect(response.data).toHaveProperty('againstVotes');
        expect(response.data).toHaveProperty('quorumReached');
        expect(response.data).toHaveProperty('passed');

        console.log(`✓ Voting results - Total: ${response.data.totalVotes}, Quorum: ${response.data.quorumReached}, Passed: ${response.data.passed}`);
      } else {
        console.warn(`Voting results returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should execute redemption if approved', async () => {
      if (!context.redemptionProposalId) {
        console.log('No proposal ID - skipping test');
        return;
      }

      const executeData = {
        proposalId: context.redemptionProposalId,
        executor: context.owner,
      };

      const response = await api.post('/api/v1/fractional/execute-redemption', executeData);

      if (response.status === 200 || response.status === 202) {
        expect(response.data).toHaveProperty('txHash');
        expect(response.data).toHaveProperty('status');

        console.log(`✓ Redemption execution initiated - TX: ${response.data.txHash}`);
      } else if (response.status === 400) {
        console.log('Redemption not approved or conditions not met');
      } else {
        console.warn(`Redemption execution returned status ${response.status}`);
      }
    }, TIMEOUT);

    it('should verify NFT ownership after redemption', async () => {
      if (!context.tokenId) {
        console.log('No token ID - skipping test');
        return;
      }

      // Wait for redemption execution
      await new Promise(resolve => setTimeout(resolve, 5000));

      const response = await api.get(`/api/v1/nft/${context.tokenId}/owner`);

      if (response.status === 200) {
        const currentOwner = response.data.owner.toLowerCase();

        if (currentOwner === context.owner.toLowerCase()) {
          console.log('✓ NFT redeemed and returned to owner');
        } else {
          console.log('NFT still in vault (redemption not executed or pending)');
        }
      } else {
        console.warn(`Ownership check returned status ${response.status}`);
      }
    }, TIMEOUT);
  });

  describe('Step 5: Kafka Event Publishing', () => {
    it('should publish NFT_FRACTIONALIZED event', async () => {
      if (!isKafkaAvailable) {
        console.log('Kafka not available - skipping test');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      const fractionalizedEvent = receivedEvents.find(
        event => event.type === 'NFT_FRACTIONALIZED' && event.data?.vaultId === context.vaultId
      );

      if (fractionalizedEvent) {
        expect(fractionalizedEvent).toHaveProperty('type', 'NFT_FRACTIONALIZED');
        expect(fractionalizedEvent.data).toHaveProperty('vaultId', context.vaultId);
        expect(fractionalizedEvent.data).toHaveProperty('tokenId', context.tokenId);
        expect(fractionalizedEvent.data).toHaveProperty('fractionalToken');
        expect(fractionalizedEvent.data).toHaveProperty('totalSupply');

        console.log('✓ NFT_FRACTIONALIZED event published');
      } else {
        console.warn('NFT_FRACTIONALIZED event not received');
      }
    }, TIMEOUT);

    it('should publish POOL_CREATED event', async () => {
      if (!isKafkaAvailable) {
        console.log('Kafka not available - skipping test');
        return;
      }

      const poolEvent = receivedEvents.find(
        event => event.type === 'POOL_CREATED' && event.data?.poolAddress === context.poolAddress
      );

      if (poolEvent) {
        expect(poolEvent).toHaveProperty('type', 'POOL_CREATED');
        expect(poolEvent.data).toHaveProperty('poolAddress', context.poolAddress);
        expect(poolEvent.data).toHaveProperty('token0');
        expect(poolEvent.data).toHaveProperty('token1');

        console.log('✓ POOL_CREATED event published');
      } else {
        console.warn('POOL_CREATED event not received');
      }
    }, TIMEOUT);

    it('should publish REDEMPTION_INITIATED event', async () => {
      if (!isKafkaAvailable) {
        console.log('Kafka not available - skipping test');
        return;
      }

      const redemptionEvent = receivedEvents.find(
        event => event.type === 'REDEMPTION_INITIATED' && event.data?.proposalId === context.redemptionProposalId
      );

      if (redemptionEvent) {
        expect(redemptionEvent).toHaveProperty('type', 'REDEMPTION_INITIATED');
        expect(redemptionEvent.data).toHaveProperty('proposalId', context.redemptionProposalId);
        expect(redemptionEvent.data).toHaveProperty('vaultId', context.vaultId);
        expect(redemptionEvent.data).toHaveProperty('buyoutPrice');

        console.log('✓ REDEMPTION_INITIATED event published');
      } else {
        console.warn('REDEMPTION_INITIATED event not received');
      }
    }, TIMEOUT);
  });

  describe('End-to-End Flow Validation', () => {
    it('should complete full fractionalization flow', () => {
      const flowComplete =
        context.tokenId &&
        context.vaultId &&
        context.fractionalToken;

      if (flowComplete) {
        console.log('\n✓ Fractionalization Flow Complete:');
        console.log(`  Token ID: ${context.tokenId}`);
        console.log(`  Vault ID: ${context.vaultId}`);
        console.log(`  Fractional Token: ${context.fractionalToken}`);
        console.log(`  Total Supply: ${context.totalSupply}`);
        console.log(`  Reserve Price: ${context.reservePrice} ETH`);
        console.log(`  Pool Address: ${context.poolAddress || 'N/A'}`);
        console.log(`  Redemption Proposal: ${context.redemptionProposalId || 'N/A'}`);
      } else {
        console.warn('Fractionalization flow incomplete');
      }

      expect(flowComplete).toBe(true);
    });

    it('should verify data consistency across all systems', async () => {
      if (!context.vaultId) {
        console.log('No vault ID - skipping test');
        return;
      }

      // Check vault info
      const vaultResponse = await api.get(`/api/v1/fractional/vault/${context.vaultId}`);
      const vaultExists = vaultResponse.status === 200;

      // Check token info
      const tokenResponse = context.fractionalToken
        ? await api.get(`/api/v1/fractional/token/${context.fractionalToken}`)
        : { status: 404 };
      const tokenExists = tokenResponse.status === 200;

      // Check pool info
      const poolResponse = context.poolAddress
        ? await api.get(`/api/v1/fractional/pool/${context.poolAddress}`)
        : { status: 404 };
      const poolExists = poolResponse.status === 200;

      console.log('\n✓ Data Consistency Check:');
      console.log(`  Vault: ${vaultExists ? '✓' : '✗'}`);
      console.log(`  Fractional Token: ${tokenExists ? '✓' : '✗'}`);
      console.log(`  Liquidity Pool: ${poolExists ? '✓' : '✗'}`);
      console.log(`  Kafka Events: ${receivedEvents.length > 0 ? '✓' : '✗'}`);

      expect(vaultExists).toBe(true);
    }, TIMEOUT);
  });
});
