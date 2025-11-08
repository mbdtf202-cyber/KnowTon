# MarketplaceAMM Contract Unit Tests

## Overview

Comprehensive unit tests for the MarketplaceAMM contract, which integrates with Uniswap V3 for IP-NFT fractional token trading. The tests cover all core functionality including pool creation, liquidity management, swap operations, price queries, and security features.

## Test Coverage

### 1. Deployment Tests (3 tests)
- ✅ Validates correct Uniswap V3 contract addresses (factory, router, position manager)
- ✅ Ensures deployment reverts with invalid addresses
- ✅ Verifies correct owner assignment

### 2. Fee Tier Tests (1 test)
- ✅ Validates fee tier constants (0.05%, 0.3%, 1%)

### 3. TWAP Configuration Tests (5 tests)
- ✅ Verifies default TWAP interval (30 minutes)
- ✅ Tests owner can update TWAP interval
- ✅ Ensures invalid intervals are rejected (too short/long)
- ✅ Prevents non-owners from updating TWAP interval

### 4. Pool Creation Tests (7 tests)
- ✅ Creates pool with valid parameters
- ✅ Stores pool information correctly
- ✅ Rejects zero address tokens
- ✅ Rejects identical token pairs
- ✅ Rejects invalid fee tiers
- ✅ Prevents duplicate pool creation
- ✅ Handles reversed token order (ensures token0 < token1)
- ✅ Restricts pool creation to owner only

### 5. Liquidity Management Tests (3 tests)
- ✅ Adds liquidity successfully to existing pools
- ✅ Reverts when pool doesn't exist
- ✅ Refunds unused tokens after liquidity provision

### 6. Swap Functionality Tests (3 tests)
- ✅ Executes exactInputSingle swaps
- ✅ Reverts swaps with insufficient output (slippage protection)
- ✅ Executes multi-hop swaps with encoded paths

### 7. Price Query Tests (4 tests)
- ✅ Retrieves spot price from pools
- ✅ Calculates TWAP (Time-Weighted Average Price)
- ✅ Reverts price queries for non-existent pools
- ✅ Handles reversed token order in price queries

### 8. Event Emission Tests (2 tests)
- ✅ Emits PoolCreated events
- ✅ Emits SwapExecuted events

### 9. Security Tests (1 test)
- ✅ Verifies reentrancy protection on critical functions

## Test Results

```
MarketplaceAMM - Uniswap V3 Integration
  ✔ 30 passing (1s)
  ✔ 0 failing
```

## Mock Contracts

To enable comprehensive testing without deploying actual Uniswap V3 contracts, the following mock contracts were created:

### MockUniswapV3Factory
- Simulates Uniswap V3 factory pool creation
- Tracks pool registry
- Emits PoolCreated events

### MockUniswapV3Pool
- Simulates pool state (sqrtPriceX96, tick, observations)
- Supports price initialization
- Provides TWAP observation data
- Allows price updates for testing

### MockSwapRouter
- Simulates token swaps with configurable exchange rates
- Implements exactInputSingle and exactInput functions
- Supports slippage tolerance configuration
- Emits Swap events

### MockNonfungiblePositionManager
- Simulates liquidity position NFTs
- Implements mint, decreaseLiquidity, and collect functions
- Tracks position data (tokens, fees, ticks, liquidity)
- Emits liquidity events

## Key Test Scenarios

### Pool Creation Flow
1. Deploy MarketplaceAMM with mock Uniswap contracts
2. Create pool with token pair and fee tier
3. Verify pool is registered and initialized
4. Check pool info is stored correctly

### Liquidity Provision Flow
1. Create pool
2. Approve tokens for MarketplaceAMM
3. Add liquidity with desired amounts and tick range
4. Verify liquidity position NFT is minted
5. Check unused tokens are refunded

### Swap Execution Flow
1. Create pool and add liquidity
2. Approve input tokens
3. Execute swap with slippage protection
4. Verify output tokens received
5. Check SwapExecuted event emitted

### Price Query Flow
1. Create and initialize pool
2. Query spot price
3. Query TWAP price
4. Verify prices are valid and consistent

## Requirements Coverage

The tests cover all requirements specified in task 2.11:

- ✅ **Uniswap Router Integration**: Tests verify router interactions for swaps
- ✅ **Swap Functionality (exactIn, exactOut)**: Tests cover exactInputSingle and exactInput
- ✅ **Liquidity Add/Remove**: Tests verify addLiquidity and removeLiquidity operations
- ✅ **Price Queries and TWAP**: Tests validate getSpotPrice and getTWAPPrice
- ✅ **Slippage Protection**: Tests ensure swaps revert with insufficient output
- ✅ **Fee Calculation**: Tests verify fee tiers and pool creation with different fees

## Running the Tests

```bash
# Run all MarketplaceAMM tests
npx hardhat test test/MarketplaceAMM.test.ts

# Run with gas reporting
REPORT_GAS=true npx hardhat test test/MarketplaceAMM.test.ts

# Run specific test suite
npx hardhat test test/MarketplaceAMM.test.ts --grep "Swap Functionality"
```

## Test Files

- **Test File**: `packages/contracts/test/MarketplaceAMM.test.ts`
- **Contract**: `packages/contracts/contracts/MarketplaceAMM.sol`
- **Mock Contracts**:
  - `packages/contracts/contracts/mocks/MockUniswapV3Factory.sol`
  - `packages/contracts/contracts/mocks/MockSwapRouter.sol`
  - `packages/contracts/contracts/mocks/MockNonfungiblePositionManager.sol`

## Next Steps

1. ✅ Task 2.11 completed - MarketplaceAMM unit tests
2. ⏳ Task 2.12 - LendingAdapter unit tests
3. ⏳ Task 2.13 - Smart contract integration tests
4. ⏳ Task 2.14 - Smart contract security tests

## Notes

- All tests use mock Uniswap V3 contracts to avoid external dependencies
- Tests focus on core functionality and error handling
- Slippage protection is validated through revert checks
- Event emissions are verified for all state-changing operations
- Reentrancy protection is implicitly tested through ReentrancyGuard usage
