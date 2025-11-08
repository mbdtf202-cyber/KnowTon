# Integration Tests Quick Start Guide

## Prerequisites Check

Before running tests, verify all services are running:

```bash
# Check if services are running
docker ps | grep -E "postgres|mongo|redis|kafka|clickhouse"

# Or start all services
docker-compose -f docker-compose.dev.yml up -d

# Check API health
curl http://localhost:3000/api/v1/health
```

## Quick Test Commands

### Run All Tests
```bash
npm run test:integration
```

### Run Specific Test Suites

```bash
# NFT Minting Flow
npx jest nft-minting-e2e.test.ts

# Marketplace Trading Flow
npx jest marketplace-trading-e2e.test.ts

# Fractionalization Flow
npx jest fractionalization-e2e.test.ts

# Royalty Distribution Flow
npx jest royalty-distribution-e2e.test.ts

# Bonding Flow
npx jest bonding-e2e.test.ts

# Error Handling
npx jest error-handling-e2e.test.ts

# Data Consistency
npx jest data-consistency.test.ts
```

### Run by Pattern

```bash
# Run all E2E tests
npx jest --testMatch="**/*-e2e.test.ts"

# Run all tests with "NFT" in the name
npx jest --testNamePattern="NFT"

# Run all tests with "marketplace" in the name
npx jest --testNamePattern="marketplace"
```

## Environment Setup

### Option 1: Use .env file
Create `tests/integration/.env`:
```bash
API_BASE_URL=http://localhost:3000
WS_URL=ws://localhost:3000
KAFKA_BROKERS=localhost:9092
POSTGRES_URL=postgresql://localhost:5432/knowton_test
MONGODB_URL=mongodb://localhost:27017/knowton_test
REDIS_URL=redis://localhost:6379
CLICKHOUSE_URL=http://localhost:8123
```

### Option 2: Export variables
```bash
export API_BASE_URL=http://localhost:3000
export WS_URL=ws://localhost:3000
export KAFKA_BROKERS=localhost:9092
```

## Common Issues

### Issue: Tests timeout
**Solution**: Increase timeout or check if services are running
```bash
# Run with longer timeout
npx jest --testTimeout=90000

# Check service status
docker-compose ps
```

### Issue: Kafka tests skipped
**Solution**: Ensure Kafka is running
```bash
# Check Kafka
docker ps | grep kafka

# Restart Kafka
docker-compose restart kafka
```

### Issue: Database connection errors
**Solution**: Verify database URLs and credentials
```bash
# Test PostgreSQL connection
psql postgresql://localhost:5432/knowton_test

# Test MongoDB connection
mongosh mongodb://localhost:27017/knowton_test
```

### Issue: API not responding
**Solution**: Check if backend is running
```bash
# Check backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

## Test Output

### Successful Test Output
```
✓ Content uploaded to IPFS: QmTest123...
✓ AI fingerprint generated: abc123...
✓ NFT minted - Token ID: 123, TX: 0x...
✓ NFT metadata stored in database
✓ NFT_MINTED event published to Kafka
✓ NFT Minting Flow Complete
```

### Failed Test Output
```
✗ Content upload returned status 500
  Expected: 201
  Received: 500
```

## Debugging

### Enable Verbose Output
```bash
npx jest --verbose
```

### Run Single Test
```bash
npx jest -t "should upload content to IPFS"
```

### Watch Mode
```bash
npx jest --watch
```

### Coverage Report
```bash
npx jest --coverage
open coverage/integration/index.html
```

## Performance Tips

### Run Tests Sequentially
```bash
npx jest --maxWorkers=1
```

### Run Specific Test File Only
```bash
npx jest nft-minting-e2e.test.ts --maxWorkers=1
```

### Skip Slow Tests
```bash
npx jest --testPathIgnorePatterns="e2e"
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Integration Tests
  run: npm run test:integration
  env:
    API_BASE_URL: http://localhost:3000
    KAFKA_BROKERS: localhost:9092
```

## Test Data Cleanup

Tests use unique identifiers to avoid conflicts:
- Wallet addresses: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
- Content hashes: `QmTest${Date.now()}`
- Token IDs: Generated dynamically

No manual cleanup required between test runs.

## Next Steps

1. ✅ Verify all services are running
2. ✅ Set environment variables
3. ✅ Run `npm run test:integration`
4. ✅ Review test output
5. ✅ Fix any failing tests
6. ✅ Proceed to load testing (Task 17.3)

## Support

For issues:
1. Check service logs: `docker-compose logs -f`
2. Verify service health: `curl http://localhost:3000/api/v1/health`
3. Review test output for specific errors
4. Check README.md for detailed troubleshooting

## Test Coverage Summary

- ✅ NFT Minting (10 tests)
- ✅ Marketplace Trading (12 tests)
- ✅ Fractionalization (11 tests)
- ✅ Royalty Distribution (13 tests)
- ✅ Bonding (4 tests)
- ✅ Error Handling (8 tests)
- ✅ Data Consistency (15+ tests)

**Total**: 70+ integration tests covering all major flows
