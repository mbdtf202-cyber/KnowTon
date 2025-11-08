#!/usr/bin/env ts-node

/**
 * Tenant Monitoring Cron Job
 * 
 * Runs periodic health checks on all active tenants
 * and sends alerts when issues are detected
 */

import { PrismaClient } from '@prisma/client';
import tenantMonitoringService from '../services/tenant-monitoring.service';

const prisma = new PrismaClient();

interface MonitoringReport {
  timestamp: Date;
  totalTenants: number;
  healthy: number;
  warning: number;
  critical: number;
  down: number;
  alerts: number;
  duration: number;
}

class TenantMonitor {
  /**
   * Run health checks on all tenants
   */
  async checkAll(): Promise<MonitoringReport> {
    const startTime = Date.now();
    
    console.log('\n🔍 Starting tenant health checks...');
    console.log(`   Time: ${new Date().toISOString()}\n`);

    try {
      // Get all health statuses
      const results = await tenantMonitoringService.checkAllTenants();

      // Count by status
      const statusCounts = {
        healthy: results.filter(r => r.status === 'healthy').length,
        warning: results.filter(r => r.status === 'warning').length,
        critical: results.filter(r => r.status === 'critical').length,
        down: results.filter(r => r.status === 'down').length
      };

      // Count total alerts
      const totalAlerts = results.reduce((sum, r) => sum + r.alerts.length, 0);

      // Log results
      console.log('📊 Health Check Results:');
      console.log('─────────────────────────────────────');
      console.log(`   Total Tenants: ${results.length}`);
      console.log(`   ✅ Healthy: ${statusCounts.healthy}`);
      console.log(`   ⚠️  Warning: ${statusCounts.warning}`);
      console.log(`   🔴 Critical: ${statusCounts.critical}`);
      console.log(`   ❌ Down: ${statusCounts.down}`);
      console.log(`   🚨 Total Alerts: ${totalAlerts}`);
      console.log('─────────────────────────────────────\n');

      // Log details for non-healthy tenants
      const unhealthyTenants = results.filter(r => r.status !== 'healthy');
      if (unhealthyTenants.length > 0) {
        console.log('⚠️  Unhealthy Tenants:');
        console.log('─────────────────────────────────────');
        
        for (const tenant of unhealthyTenants) {
          console.log(`\n   ${tenant.tenantSlug} (${tenant.status.toUpperCase()})`);
          console.log(`   Tenant ID: ${tenant.tenantId}`);
          
          if (tenant.alerts.length > 0) {
            console.log('   Alerts:');
            tenant.alerts.forEach(alert => {
              const icon = alert.type === 'critical' ? '🔴' : '⚠️';
              console.log(`     ${icon} ${alert.message}`);
            });
          }
          
          console.log('   Checks:');
          Object.entries(tenant.checks).forEach(([check, passed]) => {
            const icon = passed ? '✅' : '❌';
            console.log(`     ${icon} ${check}`);
          });
        }
        console.log('\n─────────────────────────────────────\n');
      }

      const duration = Date.now() - startTime;

      const report: MonitoringReport = {
        timestamp: new Date(),
        totalTenants: results.length,
        healthy: statusCounts.healthy,
        warning: statusCounts.warning,
        critical: statusCounts.critical,
        down: statusCounts.down,
        alerts: totalAlerts,
        duration
      };

      // Store report
      await this.storeReport(report);

      console.log(`✅ Health checks completed in ${duration}ms\n`);

      return report;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  }

  /**
   * Generate daily report
   */
  async generateDailyReport(): Promise<void> {
    console.log('\n📈 Generating daily monitoring report...\n');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Get all tenants
      const tenants = await prisma.tenant.findMany({
        where: { status: 'active' },
        include: {
          _count: {
            select: {
              users: true,
              contents: true
            }
          }
        }
      });

      console.log('📊 Daily Report Summary:');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`Date: ${yesterday.toISOString().split('T')[0]}`);
      console.log(`Total Active Tenants: ${tenants.length}\n`);

      for (const tenant of tenants) {
        // Get health history for yesterday
        const healthChecks = await tenantMonitoringService.getHealthHistory(
          tenant.id,
          yesterday,
          today
        );

        // Get alerts from yesterday
        const alerts = await tenantMonitoringService.getTenantAlerts(tenant.id, {
          resolved: false
        });

        // Get usage metrics
        const usage = await prisma.tenantUsageMetric.findUnique({
          where: {
            tenantId_date: {
              tenantId: tenant.id,
              date: yesterday
            }
          }
        });

        console.log(`\n${tenant.name} (${tenant.slug})`);
        console.log('───────────────────────────────────────────────────────');
        console.log(`  Plan: ${tenant.plan}`);
        console.log(`  Users: ${tenant._count.users} / ${tenant.maxUsers}`);
        console.log(`  Contents: ${tenant._count.contents}`);
        
        if (usage) {
          console.log(`  Active Users: ${usage.activeUsers}`);
          console.log(`  Storage Used: ${this.formatBytes(Number(usage.storageUsed))}`);
          console.log(`  API Calls: ${usage.apiCalls}`);
          console.log(`  Revenue: $${usage.revenue?.toFixed(2) || '0.00'}`);
        }

        if (healthChecks.length > 0) {
          const avgUptime = healthChecks.filter((h: any) => 
            h.status === 'healthy'
          ).length / healthChecks.length * 100;
          console.log(`  Uptime: ${avgUptime.toFixed(2)}%`);
        }

        if (alerts.length > 0) {
          console.log(`  ⚠️  Active Alerts: ${alerts.length}`);
        }
      }

      console.log('\n═══════════════════════════════════════════════════════\n');
      console.log('✅ Daily report generated\n');

    } catch (error) {
      console.error('❌ Failed to generate daily report:', error);
      throw error;
    }
  }

  /**
   * Cleanup old logs
   */
  async cleanupLogs(): Promise<void> {
    console.log('\n🧹 Cleaning up old monitoring logs...\n');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      // Delete old health checks
      const deletedHealthChecks = await prisma.tenantHealthCheck.deleteMany({
        where: {
          timestamp: {
            lt: thirtyDaysAgo
          }
        }
      });

      // Delete old resolved alerts
      const deletedAlerts = await prisma.tenantAlert.deleteMany({
        where: {
          resolved: true,
          resolvedAt: {
            lt: thirtyDaysAgo
          }
        }
      });

      // Delete old API logs
      const deletedApiLogs = await prisma.apiLog.deleteMany({
        where: {
          timestamp: {
            lt: thirtyDaysAgo
          }
        }
      });

      console.log('📊 Cleanup Results:');
      console.log('─────────────────────────────────────');
      console.log(`   Health Checks: ${deletedHealthChecks.count} deleted`);
      console.log(`   Alerts: ${deletedAlerts.count} deleted`);
      console.log(`   API Logs: ${deletedApiLogs.count} deleted`);
      console.log('─────────────────────────────────────\n');

      console.log('✅ Cleanup completed\n');

    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Store monitoring report
   */
  private async storeReport(report: MonitoringReport): Promise<void> {
    await prisma.monitoringReport.create({
      data: {
        timestamp: report.timestamp,
        totalTenants: report.totalTenants,
        healthy: report.healthy,
        warning: report.warning,
        critical: report.critical,
        down: report.down,
        alerts: report.alerts,
        duration: report.duration
      }
    });
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'check-all';

  const monitor = new TenantMonitor();

  try {
    switch (command) {
      case 'check-all':
        await monitor.checkAll();
        break;

      case 'daily-report':
        await monitor.generateDailyReport();
        break;

      case 'cleanup':
        await monitor.cleanupLogs();
        break;

      default:
        console.log('Usage:');
        console.log('  npm run monitor:check-all    - Check all tenant health');
        console.log('  npm run monitor:daily-report - Generate daily report');
        console.log('  npm run monitor:cleanup      - Cleanup old logs');
        process.exit(1);
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default TenantMonitor;
