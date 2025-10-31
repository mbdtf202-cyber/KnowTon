import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * Soak Test - Tests system stability over extended period
 * Detects memory leaks and performance degradation
 */

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const memoryLeaks = new Counter('potential_memory_leaks');

export const options = {
  stages: [
    { duration: '5m', target: 50 },    // Ramp up
    { duration: '3h', target: 50 },    // Sustained load for 3 hours
    { duration: '5m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

let baselineLatency = 0;
let requestCounter = 0;

export default function () {
  const res = http.get(`${BASE_URL}/api/v1/health`);
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time stable': (r) => {
      // Check if latency is increasing over time (potential memory leak)
      if (requestCounter === 100) {
        baselineLatency = r.timings.duration;
      }
      
      if (requestCounter > 100 && baselineLatency > 0) {
        const latencyIncrease = (r.timings.duration - baselineLatency) / baselineLatency;
        if (latencyIncrease > 0.5) {
          // Latency increased by more than 50%
          memoryLeaks.add(1);
          return false;
        }
      }
      
      return true;
    },
  });

  errorRate.add(!success);
  apiLatency.add(res.timings.duration);
  requestCounter++;
  
  sleep(1);
}

export function teardown(data) {
  console.log(`Total requests: ${requestCounter}`);
  console.log(`Baseline latency: ${baselineLatency}ms`);
}
