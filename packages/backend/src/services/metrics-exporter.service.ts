/**
 * Metrics Exporter Service
 * Exports business metrics to Prometheus for Grafana dashboards
 */

import { PrismaClient } from '@prisma/client';
import { Registry, Counter, Gauge, Histogram } from 'prom-client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class MetricsExporterService {
  private registry: Registry;
  
  // Business Metrics
  private nftMintsTotal: Counter;
  private tradingVolumeUsd: Gauge;
  private activeUsersTotal: Gauge;
  private totalNfts: Gauge;
  private activeBondsTotal: Gauge;
  private totalValueLockedUsd: Gauge;
  private royaltyPaymentsTotal: Counter;
  private contentUploadsTotal: Counter;
  private stakingPoolsActive: Gauge;
  private marketplaceTransactionsTotal: Counter;
  
  // Technical Metrics
  private aiProcessingDuration: Histogram;
  private serviceRequestsTotal: Counter;
  private databaseQueryDuration: Histogram;
  
  constructor() {
    this.registry = new Registry();
    
    // Initialize business metrics
    this.nftMintsTotal = new Counter({
      name: 'knowton_nft_mints_total',
      help: 'Total number of NFTs minted',
      labelNames: ['category', 'creator'],
      registers: [this.registry],
    });
    
    this.tradingVolumeUsd = new Gauge({
      name: 'knowton_trading_volume_usd',
      help: 'Total trading volume in USD',
      labelNames: ['period'],
      registers: [this.registry],
    });
    
    this.activeUsersTotal = new Gauge({
      name: 'knowton_active_users_total',
      help: 'Number of active users',
      labelNames: ['period'],
      registers: [this.registry],
    });
    
    this.totalNfts = new Gauge({
      name: 'knowton_total_nfts',
      help: 'Total number of NFTs in the platform',
      registers: [this.registry],
    });
    
    this.activeBondsTotal = new Gauge({
      name: 'knowton_active_bonds_total',
      help: 'Number of active IP bonds',
      registers: [this.registry],
    });
    
    this.totalValueLockedUsd = new Gauge({
      name: 'knowton_total_value_locked_usd',
      help: 'Total value locked in the platform (USD)',
      registers: [this.registry],
    });
    
    this.royaltyPaymentsTotal = new Counter({
      name: 'knowton_royalty_payments_total',
      help: 'Total number of royalty payments',
      labelNames: ['beneficiary'],
      registers: [this.registry],
    });
    
    this.contentUploadsTotal = new Counter({
      name: 'knowton_content_uploads_total',
      help: 'Total number of content uploads',
      labelNames: ['content_type'],
      registers: [this.registry],
    });
    
    this.stakingPoolsActive = new Gauge({
      name: 'knowton_staking_pools_active',
      help: 'Number of active staking pools',
      registers: [this.registry],
    });
    
    this.marketplaceTransactionsTotal = new Counter({
      name: 'knowton_marketplace_transactions_total',
      help: 'Total number of marketplace transactions',
      labelNames: ['type'],
      registers: [this.registry],
    });
    
    // Initialize technical metrics
    this.aiProcessingDuration = new Histogram({
      name: 'knowton_ai_processing_duration_seconds',
      help: 'AI processing duration in seconds',
      labelNames: ['service', 'operation'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });
    
    this.serviceRequestsTotal = new Counter({
      name: 'knowton_service_requests_total',
      help: 'Total number of service requests',
      labelNames: ['service', 'method', 'status'],
      registers: [this.registry],
    });
    
    this.databaseQueryDuration = new Histogram({
      name: 'knowton_database_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });
  }
  
  /**
   * Start collecting metrics periodically
   */
  async start() {
    logger.info('Starting metrics exporter service');
    
    // Collect metrics every 30 seconds
    setInterval(async () => {
      try {
        await this.collectBusinessMetrics();
      } catch (error) {
        logger.error('Failed to collect business metrics', { error });
      }
    }, 30000);
    
    // Initial collection
    await this.collectBusinessMetrics();
  }
  
  /**
   * Collect business metrics from database
   */
  private async collectBusinessMetrics() {
    try {
      // Total NFTs
      const totalNfts = await prisma.nFT.count();
      this.totalNfts.set(totalNfts);
      
      // Active users (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeUsers = await prisma.user.count({
        where: {
          updatedAt: {
            gte: oneDayAgo,
          },
        },
      });
      this.activeUsersTotal.set({ period: '24h' }, activeUsers);
      
      // Trading volume (last 24 hours)
      const transactions = await prisma.transaction.findMany({
        where: {
          createdAt: {
            gte: oneDayAgo,
          },
          type: 'SALE',
        },
      });
      
      const tradingVolume = transactions.reduce((sum, tx) => {
        return sum + parseFloat(tx.price || '0');
      }, 0);
      this.tradingVolumeUsd.set({ period: '24h' }, tradingVolume);
      
      // NFTs by category
      const nftsByCategory = await prisma.nFT.groupBy({
        by: ['category'],
        _count: true,
      });
      
      // Content uploads by type
      const contentByType = await prisma.content.groupBy({
        by: ['category'],
        _count: true,
      });
      
      logger.debug('Business metrics collected', {
        totalNfts,
        activeUsers,
        tradingVolume,
      });
    } catch (error) {
      logger.error('Failed to collect business metrics', { error });
    }
  }
  
  /**
   * Record NFT mint event
   */
  recordNftMint(category: string, creator: string) {
    this.nftMintsTotal.inc({ category, creator });
  }
  
  /**
   * Record royalty payment
   */
  recordRoyaltyPayment(beneficiary: string) {
    this.royaltyPaymentsTotal.inc({ beneficiary });
  }
  
  /**
   * Record content upload
   */
  recordContentUpload(contentType: string) {
    this.contentUploadsTotal.inc({ content_type: contentType });
  }
  
  /**
   * Record marketplace transaction
   */
  recordMarketplaceTransaction(type: string) {
    this.marketplaceTransactionsTotal.inc({ type });
  }
  
  /**
   * Record AI processing duration
   */
  recordAiProcessing(service: string, operation: string, duration: number) {
    this.aiProcessingDuration.observe({ service, operation }, duration);
  }
  
  /**
   * Record service request
   */
  recordServiceRequest(service: string, method: string, status: string) {
    this.serviceRequestsTotal.inc({ service, method, status });
  }
  
  /**
   * Record database query duration
   */
  recordDatabaseQuery(operation: string, table: string, duration: number) {
    this.databaseQueryDuration.observe({ operation, table }, duration);
  }
  
  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
  
  /**
   * Get registry for custom metrics
   */
  getRegistry(): Registry {
    return this.registry;
  }
}

// Singleton instance
export const metricsExporter = new MetricsExporterService();
