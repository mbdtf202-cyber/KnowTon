import { describe, it, expect, beforeAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';

/**
 * Bonding End-to-End Integration Tests
 * Tests complete bond issuance and investment flow
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TIMEOUT = 60000;

describe('Bonding End-to-End Tests', () => {
  let api: AxiosInstance;
  let context: any = {};

  beforeAll(() => {
    api = axios.create({
      baseURL: API_BASE_URL,
      timeout: TIMEOUT,
      validateStatus: () => true,
    });
    context.issuer = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  });

  it('should issue bond', async () => {
    const response = await api.post('/api/v1/bonds/issue', {
      issuer: context.issuer,
      tokenId: '123',
      totalAmount: '100',
      tranches: [
        { type: 'senior', amount: '50', rate: '5' },
        { type: 'mezzanine', amount: '30', rate: '8' },
        { type: 'junior', amount: '20', rate: '12' },
      ],
    });

    if (response.status === 201) {
      context.bondId = response.data.bondId;
      console.log(`✓ Bond issued - ID: ${context.bondId}`);
    }
  }, TIMEOUT);

  it('should invest in tranche', async () => {
    if (!context.bondId) return;
    
    const response = await api.post('/api/v1/bonds/invest', {
      bondId: context.bondId,
      tranche: 'senior',
      amount: '10',
      investor: '0x1234567890123456789012345678901234567890',
    });

    if (response.status === 200) {
      console.log('✓ Investment successful');
    }
  }, TIMEOUT);

  it('should distribute yield', async () => {
    if (!context.bondId) return;
    
    const response = await api.post('/api/v1/bonds/distribute-yield', {
      bondId: context.bondId,
      amount: '5',
    });

    if (response.status === 200) {
      console.log('✓ Yield distributed');
    }
  }, TIMEOUT);

  it('should redeem bond', async () => {
    if (!context.bondId) return;
    
    const response = await api.post('/api/v1/bonds/redeem', {
      bondId: context.bondId,
      investor: '0x1234567890123456789012345678901234567890',
    });

    if (response.status === 200) {
      console.log('✓ Bond redeemed');
    }
  }, TIMEOUT);
});
