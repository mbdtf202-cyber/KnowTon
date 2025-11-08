# Royalty Distribution - Quick Start Guide

## Overview

This guide will help you quickly integrate the off-chain royalty distribution optimization into your application.

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Ethereum wallet with private key
- RoyaltyDistributor contract deployed

## Quick Setup

### 1. Environment Configuration

Add to your `.env` file:

```bash
# Blockchain
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
PRIVATE_KEY=your_private_key_here
ROYALTY_DISTRIBUTOR_ADDRESS=0x...

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/knowton
```

### 2. Install Dependencies

```bash
cd packages/backend
npm install
```

### 3. Run Database Migrations

```bash
npx prisma migrate dev
```

## Basic Usage

### Calculate Distribution (Off-Chain)

```typescript
import { RoyaltyDistributionService } from './services/royalty-distribution.service';

const service = new RoyaltyDistributionService();

// Calculate before executing
const calculation = await service.calculateDistribution(
  '1', // tokenId
  '10.0', // amount in ETH
  [
    { recipient: '0x1234...', percentage: 5000 }, // 50%
    { recipient: '0x5678...', percentage: 5000 }, // 50%
  ]
);

console.log('Preview:', calculation);
console.log('Gas estimate:', calculation.gasEstimate, 'ETH');
```

### Execute Distribution with Retry

```typescript
// Execute with automatic retry on failure
const result = await service.executeDistribution(
  '1', // tokenId
  '10.0', // amount
  {
    maxRetries: 3,
    retryDelay: 2000,
    backoffMultiplier: 2,
  }
);

console.log('Success! TX:', result.txHash);
```

### Batch Multiple Distributions

```typescript
// Batch for gas optimization
const results = await service.executeBatchDistributions([
  { tokenId: '1', amount: '5.0' },
  { tokenId: '2', amount: '3.0' },
  { tokenId: '3', amount: '2.0' },
]);

console.log('Batch results:', results);
```

## API Integration

### Add Routes to Express App

```typescript
import express from 'express';
import royaltyDistributionRoutes from './routes/royalty-distribution.routes';

const app = express();

app.use('/api/royalty-distribution', royaltyDistributionRoutes);
```

### Example API Calls

#### Calculate Distribution
```bash
curl -X POST http://localhost:3000/api/royalty-distribution/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "tokenId": "1",
    "totalAmount": "10.0",
    "beneficiaries": [
      {"recipient": "0x1234...", "percentage": 5000},
      {"recipient": "0x5678...", "percentage": 5000}
    ]
  }'
```

#### Get Gas Estimate
```bash
curl http://localhost:3000/api/royalty-distribution/gas-estimate
```

#### Execute Distribution
```bash
curl -X POST http://localhost:3000/api/royalty-distribution/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tokenId": "1",
    "amount": "10.0"
  }'
```

## Testing

### Run Unit Tests
```bash
npm test -- royalty-distribution.test.ts
```

### Run Integration Test
```bash
npx ts-node src/scripts/test-royalty-distribution.ts
```

## Common Patterns

### Pattern 1: Preview Before Execute
```typescript
// 1. Calculate and show user
const preview = await service.calculateDistribution(tokenId, amount, beneficiaries);

// 2. Show user the preview and gas cost
console.log('You will distribute:', preview.beneficiaries);
console.log('Estimated gas:', preview.gasEstimate);

// 3. User confirms, then execute
const result = await service.executeDistribution(tokenId, amount);
```

### Pattern 2: Batch Processing
```typescript
// Collect pending distributions
const pending = await service.getPendingDistributions();

// Process in batch
if (pending.length > 0) {
  const results = await service.executeBatchDistributions(
    pending.map(p => ({ tokenId: p.tokenId, amount: p.amount }))
  );
  console.log('Processed:', results.length);
}
```

### Pattern 3: Scheduled Processing
```typescript
// Run every hour
setInterval(async () => {
  const result = await service.processPendingDistributions();
  console.log('Processed:', result.processed);
}, 60 * 60 * 1000);
```

## Key Benefits

✅ **Gas Savings**: 30-40% reduction through off-chain calculation and batching
✅ **Reliability**: Automatic retry with exponential backoff
✅ **Transparency**: Preview distributions before execution
✅ **Efficiency**: Batch processing for multiple distributions
✅ **Monitoring**: Real-time gas price estimation

## Next Steps

1. ✅ Set up environment variables
2. ✅ Test with the integration script
3. ✅ Integrate API routes into your app
4. ✅ Set up automated pending distribution processing
5. ✅ Monitor gas costs and optimize batch sizes

## Troubleshooting

### "Total percentage must equal 100%"
- Ensure beneficiary percentages sum to exactly 10000 (basis points)

### "Failed to execute distribution"
- Check wallet has sufficient balance
- Verify contract address is correct
- Check network connectivity

### High gas costs
- Use batch processing for multiple distributions
- Execute during low-traffic periods
- Monitor gas prices with `/gas-estimate` endpoint

## Support

- Documentation: `packages/backend/docs/ROYALTY_DISTRIBUTION.md`
- Test Script: `packages/backend/src/scripts/test-royalty-distribution.ts`
- API Routes: `packages/backend/src/routes/royalty-distribution.routes.ts`

## Example: Complete Flow

```typescript
import { RoyaltyDistributionService } from './services/royalty-distribution.service';

async function distributeRoyalties() {
  const service = new RoyaltyDistributionService();

  // 1. Check gas price
  const gasEstimate = await service.getGasPriceEstimate();
  console.log('Current gas price:', gasEstimate.gasPriceGwei, 'Gwei');

  // 2. Calculate distribution
  const calculation = await service.calculateDistribution(
    '1',
    '10.0',
    [
      { recipient: '0x1234...', percentage: 5000 },
      { recipient: '0x5678...', percentage: 5000 },
    ]
  );
  console.log('Distribution preview:', calculation);

  // 3. Execute with retry
  const result = await service.executeDistribution('1', '10.0', {
    maxRetries: 3,
    retryDelay: 2000,
    backoffMultiplier: 2,
  });

  console.log('✓ Distribution completed!');
  console.log('Transaction:', result.txHash);
  console.log('Gas used:', result.gasUsed);
}

distributeRoyalties().catch(console.error);
```

That's it! You're ready to use the optimized royalty distribution service. 🚀
