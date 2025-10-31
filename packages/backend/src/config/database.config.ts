import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

/**
 * Database Configuration with Connection Pooling
 * Optimized for production workloads
 */

// Calculate optimal pool size based on CPU cores
const cpuCount = require('os').cpus().length;
const optimalPoolSize = Math.max(cpuCount * 2 + 1, 10);

// Prisma Client with optimized configuration
export const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Query logging for slow queries
if (process.env.NODE_ENV !== 'production') {
  prisma.$on('query' as never, (e: any) => {
    if (e.duration > 1000) {
      logger.warn(`Slow query detected (${e.duration}ms): ${e.query}`);
    }
  });
}

// Connection pool configuration
export const poolConfig = {
  max: parseInt(process.env.DB_POOL_MAX || String(optimalPoolSize)),
  min: parseInt(process.env.DB_POOL_MIN || '5'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
};

// Database health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database connection closed');
}

// Database statistics
export async function getDatabaseStats() {
  try {
    const stats = await prisma.$queryRaw<any[]>`
      SELECT 
        schemaname,
        tablename,
        n_live_tup as row_count,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
    `;
    
    return stats;
  } catch (error) {
    logger.error('Failed to get database stats:', error);
    return [];
  }
}

// Connection pool statistics
export async function getConnectionStats() {
  try {
    const stats = await prisma.$queryRaw<any[]>`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;
    
    return stats[0];
  } catch (error) {
    logger.error('Failed to get connection stats:', error);
    return null;
  }
}

logger.info(`Database pool configured: max=${poolConfig.max}, min=${poolConfig.min}`);
