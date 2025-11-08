# Integration Tests

Comprehensive integration tests for the KnowTon platform microservices.

## Overview

These tests verify:
- **Microservice Communication**: REST API communication between services
- **Kafka Event Flow**: Event publishing, consumption, and ordering
- **Data Consistency**: Cross-database consistency (PostgreSQL, MongoDB, ClickHouse, Redis, Elasticsearch)
- **Service Resilience**: Retry mechanisms, circuit breakers, timeouts
- **API Integration**: End-to-end API workflows

## Test Files

### 1. `api-integration.test.ts`
Tests API endpoints and service integration:
- Health checks for all services
- Creator service registration and profile management
- Content upload and NFT minting workflows
- Marketplace order placement and order book
- Fractionalization and staking
- Analytics and reporting
- Cross-service data consistency
- Error handling and rate limiting

### 2. `kafka-events.test.ts`
Tests Kafka event-driven architecture:
- Event publishing and consumption
- Event ordering and partitioning
- Event replay and recovery
- Schema validation
- Dead letter queue handling
- Consumer groups and lag monitoring
- Event idempotency and batching

### 3. `data-consistency.test.ts`
Tests data consistency across services:
- PostgreSQL ↔ MongoDB consistency
- PostgreSQL ↔ ClickHouse consistency
- Kafka event-driven consistency
- Redis cache consistency
- Elasticsearch index consistency
- Eventual consistency verification
- Referential integrity checks

### 4. `service-communication.test.ts`
Tests microservice communication patterns:
- Service discovery and health checks
- Inter-service dependencies
- Request validation and sanitization
- Retry mechanisms and circuit breakers
- Timeout handling
- Load balancing
- Authentication and authorization

## Prerequisites

### Required Services

All services must be running before executing tests:

```bash
# Start all services with Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Or use the dev start script
./scripts/dev-start.sh
```

Required services:
- PostgreSQL (port 5432)
- MongoDB (port 27017)
- Redis (port 6379)
- Kafka (port 9092)
- ClickHouse (port 8123)
- Elasticsearch (port 9200)
- Backend API (port 3000)

### Environment Variables

Configure test environment in `.env.test` or set directly:

```bash
# API Configuration
API_BASE_URL=http://localhost:3000

# Kafka Configuration
KAFKA_BROKERS=localhost:9092

# Database Configuration
POSTGRES_URL=postgresql://localhost:5432/knowton_test
MONGODB_URL=mongodb://localhost:27017/knowton_test
REDIS_URL=redis://localhost:6379
CLICKHOUSE_URL=http://localhost:8123
ELASTICSEARCH_URL=http://localhost:9200
```

## Running Tests

### Run All Integration Tests

```bash
# From project root
npm run test:integration

# Or with Jest directly
cd tests/integration
npx jest
```

### Run Specific Test Suite

```bash
# API integration tests
npx jest api-integration.test.ts

# Kafka event tests
npx jest kafka-events.test.ts

# Data consistency tests
npx jest data-consistency.test.ts

# Service communication tests
npx jest service-communication.test.ts
```

### Run with Coverage

```bash
npx jest --coverage
```

### Run in Watch Mode

```bash
npx jest --watch
```

### Run with Verbose Output

```bash
npx jest --verbose
```

## Test Configuration

### Jest Configuration

See `jest.config.js` for test configuration:
- Timeout: 30 seconds per test
- Max workers: 1 (sequential execution)
- Coverage directory: `../../coverage/integration`

### Test Setup

See `setup.ts` for global test setup:
- Environment variable configuration
- Global utility functions
- Console mocking
- Test data cleanup

## Writing New Tests

### Test Structure

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';

describe('My Integration Test Suite', () => {
  let api: AxiosInstance;

  beforeAll(() => {
    api = axios.create({
      baseURL: process.env.API_BASE_URL,
      timeout: 30000,
      validateStatus: () => true, // Don't throw on any status
    });
  });

  describe('Feature Tests', () => {
    it('should test feature', async () => {
      const response = await api.get('/api/v1/endpoint');
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
      } else {
        console.warn('Feature not available');
      }
    });
  });
});
```

### Best Practices

1. **Graceful Degradation**: Tests should handle service unavailability gracefully
2. **Idempotency**: Tests should be idempotent and not depend on execution order
3. **Cleanup**: Clean up test data after tests complete
4. **Timeouts**: Use appropriate timeouts for async operations
5. **Logging**: Log important information for debugging
6. **Assertions**: Use meaningful assertions with clear error messages

### Handling Service Unavailability

```typescript
it('should handle service unavailability', async () => {
  const response = await api.get('/api/v1/service');
  
  if (response.status === 503) {
    console.warn('Service not available - skipping test');
    return;
  }
  
  expect(response.status).toBe(200);
});
```

### Testing Eventual Consistency

```typescript
it('should achieve eventual consistency', async () => {
  // Create data
  const createResponse = await api.post('/api/v1/data', testData);
  
  if (createResponse.status === 201) {
    const dataId = createResponse.data.id;
    
    // Wait for consistency
    const consistent = await waitForCondition(async () => {
      const checkResponse = await api.get(`/api/v1/data/${dataId}`);
      return checkResponse.status === 200;
    }, 10000, 500);
    
    expect(consistent).toBe(true);
  }
});
```

## Troubleshooting

### Tests Timing Out

- Increase timeout in `jest.config.js`
- Check if services are running
- Verify network connectivity

### Kafka Tests Failing

- Ensure Kafka is running: `docker ps | grep kafka`
- Check Kafka broker configuration
- Verify topic creation

### Database Connection Errors

- Check database connection strings
- Verify databases are running
- Check database credentials

### Inconsistent Test Results

- Run tests sequentially: `maxWorkers: 1`
- Add delays between tests
- Clean up test data between runs

## CI/CD Integration

### GitHub Actions

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
      
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
      
      redis:
        image: redis:7
        ports:
          - 6379:6379
      
      kafka:
        image: confluentinc/cp-kafka:latest
        ports:
          - 9092:9092
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          API_BASE_URL: http://localhost:3000
          KAFKA_BROKERS: localhost:9092
```

## Metrics and Reporting

### Test Coverage

View coverage report:
```bash
npx jest --coverage
open coverage/integration/index.html
```

### Test Results

Test results are saved to:
- `test-results.json`: JSON format
- `junit.xml`: JUnit XML format (for CI/CD)

## Performance Benchmarks

Expected test execution times:
- API Integration Tests: ~2-3 minutes
- Kafka Event Tests: ~1-2 minutes
- Data Consistency Tests: ~3-4 minutes
- Service Communication Tests: ~1-2 minutes

Total: ~7-11 minutes for full suite

## Support

For issues or questions:
1. Check service logs: `docker-compose logs -f`
2. Verify service health: `curl http://localhost:3000/api/v1/health`
3. Review test output for specific errors
4. Check this README for troubleshooting tips


## New End-to-End Test Suites

### 5. `nft-minting-e2e.test.ts`
Complete NFT minting flow testing:
- Content upload to IPFS
- AI fingerprint generation
- Smart contract minting transaction
- Metadata storage and indexing
- Kafka event publishing
- **Requirements**: 2.1, 2.2, 2.3, 2.4, 2.5

### 6. `marketplace-trading-e2e.test.ts`
Trading and marketplace flow testing:
- Order book creation and matching
- On-chain transaction execution
- WebSocket real-time updates
- Trading history recording
- **Requirements**: 6.1, 6.2, 6.3, 6.4, 6.5

### 7. `fractionalization-e2e.test.ts`
NFT fractionalization flow testing:
- NFT locking to vault
- ERC-20 token minting
- Liquidity pool creation
- Redemption voting mechanism
- **Requirements**: 4.1, 4.2, 4.3, 4.4, 4.5

### 8. `royalty-distribution-e2e.test.ts`
Royalty distribution flow testing:
- Royalty event listening
- Automatic distribution execution
- Multi-beneficiary distribution
- Withdrawal functionality
- **Requirements**: 7.1, 7.2, 7.3, 7.4, 7.5

### 9. `bonding-e2e.test.ts`
Bond issuance flow testing:
- Bond issuance
- Tranche investment
- Yield distribution
- Bond redemption
- **Requirements**: 12.1, 12.2, 12.3, 12.4, 12.5

### 10. `error-handling-e2e.test.ts`
Error handling and edge cases:
- Network error retry
- Transaction failure rollback
- Concurrent request handling
- Input validation and sanitization
- Rate limiting enforcement
- **Requirements**: Security requirements

## Running End-to-End Tests

```bash
# Run all E2E tests
npx jest --testMatch="**/*-e2e.test.ts"

# Run specific E2E test
npx jest nft-minting-e2e.test.ts

# Run with extended timeout (for blockchain operations)
npx jest --testTimeout=60000 nft-minting-e2e.test.ts
```

## E2E Test Features

- **Complete Flow Coverage**: Tests entire user journeys from start to finish
- **Multi-System Validation**: Verifies data consistency across all systems
- **Event Verification**: Confirms Kafka events are published correctly
- **WebSocket Testing**: Tests real-time updates via WebSocket
- **Blockchain Integration**: Tests smart contract interactions
- **Error Scenarios**: Tests error handling and edge cases

## Additional Dependencies

The E2E tests require:
- `ws` - WebSocket client for testing real-time updates
- `form-data` - For file upload testing
- All existing integration test dependencies

Install with:
```bash
npm install --save-dev ws @types/ws form-data @types/form-data
```
