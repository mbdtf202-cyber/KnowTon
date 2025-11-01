/**
 * Integration Test Setup
 * Configures test environment and utilities
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
process.env.KAFKA_BROKERS = process.env.KAFKA_BROKERS || 'localhost:9092';
process.env.POSTGRES_URL = process.env.POSTGRES_URL || 'postgresql://localhost:5432/knowton_test';
process.env.MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/knowton_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.CLICKHOUSE_URL = process.env.CLICKHOUSE_URL || 'http://localhost:8123';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
declare global {
  var sleep: (ms: number) => Promise<void>;
  var waitForCondition: (
    condition: () => Promise<boolean>,
    timeout?: number,
    interval?: number
  ) => Promise<boolean>;
}

global.sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

global.waitForCondition = async (
  condition: () => Promise<boolean>,
  timeout: number = 10000,
  interval: number = 500
): Promise<boolean> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await global.sleep(interval);
  }
  
  return false;
};

// Mock console methods to reduce noise (but keep important logs)
const originalConsole = { ...console };

global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: (message?: any, ...optionalParams: any[]) => {
    // Keep warnings visible
    originalConsole.warn(message, ...optionalParams);
  },
  error: (message?: any, ...optionalParams: any[]) => {
    // Keep errors visible
    originalConsole.error(message, ...optionalParams);
  },
};

// Test data cleanup utilities
export const cleanupTestData = async () => {
  // Cleanup logic can be added here
  console.error('Cleaning up test data...');
};

// Setup and teardown
beforeAll(async () => {
  console.error('='.repeat(60));
  console.error('Starting Integration Tests');
  console.error('='.repeat(60));
  console.error(`API Base URL: ${process.env.API_BASE_URL}`);
  console.error(`Kafka Brokers: ${process.env.KAFKA_BROKERS}`);
  console.error('='.repeat(60));
});

afterAll(async () => {
  console.error('='.repeat(60));
  console.error('Integration Tests Completed');
  console.error('='.repeat(60));
  
  // Cleanup
  await cleanupTestData();
});
