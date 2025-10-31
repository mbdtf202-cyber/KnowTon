# Load Testing with K6

This directory contains load testing scripts for the KnowTon platform using K6.

## Prerequisites

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

## Test Types

### 1. API Load Test (`api-load-test.js`)
Tests normal load conditions with gradual ramp-up.

**Run:**
```bash
k6 run tests/load/api-load-test.js
```

**With custom target:**
```bash
k6 run --env API_BASE_URL=http://localhost:3000 tests/load/api-load-test.js
```

**Stages:**
- 2m: Ramp up to 10 users
- 5m: Ramp up to 50 users
- 5m: Ramp up to 100 users
- 5m: Sustain 100 users
- 2m: Ramp down

### 2. Spike Test (`spike-test.js`)
Tests system behavior under sudden traffic spikes.

**Run:**
```bash
k6 run tests/load/spike-test.js
```

**Stages:**
- 1m: Normal load (10 users)
- 30s: Sudden spike (500 users)
- 1m: Sustained spike
- 30s: Recovery
- 1m: Normal load

### 3. Stress Test (`stress-test.js`)
Finds the breaking point of the system.

**Run:**
```bash
k6 run tests/load/stress-test.js
```

**Stages:**
- Gradually increases load from 50 to 400 users
- Identifies performance degradation points
- Tests system recovery

### 4. Soak Test (`soak-test.js`)
Tests system stability over extended period (3 hours).

**Run:**
```bash
k6 run tests/load/soak-test.js
```

**Purpose:**
- Detect memory leaks
- Identify performance degradation over time
- Test resource cleanup

## Output Formats

### HTML Report
```bash
k6 run --out html=report.html tests/load/api-load-test.js
```

### JSON Output
```bash
k6 run --out json=results.json tests/load/api-load-test.js
```

### InfluxDB Integration
```bash
k6 run --out influxdb=http://localhost:8086/k6 tests/load/api-load-test.js
```

### Grafana Dashboard
```bash
k6 run --out influxdb=http://localhost:8086/k6 tests/load/api-load-test.js
# View in Grafana at http://localhost:3000
```

## Performance Thresholds

### API Load Test
- 95th percentile < 500ms
- 99th percentile < 1000ms
- Error rate < 5%

### Spike Test
- 95th percentile < 2000ms (during spike)
- Error rate < 15% (during spike)

### Stress Test
- 95th percentile < 3000ms
- Error rate < 25%

### Soak Test
- 95th percentile < 500ms
- 99th percentile < 1000ms
- Error rate < 5%
- No significant latency increase over time

## Interpreting Results

### Key Metrics

1. **http_req_duration**: Request duration
   - p(95): 95% of requests completed within this time
   - p(99): 99% of requests completed within this time

2. **http_req_failed**: Failed request rate
   - Should be < 5% under normal load
   - May increase during spike/stress tests

3. **http_reqs**: Total number of requests
   - Indicates throughput

4. **vus**: Virtual users
   - Number of concurrent users

### Performance Bottlenecks

If tests fail, check:
1. Database query performance
2. API response times
3. Memory usage
4. CPU utilization
5. Network latency
6. Connection pool limits

## CI/CD Integration

Add to GitHub Actions:
```yaml
- name: Run Load Tests
  run: |
    k6 run --quiet tests/load/api-load-test.js
```

## Best Practices

1. **Start Small**: Begin with low load and gradually increase
2. **Monitor Resources**: Watch CPU, memory, and database metrics
3. **Test Realistic Scenarios**: Use production-like data and patterns
4. **Run Regularly**: Include in CI/CD pipeline
5. **Analyze Trends**: Compare results over time
6. **Test Different Endpoints**: Cover all critical paths
7. **Consider Time Zones**: Test during peak hours

## Troubleshooting

### High Error Rates
- Check API logs
- Verify database connections
- Check rate limiting configuration

### High Latency
- Analyze slow queries
- Check cache hit rates
- Review API response times

### Memory Leaks
- Run soak test
- Monitor memory usage over time
- Check for unclosed connections

## Additional Resources

- [K6 Documentation](https://k6.io/docs/)
- [K6 Examples](https://k6.io/docs/examples/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/)
