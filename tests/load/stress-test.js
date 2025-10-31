import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * Stress Test - Finds the breaking point of the system
 */

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Ramp up
    { duration: '5m', target: 100 },   // Increase load
    { duration: '5m', target: 200 },   // Further increase
    { duration: '5m', target: 300 },   // Push to limits
    { duration: '5m', target: 400 },   // Beyond capacity
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.25'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

export default function () {
  // Mix of different endpoints
  const endpoints = [
    '/api/v1/health',
    '/api/v1/marketplace/nfts?page=1&limit=10',
    '/api/v1/analytics/stats',
    `/api/v1/nft/${Math.floor(Math.random() * 100)}`,
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE_URL}${endpoint}`);
  
  const success = check(res, {
    'status is 2xx or 4xx': (r) => r.status >= 200 && r.status < 500,
  });

  errorRate.add(!success);
  apiLatency.add(res.timings.duration);
  
  sleep(Math.random() * 2);
}
