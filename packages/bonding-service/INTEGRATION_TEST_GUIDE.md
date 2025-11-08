# Bonding Service Integration Test Guide

This guide provides step-by-step instructions for running the Bonding Service integration tests.

## Quick Start

### 1. Prerequisites

- Go 1.21 or higher
- Access to Arbitrum Sepolia testnet
- Deployed IPBond contract
- (Optional) Running Oracle Adapter service

### 2. Setup Environment

Create a `.env` file in `packages/bonding-service/`:

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your values
nano .env
```

Required environment variables:

```bash
# Arbitrum Sepolia RPC URL
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# Deployed IPBond contract address
IPBOND_CONTRACT_ADDRESS=0x... # Your contract address

# Private key for signing transactions (without 0x prefix)
PRIVATE_KEY=... # Your private key

# Oracle Adapter URL (optional, defaults to http://localhost:8000)
AI_ORACLE_URL=http://localhost:8000
```

### 3. Get Testnet ETH

Get Arbitrum Sepolia testnet ETH from a faucet:
- [Arbitrum Faucet](https://faucet.quicknode.com/arbitrum/sepolia)
- [Chainlink Faucet](https://faucets.chain.link/arbitrum-sepolia)

Verify your balance:
```bash
# Using cast (from Foundry)
cast balance <your-address> --rpc-url $ARBITRUM_RPC_URL
```

### 4. Deploy IPBond Contract (if not already deployed)

```bash
cd packages/contracts
npx hardhat run scripts/deploy.ts --network arbitrumSepolia
```

Copy the deployed contract address to your `.env` file.

### 5. Start Oracle Adapter (Optional)

```bash
cd packages/oracle-adapter
python src/main.py
```

Verify it's running:
```bash
curl http://localhost:8000/health
```

### 6. Run Integration Tests

```bash
cd packages/bonding-service

# Run all integration tests
make test-integration

# Or run specific test suites
make test-integration-contract    # Contract tests only
make test-integration-lifecycle   # Full lifecycle tests only
```

## Test Suites

### Contract Integration Tests

Tests direct smart contract interactions:

```bash
make test-integration-contract
```

**What it tests:**
- Bond issuance
- Investments in all tranches (Senior, Mezzanine, Junior)
- Revenue distribution
- Bond redemption
- Error handling
- Retry logic
- Concurrent operations

**Expected duration:** ~5-10 minutes

### Full Lifecycle Tests

Tests the complete bond lifecycle with risk assessment:

```bash
make test-integration-lifecycle
```

**What it tests:**
- Risk assessment with Oracle integration
- Bond issuance based on risk assessment
- Multi-investor participation
- Revenue distribution with priority
- Bond state verification
- Error recovery mechanisms

**Expected duration:** ~10-15 minutes

## Troubleshooting

### Issue: "ARBITRUM_RPC_URL not set"

**Solution:**
```bash
# Load environment variables
source .env

# Or export manually
export ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
export IPBOND_CONTRACT_ADDRESS=0x...
export PRIVATE_KEY=...
```

### Issue: "Insufficient funds for gas"

**Solution:**
1. Get testnet ETH from faucet
2. Verify balance: `cast balance <address> --rpc-url $ARBITRUM_RPC_URL`
3. Ensure you have at least 0.1 ETH for testing

### Issue: "Transaction failed"

**Possible causes:**
1. Contract not deployed or wrong address
2. Insufficient gas
3. Invalid parameters

**Debug steps:**
```bash
# Check contract exists
cast code $IPBOND_CONTRACT_ADDRESS --rpc-url $ARBITRUM_RPC_URL

# Check your balance
cast balance <your-address> --rpc-url $ARBITRUM_RPC_URL

# Enable debug logging
export LOG_LEVEL=debug
make test-integration
```

### Issue: "Oracle service returned error"

**Solution:**
1. Check Oracle service is running: `curl http://localhost:8000/health`
2. Check Oracle logs for errors
3. Tests will fallback to rule-based valuation if Oracle is unavailable

### Issue: "Context deadline exceeded"

**Solution:**
1. Increase timeout: `go test -v ./test/integration/... -timeout 45m`
2. Check network connectivity
3. Try a different RPC endpoint

## Test Output Examples

### Successful Test Run

```
=== RUN   TestFullBondLifecycle
=== RUN   TestFullBondLifecycle/Step1_AssessIPValue
    bond_lifecycle_test.go:89: Risk Assessment Results:
    bond_lifecycle_test.go:90:   Valuation: $15000.00
    bond_lifecycle_test.go:91:   Confidence: 0.80
    bond_lifecycle_test.go:92:   Risk Rating: AA
    bond_lifecycle_test.go:93:   Default Probability: 2.00%
    bond_lifecycle_test.go:94:   Recommended LTV: 63.50%
=== RUN   TestFullBondLifecycle/Step2_IssueBond
    bond_lifecycle_test.go:125: Bond issued successfully. TxHash: 0xabc123...
=== RUN   TestFullBondLifecycle/Step3_InvestInTranches
=== RUN   TestFullBondLifecycle/Step3_InvestInTranches/SeniorInvestment
    bond_lifecycle_test.go:143: Senior investment successful. TxHash: 0xdef456...
=== RUN   TestFullBondLifecycle/Step3_InvestInTranches/MezzanineInvestment
    bond_lifecycle_test.go:155: Mezzanine investment successful. TxHash: 0xghi789...
=== RUN   TestFullBondLifecycle/Step3_InvestInTranches/JuniorInvestment
    bond_lifecycle_test.go:167: Junior investment successful. TxHash: 0xjkl012...
=== RUN   TestFullBondLifecycle/Step4_DistributeRevenue
    bond_lifecycle_test.go:183: Revenue distributed successfully. TxHash: 0xmno345...
=== RUN   TestFullBondLifecycle/Step5_VerifyBondState
    bond_lifecycle_test.go:199: Bond State:
    bond_lifecycle_test.go:200:   NFT Contract: 0x1234567890123456789012345678901234567890
    bond_lifecycle_test.go:201:   Issuer: 0x...
    bond_lifecycle_test.go:202:   Total Value: 1000000000000000000
    bond_lifecycle_test.go:203:   Total Revenue: 50000000000000000
    bond_lifecycle_test.go:204:   Status: 0
--- PASS: TestFullBondLifecycle (45.23s)
PASS
ok      github.com/knowton/bonding-service/test/integration     45.234s
```

## Performance Metrics

### Expected Gas Usage

| Operation | Gas Used | Cost (at 0.1 Gwei) |
|-----------|----------|-------------------|
| Issue Bond | ~300,000 | ~0.00003 ETH |
| Invest | ~150,000 | ~0.000015 ETH |
| Distribute Revenue | ~200,000 | ~0.00002 ETH |
| Redeem | ~180,000 | ~0.000018 ETH |

### Expected Execution Times

| Test Suite | Duration |
|------------|----------|
| Contract Integration | 5-10 minutes |
| Full Lifecycle | 10-15 minutes |
| All Integration Tests | 15-25 minutes |

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Bonding Service Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Install dependencies
        working-directory: packages/bonding-service
        run: go mod download
      
      - name: Run Integration Tests
        working-directory: packages/bonding-service
        env:
          ARBITRUM_RPC_URL: ${{ secrets.ARBITRUM_RPC_URL }}
          IPBOND_CONTRACT_ADDRESS: ${{ secrets.IPBOND_CONTRACT_ADDRESS }}
          PRIVATE_KEY: ${{ secrets.PRIVATE_KEY }}
          AI_ORACLE_URL: ${{ secrets.AI_ORACLE_URL }}
        run: make test-integration
```

## Best Practices

1. **Run unit tests first**: `make test-unit` (fast, no external dependencies)
2. **Run integration tests before deployment**: Catch issues early
3. **Monitor gas usage**: Optimize contracts if gas usage is too high
4. **Keep testnet ETH**: Maintain sufficient balance for regular testing
5. **Use separate test accounts**: Don't use production keys for testing
6. **Review transaction logs**: Check Arbiscan for detailed transaction info

## Additional Resources

- [IPBond Contract Documentation](../contracts/docs/IPBOND_QUICK_START.md)
- [Arbitrum Sepolia Explorer](https://sepolia.arbiscan.io/)
- [Arbitrum Documentation](https://docs.arbitrum.io/)
- [Go Testing Documentation](https://golang.org/pkg/testing/)

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review test logs for error messages
3. Check Arbiscan for transaction details
4. Open an issue on GitHub with:
   - Error message
   - Test output
   - Transaction hash (if applicable)
   - Environment details
