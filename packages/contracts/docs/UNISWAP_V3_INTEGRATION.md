# Uniswap V3 Integration for Fractional Tokens

## Overview

This document describes the Uniswap V3 integration for trading fractional NFT tokens on the KnowTon platform. The integration enables:

- **Liquidity Pools**: Create Uniswap V3 pools for fractional tokens paired with WETH
- **Token Swapping**: Swap between fractional tokens and ETH with slippage protection
- **Liquidity Provision**: Add and remove liquidity to earn trading fees
- **Price Oracle**: Integrate Chainlink price feeds for accurate pricing

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
│  - SwapInterface Component                              │
│  - useSwap Hook                                         │
│  - Slippage Settings                                    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  Backend API (Express)                  │
│  - Uniswap Routes                                       │
│  - UniswapService                                       │
│  - Transaction Management                               │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              Smart Contracts (Solidity)                 │
│  - UniswapV3PoolManager                                 │
│  - ChainlinkOracleAdapter                               │
│  - FractionalizationVault                               │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  Uniswap V3 Protocol                    │
│  - Factory                                              │
│  - Pool                                                 │
│  - Position Manager                                     │
│  - Swap Router                                          │
└─────────────────────────────────────────────────────────┘
```

## Smart Contract: UniswapV3PoolManager

### Key Features

1. **Pool Creation**
   - Creates Uniswap V3 pools for fractional tokens
   - Pairs fractional tokens with WETH
   - Supports multiple fee tiers (0.05%, 0.3%, 1%)
   - Initializes pools with custom prices

2. **Liquidity Management**
   - Add liquidity with tick range selection
   - Remove liquidity from positions
   - Track position NFTs
   - Collect trading fees

3. **Token Swapping**
   - Execute swaps with slippage protection
   - Calculate minimum output amounts
   - Support exact input swaps
   - Integrate with Chainlink price oracle

4. **Price Oracle Integration**
   - Get prices from Chainlink oracle
   - Fallback to pool TWAP
   - Calculate price impact
   - Monitor price deviations

### Contract Interface

```solidity
interface IUniswapV3PoolManager {
    // Pool Management
    function createPool(
        uint256 vaultId,
        address fractionalToken,
        uint24 fee,
        uint160 initialPrice
    ) external returns (address pool);
    
    // Liquidity Management
    function addLiquidity(
        uint256 vaultId,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        int24 tickLower,
        int24 tickUpper
    ) external returns (
        uint256 tokenId,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );
    
    function removeLiquidity(
        uint256 tokenId,
        uint128 liquidity,
        uint256 amount0Min,
        uint256 amount1Min
    ) external returns (uint256 amount0, uint256 amount1);
    
    // Swapping
    function swapTokens(
        uint256 vaultId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address recipient
    ) external returns (uint256 amountOut);
    
    // Price Oracle
    function getOraclePrice(uint256 vaultId) external view returns (uint256 price);
    
    function calculateAmountOutMinimum(
        uint256 vaultId,
        address tokenIn,
        uint256 amountIn,
        uint256 slippageBps
    ) external view returns (uint256 amountOutMinimum);
}
```

## Frontend Integration

### SwapInterface Component

The `SwapInterface` component provides a user-friendly interface for swapping tokens:

```tsx
<SwapInterface
  vaultId="1"
  fractionalToken="0x..."
  fractionalTokenSymbol="FRAC-NFT-1"
/>
```

**Features:**
- Token input/output fields
- Swap direction toggle
- Slippage tolerance settings (0.1%, 0.5%, 1%, custom)
- Real-time price quotes
- Price impact warnings
- Transaction status tracking
- Pool statistics display

### useSwap Hook

The `useSwap` hook manages swap state and interactions:

```typescript
const {
  swapState,
  poolInfo,
  quote,
  executeSwap,
  getQuote,
  loadPoolInfo,
  addLiquidity,
  removeLiquidity,
} = useSwap();
```

**State Management:**
- `swapState`: Current swap status (idle, approving, swapping, confirming, complete, error)
- `poolInfo`: Pool information (liquidity, volume, price)
- `quote`: Swap quote with price impact and minimum output

## Backend API

### Endpoints

#### Get Pool Info
```
GET /api/v1/uniswap/pools/:vaultId
```

Response:
```json
{
  "success": true,
  "data": {
    "token0": "0x...",
    "token1": "0x...",
    "fee": 3000,
    "pool": "0x...",
    "isActive": true,
    "price": "0.001",
    "liquidity": "100000",
    "volume24h": "50000"
  }
}
```

#### Create Pool
```
POST /api/v1/uniswap/pools
```

Request:
```json
{
  "vaultId": "1",
  "fractionalToken": "0x...",
  "fee": 3000,
  "initialPrice": "79228162514264337593543950336"
}
```

#### Get Swap Quote
```
POST /api/v1/uniswap/quote
```

Request:
```json
{
  "vaultId": "1",
  "tokenIn": "ETH",
  "amountIn": "1.0",
  "slippageBps": 50
}
```

Response:
```json
{
  "success": true,
  "data": {
    "amountOut": "1000000000000000000000",
    "amountOutMinimum": "995000000000000000000",
    "priceImpact": 0.5,
    "route": ["ETH", "FRACTION"],
    "fee": 3000
  }
}
```

#### Execute Swap
```
POST /api/v1/uniswap/swap
```

Request:
```json
{
  "vaultId": "1",
  "tokenIn": "0x...",
  "tokenOut": "0x...",
  "amountIn": "1.0",
  "slippageBps": 50
}
```

#### Add Liquidity
```
POST /api/v1/uniswap/liquidity/add
```

Request:
```json
{
  "vaultId": "1",
  "amount0Desired": "1.0",
  "amount1Desired": "1000.0",
  "slippageBps": 50
}
```

#### Remove Liquidity
```
POST /api/v1/uniswap/liquidity/remove
```

Request:
```json
{
  "vaultId": "1",
  "positionId": "123456",
  "liquidity": "1000000",
  "slippageBps": 50
}
```

## Slippage Protection

### How It Works

Slippage tolerance protects users from price changes during transaction execution:

1. **User Sets Tolerance**: User selects slippage (e.g., 0.5%)
2. **Calculate Minimum Output**: System calculates minimum acceptable output
3. **Execute Swap**: Transaction reverts if output < minimum
4. **Price Impact Warning**: Warn users if price impact > 5%

### Calculation

```typescript
const amountOutMinimum = (amountOut * (10000 - slippageBps)) / 10000;
```

Example:
- Expected output: 1000 tokens
- Slippage: 0.5% (50 bps)
- Minimum output: 1000 * (10000 - 50) / 10000 = 995 tokens

### Recommended Settings

- **Low volatility**: 0.1% - 0.5%
- **Medium volatility**: 0.5% - 1%
- **High volatility**: 1% - 3%
- **Large trades**: 2% - 5%

## Chainlink Price Oracle Integration

### Purpose

Chainlink price oracles provide:
- Accurate, tamper-proof price data
- Protection against price manipulation
- Fallback pricing mechanism
- Historical price data

### Implementation

```solidity
function getOraclePrice(uint256 vaultId) external view returns (uint256 price) {
    PoolConfig storage config = vaultPools[vaultId];
    
    if (priceOracle != address(0)) {
        // Get price from Chainlink oracle
        (int256 oraclePrice, ) = IChainlinkOracle(priceOracle).getLatestPrice(config.token0);
        price = uint256(oraclePrice);
    } else {
        // Fallback to pool price
        price = _getPoolPrice(config.pool);
    }
}
```

### Price Feeds

For Arbitrum mainnet:
- ETH/USD: `0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612`
- USDC/USD: `0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3`
- USDT/USD: `0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7`

## Fee Tiers

Uniswap V3 supports three fee tiers:

| Fee Tier | Percentage | Use Case |
|----------|------------|----------|
| 500 | 0.05% | Stablecoin pairs |
| 3000 | 0.3% | Standard pairs (recommended) |
| 10000 | 1% | Exotic/volatile pairs |

## Security Considerations

1. **Slippage Protection**: Always set appropriate slippage tolerance
2. **Price Impact**: Warn users about high price impact (>5%)
3. **Oracle Validation**: Verify oracle prices are recent (<1 hour)
4. **Reentrancy Guards**: All state-changing functions protected
5. **Access Control**: Only authorized users can create pools
6. **Token Approvals**: Minimize approval amounts

## Gas Optimization

1. **Batch Operations**: Combine multiple swaps when possible
2. **Tick Range**: Use wider ranges for lower gas costs
3. **Fee Collection**: Collect fees periodically, not per swap
4. **Pool Reuse**: Reuse existing pools instead of creating new ones

## Testing

### Unit Tests

```bash
cd packages/contracts
npx hardhat test test/UniswapV3PoolManager.test.ts
```

### Integration Tests

```bash
cd packages/backend
npm test -- uniswap.service.test.ts
```

### Frontend Tests

```bash
cd packages/frontend
npm test -- SwapInterface.test.tsx
```

## Deployment

### 1. Deploy Contracts

```bash
cd packages/contracts
npx hardhat run scripts/deploy-uniswap-manager.ts --network arbitrum
```

### 2. Configure Environment

```bash
# .env
UNISWAP_POOL_MANAGER_ADDRESS=0x...
CHAINLINK_ORACLE_ADDRESS=0x...
UNISWAP_V3_FACTORY=0x1F98431c8aD98523631AE4a59f267346ea31F984
POSITION_MANAGER=0xC36442b4a4522E871399CD717aBDD847Ab11FE88
SWAP_ROUTER=0xE592427A0AEce92De3Edee1F18E0157C05861564
```

### 3. Initialize Pools

```bash
# Create initial pools for fractional tokens
npm run create-pools
```

## Monitoring

### Metrics to Track

1. **Pool Metrics**
   - Total liquidity
   - 24h volume
   - Fee revenue
   - Active positions

2. **Swap Metrics**
   - Swap count
   - Average swap size
   - Slippage occurrences
   - Failed transactions

3. **Price Metrics**
   - Price deviation from oracle
   - Price impact distribution
   - TWAP vs spot price

### Alerts

- High price impact (>10%)
- Low liquidity (<$10k)
- Oracle price stale (>1 hour)
- Failed swaps (>5% rate)

## Troubleshooting

### Common Issues

1. **"Insufficient liquidity"**
   - Solution: Add more liquidity or reduce swap amount

2. **"Slippage exceeded"**
   - Solution: Increase slippage tolerance or wait for better price

3. **"Price impact too high"**
   - Solution: Split large trades into smaller chunks

4. **"Oracle price stale"**
   - Solution: Wait for oracle update or use pool price

## Future Enhancements

1. **Multi-hop Swaps**: Route through multiple pools for better prices
2. **Limit Orders**: Place limit orders using Uniswap V3 range orders
3. **Auto-rebalancing**: Automatically rebalance liquidity positions
4. **Concentrated Liquidity**: Optimize liquidity provision strategies
5. **Flash Swaps**: Enable flash swaps for arbitrage opportunities

## References

- [Uniswap V3 Documentation](https://docs.uniswap.org/protocol/concepts/V3-overview/concentrated-liquidity)
- [Chainlink Price Feeds](https://docs.chain.link/data-feeds/price-feeds)
- [Arbitrum Network](https://docs.arbitrum.io/)
- [EIP-1559 Gas Optimization](https://eips.ethereum.org/EIPS/eip-1559)

## Support

For questions or issues:
- GitHub Issues: https://github.com/knowton/platform/issues
- Discord: https://discord.gg/knowton
- Email: support@knowton.io
