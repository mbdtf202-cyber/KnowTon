# KnowTon Platform Load Testing Suite

This directory contains comprehensive load testing scripts for the KnowTon platform using K6, implementing **Task 17.3: 进行负载测试**.

## 📋 Overview

The load testing suite includes:

1. **API Load Test** (Task 17.3.1) - Tests API performance under various load conditions
2. **Database Load Test** (Task 17.3.2) - Tests database query performance
3. **Stress Test** (Task 17.3.3) - Finds system breaking points
4. **Soak Test** (Task 17.3.4) - Tests long-term stability
5. **Performance Report Generator** (Task 17.3.5) - Generates comprehensive reports

## 🚀 Quick Start

### Prerequisites

Install K6:

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### Run All Tests

```bash
# Run all tests (skip soak test by default)
./tests/load/run-all-tests.sh

# Run all tests including soak test (24 hours)
SKIP_SOAK=false ./tests/load/run-all-tests.sh

# Run with custom soak test duration (1 hour)
SKIP_SOAK=false SOAK_TEST_HOURS=1 ./tests/load/run-all-tests.sh

# Run with custom API URL
API_BASE_URL=http://production-api.com ./tests/load/run-all-tests.sh
```

## 📊 Test Details

### 1. API Load Test (Task 17.3.1)

Tests API performance with multiple concurrent scenarios:

- **NFT Minting API**: 100 concurrent users
- **Marketplace Query API**: 500 concurrent users
- **Trading API**: 200 concurrent users
- **Analytics API**: 300 concurrent users

**Run individually:**
```bash
k6 run --env API_BASE_URL=http://localhost:3000 tests/load/api-load-test.js
```

**Thresholds:**
- P95 latency < 1000ms
- P99 latency < 2000ms
- Error rate < 5%

**Endpoints tested:**
- `/api/v1/content/upload` - Content upload
- `/api/v1/marketplace/nfts` - NFT listing
- `/api/v1/marketplace/search` - Search functionality
- `/api/v1/marketplace/orderbook/:id` - Order book queries
- `/api/v1/marketplace/trades/:id` - Trading history
- `/api/v1/analytics/stats` - Platform statistics
- `/api/v1/analytics/trending` - Trending NFTs

### 2. Database Load Test (Task 17.3.2)

Tests database performance across all data stores:

- **PostgreSQL**: Read/Write operations (150 concurrent)
- **MongoDB**: Query operations (120 concurrent)
- **ClickHouse**: Analytics queries (100 concurrent)
- **Redis**: Cache operations (300 concurrent)

**Run individually:**
```bash
k6 run --env API_BASE_URL=http://localhost:3000 tests/load/database-load-test.js
```

**Thresholds:**
- PostgreSQL Read: P95 < 200ms
- PostgreSQL Write: P95 < 300ms
- MongoDB Query: P95 < 250ms
- ClickHouse Query: P95 < 1000ms
- Redis Cache Hit Rate: > 80%

**Operations tested:**
- Complex JOIN queries
- Aggregation pipelines
- Full-text search
- Time-series queries
- Cache hit/miss scenarios

### 3. Stress Test (Task 17.3.3)

Finds the system breaking point by gradually increasing load:

**Load stages:**
1. Baseline: 50 users (2 min)
2. Moderate: 100 users (3 min)
3. High: 200 users (3 min)
4. Very High: 300 users (3 min)
5. Extreme: 400 users (3 min)
6. Beyond Capacity: 500 users (3 min)
7. Critical: 600 users (3 min)
8. Recovery: Ramp down (2 min)

**Run individually:**
```bash
k6 run --env API_BASE_URL=http://localhost:3000 tests/load/stress-test.js
```

**Objectives:**
- Identify system capacity limits
- Test HPA (Horizontal Pod Autoscaler) effectiveness
- Measure recovery time
- Document breaking points

### 4. Soak Test (Task 17.3.4)

Tests long-term stability and detects memory leaks:

**Duration:** 24 hours (configurable)
**Load:** 50 concurrent users (sustained)

**Run individually:**
```bash
# 24-hour test
k6 run --env API_BASE_URL=http://localhost:3000 tests/load/soak-test.js

# 1-hour test (for testing)
k6 run --env API_BASE_URL=http://localhost:3000 --env SOAK_TEST_HOURS=1 tests/load/soak-test.js
```

**Monitors:**
- Memory leak indicators
- Performance degradation over time
- Error rate trends
- Connection stability
- Resource cleanup

**Alerts triggered when:**
- Latency increases by > 50% from baseline
- Memory leak indicators detected
- Error rate exceeds 5%

### 5. Performance Report Generator (Task 17.3.5)

Generates comprehensive performance reports from all test results:

**Run:**
```bash
node tests/load/generate-performance-report.js
```

**Report includes:**
- Executive summary
- Test results for all scenarios
- Bottleneck identification
- Performance recommendations
- Optimization plan (P0, P1, P2)
- Performance baseline comparison
- Trend analysis

**Output:**
- `reports/performance-report.md` - Markdown report
- `reports/performance-baseline.json` - Baseline for future comparisons

## 📈 Interpreting Results

### Key Metrics

1. **http_req_duration**
   - `p(95)`: 95% of requests completed within this time
   - `p(99)`: 99% of requests completed within this time
   - `avg`: Average request duration
   - `max`: Maximum request duration

2. **http_req_failed**
   - `rate`: Percentage of failed requests
   - Should be < 5% under normal load

3. **http_reqs**
   - `count`: Total number of requests
   - `rate`: Requests per second (throughput)

4. **Custom Metrics**
   - `nft_mint_latency`: NFT minting endpoint latency
   - `marketplace_latency`: Marketplace query latency
   - `trading_latency`: Trading operation latency
   - `analytics_latency`: Analytics query latency
   - `redis_cache_hit_rate`: Cache effectiveness
   - `slow_queries`: Number of slow database queries

### Performance Thresholds

| Test Type | Metric | Threshold | Status |
|-----------|--------|-----------|--------|
| API Load | P95 Latency | < 1000ms | ✅ Pass |
| API Load | Error Rate | < 5% | ✅ Pass |
| Database | PostgreSQL Read | < 200ms | ✅ Pass |
| Database | Redis Cache Hit | > 80% | ✅ Pass |
| Stress | Max Users | ≥ 500 | ✅ Pass |
| Soak | Memory Leaks | 0 | ✅ Pass |

### Bottleneck Identification

Common bottlenecks and solutions:

1. **High API Latency**
   - Check database query performance
   - Review cache hit rates
   - Optimize slow endpoints

2. **Database Slow Queries**
   - Add missing indexes
   - Optimize complex queries
   - Implement query caching

3. **Low Cache Hit Rate**
   - Increase cache TTL
   - Review cache invalidation strategy
   - Pre-warm cache for popular items

4. **System Breakpoint**
   - Scale horizontally (add instances)
   - Optimize resource-intensive operations
   - Review HPA configuration

5. **Memory Leaks**
   - Analyze heap dumps
   - Check for unclosed connections
   - Review event listener cleanup

## 📁 Report Files

After running tests, reports are generated in `tests/load/reports/`:

```
reports/
├── api-load-test-2025-11-08T12-00-00.html
├── api-load-test-2025-11-08T12-00-00.json
├── database-load-test-2025-11-08T12-15-00.html
├── database-load-test-2025-11-08T12-15-00.json
├── stress-test-2025-11-08T12-30-00.html
├── stress-test-2025-11-08T12-30-00.json
├── soak-test-2025-11-08T12-45-00.html
├── soak-test-2025-11-08T12-45-00.json
├── performance-report.md
└── performance-baseline.json
```

## 🔧 Configuration

### Environment Variables

- `API_BASE_URL`: Target API URL (default: `http://localhost:3000`)
- `TEST_TOKEN`: Authentication token for protected endpoints
- `SKIP_SOAK`: Skip soak test (default: `false`)
- `SOAK_TEST_HOURS`: Soak test duration in hours (default: `24`)

### Custom Thresholds

Edit the test files to customize thresholds:

```javascript
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};
```

## 🚨 Troubleshooting

### High Error Rates

```bash
# Check API logs
docker logs knowton-backend

# Check database connections
docker ps | grep postgres

# Review rate limiting
curl -I http://localhost:3000/api/v1/health
```

### High Latency

```bash
# Analyze slow queries
docker exec -it knowton-postgres psql -U postgres -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check cache hit rates
docker exec -it knowton-redis redis-cli INFO stats

# Review API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/v1/health
```

### Memory Leaks

```bash
# Monitor memory usage
docker stats knowton-backend

# Check for unclosed connections
docker exec -it knowton-postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Review application logs
docker logs knowton-backend | grep -i "memory\|leak\|heap"
```

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday at 2 AM
  workflow_dispatch:

jobs:
  load-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Start services
        run: docker-compose up -d
      
      - name: Run load tests
        run: |
          SKIP_SOAK=true ./tests/load/run-all-tests.sh
      
      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: load-test-reports
          path: tests/load/reports/
```

## 📚 Best Practices

1. **Start Small**: Begin with low load and gradually increase
2. **Monitor Resources**: Watch CPU, memory, and database metrics during tests
3. **Test Realistic Scenarios**: Use production-like data and patterns
4. **Run Regularly**: Include in CI/CD pipeline for continuous monitoring
5. **Analyze Trends**: Compare results over time using baseline
6. **Test Different Endpoints**: Cover all critical user paths
7. **Consider Peak Hours**: Test during expected peak traffic times
8. **Document Findings**: Keep performance reports for future reference

## 📖 Additional Resources

- [K6 Documentation](https://k6.io/docs/)
- [K6 Examples](https://k6.io/docs/examples/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/)
- [K6 Cloud](https://k6.io/cloud/) - For distributed load testing

## 🤝 Contributing

When adding new load tests:

1. Follow the existing test structure
2. Add appropriate thresholds
3. Include detailed comments
4. Update this README
5. Add test to `run-all-tests.sh`
6. Update performance report generator

## 📝 License

Part of the KnowTon Platform - See main LICENSE file
