# Uniswap V3 Integration - Quick Start Guide

## Overview

This guide will help you quickly integrate Uniswap V3 for trading fractional NFT tokens.

## Prerequisites

- Node.js 18+
- Hardhat
- MetaMask or compatible wallet
- Test ETH on Arbitrum Sepolia

## Quick Setup

### 1. Install Dependencies

```bash
# Install contract dependencies
cd packages/contracts
npm install @uniswap/v3-core @uniswap/v3-periphery

# Install frontend dependencies
cd packages/frontend
npm install

# Install backend dependencies
cd packages/backend
npm install
```

### 2. Configure Environment

```bash
# packages/contracts/.env
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
PRIVATE_KEY=your_private_key_here
UNISWAP_V3_FACTORY=0x1F98431c8aD98523631AE4a59f267346ea31F984
POSITION_MANAGER=0xC36442b4a4522E871399CD717aBDD847Ab11FE88
SWAP_ROUTER=0xE592427A0AEce92De3Edee1F18E0157C05861564
WETH=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

# packages/backend/.env
UNISWAP_POOL_MANAGER_ADDRESS=deployed_address_here
CHAINLINK_ORACLE_ADDRESS=deployed_address_here
```

### 3. Deploy Contracts

```bash
cd packages/contracts

# Compile contracts
npx hardhat compile

# Deploy to testnet
npx hardhat run scripts/deploy-uniswap-manager.ts --network arbitrumSepolia

# Verify on Arbiscan
npx hardhat verify --network arbitrumSepolia DEPLOYED_ADDRESS
```

### 4. Create a Pool

```typescript
// Using the frontend
import { useSwap } from './hooks/useSwap';

const { createPool } = useSwap();

await createPool({
  vaultId: '1',
  fractionalToken: '0x...',
  fee: 3000, // 0.3%
  initialPrice: '79228162514264337593543950336', // sqrtPriceX96
});
```

### 5. Add Liquidity

```typescript
const { addLiquidity } = useSwap();

await addLiquidity({
  vaultId: '1',
  amount0Desired: '1.0', // 1 ETH
  amount1Desired: '1000.0', // 1000 fractional tokens
  slippageBps: 50, // 0.5%
});
```

### 6. Execute a Swap

```typescript
const { executeSwap } = useSwap();

await executeSwap({
  vaultId: '1',
  tokenIn: 'ETH',
  tokenOut: 'FRACTION',
  amountIn: '0.1', // 0.1 ETH
  slippageBps: 50, // 0.5%
});
```

## Frontend Integration

### Add Swap Interface to Your Page

```tsx
import { SwapInterface } from './components/SwapInterface';

function TradingPage() {
  return (
    <div>
      <h1>Trade Fractional Tokens</h1>
      <SwapInterface
        vaultId="1"
        fractionalToken="0x..."
        fractionalTokenSymbol="FRAC-NFT-1"
      />
    </div>
  );
}
```

### Customize Slippage Settings

```tsx
// Default slippage options: 0.1%, 0.5%, 1.0%
// Users can also enter custom values

const [slippage, setSlippage] = useState('0.5');

<input
  type="number"
  value={slippage}
  onChange={(e) => setSlippage(e.target.value)}
  min="0.1"
  max="50"
  step="0.1"
/>
```

## Backend API Integration

### Register Routes

```typescript
// packages/backend/src/app.ts
import uniswapRoutes from './routes/uniswap.routes';

app.use('/api/v1/uniswap', uniswapRoutes);
```

### Test API Endpoints

```bash
# Get pool info
curl http://localhost:3000/api/v1/uniswap/pools/1

# Get swap quote
curl -X POST http://localhost:3000/api/v1/uniswap/quote \
  -H "Content-Type: application/json" \
  -d '{
    "vaultId": "1",
    "tokenIn": "ETH",
    "amountIn": "1.0",
    "slippageBps": 50
  }'

# Execute swap (requires authentication)
curl -X POST http://localhost:3000/api/v1/uniswap/swap \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "vaultId": "1",
    "tokenIn": "0x...",
    "tokenOut": "0x...",
    "amountIn": "1.0",
    "slippageBps": 50
  }'
```

## Testing

### Run Contract Tests

```bash
cd packages/contracts
npx hardhat test test/UniswapV3PoolManager.test.ts
```

### Run Backend Tests

```bash
cd packages/backend
npm test -- uniswap.service.test.ts
```

### Run Frontend Tests

```bash
cd packages/frontend
npm test -- SwapInterface.test.tsx
```

## Common Use Cases

### 1. Buy Fractional Tokens with ETH

```typescript
await executeSwap({
  vaultId: '1',
  tokenIn: 'ETH',
  tokenOut: 'FRACTION',
  amountIn: '0.5',
  slippageBps: 50,
});
```

### 2. Sell Fractional Tokens for ETH

```typescript
await executeSwap({
  vaultId: '1',
  tokenIn: 'FRACTION',
  tokenOut: 'ETH',
  amountIn: '500',
  slippageBps: 50,
});
```

### 3. Provide Liquidity to Earn Fees

```typescript
// Add liquidity
const result = await addLiquidity({
  vaultId: '1',
  amount0Desired: '1.0',
  amount1Desired: '1000.0',
  slippageBps: 50,
});

// Save position ID
const positionId = result.tokenId;

// Later, remove liquidity
await removeLiquidity({
  vaultId: '1',
  positionId,
  liquidity: '1000000',
  slippageBps: 50,
});
```

### 4. Get Real-time Price Quote

```typescript
const { getQuote } = useSwap();

const quote = await getQuote({
  vaultId: '1',
  tokenIn: 'ETH',
  amountIn: '1.0',
  slippageBps: 50,
});

console.log('Expected output:', quote.amountOut);
console.log('Minimum output:', quote.amountOutMinimum);
console.log('Price impact:', quote.priceImpact);
```

## Slippage Settings Guide

| Scenario | Recommended Slippage |
|----------|---------------------|
| Stable market, small trade | 0.1% - 0.5% |
| Normal market conditions | 0.5% - 1% |
| Volatile market | 1% - 3% |
| Large trade (>$10k) | 2% - 5% |
| Emergency exit | 5% - 10% |

## Price Impact Warnings

The system automatically warns users about high price impact:

- **< 1%**: ✅ Low impact (green)
- **1% - 3%**: ⚠️ Medium impact (yellow)
- **3% - 5%**: ⚠️ High impact (orange)
- **> 5%**: 🚫 Very high impact (red) - Consider splitting trade

## Troubleshooting

### Issue: "Insufficient liquidity"

**Solution:**
1. Check pool liquidity: `getPoolInfo(vaultId)`
2. Reduce swap amount
3. Add liquidity to the pool

### Issue: "Slippage exceeded"

**Solution:**
1. Increase slippage tolerance
2. Wait for better market conditions
3. Split large trades into smaller chunks

### Issue: "Transaction failed"

**Solution:**
1. Check gas settings
2. Verify token approvals
3. Ensure sufficient balance
4. Check network congestion

### Issue: "Price impact too high"

**Solution:**
1. Reduce trade size
2. Add more liquidity to pool
3. Use multiple smaller trades
4. Wait for better liquidity

## Best Practices

1. **Always Set Slippage**: Never use 0% slippage in production
2. **Monitor Price Impact**: Warn users when impact > 5%
3. **Use Oracle Prices**: Validate against Chainlink oracle
4. **Test on Testnet**: Always test on Arbitrum Sepolia first
5. **Handle Errors**: Implement proper error handling and user feedback
6. **Gas Optimization**: Batch operations when possible
7. **Security**: Validate all inputs and use reentrancy guards

## Next Steps

1. **Advanced Features**
   - Implement multi-hop swaps
   - Add limit order functionality
   - Create liquidity mining rewards

2. **Optimization**
   - Optimize gas usage
   - Implement caching for quotes
   - Add transaction batching

3. **Monitoring**
   - Set up price alerts
   - Monitor pool health
   - Track trading volume

## Resources

- [Full Documentation](./UNISWAP_V3_INTEGRATION.md)
- [Uniswap V3 Docs](https://docs.uniswap.org/protocol/concepts/V3-overview/concentrated-liquidity)
- [Chainlink Price Feeds](https://docs.chain.link/data-feeds/price-feeds)
- [Arbitrum Docs](https://docs.arbitrum.io/)

## Support

Need help? Contact us:
- GitHub: https://github.com/knowton/platform/issues
- Discord: https://discord.gg/knowton
- Email: support@knowton.io
