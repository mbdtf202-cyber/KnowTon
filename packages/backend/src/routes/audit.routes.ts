/**
 * Audit Log API Routes
 * Provides endpoints for querying, analyzing, and exporting audit logs
 */

import { Router, Request, Response } from 'express';
import { auditLogService, AuditEventType, AuditSeverity, AuditStatus } from '../services/audit-log.service';
import { logger } from '../utils/logger';
import { validatePagination } from '../middleware/security';
import { handleValidationErrors } from '../middleware/security';
import { query, param } from 'express-validator';

const router = Router();

/**
 * GET /api/v1/audit/logs
 * Query audit logs with filters
 */
router.get(
  '/logs',
  [
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
    query('eventTypes').optional().isString().withMessage('Event types must be a comma-separated string'),
    query('severities').optional().isString().withMessage('Severities must be a comma-separated string'),
    query('userId').optional().isString().withMessage('Invalid user ID'),
    query('walletAddress').optional().isEthereumAddress().withMessage('Invalid wallet address'),
    query('resourceType').optional().isString().withMessage('Invalid resource type'),
    query('resourceId').optional().isString().withMessage('Invalid resource ID'),
    query('status').optional().isIn(['success', 'failure', 'pending']).withMessage('Invalid status'),
    ...validatePagination,
    handleValidationErrors,
  ],
  async (req: Request, res: Response) => {
    try {
      // Parse query parameters
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const eventTypes = req.query.eventTypes 
        ? (req.query.eventTypes as string).split(',') as AuditEventType[]
        : undefined;
      const severities = req.query.severities
        ? (req.query.severities as string).split(',') as AuditSeverity[]
        : undefined;
      const status = req.query.status as AuditStatus | undefined;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      // Query audit logs
      const logs = await auditLogService.queryLogs({
        startDate,
        endDate,
        eventTypes,
        severities,
        userId: req.query.userId as string,
        walletAddress: req.query.walletAddress as string,
        resourceType: req.query.resourceType as string,
        resourceId: req.query.resourceId as string,
        status,
        limit,
        offset,
      });
      
      res.json({
        success: true,
        data: logs,
        pagination: {
          limit,
          offset,
          total: logs.length,
        },
      });
    } catch (error) {
      logger.error('Failed to query audit logs', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to query audit logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/v1/audit/logs/:id
 * Get specific audit log by ID
 */
router.get(
  '/logs/:id',
  [
    param('id').isString().withMessage('Invalid audit log ID'),
    handleValidationErrors,
  ],
  async (req: Request, res: Response) => {
    try {
      const logs = await auditLogService.queryLogs({ limit: 1 });
      const log = logs.find(l => l.id === req.params.id);
      
      if (!log) {
        return res.status(404).json({
          success: false,
          error: 'Audit log not found',
        });
      }
      
      res.json({
        success: true,
        data: log,
      });
    } catch (error) {
      logger.error('Failed to get audit log', { error, id: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to get audit log',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/v1/audit/statistics
 * Get audit log statistics
 */
router.get(
  '/statistics',
  [
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
    handleValidationErrors,
  ],
  async (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const stats = await auditLogService.getStatistics(startDate, endDate);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get audit statistics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get audit statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/v1/audit/export
 * Export audit logs for compliance
 */
router.get(
  '/export',
  [
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
    query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv'),
    query('eventTypes').optional().isString().withMessage('Event types must be a comma-separated string'),
    handleValidationErrors,
  ],
  async (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const format = (req.query.format as 'json' | 'csv') || 'json';
      const eventTypes = req.query.eventTypes 
        ? (req.query.eventTypes as string).split(',') as AuditEventType[]
        : undefined;
      
      const exportData = await auditLogService.exportLogs(
        {
          startDate,
          endDate,
          eventTypes,
          limit: 100000,
        },
        format
      );
      
      // Set appropriate headers
      const filename = `audit-logs-${Date.now()}.${format}`;
      res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.send(exportData);
    } catch (error) {
      logger.error('Failed to export audit logs', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to export audit logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/v1/audit/verify
 * Verify audit log integrity (hash chain verification)
 */
router.get(
  '/verify',
  [
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
    handleValidationErrors,
  ],
  async (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const limit = parseInt(req.query.limit as string) || 1000;
      
      // Get logs to verify
      const logs = await auditLogService.queryLogs({
        startDate,
        endDate,
        limit,
      });
      
      // Verify hash chain
      const isValid = await auditLogService.verifyHashChain(logs);
      
      res.json({
        success: true,
        data: {
          isValid,
          verifiedCount: logs.length,
          startDate: logs[0]?.timestamp,
          endDate: logs[logs.length - 1]?.timestamp,
        },
      });
    } catch (error) {
      logger.error('Failed to verify audit logs', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to verify audit logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/v1/audit/alerts
 * Get critical audit alerts
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    // Get critical alerts from Redis
    const redis = (auditLogService as any).redis;
    const alerts = await redis.lrange('audit:critical_alerts', 0, 99);
    
    const parsedAlerts = alerts.map((alert: string) => JSON.parse(alert));
    
    res.json({
      success: true,
      data: parsedAlerts,
      count: parsedAlerts.length,
    });
  } catch (error) {
    logger.error('Failed to get audit alerts', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get audit alerts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/audit/user/:userId
 * Get audit logs for specific user
 */
router.get(
  '/user/:userId',
  [
    param('userId').isString().withMessage('Invalid user ID'),
    ...validatePagination,
    handleValidationErrors,
  ],
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const logs = await auditLogService.queryLogs({
        userId: req.params.userId,
        limit,
        offset,
      });
      
      res.json({
        success: true,
        data: logs,
        pagination: {
          limit,
          offset,
          total: logs.length,
        },
      });
    } catch (error) {
      logger.error('Failed to get user audit logs', { error, userId: req.params.userId });
      res.status(500).json({
        success: false,
        error: 'Failed to get user audit logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/v1/audit/wallet/:address
 * Get audit logs for specific wallet address
 */
router.get(
  '/wallet/:address',
  [
    param('address').isEthereumAddress().withMessage('Invalid wallet address'),
    ...validatePagination,
    handleValidationErrors,
  ],
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const logs = await auditLogService.queryLogs({
        walletAddress: req.params.address,
        limit,
        offset,
      });
      
      res.json({
        success: true,
        data: logs,
        pagination: {
          limit,
          offset,
          total: logs.length,
        },
      });
    } catch (error) {
      logger.error('Failed to get wallet audit logs', { error, address: req.params.address });
      res.status(500).json({
        success: false,
        error: 'Failed to get wallet audit logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/v1/audit/cleanup
 * Cleanup old audit logs (admin only)
 */
router.post(
  '/cleanup',
  [
    query('retentionDays').optional().isInt({ min: 1, max: 3650 }).withMessage('Retention days must be between 1 and 3650'),
    handleValidationErrors,
  ],
  async (req: Request, res: Response) => {
    try {
      // TODO: Add admin authentication check
      // if (!req.user?.role || req.user.role !== 'admin') {
      //   return res.status(403).json({ success: false, error: 'Unauthorized' });
      // }
      
      const retentionDays = parseInt(req.query.retentionDays as string) || 90;
      
      const deletedCount = await auditLogService.cleanup(retentionDays);
      
      res.json({
        success: true,
        data: {
          deletedCount,
          retentionDays,
        },
      });
    } catch (error) {
      logger.error('Failed to cleanup audit logs', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup audit logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/v1/audit/event-types
 * Get list of available audit event types
 */
router.get('/event-types', (req: Request, res: Response) => {
  const eventTypes = Object.values(AuditEventType);
  
  res.json({
    success: true,
    data: eventTypes,
  });
});

/**
 * GET /api/v1/audit/health
 * Health check for audit logging system
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check Redis connection
    const redis = (auditLogService as any).redis;
    await redis.ping();
    
    // Get last hash to verify system is working
    const lastHash = await redis.get('audit:last_hash');
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        redis: 'connected',
        lastHash: lastHash ? lastHash.substring(0, 16) + '...' : 'none',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Audit system health check failed', { error });
    res.status(503).json({
      success: false,
      error: 'Audit system unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
