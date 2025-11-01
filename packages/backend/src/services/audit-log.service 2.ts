/**
 * Security Audit Log Service
 * Implements comprehensive audit logging with immutable storage,
 * cryptographic verification, and compliance features
 */

import { createHmac } from 'crypto';
import { logger } from '../utils/logger';
import Redis from 'ioredis';
import { Kafka, Producer } from 'kafkajs';
import { auditMetricsService } from './audit-metrics.service';

// Types
export enum AuditEventType {
  // Authentication & Authorization
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_FAILED = 'auth.failed',
  AUTH_TOKEN_REFRESH = 'auth.token_refresh',
  AUTH_PASSWORD_CHANGE = 'auth.password_change',
  
  // NFT Operations
  NFT_MINT = 'nft.mint',
  NFT_TRANSFER = 'nft.transfer',
  NFT_BURN = 'nft.burn',
  NFT_METADATA_UPDATE = 'nft.metadata_update',
  
  // Trading Operations
  TRADE_ORDER_CREATE = 'trade.order_create',
  TRADE_ORDER_CANCEL = 'trade.order_cancel',
  TRADE_EXECUTE = 'trade.execute',
  
  // Financial Operations
  ROYALTY_DISTRIBUTE = 'royalty.distribute',
  ROYALTY_CLAIM = 'royalty.claim',
  STAKE_DEPOSIT = 'stake.deposit',
  STAKE_WITHDRAW = 'stake.withdraw',
  LENDING_BORROW = 'lending.borrow',
  LENDING_REPAY = 'lending.repay',
  BOND_ISSUE = 'bond.issue',
  BOND_REDEEM = 'bond.redeem',
  
  // Governance
  PROPOSAL_CREATE = 'governance.proposal_create',
  PROPOSAL_VOTE = 'governance.proposal_vote',
  PROPOSAL_EXECUTE = 'governance.proposal_execute',
  PROPOSAL_CANCEL = 'governance.proposal_cancel',
  
  // Content Operations
  CONTENT_UPLOAD = 'content.upload',
  CONTENT_DELETE = 'content.delete',
  CONTENT_UPDATE = 'content.update',
  
  // Admin Operations
  ADMIN_USER_BAN = 'admin.user_ban',
  ADMIN_USER_UNBAN = 'admin.user_unban',
  ADMIN_CONFIG_CHANGE = 'admin.config_change',
  ADMIN_CONTRACT_UPGRADE = 'admin.contract_upgrade',
  
  // Security Events
  SECURITY_RATE_LIMIT = 'security.rate_limit',
  SECURITY_INVALID_INPUT = 'security.invalid_input',
  SECURITY_UNAUTHORIZED_ACCESS = 'security.unauthorized_access',
  SECURITY_SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',
  
  // System Events
  SYSTEM_ERROR = 'system.error',
  SYSTEM_CONFIG_CHANGE = 'system.config_change',
}

export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum AuditStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PENDING = 'pending',
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  severity: AuditSeverity;
  status: AuditStatus;
  
  // Actor information
  userId?: string;
  walletAddress?: string;
  ipAddress: string;
  userAgent: string;
  
  // Resource information
  resourceType?: string;
  resourceId?: string;
  
  // Action details
  action: string;
  description: string;
  metadata?: Record<string, any>;
  
  // Request context
  requestId?: string;
  sessionId?: string;
  
  // Transaction information (for blockchain operations)
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  
  // Security context
  authMethod?: string;
  permissions?: string[];
  
  // Result information
  resultCode?: string;
  resultMessage?: string;
  errorDetails?: any;
  
  // Compliance
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionPeriod?: number; // days
  
  // Cryptographic verification
  hash?: string;
  previousHash?: string;
  signature?: string;
}

export interface AuditLogQuery {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: AuditEventType[];
  severities?: AuditSeverity[];
  userId?: string;
  walletAddress?: string;
  resourceType?: string;
  resourceId?: string;
  status?: AuditStatus;
  limit?: number;
  offset?: number;
}

export interface AuditLogStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsByStatus: Record<string, number>;
  topUsers: Array<{ userId: string; count: number }>;
  topResources: Array<{ resourceType: string; resourceId: string; count: number }>;
  timeRange: { start: Date; end: Date };
}

/**
 * Audit Log Service
 * Provides comprehensive audit logging with immutable storage
 */
export class AuditLogService {
  private redis: Redis;
  private kafka?: Kafka;
  private producer?: Producer;
  private secretKey: string;
  private lastHash: string = '';
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_AUDIT_DB || '2'),
    });
    
    this.secretKey = process.env.AUDIT_SECRET_KEY || 'default-secret-key-change-in-production';
    
    // Initialize Kafka for audit log streaming
    if (process.env.KAFKA_BROKERS) {
      this.initializeKafka();
    }
    
    // Load last hash from storage
    this.loadLastHash();
  }
  
  /**
   * Initialize Kafka producer for audit log streaming
   */
  private async initializeKafka(): Promise<void> {
    try {
      this.kafka = new Kafka({
        clientId: 'audit-log-service',
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      });
      
      this.producer = this.kafka.producer();
      await this.producer.connect();
      
      logger.info('Kafka producer connected for audit logs');
    } catch (error) {
      logger.error('Failed to initialize Kafka for audit logs', { error });
    }
  }
  
  /**
   * Load last hash from storage for chain verification
   */
  private async loadLastHash(): Promise<void> {
    try {
      const hash = await this.redis.get('audit:last_hash');
      this.lastHash = hash || '';
    } catch (error) {
      logger.error('Failed to load last audit hash', { error });
    }
  }
  
  /**
   * Log an audit event
   */
  async logEvent(event: Partial<AuditEvent>): Promise<AuditEvent> {
    const startTime = Date.now();
    
    try {
      // Generate event ID
      const eventId = this.generateEventId();
      
      // Create complete audit event
      const auditEvent: AuditEvent = {
        id: eventId,
        timestamp: new Date(),
        eventType: event.eventType!,
        severity: event.severity || AuditSeverity.INFO,
        status: event.status || AuditStatus.SUCCESS,
        ipAddress: event.ipAddress || 'unknown',
        userAgent: event.userAgent || 'unknown',
        action: event.action!,
        description: event.description!,
        ...event,
      };
      
      // Add cryptographic hash for immutability
      auditEvent.previousHash = this.lastHash;
      auditEvent.hash = this.calculateHash(auditEvent);
      
      // Update last hash
      this.lastHash = auditEvent.hash;
      await this.redis.set('audit:last_hash', this.lastHash);
      
      // Store in Redis (for fast access)
      await this.storeInRedis(auditEvent);
      
      // Stream to Kafka (for long-term storage and analysis)
      await this.streamToKafka(auditEvent);
      
      // Log to Winston for immediate visibility
      this.logToWinston(auditEvent);
      
      // Record metrics
      auditMetricsService.recordEvent(auditEvent.eventType, auditEvent.severity, auditEvent.status);
      
      // Record event duration
      const duration = (Date.now() - startTime) / 1000;
      auditMetricsService.recordEventDuration(auditEvent.eventType, duration);
      
      // Check for critical events and trigger alerts
      await this.checkAndAlert(auditEvent);
      
      return auditEvent;
    } catch (error) {
      logger.error('Failed to log audit event', { error, event });
      throw error;
    }
  }
  
  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `audit_${timestamp}_${random}`;
  }
  
  /**
   * Calculate cryptographic hash for event
   * Creates a chain of hashes to ensure immutability
   */
  private calculateHash(event: AuditEvent): string {
    const data = JSON.stringify({
      id: event.id,
      timestamp: event.timestamp,
      eventType: event.eventType,
      userId: event.userId,
      walletAddress: event.walletAddress,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      previousHash: event.previousHash,
    });
    
    // Use HMAC for additional security
    return createHmac('sha256', this.secretKey)
      .update(data)
      .digest('hex');
  }
  
  /**
   * Verify hash chain integrity
   */
  async verifyHashChain(events: AuditEvent[]): Promise<boolean> {
    try {
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const calculatedHash = this.calculateHash(event);
        
        if (calculatedHash !== event.hash) {
          logger.error('Hash mismatch detected', {
            eventId: event.id,
            expected: event.hash,
            calculated: calculatedHash,
          });
          return false;
        }
        
        if (i > 0 && event.previousHash !== events[i - 1].hash) {
          logger.error('Chain break detected', {
            eventId: event.id,
            previousHash: event.previousHash,
            expectedPreviousHash: events[i - 1].hash,
          });
          return false;
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to verify hash chain', { error });
      return false;
    }
  }
  
  /**
   * Store audit event in Redis
   */
  private async storeInRedis(event: AuditEvent): Promise<void> {
    const key = `audit:event:${event.id}`;
    const ttl = event.retentionPeriod ? event.retentionPeriod * 86400 : 7776000; // Default 90 days
    
    await this.redis.setex(key, ttl, JSON.stringify(event));
    
    // Add to sorted sets for efficient querying
    await this.redis.zadd('audit:timeline', event.timestamp.getTime(), event.id);
    await this.redis.zadd(`audit:user:${event.userId}`, event.timestamp.getTime(), event.id);
    await this.redis.zadd(`audit:type:${event.eventType}`, event.timestamp.getTime(), event.id);
    
    if (event.walletAddress) {
      await this.redis.zadd(`audit:wallet:${event.walletAddress}`, event.timestamp.getTime(), event.id);
    }
  }
  
  /**
   * Stream audit event to Kafka
   */
  private async streamToKafka(event: AuditEvent): Promise<void> {
    if (!this.producer) return;
    
    try {
      await this.producer.send({
        topic: 'audit-logs',
        messages: [
          {
            key: event.id,
            value: JSON.stringify(event),
            headers: {
              eventType: event.eventType,
              severity: event.severity,
              timestamp: event.timestamp.toISOString(),
            },
          },
        ],
      });
    } catch (error) {
      logger.error('Failed to stream audit event to Kafka', { error, eventId: event.id });
    }
  }
  
  /**
   * Log to Winston for immediate visibility
   */
  private logToWinston(event: AuditEvent): void {
    const logLevel = this.mapSeverityToLogLevel(event.severity);
    
    logger.log(logLevel, 'Audit event', {
      auditEventId: event.id,
      eventType: event.eventType,
      severity: event.severity,
      status: event.status,
      userId: event.userId,
      walletAddress: event.walletAddress,
      action: event.action,
      description: event.description,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      ipAddress: event.ipAddress,
      requestId: event.requestId,
      transactionHash: event.transactionHash,
    });
  }
  
  /**
   * Map audit severity to Winston log level
   */
  private mapSeverityToLogLevel(severity: AuditSeverity): string {
    switch (severity) {
      case AuditSeverity.INFO:
        return 'info';
      case AuditSeverity.WARNING:
        return 'warn';
      case AuditSeverity.ERROR:
      case AuditSeverity.CRITICAL:
        return 'error';
      default:
        return 'info';
    }
  }
  
  /**
   * Check for critical events and trigger alerts
   */
  private async checkAndAlert(event: AuditEvent): Promise<void> {
    // Critical events that require immediate attention
    const criticalEventTypes = [
      AuditEventType.SECURITY_UNAUTHORIZED_ACCESS,
      AuditEventType.SECURITY_SUSPICIOUS_ACTIVITY,
      AuditEventType.ADMIN_CONTRACT_UPGRADE,
      AuditEventType.ADMIN_USER_BAN,
    ];
    
    if (
      event.severity === AuditSeverity.CRITICAL ||
      criticalEventTypes.includes(event.eventType)
    ) {
      await this.triggerAlert(event);
    }
    
    // Check for patterns indicating attacks
    await this.detectAnomalies(event);
  }
  
  /**
   * Trigger alert for critical events
   */
  private async triggerAlert(event: AuditEvent): Promise<void> {
    try {
      // Store in critical alerts list
      await this.redis.lpush('audit:critical_alerts', JSON.stringify(event));
      await this.redis.ltrim('audit:critical_alerts', 0, 999); // Keep last 1000
      
      // Publish to alert channel
      await this.redis.publish('audit:alerts', JSON.stringify({
        type: 'critical_audit_event',
        event,
        timestamp: new Date().toISOString(),
      }));
      
      logger.error('CRITICAL AUDIT EVENT', {
        eventId: event.id,
        eventType: event.eventType,
        description: event.description,
        userId: event.userId,
        walletAddress: event.walletAddress,
      });
    } catch (error) {
      logger.error('Failed to trigger audit alert', { error, eventId: event.id });
    }
  }
  
  /**
   * Detect anomalies and suspicious patterns
   */
  private async detectAnomalies(event: AuditEvent): Promise<void> {
    try {
      // Check for rapid repeated actions (potential attack)
      if (event.userId) {
        const recentEvents = await this.redis.zcount(
          `audit:user:${event.userId}`,
          Date.now() - 60000, // Last minute
          Date.now()
        );
        
        if (recentEvents > 100) {
          await this.logEvent({
            eventType: AuditEventType.SECURITY_SUSPICIOUS_ACTIVITY,
            severity: AuditSeverity.WARNING,
            status: AuditStatus.SUCCESS,
            userId: event.userId,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            action: 'anomaly_detection',
            description: `Suspicious activity detected: ${recentEvents} events in 1 minute`,
            metadata: { triggeringEvent: event.id, eventCount: recentEvents },
          });
        }
      }
      
      // Check for failed authentication attempts
      if (event.eventType === AuditEventType.AUTH_FAILED) {
        const failedAttempts = await this.redis.incr(`audit:failed_auth:${event.ipAddress}`);
        await this.redis.expire(`audit:failed_auth:${event.ipAddress}`, 3600); // 1 hour
        
        if (failedAttempts > 5) {
          await this.logEvent({
            eventType: AuditEventType.SECURITY_SUSPICIOUS_ACTIVITY,
            severity: AuditSeverity.WARNING,
            status: AuditStatus.SUCCESS,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            action: 'brute_force_detection',
            description: `Multiple failed authentication attempts from IP: ${failedAttempts}`,
            metadata: { failedAttempts },
          });
        }
      }
    } catch (error) {
      logger.error('Failed to detect anomalies', { error, eventId: event.id });
    }
  }
  
  /**
   * Query audit logs
   */
  async queryLogs(query: AuditLogQuery): Promise<AuditEvent[]> {
    try {
      const events: AuditEvent[] = [];
      const limit = query.limit || 100;
      const offset = query.offset || 0;
      
      // Build query based on filters
      let eventIds: string[] = [];
      
      if (query.userId) {
        eventIds = await this.getEventIdsByUser(query.userId, query.startDate, query.endDate);
      } else if (query.walletAddress) {
        eventIds = await this.getEventIdsByWallet(query.walletAddress, query.startDate, query.endDate);
      } else if (query.eventTypes && query.eventTypes.length > 0) {
        eventIds = await this.getEventIdsByType(query.eventTypes[0], query.startDate, query.endDate);
      } else {
        eventIds = await this.getEventIdsByTimeRange(query.startDate, query.endDate);
      }
      
      // Apply pagination
      const paginatedIds = eventIds.slice(offset, offset + limit);
      
      // Fetch events
      for (const id of paginatedIds) {
        const eventData = await this.redis.get(`audit:event:${id}`);
        if (eventData) {
          const event = JSON.parse(eventData);
          
          // Apply additional filters
          if (this.matchesFilters(event, query)) {
            events.push(event);
          }
        }
      }
      
      return events;
    } catch (error) {
      logger.error('Failed to query audit logs', { error, query });
      throw error;
    }
  }
  
  /**
   * Get event IDs by user
   */
  private async getEventIdsByUser(userId: string, startDate?: Date, endDate?: Date): Promise<string[]> {
    const min = startDate ? startDate.getTime() : '-inf';
    const max = endDate ? endDate.getTime() : '+inf';
    return await this.redis.zrevrangebyscore(`audit:user:${userId}`, max, min);
  }
  
  /**
   * Get event IDs by wallet address
   */
  private async getEventIdsByWallet(walletAddress: string, startDate?: Date, endDate?: Date): Promise<string[]> {
    const min = startDate ? startDate.getTime() : '-inf';
    const max = endDate ? endDate.getTime() : '+inf';
    return await this.redis.zrevrangebyscore(`audit:wallet:${walletAddress}`, max, min);
  }
  
  /**
   * Get event IDs by event type
   */
  private async getEventIdsByType(eventType: AuditEventType, startDate?: Date, endDate?: Date): Promise<string[]> {
    const min = startDate ? startDate.getTime() : '-inf';
    const max = endDate ? endDate.getTime() : '+inf';
    return await this.redis.zrevrangebyscore(`audit:type:${eventType}`, max, min);
  }
  
  /**
   * Get event IDs by time range
   */
  private async getEventIdsByTimeRange(startDate?: Date, endDate?: Date): Promise<string[]> {
    const min = startDate ? startDate.getTime() : '-inf';
    const max = endDate ? endDate.getTime() : '+inf';
    return await this.redis.zrevrangebyscore('audit:timeline', max, min);
  }
  
  /**
   * Check if event matches query filters
   */
  private matchesFilters(event: AuditEvent, query: AuditLogQuery): boolean {
    if (query.eventTypes && !query.eventTypes.includes(event.eventType)) {
      return false;
    }
    
    if (query.severities && !query.severities.includes(event.severity)) {
      return false;
    }
    
    if (query.status && event.status !== query.status) {
      return false;
    }
    
    if (query.resourceType && event.resourceType !== query.resourceType) {
      return false;
    }
    
    if (query.resourceId && event.resourceId !== query.resourceId) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Get audit log statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date): Promise<AuditLogStats> {
    try {
      const events = await this.queryLogs({ startDate, endDate, limit: 10000 });
      
      const stats: AuditLogStats = {
        totalEvents: events.length,
        eventsByType: {},
        eventsBySeverity: {},
        eventsByStatus: {},
        topUsers: [],
        topResources: [],
        timeRange: {
          start: startDate || new Date(0),
          end: endDate || new Date(),
        },
      };
      
      // Count by type
      events.forEach(event => {
        stats.eventsByType[event.eventType] = (stats.eventsByType[event.eventType] || 0) + 1;
        stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;
        stats.eventsByStatus[event.status] = (stats.eventsByStatus[event.status] || 0) + 1;
      });
      
      // Top users
      const userCounts: Record<string, number> = {};
      events.forEach(event => {
        if (event.userId) {
          userCounts[event.userId] = (userCounts[event.userId] || 0) + 1;
        }
      });
      stats.topUsers = Object.entries(userCounts)
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      // Top resources
      const resourceCounts: Record<string, number> = {};
      events.forEach(event => {
        if (event.resourceType && event.resourceId) {
          const key = `${event.resourceType}:${event.resourceId}`;
          resourceCounts[key] = (resourceCounts[key] || 0) + 1;
        }
      });
      stats.topResources = Object.entries(resourceCounts)
        .map(([key, count]) => {
          const [resourceType, resourceId] = key.split(':');
          return { resourceType, resourceId, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      return stats;
    } catch (error) {
      logger.error('Failed to get audit statistics', { error });
      throw error;
    }
  }
  
  /**
   * Export audit logs for compliance
   */
  async exportLogs(query: AuditLogQuery, format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const events = await this.queryLogs({ ...query, limit: 100000 });
      
      if (format === 'json') {
        return JSON.stringify(events, null, 2);
      } else {
        // CSV format
        const headers = [
          'ID', 'Timestamp', 'Event Type', 'Severity', 'Status',
          'User ID', 'Wallet Address', 'IP Address', 'Action',
          'Description', 'Resource Type', 'Resource ID', 'Transaction Hash'
        ];
        
        const rows = events.map(event => [
          event.id,
          event.timestamp.toISOString(),
          event.eventType,
          event.severity,
          event.status,
          event.userId || '',
          event.walletAddress || '',
          event.ipAddress,
          event.action,
          event.description,
          event.resourceType || '',
          event.resourceId || '',
          event.transactionHash || '',
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
      }
    } catch (error) {
      logger.error('Failed to export audit logs', { error });
      throw error;
    }
  }
  
  /**
   * Cleanup old audit logs based on retention policy
   */
  async cleanup(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 86400000);
      const eventIds = await this.redis.zrangebyscore('audit:timeline', '-inf', cutoffDate.getTime());
      
      let deletedCount = 0;
      for (const id of eventIds) {
        await this.redis.del(`audit:event:${id}`);
        deletedCount++;
      }
      
      // Remove from sorted sets
      await this.redis.zremrangebyscore('audit:timeline', '-inf', cutoffDate.getTime());
      
      logger.info('Audit log cleanup completed', { deletedCount, retentionDays });
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup audit logs', { error });
      throw error;
    }
  }
}

// Singleton instance
export const auditLogService = new AuditLogService();
