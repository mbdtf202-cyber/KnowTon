/**
 * CDC (Change Data Capture) Sync Service
 * Implements database change tracking and synchronization to ClickHouse and Elasticsearch
 * Requirements: 数据一致性需求
 */

import { PrismaClient } from '@prisma/client';
import { Kafka, Producer } from 'kafkajs';
import { createClient, ClickHouseClient } from '@clickhouse/client';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { Registry, Counter, Gauge, Histogram } from 'prom-client';

const prisma = new PrismaClient();

interface CDCEvent {
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  before?: any;
  after?: any;
  timestamp: Date;
  transactionId?: string;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    kafka: boolean;
    clickhouse: boolean;
    elasticsearch: boolean;
    postgres: boolean;
  };
  metrics: {
    syncLag: number;
    errorRate: number;
    throughput: number;
  };
}

export class CDCSyncService {
  private kafka: Kafka;
  private producer: Producer;
  private clickhouse: ClickHouseClient;
  private elasticsearch: ElasticsearchClient;
  private isRunning: boolean = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastSyncTimestamps: Map<string, Date> = new Map();
  
  // Prometheus metrics
  private metricsRegistry: Registry;
  private syncEventsTotal: Counter;
  private syncErrorsTotal: Counter;
  private syncLatency: Histogram;
  private syncLagSeconds: Gauge;
  private kafkaMessagesPublished: Counter;
  private clickhouseWritesTotal: Counter;
  private elasticsearchWritesTotal: Counter;
  private lastHealthCheck: Date = new Date();
  private healthStatus: HealthStatus['status'] = 'healthy';

  constructor() {
    this.kafka = new Kafka({
      clientId: 'cdc-sync-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });

    this.producer = this.kafka.producer();

    this.clickhouse = createClient({
      host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
      database: process.env.CLICKHOUSE_DATABASE || 'knowton',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
    });

    this.elasticsearch = new ElasticsearchClient({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    });

    // Initialize Prometheus metrics
    this.metricsRegistry = new Registry();
    
    this.syncEventsTotal = new Counter({
      name: 'cdc_sync_events_total',
      help: 'Total number of CDC sync events processed',
      labelNames: ['table', 'operation', 'status'],
      registers: [this.metricsRegistry],
    });

    this.syncErrorsTotal = new Counter({
      name: 'cdc_sync_errors_total',
      help: 'Total number of CDC sync errors',
      labelNames: ['table', 'error_type'],
      registers: [this.metricsRegistry],
    });

    this.syncLatency = new Histogram({
      name: 'cdc_sync_latency_seconds',
      help: 'Latency of CDC sync operations',
      labelNames: ['table', 'operation'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
      registers: [this.metricsRegistry],
    });

    this.syncLagSeconds = new Gauge({
      name: 'cdc_sync_lag_seconds',
      help: 'Sync lag in seconds for each table',
      labelNames: ['table'],
      registers: [this.metricsRegistry],
    });

    this.kafkaMessagesPublished = new Counter({
      name: 'cdc_kafka_messages_published_total',
      help: 'Total number of messages published to Kafka',
      labelNames: ['topic'],
      registers: [this.metricsRegistry],
    });

    this.clickhouseWritesTotal = new Counter({
      name: 'cdc_clickhouse_writes_total',
      help: 'Total number of writes to ClickHouse',
      labelNames: ['table', 'status'],
      registers: [this.metricsRegistry],
    });

    this.elasticsearchWritesTotal = new Counter({
      name: 'cdc_elasticsearch_writes_total',
      help: 'Total number of writes to Elasticsearch',
      labelNames: ['index', 'status'],
      registers: [this.metricsRegistry],
    });
  }

  async start() {
    if (this.isRunning) {
      console.log('CDC Sync Service is already running');
      return;
    }

    await this.producer.connect();
    console.log('CDC Sync Service started');
    this.isRunning = true;

    // Initialize last sync timestamps
    await this.initializeLastSyncTimestamps();

    // Start polling for changes
    this.startPolling();
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    await this.producer.disconnect();
    await this.clickhouse.close();
    this.isRunning = false;
    console.log('CDC Sync Service stopped');
  }

  private async initializeLastSyncTimestamps() {
    const tables = ['User', 'Creator', 'Content', 'NFT', 'Transaction', 'Royalty'];
    const now = new Date();
    
    for (const table of tables) {
      this.lastSyncTimestamps.set(table, now);
    }
  }

  private startPolling() {
    // Poll every 5 seconds for changes
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollChanges();
      } catch (error) {
        console.error('Error polling changes:', error);
      }
    }, 5000);
  }

  private async pollChanges() {
    // Poll each table for changes
    await this.pollUserChanges();
    await this.pollCreatorChanges();
    await this.pollContentChanges();
    await this.pollNFTChanges();
    await this.pollTransactionChanges();
    await this.pollRoyaltyChanges();

    // Update sync lag metrics
    this.updateSyncLagMetrics();
  }

  private updateSyncLagMetrics() {
    const now = new Date();
    for (const [table, lastSync] of this.lastSyncTimestamps.entries()) {
      const lagSeconds = (now.getTime() - lastSync.getTime()) / 1000;
      this.syncLagSeconds.set({ table }, lagSeconds);
    }
  }

  private async pollUserChanges() {
    const lastSync = this.lastSyncTimestamps.get('User') || new Date(0);
    
    const users = await prisma.user.findMany({
      where: {
        updatedAt: {
          gt: lastSync,
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });

    for (const user of users) {
      await this.handleUserChange(user);
    }

    if (users.length > 0) {
      this.lastSyncTimestamps.set('User', users[users.length - 1].updatedAt);
    }
  }

  private async pollCreatorChanges() {
    const lastSync = this.lastSyncTimestamps.get('Creator') || new Date(0);
    
    const creators = await prisma.creator.findMany({
      where: {
        updatedAt: {
          gt: lastSync,
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });

    for (const creator of creators) {
      await this.handleCreatorChange(creator);
    }

    if (creators.length > 0) {
      this.lastSyncTimestamps.set('Creator', creators[creators.length - 1].updatedAt);
    }
  }

  private async pollContentChanges() {
    const lastSync = this.lastSyncTimestamps.get('Content') || new Date(0);
    
    const contents = await prisma.content.findMany({
      where: {
        updatedAt: {
          gt: lastSync,
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
      include: {
        creator: true,
      },
    });

    for (const content of contents) {
      await this.handleContentChange(content);
    }

    if (contents.length > 0) {
      this.lastSyncTimestamps.set('Content', contents[contents.length - 1].updatedAt);
    }
  }

  private async pollNFTChanges() {
    const lastSync = this.lastSyncTimestamps.get('NFT') || new Date(0);
    
    const nfts = await prisma.nFT.findMany({
      where: {
        updatedAt: {
          gt: lastSync,
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
      include: {
        content: true,
        creator: true,
      },
    });

    for (const nft of nfts) {
      await this.handleNFTChange(nft);
    }

    if (nfts.length > 0) {
      this.lastSyncTimestamps.set('NFT', nfts[nfts.length - 1].updatedAt);
    }
  }

  private async pollTransactionChanges() {
    const lastSync = this.lastSyncTimestamps.get('Transaction') || new Date(0);
    
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gt: lastSync,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        nft: true,
      },
    });

    for (const transaction of transactions) {
      await this.handleTransactionChange(transaction);
    }

    if (transactions.length > 0) {
      this.lastSyncTimestamps.set('Transaction', transactions[transactions.length - 1].createdAt);
    }
  }

  private async pollRoyaltyChanges() {
    const lastSync = this.lastSyncTimestamps.get('Royalty') || new Date(0);
    
    const royalties = await prisma.royaltyPayment.findMany({
      where: {
        createdAt: {
          gt: lastSync,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        nft: true,
      },
    });

    for (const royalty of royalties) {
      await this.handleRoyaltyChange(royalty);
    }

    if (royalties.length > 0) {
      this.lastSyncTimestamps.set('Royalty', royalties[royalties.length - 1].createdAt);
    }
  }

  private async handleUserChange(user: any) {
    const startTime = Date.now();
    
    try {
      const cdcEvent: CDCEvent = {
        operation: 'INSERT',
        table: 'User',
        after: user,
        timestamp: new Date(),
      };

      // Send to Kafka for processing
      await this.sendCDCEvent(cdcEvent);

      // Sync to Elasticsearch for search
      await this.syncUserToElasticsearch(user);

      // Record success metrics
      this.syncEventsTotal.inc({ table: 'User', operation: 'INSERT', status: 'success' });
      this.syncLatency.observe({ table: 'User', operation: 'sync' }, (Date.now() - startTime) / 1000);
    } catch (error) {
      this.syncErrorsTotal.inc({ table: 'User', error_type: 'sync_failed' });
      this.syncEventsTotal.inc({ table: 'User', operation: 'INSERT', status: 'error' });
      throw error;
    }
  }

  private async handleCreatorChange(creator: any) {
    const cdcEvent: CDCEvent = {
      operation: 'INSERT',
      table: 'Creator',
      after: creator,
      timestamp: new Date(),
    };

    await this.sendCDCEvent(cdcEvent);
    await this.syncCreatorToElasticsearch(creator);
  }

  private async handleContentChange(content: any) {
    const startTime = Date.now();
    
    try {
      const cdcEvent: CDCEvent = {
        operation: 'INSERT',
        table: 'Content',
        after: content,
        timestamp: new Date(),
      };

      await this.sendCDCEvent(cdcEvent);
      await this.syncContentToElasticsearch(content);
      await this.syncContentMetricsToClickHouse(content);

      this.syncEventsTotal.inc({ table: 'Content', operation: 'INSERT', status: 'success' });
      this.syncLatency.observe({ table: 'Content', operation: 'sync' }, (Date.now() - startTime) / 1000);
    } catch (error) {
      this.syncErrorsTotal.inc({ table: 'Content', error_type: 'sync_failed' });
      this.syncEventsTotal.inc({ table: 'Content', operation: 'INSERT', status: 'error' });
      throw error;
    }
  }

  private async handleNFTChange(nft: any) {
    const cdcEvent: CDCEvent = {
      operation: 'INSERT',
      table: 'NFT',
      after: nft,
      timestamp: new Date(),
    };

    await this.sendCDCEvent(cdcEvent);
    await this.syncNFTToElasticsearch(nft);
  }

  private async handleTransactionChange(transaction: any) {
    const cdcEvent: CDCEvent = {
      operation: 'INSERT',
      table: 'Transaction',
      after: transaction,
      timestamp: new Date(),
    };

    await this.sendCDCEvent(cdcEvent);
    await this.syncTransactionToClickHouse(transaction);
  }

  private async handleRoyaltyChange(royalty: any) {
    const cdcEvent: CDCEvent = {
      operation: 'INSERT',
      table: 'Royalty',
      after: royalty,
      timestamp: new Date(),
    };

    await this.sendCDCEvent(cdcEvent);
    await this.syncRoyaltyToClickHouse(royalty);
  }

  private async sendCDCEvent(event: CDCEvent) {
    try {
      await this.producer.send({
        topic: 'cdc-events',
        messages: [{
          key: `${event.table}-${event.timestamp.getTime()}`,
          value: JSON.stringify(event),
        }],
      });
      this.kafkaMessagesPublished.inc({ topic: 'cdc-events' });
    } catch (error) {
      this.syncErrorsTotal.inc({ table: event.table, error_type: 'kafka_publish_failed' });
      throw error;
    }
  }

  // Elasticsearch sync methods
  private async syncUserToElasticsearch(user: any) {
    try {
      await this.elasticsearch.index({
        index: 'knowton-users',
        id: user.address,
        document: {
          address: user.address,
          username: user.username,
          bio: user.bio,
          avatar: user.avatar,
          reputation: user.reputation,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
      this.elasticsearchWritesTotal.inc({ index: 'knowton-users', status: 'success' });
    } catch (error) {
      this.elasticsearchWritesTotal.inc({ index: 'knowton-users', status: 'error' });
      console.error('Error syncing user to Elasticsearch:', error);
      throw error;
    }
  }

  private async syncCreatorToElasticsearch(creator: any) {
    try {
      await this.elasticsearch.index({
        index: 'knowton-creators',
        id: creator.address,
        document: {
          address: creator.address,
          did: creator.did,
          username: creator.username,
          bio: creator.bio,
          avatar: creator.avatar,
          verified: creator.verified,
          totalEarnings: creator.totalEarnings,
          createdAt: creator.createdAt,
          updatedAt: creator.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error syncing creator to Elasticsearch:', error);
    }
  }

  private async syncContentToElasticsearch(content: any) {
    try {
      await this.elasticsearch.index({
        index: 'knowton-content',
        id: content.id,
        document: {
          id: content.id,
          contentHash: content.contentHash,
          title: content.title,
          description: content.description,
          category: content.category,
          tags: content.tags,
          creatorAddress: content.creatorAddress,
          creatorName: content.creator?.username || '',
          fingerprint: content.fingerprint,
          verified: content.verified,
          views: content.views || 0,
          likes: content.likes || 0,
          createdAt: content.createdAt,
          updatedAt: content.updatedAt,
        },
      });
      this.elasticsearchWritesTotal.inc({ index: 'knowton-content', status: 'success' });
    } catch (error) {
      this.elasticsearchWritesTotal.inc({ index: 'knowton-content', status: 'error' });
      console.error('Error syncing content to Elasticsearch:', error);
      throw error;
    }
  }

  private async syncNFTToElasticsearch(nft: any) {
    try {
      await this.elasticsearch.index({
        index: 'knowton-nfts',
        id: nft.tokenId.toString(),
        document: {
          tokenId: nft.tokenId.toString(),
          contractAddress: nft.contractAddress,
          contentHash: nft.content?.contentHash || '',
          title: nft.content?.title || '',
          description: nft.content?.description || '',
          category: nft.content?.category || '',
          creatorAddress: nft.creatorAddress,
          ownerAddress: nft.ownerAddress,
          price: nft.price,
          royaltyPercentage: nft.royaltyPercentage,
          verified: nft.verified,
          createdAt: nft.createdAt,
          updatedAt: nft.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error syncing NFT to Elasticsearch:', error);
    }
  }

  // ClickHouse sync methods
  private async syncContentMetricsToClickHouse(content: any) {
    try {
      const query = `
        INSERT INTO content_metrics (
          date, content_id, token_id, views, unique_viewers, likes, shares, revenue
        ) VALUES (
          toDate(now()), {contentId:String}, {tokenId:UInt256}, {views:UInt64}, 
          {uniqueViewers:UInt64}, {likes:UInt64}, {shares:UInt64}, {revenue:Decimal(78,18)}
        )
      `;

      await this.clickhouse.insert({
        table: 'content_metrics',
        values: [{
          date: new Date().toISOString().split('T')[0],
          content_id: content.id,
          token_id: content.tokenId || 0,
          views: content.views || 0,
          unique_viewers: content.uniqueViewers || 0,
          likes: content.likes || 0,
          shares: content.shares || 0,
          revenue: content.revenue || '0',
        }],
        format: 'JSONEachRow',
      });
      this.clickhouseWritesTotal.inc({ table: 'content_metrics', status: 'success' });
    } catch (error) {
      this.clickhouseWritesTotal.inc({ table: 'content_metrics', status: 'error' });
      console.error('Error syncing content metrics to ClickHouse:', error);
      throw error;
    }
  }

  private async syncTransactionToClickHouse(transaction: any) {
    try {
      await this.clickhouse.insert({
        table: 'nft_transactions',
        values: [{
          event_date: new Date().toISOString().split('T')[0],
          event_time: transaction.createdAt.toISOString(),
          tx_hash: transaction.txHash,
          block_number: transaction.blockNumber || 0,
          block_timestamp: transaction.blockTimestamp || transaction.createdAt.toISOString(),
          token_id: transaction.nft?.tokenId || 0,
          contract_address: transaction.nft?.contractAddress || '',
          from_address: transaction.fromAddress,
          to_address: transaction.toAddress,
          transaction_type: this.mapTransactionType(transaction.type),
          price: transaction.price || '0',
          currency: transaction.currency || 'ETH',
          currency_usd_price: transaction.currencyUsdPrice || '0',
          price_usd: transaction.priceUsd || '0',
          gas_used: transaction.gasUsed || 0,
          gas_price_gwei: transaction.gasPriceGwei || '0',
          gas_cost_eth: transaction.gasCostEth || '0',
          gas_cost_usd: transaction.gasCostUsd || '0',
          marketplace: transaction.marketplace || '',
          category: transaction.nft?.content?.category || '',
          creator_address: transaction.nft?.creatorAddress || '',
          royalty_amount: transaction.royaltyAmount || '0',
          platform_fee: transaction.platformFee || '0',
          is_first_sale: transaction.isFirstSale || false,
          metadata_updated: false,
        }],
        format: 'JSONEachRow',
      });
      this.clickhouseWritesTotal.inc({ table: 'nft_transactions', status: 'success' });
    } catch (error) {
      this.clickhouseWritesTotal.inc({ table: 'nft_transactions', status: 'error' });
      console.error('Error syncing transaction to ClickHouse:', error);
      throw error;
    }
  }

  private async syncRoyaltyToClickHouse(royalty: any) {
    try {
      await this.clickhouse.insert({
        table: 'royalty_analytics',
        values: [{
          date: new Date().toISOString().split('T')[0],
          token_id: royalty.nft?.tokenId || 0,
          beneficiary_address: royalty.beneficiaryAddress,
          total_distributed: royalty.amount || '0',
          distribution_count: 1,
        }],
        format: 'JSONEachRow',
      });
    } catch (error) {
      console.error('Error syncing royalty to ClickHouse:', error);
    }
  }

  private mapTransactionType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'MINT': 'mint',
      'TRANSFER': 'transfer',
      'SALE': 'sale',
      'BURN': 'burn',
      'LIST': 'list',
      'DELIST': 'delist',
    };
    return typeMap[type] || 'transfer';
  }

  /**
   * Health check endpoint
   * Returns comprehensive health status of all sync components
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const services = {
      kafka: await this.checkKafkaHealth(),
      clickhouse: await this.checkClickHouseHealth(),
      elasticsearch: await this.checkElasticsearchHealth(),
      postgres: await this.checkPostgresHealth(),
    };

    const allHealthy = Object.values(services).every(status => status);
    const someHealthy = Object.values(services).some(status => status);

    let status: HealthStatus['status'];
    if (allHealthy) {
      status = 'healthy';
    } else if (someHealthy) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    // Calculate metrics
    const maxLag = Math.max(...Array.from(this.lastSyncTimestamps.values()).map(
      ts => (Date.now() - ts.getTime()) / 1000
    ));

    this.healthStatus = status;
    this.lastHealthCheck = new Date();

    return {
      status,
      timestamp: new Date(),
      services,
      metrics: {
        syncLag: maxLag,
        errorRate: await this.calculateErrorRate(),
        throughput: await this.calculateThroughput(),
      },
    };
  }

  /**
   * Readiness check endpoint
   * Returns true if service is ready to accept traffic
   */
  async isReady(): Promise<boolean> {
    if (!this.isRunning) {
      return false;
    }

    const health = await this.getHealthStatus();
    return health.status !== 'unhealthy';
  }

  /**
   * Liveness check endpoint
   * Returns true if service is alive (even if degraded)
   */
  async isAlive(): Promise<boolean> {
    return this.isRunning;
  }

  private async checkKafkaHealth(): Promise<boolean> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();
      return true;
    } catch (error) {
      console.error('Kafka health check failed:', error);
      return false;
    }
  }

  private async checkClickHouseHealth(): Promise<boolean> {
    try {
      await this.clickhouse.ping();
      return true;
    } catch (error) {
      console.error('ClickHouse health check failed:', error);
      return false;
    }
  }

  private async checkElasticsearchHealth(): Promise<boolean> {
    try {
      const health = await this.elasticsearch.cluster.health();
      return health.status === 'green' || health.status === 'yellow';
    } catch (error) {
      console.error('Elasticsearch health check failed:', error);
      return false;
    }
  }

  private async checkPostgresHealth(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Postgres health check failed:', error);
      return false;
    }
  }

  private async calculateErrorRate(): Promise<number> {
    try {
      const metrics = await this.metricsRegistry.metrics();
      const errorMatch = metrics.match(/cdc_sync_errors_total\s+(\d+)/);
      const totalMatch = metrics.match(/cdc_sync_events_total.*status="success".*\s+(\d+)/);
      
      if (errorMatch && totalMatch) {
        const errors = parseInt(errorMatch[1]);
        const total = parseInt(totalMatch[1]);
        return total > 0 ? errors / total : 0;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  private async calculateThroughput(): Promise<number> {
    try {
      const metrics = await this.metricsRegistry.metrics();
      const match = metrics.match(/cdc_sync_events_total.*status="success".*\s+(\d+)/);
      
      if (match) {
        const total = parseInt(match[1]);
        const uptimeSeconds = (Date.now() - this.lastHealthCheck.getTime()) / 1000;
        return uptimeSeconds > 0 ? total / uptimeSeconds : 0;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get Prometheus metrics
   */
  async getMetrics(): Promise<string> {
    return this.metricsRegistry.metrics();
  }

  /**
   * Validate data consistency between PostgreSQL and target systems
   */
  async validateDataConsistency(): Promise<{
    consistent: boolean;
    issues: Array<{
      table: string;
      issue: string;
      count: number;
    }>;
  }> {
    const issues: Array<{ table: string; issue: string; count: number }> = [];

    try {
      // Check User consistency
      const userCount = await prisma.user.count();
      const esUserResult = await this.elasticsearch.count({ index: 'knowton-users' });
      if (userCount !== esUserResult.count) {
        issues.push({
          table: 'User',
          issue: 'Count mismatch between PostgreSQL and Elasticsearch',
          count: Math.abs(userCount - esUserResult.count),
        });
      }

      // Check Content consistency
      const contentCount = await prisma.content.count();
      const esContentResult = await this.elasticsearch.count({ index: 'knowton-content' });
      if (contentCount !== esContentResult.count) {
        issues.push({
          table: 'Content',
          issue: 'Count mismatch between PostgreSQL and Elasticsearch',
          count: Math.abs(contentCount - esContentResult.count),
        });
      }

      // Check NFT consistency
      const nftCount = await prisma.nFT.count();
      const esNFTResult = await this.elasticsearch.count({ index: 'knowton-nfts' });
      if (nftCount !== esNFTResult.count) {
        issues.push({
          table: 'NFT',
          issue: 'Count mismatch between PostgreSQL and Elasticsearch',
          count: Math.abs(nftCount - esNFTResult.count),
        });
      }

      // Check Transaction consistency with ClickHouse
      const txCount = await prisma.transaction.count();
      const chResult = await this.clickhouse.query({
        query: 'SELECT count(*) as count FROM nft_transactions',
        format: 'JSONEachRow',
      });
      const chData = await chResult.json();
      const chCount = chData[0]?.count || 0;
      
      if (txCount !== chCount) {
        issues.push({
          table: 'Transaction',
          issue: 'Count mismatch between PostgreSQL and ClickHouse',
          count: Math.abs(txCount - chCount),
        });
      }

    } catch (error) {
      console.error('Error validating data consistency:', error);
      issues.push({
        table: 'All',
        issue: 'Validation failed due to error',
        count: 0,
      });
    }

    return {
      consistent: issues.length === 0,
      issues,
    };
  }
}
