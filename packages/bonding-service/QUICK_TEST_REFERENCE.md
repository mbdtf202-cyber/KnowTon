# Bonding Service Integration Tests - Quick Reference

## Setup (One-Time)

```bash
# 1. Navigate to bonding service
cd packages/bonding-service

# 2. Create environment file
cp .env.example .env

# 3. Edit .env with your values
nano .env

# Required values:
# ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
# IPBOND_CONTRACT_ADDRESS=0x...
# PRIVATE_KEY=...
# AI_ORACLE_URL=http://localhost:8000 (optional)

# 4. Get testnet ETH
# Visit: https://faucet.quicknode.com/arbitrum/sepolia
```

## Running Tests

```bash
# All integration tests (15-25 min)
make test-integration

# Contract tests only (5-10 min)
make test-integration-contract

# Lifecycle tests only (10-15 min)
make test-integration-lifecycle

# Unit tests only (fast)
make test-unit
```

## Test Coverage

### Contract Integration Tests
- ✅ Bond issuance
- ✅ Multi-tranche investment
- ✅ Revenue distribution
- ✅ Bond redemption
- ✅ Error handling
- ✅ Retry logic

### Lifecycle Tests
- ✅ Risk assessment
- ✅ Oracle integration
- ✅ End-to-end workflow
- ✅ State verification
- ✅ Error recovery

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "RPC URL not set" | Create `.env` file |
| "Insufficient funds" | Get testnet ETH from faucet |
| "Transaction failed" | Check contract address |
| "Oracle error" | Tests use fallback valuation |
| "Timeout" | Increase timeout or check network |

## Expected Results

```
✅ Bond issued successfully
✅ Senior investment successful
✅ Mezzanine investment successful
✅ Junior investment successful
✅ Revenue distributed successfully
✅ Bond state verified

PASS: TestFullBondLifecycle (45.23s)
```

## Gas Costs (Arbitrum Sepolia)

| Operation | Gas | Cost @ 0.1 Gwei |
|-----------|-----|-----------------|
| Issue Bond | 300k | 0.00003 ETH |
| Invest | 150k | 0.000015 ETH |
| Distribute | 200k | 0.00002 ETH |

## Files

- `internal/blockchain/contract_integration_test.go` - Contract tests
- `test/integration/bond_lifecycle_test.go` - Lifecycle tests
- `internal/blockchain/retry.go` - Retry logic
- `INTEGRATION_TEST_GUIDE.md` - Full guide
- `test/integration/README.md` - Detailed docs

## Need Help?

1. Check `INTEGRATION_TEST_GUIDE.md` for detailed instructions
2. Review `test/integration/README.md` for test documentation
3. See `TASK_8.2_COMPLETION.md` for implementation details
