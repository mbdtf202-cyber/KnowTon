import { Router } from 'express';
import tenantMonitoringService from '../services/tenant-monitoring.service';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

/**
 * @route GET /api/v1/monitoring/health
 * @desc Get current health status for tenant
 * @access Private
 */
router.get('/health', requireTenant, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const health = await tenantMonitoringService.checkTenantHealth(tenantId);

    res.json({
      success: true,
      data: health
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/monitoring/health/history
 * @desc Get health check history
 * @access Private
 */
router.get('/health/history', requireTenant, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const { startDate, endDate } = req.query;

    const history = await tenantMonitoringService.getHealthHistory(
      tenantId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/monitoring/alerts
 * @desc Get tenant alerts
 * @access Private
 */
router.get('/alerts', requireTenant, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const { severity, category, resolved, limit } = req.query;

    const alerts = await tenantMonitoringService.getTenantAlerts(tenantId, {
      severity: severity as any,
      category: category as string,
      resolved: resolved === 'true',
      limit: limit ? parseInt(limit as string) : undefined
    });

    res.json({
      success: true,
      data: alerts
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/monitoring/alerts/:id/resolve
 * @desc Resolve an alert
 * @access Private
 */
router.post('/alerts/:id/resolve', requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const resolvedBy = req.user?.id || 'system';

    await tenantMonitoringService.resolveAlert(id, resolvedBy);

    res.json({
      success: true,
      message: 'Alert resolved'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/monitoring/dashboard
 * @desc Get monitoring dashboard data
 * @access Private
 */
router.get('/dashboard', requireTenant, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const dashboard = await tenantMonitoringService.getMonitoringDashboard(tenantId);

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/monitoring/check-all
 * @desc Check health of all tenants (admin only)
 * @access Admin
 */
router.post('/check-all', async (req, res) => {
  try {
    // TODO: Add admin authentication check
    const results = await tenantMonitoringService.checkAllTenants();

    res.json({
      success: true,
      data: {
        total: results.length,
        healthy: results.filter(r => r.status === 'healthy').length,
        warning: results.filter(r => r.status === 'warning').length,
        critical: results.filter(r => r.status === 'critical').length,
        down: results.filter(r => r.status === 'down').length,
        results
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
