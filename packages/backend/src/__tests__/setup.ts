import { PrismaClient } from '@prisma/client';

// Test database setup
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/knowton_test'
    }
  }
});

// Global test setup
beforeAll(async () => {
  // Skip database connection if Prisma is mocked (for unit tests)
  if (process.env.SKIP_DB_SETUP !== 'true') {
    try {
      await prisma.$connect();
    } catch (error) {
      console.warn('Database connection failed in test setup. Skipping for mocked tests.');
    }
  }
});

afterAll(async () => {
  // Skip database disconnection if Prisma is mocked
  if (process.env.SKIP_DB_SETUP !== 'true') {
    try {
      await prisma.$disconnect();
    } catch (error) {
      // Ignore disconnection errors
    }
  }
});

export { prisma };