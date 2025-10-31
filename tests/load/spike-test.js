import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * Spike Test - Tests system behavior under sudden traffic spikes
 */

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

export const options = {
  stages: [
    { duration: '1m', target: 10 },    // Normal load
    { duration: '30s', target: 500 },  // Sudden spike
    { duration: '1m', target: 500 },   // Sustained spike
    { duration: '30s', target: 10 },   // Recovery
    { duration: '1m', target: 10 },    // Normal load
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // More lenient during spike
    http_req_failed: ['rate<0.15'],     // Allow higher error rate during spike
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE_URL}/api/v1/health`);
  
  const success = check(res, {
    'status is 200 or 503': (r) => r.status === 200 || r.status === 503,
  });

  errorRate.add(!success);
  apiLatency.add(res.timings.duration);
  
  sleep(1);
}
