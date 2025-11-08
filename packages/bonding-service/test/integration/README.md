# Bonding Service Integration Tests

This directory contains comprehensive integration tests for the Bonding Service, testing the full bond lifecycle including on-chain interactions, risk assessment, and Oracle Adapter integration.

## Test Coverage

### 1. Contract Integration Tests (`contract_integration_test.go`)

Tests direct interaction with the IPBond smart contract:

- **Bond Issuance**: Tests creating new bonds with proper parameters
- **Investment Flow**: Tests investing in Senior, Mezzanine, and Junior tranches
- **Revenue Distribution**: Tests distributing revenue to bond holders
- **Bond Redemption**: Tests redeeming investments after maturity
- **Bond Info Queries**: Tests retrieving bond and tranche information
- **Error Handling**: Tests various error scenarios
- **Retry Logic**: Tests transaction retry mechanisms
- **Concurrent Operations**: Tests multiple simultaneous investments

### 2. Full Lifecycle Tests (`bond_lifecycle_test.go`)

Tests the complete end-to-end bond lifecycle:

- **Step 1: Risk Assessment**: Uses Risk Engine to assess IP value
- **Step 2: Bond Issuance**: Issues bond based on risk assessment
- **Step 3: Multi-Tranche Investment**: Multiple investors invest in different tranches
- **Step 4: Revenue Distribution**: Distributes revenue with priority-based allocation
- **Step 5: State Verification**: Verifies bond state after operations

Additional test suites:

- **Oracle Integration**: Tests Oracle Adapter health check and valuation
- **Risk Assessment with Oracle**: Tests risk assessment with different IP types
- **Error Recovery**: Tests error handling and recovery mechanisms

## Prerequisites

### Environment Variables

Create a `.env` file in the `packages/bonding-service` directory:

```bash
# Ethereum Configuration
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
IPBOND_CONTRACT_ADDRESS=0x... # Your deployed IPBond contract address
PRIVATE_KEY=... # Your private key (without 0x prefix)

# Oracle Configuration
AI_ORACLE_URL=http://localhost:8000

# Database (optional for integration tests)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/knowton_test?sslmode=disable
```

### Required Services

1. **Arbitrum Sepolia Testnet Access**
   - Get testnet ETH from [Arbitrum Sepolia Faucet](https://faucet.quicknode.com/arbitrum/sepolia)
   - Ensure your account has sufficient balance for gas fees

2. **Deployed IPBond Contract**
   - Deploy the IPBond contract to Arbitrum Sepolia
   - Update `IPBOND_CONTRACT_ADDRESS` in `.env`

3. **Oracle Adapter Service** (Optional)
   - Start the Oracle Adapter service: `cd packages/oracle-adapter && python src/main.py`
   - Service should be running on `http://localhost:8000`

## Running Tests

### Run All Integration Tests

```bash
cd packages/bonding-service
go test -v ./test/integration/... -timeout 30m
```

### Run Specific Test Suite

```bash
# Contract integration tests only
go test -v ./internal/blockchain/contract_integration_test.go -timeout 15m

# Full lifecycle tests only
go test -v ./test/integration/bond_lifecycle_test.go -timeout 15m
```

### Run with Short Mode (Skip Integration Tests)

```bash
go test -v -short ./...
```

### Run Specific Test Case

```bash
go test -v ./test/integration/... -run TestFullBondLifecycle -timeout 15m
go test -v ./test/integration/... -run TestOracleIntegration -timeout 5m
```

## Test Scenarios

### Scenario 1: High-Quality Music IP

- **Category**: Music
- **Age**: 6 months
- **Engagement**: 5,000 views, 500 likes
- **Expected**: High valuation, low risk rating (AA/AAA)

### Scenario 2: New Video Content

- **Category**: Video
- **Age**: 30 days
- **Engagement**: 1,000 views, 100 likes
- **Expected**: Moderate valuation, medium risk rating (BBB/A)

### Scenario 3: Established Software

- **Category**: Software
- **Age**: 2 years
- **Engagement**: 100,000 views, 10,000 likes
- **Expected**: High valuation, low risk rating (AAA)

## Expected Results

### Successful Test Run

```
=== RUN   TestFullBondLifecycle
=== RUN   TestFullBondLifecycle/Step1_AssessIPValue
    Risk Assessment Results:
      Valuation: $15000.00
      Confidence: 0.80
      Risk Rating: AA
      Default Probability: 2.00%
      Recommended LTV: 63.50%
=== RUN   TestFullBondLifecycle/Step2_IssueBond
    Bond issued successfully. TxHash: 0x...
=== RUN   TestFullBondLifecycle/Step3_InvestInTranches
=== RUN   TestFullBondLifecycle/Step3_InvestInTranches/SeniorInvestment
    Senior investment successful. TxHash: 0x...
=== RUN   TestFullBondLifecycle/Step3_InvestInTranches/MezzanineInvestment
    Mezzanine investment successful. TxHash: 0x...
=== RUN   TestFullBondLifecycle/Step3_InvestInTranches/JuniorInvestment
    Junior investment successful. TxHash: 0x...
=== RUN   TestFullBondLifecycle/Step4_DistributeRevenue
    Revenue distributed successfully. TxHash: 0x...
=== RUN   TestFullBondLifecycle/Step5_VerifyBondState
    Bond State:
      NFT Contract: 0x1234567890123456789012345678901234567890
      Issuer: 0x...
      Total Value: 1000000000000000000
      Total Revenue: 50000000000000000
      Status: 0
--- PASS: TestFullBondLifecycle (45.23s)
```

## Troubleshooting

### Common Issues

1. **"ARBITRUM_RPC_URL not set"**
   - Ensure `.env` file exists and contains valid RPC URL
   - Load environment variables: `source .env`

2. **"Insufficient funds for gas"**
   - Get testnet ETH from faucet
   - Check balance: `cast balance <your-address> --rpc-url $ARBITRUM_RPC_URL`

3. **"Transaction failed"**
   - Check contract is deployed correctly
   - Verify contract address in `.env`
   - Check transaction revert reason in block explorer

4. **"Oracle service returned error"**
   - Ensure Oracle Adapter is running
   - Check Oracle service health: `curl http://localhost:8000/health`
   - Review Oracle service logs

5. **"Context deadline exceeded"**
   - Increase test timeout: `-timeout 30m`
   - Check network connectivity
   - Verify RPC endpoint is responsive

### Debug Mode

Enable verbose logging:

```bash
export LOG_LEVEL=debug
go test -v ./test/integration/... -timeout 30m
```

## Performance Benchmarks

Expected execution times (Arbitrum Sepolia):

- Bond Issuance: ~5-10 seconds
- Investment: ~3-5 seconds per transaction
- Revenue Distribution: ~5-8 seconds
- Bond Info Query: <1 second
- Full Lifecycle Test: ~45-60 seconds

## Gas Usage

Typical gas consumption (Arbitrum Sepolia):

- `issueBond()`: ~300,000 gas
- `invest()`: ~150,000 gas
- `distributeRevenue()`: ~200,000 gas
- `redeem()`: ~180,000 gas

## Continuous Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# .github/workflows/bonding-service-tests.yml
name: Bonding Service Integration Tests

on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Run Integration Tests
        env:
          ARBITRUM_RPC_URL: ${{ secrets.ARBITRUM_RPC_URL }}
          IPBOND_CONTRACT_ADDRESS: ${{ secrets.IPBOND_CONTRACT_ADDRESS }}
          PRIVATE_KEY: ${{ secrets.PRIVATE_KEY }}
          AI_ORACLE_URL: ${{ secrets.AI_ORACLE_URL }}
        run: |
          cd packages/bonding-service
          go test -v ./test/integration/... -timeout 30m
```

## Contributing

When adding new integration tests:

1. Follow existing test structure and naming conventions
2. Add proper error handling and assertions
3. Include descriptive log messages
4. Update this README with new test scenarios
5. Ensure tests are idempotent and can run independently

## References

- [IPBond Contract Documentation](../../contracts/docs/IPBOND_QUICK_START.md)
- [Risk Engine Documentation](../internal/risk/README.md)
- [Oracle Adapter API](../../oracle-adapter/README.md)
- [Arbitrum Sepolia Testnet](https://docs.arbitrum.io/for-devs/concepts/public-chains)
