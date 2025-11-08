/**
 * Data Sync Health Check Routes
 * Provides health, readiness, and metrics endpoints for CDC sync service
 * Requirements: 数据一致性需求, 监控需求
 */

import { Router, Request, Response } from 'express';
import { CDCSyncService } from '../services/cdc-sync.service';

const router = Router();

// Singleton instance (should be injected in production)
let cdcService: CDCSyncService | null = null;

export function setCDCService(service: CDCSyncService) {
  cdcService = service;
}

/**
 * @route GET /api/v1/data-sync/health
 * @desc Get comprehensive health status
 * @access Public
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    if (!cdcService) {
      return res.status(503).json({
        status: 'unhealthy',
        message: 'CDC service not initialized',
      });
    }

    const health = await cdcService.getHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route GET /api/v1/data-sync/ready
 * @desc Kubernetes readiness probe
 * @access Public
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    if (!cdcService) {
      return res.status(503).json({
        ready: false,
        message: 'CDC service not initialized',
      });
    }

    const ready = await cdcService.isReady();
    
    if (ready) {
      res.status(200).json({
        ready: true,
        message: 'Service is ready',
      });
    } else {
      res.status(503).json({
        ready: false,
        message: 'Service is not ready',
      });
    }
  } catch (error) {
    console.error('Readiness check error:', error);
    res.status(503).json({
      ready: false,
      message: 'Readiness check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route GET /api/v1/data-sync/live
 * @desc Kubernetes liveness probe
 * @access Public
 */
router.get('/live', async (req: Request, res: Response) => {
  try {
    if (!cdcService) {
      return res.status(503).json({
        alive: false,
        message: 'CDC service not initialized',
      });
    }

    const alive = await cdcService.isAlive();
    
    if (alive) {
      res.status(200).json({
        alive: true,
        message: 'Service is alive',
      });
    } else {
      res.status(503).json({
        alive: false,
        message: 'Service is not alive',
      });
    }
  } catch (error) {
    console.error('Liveness check error:', error);
    res.status(503).json({
      alive: false,
      message: 'Liveness check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route GET /api/v1/data-sync/metrics
 * @desc Prometheus metrics endpoint
 * @access Public
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    if (!cdcService) {
      return res.status(503).send('# CDC service not initialized\n');
    }

    const metrics = await cdcService.getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    console.error('Metrics endpoint error:', error);
    res.status(500).send('# Error retrieving metrics\n');
  }
});

/**
 * @route GET /api/v1/data-sync/consistency
 * @desc Validate data consistency across systems
 * @access Public
 */
router.get('/consistency', async (req: Request, res: Response) => {
  try {
    if (!cdcService) {
      return res.status(503).json({
        error: 'CDC service not initialized',
      });
    }

    const result = await cdcService.validateDataConsistency();
    
    res.status(200).json({
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error('Consistency check error:', error);
    res.status(500).json({
      error: 'Consistency check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
