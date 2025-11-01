/**
 * Audit Metrics Service
 * Exports Prometheus metrics for audit log monitoring and alerting
 */

import { Counter, Gauge, Histogram, Registry } from 'prom-client';
import { AuditEventType, AuditSeverity, AuditStatus } from './audit-log.service';

// Create a custom registry for audit metrics
export const auditMetricsRegistry = new Registry();

/**
 * Audit event counter
 * Tracks total number of audit events by type, severity, and status
 */
export const auditEventTotal = new Counter({
  name: 'audit_events_total',
  help: 'Total number of audit events',
  labelNames: ['event_type', 'severity', 'status'],
  registers: [auditMetricsRegistry],
});

/**
 * Audit event duration histogram
 * Tracks time taken to log audit events
 */
export const auditEventDuration = new Histogram({
  name: 'audit_event_duration_seconds',
  help: 'Duration of audit event logging in seconds',
  labelNames: ['event_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [auditMetricsRegistry],
});

/**
 * Critical audit events counter
 * Tracks critical security events that require immediate attention
 */
export const criticalAuditEvents = new Counter({
  name: 'audit_critical_events_total',
  help: 'Total number of critical audit events',
  labelNames: ['event_type'],
  registers: [auditMetricsRegistry],
});

/**
 * Failed operations counter
 * Tracks failed operations by type
 */
export const failedOperations = new Counter({
  name: 'audit_failed_operations_total',
  help: 'Total number of failed operations',
  labelNames: ['event_type', 'error_type'],
  registers: [auditMetricsRegistry],
});

/**
 * Authentication failures counter
 * Tracks authentication failures by IP and user
 */
export const authFailures = new Counter({
  name: 'audit_auth_failures_total',
  help: 'Total number of authentication failures',
  labelNames: ['ip_address', 'user_id'],
  registers: [auditMetricsRegistry],
});

/**
 * Suspicious activity counter
 * Tracks detected suspicious activities
 */
export const suspiciousActivity = new Counter({
  name: 'audit_suspicious_activity_total',
  help: 'Total number of suspicious activities detected',
  labelNames: ['activity_type', 'ip_address'],
  registers: [auditMetricsRegistry],
});

/**
 * Audit log storage size gauge
 * Tracks current size of audit log storage
 */
export const auditLogStorageSize = new Gauge({
  name: 'audit_log_storage_bytes',
  help: 'Current size of audit log storage in bytes',
  registers: [auditMetricsRegistry],
});

/**
 * Audit log count gauge
 * Tracks total number of audit logs
 */
export const auditLogCount = new Gauge({
  name: 'audit_log_count',
  help: 'Total number of audit logs',
  labelNames: ['time_range'],
  registers: [auditMetricsRegistry],
});

/**
 * Hash chain verification gauge
 * Tracks hash chain integrity status
 */
export const hashChainIntegrity = new Gauge({
  name: 'audit_hash_chain_integrity',
  help: 'Hash chain integrity status (1 = valid, 0 = invalid)',
  registers: [auditMetricsRegistry],
});

/**
 * User activity gauge
 * Tracks active users in audit logs
 */
export const activeUsers = new Gauge({
  name: 'audit_active_users',
  help: 'Number of active users in audit logs',
  labelNames: ['time_range'],
  registers: [auditMetricsRegistry],
});

/**
 * Resource access counter
 * Tracks resource access by type
 */
export const resourceAccess = new Counter({
  name: 'audit_resource_access_total',
  help: 'Total number of resource accesses',
  labelNames: ['resource_type', 'action'],
  registers: [auditMetricsRegistry],
});

/**
 * Financial operations counter
 * Tracks financial operations (trades, stakes, loans, etc.)
 */
export const financialOperations = new Counter({
  name: 'audit_financial_operations_total',
  help: 'Total number of financial operations',
  labelNames: ['operation_type', 'status'],
  registers: [auditMetricsRegistry],
});

/**
 * Financial operations value histogram
 * Tracks value of financial operations
 */
export const financialOperationValue = new Histogram({
  name: 'audit_financial_operation_value',
  help: 'Value of financial operations',
  labelNames: ['operation_type', 'currency'],
  buckets: [10, 100, 1000, 10000, 100000, 1000000],
  registers: [auditMetricsRegistry],
});

/**
 * Admin operations counter
 * Tracks administrative operations
 */
export const adminOperations = new Counter({
  name: 'audit_admin_operations_total',
  help: 'Total number of administrative operations',
  labelNames: ['operation_type', 'admin_id'],
  registers: [auditMetricsRegistry],
});

/**
 * Governance operations counter
 * Tracks governance operations (proposals, votes, etc.)
 */
export const governanceOperations = new Counter({
  name: 'audit_governance_operations_total',
  help: 'Total number of governance operations',
  labelNames: ['operation_type'],
  registers: [auditMetricsRegistry],
});

/**
 * NFT operations counter
 * Tracks NFT operations (mint, transfer, burn, etc.)
 */
export const nftOperations = new Counter({
  name: 'audit_nft_operations_total',
  help: 'Total number of NFT operations',
  labelNames: ['operation_type', 'status'],
  registers: [auditMetricsRegistry],
});

/**
 * Content operations counter
 * Tracks content operations (upload, delete, update, etc.)
 */
export const contentOperations = new Counter({
  name: 'audit_content_operations_total',
  help: 'Total number of content operations',
  labelNames: ['operation_type', 'content_type'],
  registers: [auditMetricsRegistry],
});

/**
 * Rate limit violations counter
 * Tracks rate limit violations
 */
export const rateLimitViolations = new Counter({
  name: 'audit_rate_limit_violations_total',
  help: 'Total number of rate limit violations',
  labelNames: ['endpoint', 'ip_address'],
  registers: [auditMetricsRegistry],
});

/**
 * Audit Metrics Service
 * Provides methods to record audit metrics
 */
export class AuditMetricsService {
  /**
   * Record audit event
   */
  recordEvent(eventType: AuditEventType, severity: AuditSeverity, status: AuditStatus): void {
    auditEventTotal.labels(eventType, severity, status).inc();
    
    // Track critical events separately
    if (severity === AuditSeverity.CRITICAL) {
      criticalAuditEvents.labels(eventType).inc();
    }
    
    // Track failed operations
    if (status === AuditStatus.FAILURE) {
      failedOperations.labels(eventType, 'unknown').inc();
    }
    
    // Track specific operation types
    this.trackOperationType(eventType, status);
  }
  
  /**
   * Track operation type specific metrics
   */
  private trackOperationType(eventType: AuditEventType, status: AuditStatus): void {
    // Financial operations
    if (this.isFinancialOperation(eventType)) {
      financialOperations.labels(eventType, status).inc();
    }
    
    // Admin operations
    if (eventType.startsWith('admin.')) {
      adminOperations.labels(eventType, 'system').inc();
    }
    
    // Governance operations
    if (eventType.startsWith('governance.')) {
      governanceOperations.labels(eventType).inc();
    }
    
    // NFT operations
    if (eventType.startsWith('nft.')) {
      nftOperations.labels(eventType, status).inc();
    }
    
    // Content operations
    if (eventType.startsWith('content.')) {
      contentOperations.labels(eventType, 'unknown').inc();
    }
  }
  
  /**
   * Check if event type is a financial operation
   */
  private isFinancialOperation(eventType: AuditEventType): boolean {
    const financialTypes = [
      AuditEventType.TRADE_ORDER_CREATE,
      AuditEventType.TRADE_EXECUTE,
      AuditEventType.ROYALTY_DISTRIBUTE,
      AuditEventType.ROYALTY_CLAIM,
      AuditEventType.STAKE_DEPOSIT,
      AuditEventType.STAKE_WITHDRAW,
      AuditEventType.LENDING_BORROW,
      AuditEventType.LENDING_REPAY,
      AuditEventType.BOND_ISSUE,
      AuditEventType.BOND_REDEEM,
    ];
    
    return financialTypes.includes(eventType);
  }
  
  /**
   * Record event duration
   */
  recordEventDuration(eventType: AuditEventType, durationSeconds: number): void {
    auditEventDuration.labels(eventType).observe(durationSeconds);
  }
  
  /**
   * Record authentication failure
   */
  recordAuthFailure(ipAddress: string, userId?: string): void {
    authFailures.labels(ipAddress, userId || 'unknown').inc();
  }
  
  /**
   * Record suspicious activity
   */
  recordSuspiciousActivity(activityType: string, ipAddress: string): void {
    suspiciousActivity.labels(activityType, ipAddress).inc();
  }
  
  /**
   * Record resource access
   */
  recordResourceAccess(resourceType: string, action: string): void {
    resourceAccess.labels(resourceType, action).inc();
  }
  
  /**
   * Record financial operation value
   */
  recordFinancialValue(operationType: string, value: number, currency: string = 'USD'): void {
    financialOperationValue.labels(operationType, currency).observe(value);
  }
  
  /**
   * Record rate limit violation
   */
  recordRateLimitViolation(endpoint: string, ipAddress: string): void {
    rateLimitViolations.labels(endpoint, ipAddress).inc();
  }
  
  /**
   * Update storage metrics
   */
  updateStorageMetrics(sizeBytes: number, count: number): void {
    auditLogStorageSize.set(sizeBytes);
    auditLogCount.labels('total').set(count);
  }
  
  /**
   * Update hash chain integrity status
   */
  updateHashChainIntegrity(isValid: boolean): void {
    hashChainIntegrity.set(isValid ? 1 : 0);
  }
  
  /**
   * Update active users count
   */
  updateActiveUsers(count: number, timeRange: string = '24h'): void {
    activeUsers.labels(timeRange).set(count);
  }
  
  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return await auditMetricsRegistry.metrics();
  }
  
  /**
   * Reset all metrics (for testing)
   */
  resetMetrics(): void {
    auditMetricsRegistry.resetMetrics();
  }
}

// Singleton instance
export const auditMetricsService = new AuditMetricsService();
