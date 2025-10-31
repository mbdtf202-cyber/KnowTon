// Jest setup for backend tests

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    content: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    nFT: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    listing: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    trade: {
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
  })),
}));

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    hGet: jest.fn(),
    hSet: jest.fn(),
    hDel: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
  })),
}));

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    Contract: jest.fn(),
    JsonRpcProvider: jest.fn(),
    Wallet: jest.fn(),
    parseEther: jest.fn((value) => value),
    formatEther: jest.fn((value) => value),
    keccak256: jest.fn(),
    toUtf8Bytes: jest.fn(),
    getAddress: jest.fn((address) => address),
  },
}));

// Mock IPFS
jest.mock('ipfs-http-client', () => ({
  create: jest.fn(() => ({
    add: jest.fn().mockResolvedValue([{ hash: 'QmMockHash123' }]),
    cat: jest.fn().mockResolvedValue(Buffer.from('mock content')),
    pin: {
      add: jest.fn().mockResolvedValue({ hash: 'QmMockHash123' }),
    },
  })),
}));

// Mock Bull Queue
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn(),
  }));
});

// Mock Kafka
jest.mock('kafkajs', () => ({
  Kafka: jest.fn(() => ({
    producer: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      send: jest.fn(),
    })),
    consumer: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      subscribe: jest.fn(),
      run: jest.fn(),
    })),
  })),
}));

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.JWT_SECRET = 'test-secret';
});

afterAll(() => {
  // Cleanup
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Increase timeout for async operations
jest.setTimeout(30000);