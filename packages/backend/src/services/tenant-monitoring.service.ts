/**
 * Tenant Monitoring Service
 * 
 * Monitors tenant health, usage, and performance metrics
 * Sends alerts when thresholds are exceeded
 */

import { PrismaClient } from '@prisma/client';
import tenantService from './tenant.service';

const prisma = new PrismaClient();

interface TenantHealthStatus {
  tenantId: string;
  tenantSlug: string;
  status: 'healthy' | 'warning' | 'critical' | 'down';
  checks: {
    database: boolean;
    api: boolean;
    storage: boolean;
    users: boolean;
    errorRate: boolean;
  };
  metrics: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    activeUsers: number;
    storageUsed: bigint;
    apiCalls: number;
  };
  alerts: Alert[];
  lastChecked: Date;
}

interface Alert {
  type: 'warning' | 'critical';
  category: 'usage' | 'performance' | 'error' | 'limit';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

interface MonitoringConfig {
  alertThresholds: {
    userLimit: number; // Percentage
    storageLimit: number; // Percentage
    apiRateLimit: number; // Percentage
    errorRate: number; // Percentage
    responseTime: number; // Milliseconds
  };
  notificationChannels: {
    email: boolean;
    webhook: boolean;
    slack: boolean;
  };
  checkInterval: number; // Minutes
}

class TenantMonitoringService {
  /**
   * Check health of a single tenant
   */
  async checkTenantHealth(tenantId: string): Promise<TenantHealthStatus> {
    const tenant = await tenantService.getTenantById(tenantId);
    const monitoring = await this.getMonitoringConfig(tenantId);
    const alerts: Alert[] = [];

    // Check database connectivity
    const databaseCheck = await this.checkDatabase(tenantId);

    // Check API health
    const apiCheck = await this.checkApiHealth(tenantId);

    // Check storage usage
    const storageCheck = await this.checkStorageUsage(tenantId, monitoring);
    if (storageCheck.alert) alerts.push(storageCheck.alert);

    // Check user limits
    const userCheck = await this.checkUserLimits(tenantId, monitoring);
    if (userCheck.alert) alerts.push(userCheck.alert);

    // Check error rate
    const errorCheck = await this.checkErrorRate(tenantId, monitoring);
    if (errorCheck.alert) alerts.push(errorCheck.alert);

    // Get current metrics
    const metrics = await this.getCurrentMetrics(tenantId);

    // Determine overall status
    const status = this.determineStatus(alerts, {
      database: databaseCheck,
      api: apiCheck,
      storage: storageCheck.ok,
      users: userCheck.ok,
      errorRate: errorCheck.ok
    });

    const healthStatus: TenantHealthStatus = {
      tenantId,
      tenantSlug: tenant.slug,
      status,
      checks: {
        database: databaseCheck,
        api: apiCheck,
        storage: storageCheck.ok,
        users: userCheck.ok,
        errorRate: errorCheck.ok
      },
      metrics,
      alerts,
      lastChecked: new Date()
    };

    // Store health check result
    await this.storeHealthCheck(healthStatus);

    // Send alerts if needed
    if (alerts.length > 0) {
      await this.sendAlerts(tenantId, alerts);
    }

    return healthStatus;
  }

  /**
   * Check health of all active tenants
   */
  async checkAllTenants(): Promise<TenantHealthStatus[]> {
    const tenants = await prisma.tenant.findMany({
      where: { status: 'active' },
      select: { id: true }
    });

    const healthStatuses = await Promise.all(
      tenants.map(tenant => this.checkTenantHealth(tenant.id))
    );

    return healthStatuses;
  }

  /**
   * Get tenant health history
   */
  async getHealthHistory(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    const where: any = { tenantId };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    return await prisma.tenantHealthCheck.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100
    });
  }

  /**
   * Get tenant alerts
   */
  async getTenantAlerts(
    tenantId: string,
    options?: {
      severity?: 'warning' | 'critical';
      category?: string;
      resolved?: boolean;
      limit?: number;
    }
  ): Promise<any[]> {
    const where: any = { tenantId };

    if (options?.severity) {
      where.severity = options.severity;
    }

    if (options?.category) {
      where.category = options.category;
    }

    if (options?.resolved !== undefined) {
      where.resolved = options.resolved;
    }

    return await prisma.tenantAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50
    });
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, resolvedBy: string): Promise<void> {
    await prisma.tenantAlert.update({
      where: { id: alertId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy
      }
    });
  }

  /**
   * Get monitoring dashboard data
   */
  async getMonitoringDashboard(tenantId: string): Promise<any> {
    const [
      tenant,
      currentHealth,
      recentAlerts,
      usageMetrics,
      performanceMetrics
    ] = await Promise.all([
      tenantService.getTenantById(tenantId),
      this.checkTenantHealth(tenantId),
      this.getTenantAlerts(tenantId, { resolved: false, limit: 10 }),
      this.getUsageMetrics(tenantId),
      this.getPerformanceMetrics(tenantId)
    ]);

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        status: tenant.status
      },
      health: currentHealth,
      alerts: recentAlerts,
      usage: usageMetrics,
      performance: performanceMetrics
    };
  }

  /**
   * Private helper methods
   */

  private async checkDatabase(tenantId: string): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error(`Database check failed for tenant ${tenantId}:`, error);
      return false;
    }
  }

  private async checkApiHealth(tenantId: string): Promise<boolean> {
    // In production, this would make an actual HTTP request to the tenant's API
    // For now, we'll assume it's healthy if the database is accessible
    return true;
  }

  private async checkStorageUsage(
    tenantId: string,
    config: MonitoringConfig
  ): Promise<{ ok: boolean; alert?: Alert }> {
    const limits = await tenantService.checkLimits(tenantId);
    const usagePercent = Number(
      (BigInt(100) * limits.storage.current) / BigInt(limits.storage.limit)
    );

    if (usagePercent >= config.alertThresholds.storageLimit) {
      return {
        ok: false,
        alert: {
          type: usagePercent >= 95 ? 'critical' : 'warning',
          category: 'limit',
          message: `Storage usage at ${usagePercent.toFixed(1)}%`,
          value: usagePercent,
          threshold: config.alertThresholds.storageLimit,
          timestamp: new Date()
        }
      };
    }

    return { ok: true };
  }

  private async checkUserLimits(
    tenantId: string,
    config: MonitoringConfig
  ): Promise<{ ok: boolean; alert?: Alert }> {
    const limits = await tenantService.checkLimits(tenantId);
    const usagePercent = (limits.users.current / limits.users.limit) * 100;

    if (usagePercent >= config.alertThresholds.userLimit) {
      return {
        ok: false,
        alert: {
          type: usagePercent >= 95 ? 'critical' : 'warning',
          category: 'limit',
          message: `User limit at ${usagePercent.toFixed(1)}%`,
          value: usagePercent,
          threshold: config.alertThresholds.userLimit,
          timestamp: new Date()
        }
      };
    }

    return { ok: true };
  }

  private async checkErrorRate(
    tenantId: string,
    config: MonitoringConfig
  ): Promise<{ ok: boolean; alert?: Alert }> {
    // Get error rate from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const [totalRequests, errorRequests] = await Promise.all([
      prisma.apiLog.count({
        where: {
          tenantId,
          timestamp: { gte: oneHourAgo }
        }
      }),
      prisma.apiLog.count({
        where: {
          tenantId,
          timestamp: { gte: oneHourAgo },
          statusCode: { gte: 500 }
        }
      })
    ]);

    const errorRate = totalRequests > 0 
      ? (errorRequests / totalRequests) * 100 
      : 0;

    if (errorRate >= config.alertThresholds.errorRate) {
      return {
        ok: false,
        alert: {
          type: errorRate >= 10 ? 'critical' : 'warning',
          category: 'error',
          message: `Error rate at ${errorRate.toFixed(2)}%`,
          value: errorRate,
          threshold: config.alertThresholds.errorRate,
          timestamp: new Date()
        }
      };
    }

    return { ok: true };
  }

  private async getCurrentMetrics(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await prisma.tenantUsageMetric.findUnique({
      where: {
        tenantId_date: {
          tenantId,
          date: today
        }
      }
    });

    return {
      uptime: 99.9, // Would be calculated from actual uptime data
      responseTime: 150, // Would be calculated from actual response times
      errorRate: 0.5, // Would be calculated from actual error logs
      activeUsers: usage?.activeUsers || 0,
      storageUsed: usage?.storageUsed || BigInt(0),
      apiCalls: usage?.apiCalls || 0
    };
  }

  private determineStatus(
    alerts: Alert[],
    checks: Record<string, boolean>
  ): 'healthy' | 'warning' | 'critical' | 'down' {
    // If any critical check fails, status is down
    if (!checks.database || !checks.api) {
      return 'down';
    }

    // If there are critical alerts, status is critical
    if (alerts.some(a => a.type === 'critical')) {
      return 'critical';
    }

    // If there are warnings, status is warning
    if (alerts.length > 0) {
      return 'warning';
    }

    // Otherwise, healthy
    return 'healthy';
  }

  private async storeHealthCheck(health: TenantHealthStatus): Promise<void> {
    await prisma.tenantHealthCheck.create({
      data: {
        tenantId: health.tenantId,
        status: health.status,
        checks: health.checks,
        metrics: health.metrics as any,
        alertCount: health.alerts.length,
        timestamp: health.lastChecked
      }
    });
  }

  private async sendAlerts(tenantId: string, alerts: Alert[]): Promise<void> {
    const config = await this.getMonitoringConfig(tenantId);
    const tenant = await tenantService.getTenantById(tenantId);

    // Store alerts in database
    for (const alert of alerts) {
      await prisma.tenantAlert.create({
        data: {
          tenantId,
          severity: alert.type,
          category: alert.category,
          message: alert.message,
          value: alert.value,
          threshold: alert.threshold
        }
      });
    }

    // Send notifications based on configuration
    if (config.notificationChannels.email) {
      await this.sendEmailAlert(tenant, alerts);
    }

    if (config.notificationChannels.webhook && tenant.tenantConfig?.webhookUrl) {
      await this.sendWebhookAlert(tenant.tenantConfig.webhookUrl, alerts);
    }

    if (config.notificationChannels.slack) {
      await this.sendSlackAlert(tenant, alerts);
    }
  }

  private async sendEmailAlert(tenant: any, alerts: Alert[]): Promise<void> {
    // In production, this would send actual emails
    console.log(`📧 Email alert for tenant ${tenant.slug}:`, alerts);
  }

  private async sendWebhookAlert(webhookUrl: string, alerts: Alert[]): Promise<void> {
    // In production, this would make an HTTP POST to the webhook URL
    console.log(`🔔 Webhook alert to ${webhookUrl}:`, alerts);
  }

  private async sendSlackAlert(tenant: any, alerts: Alert[]): Promise<void> {
    // In production, this would send to Slack
    console.log(`💬 Slack alert for tenant ${tenant.slug}:`, alerts);
  }

  private async getMonitoringConfig(tenantId: string): Promise<MonitoringConfig> {
    const config = await prisma.tenantMonitoring.findUnique({
      where: { tenantId }
    });

    return config || {
      alertThresholds: {
        userLimit: 90,
        storageLimit: 85,
        apiRateLimit: 80,
        errorRate: 5,
        responseTime: 1000
      },
      notificationChannels: {
        email: true,
        webhook: false,
        slack: false
      },
      checkInterval: 5
    };
  }

  private async getUsageMetrics(tenantId: string) {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const metrics = await prisma.tenantUsageMetric.findMany({
      where: {
        tenantId,
        date: { gte: last30Days }
      },
      orderBy: { date: 'asc' }
    });

    return {
      daily: metrics,
      summary: {
        totalUsers: metrics[metrics.length - 1]?.activeUsers || 0,
        totalStorage: metrics[metrics.length - 1]?.storageUsed || BigInt(0),
        totalApiCalls: metrics.reduce((sum, m) => sum + (m.apiCalls || 0), 0),
        totalRevenue: metrics.reduce((sum, m) => sum + (m.revenue || 0), 0)
      }
    };
  }

  private async getPerformanceMetrics(tenantId: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const logs = await prisma.apiLog.findMany({
      where: {
        tenantId,
        timestamp: { gte: oneHourAgo }
      },
      select: {
        responseTime: true,
        statusCode: true
      }
    });

    const responseTimes = logs.map(l => l.responseTime).filter(Boolean);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    const errorCount = logs.filter(l => l.statusCode >= 500).length;
    const errorRate = logs.length > 0 ? (errorCount / logs.length) * 100 : 0;

    return {
      avgResponseTime,
      errorRate,
      requestCount: logs.length,
      errorCount
    };
  }
}

export default new TenantMonitoringService();
