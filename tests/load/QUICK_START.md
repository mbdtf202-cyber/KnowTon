# Load Testing Quick Start Guide

## 🚀 Run All Tests (Recommended)

```bash
# Skip soak test (fastest)
./tests/load/run-all-tests.sh

# Include 1-hour soak test
SKIP_SOAK=false SOAK_TEST_HOURS=1 ./tests/load/run-all-tests.sh

# Full 24-hour soak test
SKIP_SOAK=false ./tests/load/run-all-tests.sh
```

## 📊 Run Individual Tests

### API Load Test (10 minutes)
```bash
k6 run tests/load/api-load-test.js
```

### Database Load Test (10 minutes)
```bash
k6 run tests/load/database-load-test.js
```

### Stress Test (22 minutes)
```bash
k6 run tests/load/stress-test.js
```

### Soak Test (24 hours)
```bash
k6 run tests/load/soak-test.js
```

## 📈 Generate Report

```bash
node tests/load/generate-performance-report.js
```

## 🔍 View Results

```bash
# View performance report
cat tests/load/reports/performance-report.md

# View HTML reports
open tests/load/reports/*.html

# View JSON data
cat tests/load/reports/*.json | jq
```

## ⚙️ Configuration

```bash
# Custom API URL
export API_BASE_URL=http://staging-api.com

# Custom test duration
export SOAK_TEST_HOURS=2

# Skip soak test
export SKIP_SOAK=true

# Run tests
./tests/load/run-all-tests.sh
```

## 🎯 Expected Results

| Test | Duration | Concurrent Users | Expected P95 |
|------|----------|------------------|--------------|
| API Load | 10 min | 100-500 | < 1000ms |
| Database | 10 min | 100-300 | < 500ms |
| Stress | 22 min | 50-600 | < 3000ms |
| Soak | 24 hours | 50 | < 500ms |

## 🚨 Troubleshooting

### API not accessible
```bash
# Start backend
cd packages/backend && npm run dev

# Check health
curl http://localhost:3000/api/v1/health
```

### k6 not installed
```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6
```

### High error rates
```bash
# Check logs
docker logs knowton-backend

# Check database
docker ps | grep postgres
```

## 📚 More Information

See [README.md](./README.md) for detailed documentation.
