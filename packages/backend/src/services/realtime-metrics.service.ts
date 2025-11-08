import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface RealtimeMetrics {
  revenue: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  activeUsers: {
    current: number;
    today: number;
    peak24h: number;
  };
  transactions: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
  };
  content: {
    totalViews: number;
    totalPurchases: number;
    conversionRate: number;
  };
  timestamp: string;
}

export class RealtimeMetricsService extends EventEmitter {
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL_MS = 5000; // Update every 5 seconds

  constructor() {
    super();
  }

  async startMetricsUpdates(): Promise<void> {
    if (this.updateInterval) {
      return;
    }

    // Initial update
    await this.updateMetrics();

    // Set up periodic updates
    this.updateInterval = setInterval(async () => {
      await this.updateMetrics();
    }, this.UPDATE_INTERVAL_MS);
  }

  stopMetricsUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private async updateMetrics(): Promise<void> {
    try {
      const metrics = await this.calculateMetrics();
      
      // Cache the metrics
      await redis.setex('realtime:metrics', 10, JSON.stringify(metrics));
      
      // Emit event for WebSocket broadcast
      this.emit('metrics-updated', metrics);
    } catch (error) {
      console.error('Error updating realtime metrics:', error);
    }
  }

  async getMetrics(): Promise<RealtimeMetrics> {
    // Try to get from cache first
    const cached = await redis.get('realtime:metrics');
    if (cached) {
      return JSON.parse(cached);
    }

    // Calculate fresh metrics
    return await this.calculateMetrics();
  }

  private async calculateMetrics(): Promise<RealtimeMetrics> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Revenue calculations
    const [totalRevenue, todayRevenue, weekRevenue, monthRevenue] = await Promise.all([
      this.calculateRevenue(),
      this.calculateRevenue(todayStart),
      this.calculateRevenue(weekStart),
      this.calculateRevenue(monthStart),
    ]);

    // Active users
    const activeUsers = await this.calculateActiveUsers();

    // Transactions
    const transactions = await this.calculateTransactions();

    // Content metrics
    const contentMetrics = await this.calculateContentMetrics();

    return {
      revenue: {
        total: totalRevenue,
        today: todayRevenue,
        thisWeek: weekRevenue,
        thisMonth: monthRevenue,
      },
      activeUsers,
      transactions,
      content: contentMetrics,
      timestamp: now.toISOString(),
    };
  }

  private async calculateRevenue(since?: Date): Promise<number> {
    try {
      const purchases = await prisma.purchase.findMany({
        where: {
          status: 'completed',
          ...(since && {
            createdAt: {
              gte: since,
            },
          }),
        },
        select: {
          price: true,
        },
      });

      return purchases.reduce((sum, p) => sum + parseFloat(p.price.toString()), 0);
    } catch (error) {
      console.error('Error calculating revenue:', error);
      return 0;
    }
  }

  private async calculateActiveUsers(): Promise<{
    current: number;
    today: number;
    peak24h: number;
  }> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last5min = new Date(now.getTime() - 5 * 60 * 1000);

      // Get current active users (last 5 minutes)
      const currentActive = await redis.scard('active:users:current');

      // Get today's unique users
      const todayUsers = await prisma.user.count({
        where: {
          lastLoginAt: {
            gte: todayStart,
          },
        },
      });

      // Get peak from Redis (tracked separately)
      const peak24hStr = await redis.get('active:users:peak24h');
      const peak24h = peak24hStr ? parseInt(peak24hStr) : currentActive;

      // Update peak if current is higher
      if (currentActive > peak24h) {
        await redis.setex('active:users:peak24h', 86400, currentActive.toString());
      }

      return {
        current: currentActive,
        today: todayUsers,
        peak24h: Math.max(peak24h, currentActive),
      };
    } catch (error) {
      console.error('Error calculating active users:', error);
      return { current: 0, today: 0, peak24h: 0 };
    }
  }

  private async calculateTransactions(): Promise<{
    total: number;
    pending: number;
    completed: number;
    failed: number;
  }> {
    try {
      const [total, pending, completed, failed] = await Promise.all([
        prisma.purchase.count(),
        prisma.purchase.count({ where: { status: 'pending' } }),
        prisma.purchase.count({ where: { status: 'completed' } }),
        prisma.purchase.count({ where: { status: 'failed' } }),
      ]);

      return { total, pending, completed, failed };
    } catch (error) {
      console.error('Error calculating transactions:', error);
      return { total: 0, pending: 0, completed: 0, failed: 0 };
    }
  }

  private async calculateContentMetrics(): Promise<{
    totalViews: number;
    totalPurchases: number;
    conversionRate: number;
  }> {
    try {
      // Get view count from Redis (tracked by content access)
      const viewsStr = await redis.get('metrics:total:views');
      const totalViews = viewsStr ? parseInt(viewsStr) : 0;

      const totalPurchases = await prisma.purchase.count({
        where: { status: 'completed' },
      });

      const conversionRate = totalViews > 0 ? (totalPurchases / totalViews) * 100 : 0;

      return {
        totalViews,
        totalPurchases,
        conversionRate: Math.round(conversionRate * 100) / 100,
      };
    } catch (error) {
      console.error('Error calculating content metrics:', error);
      return { totalViews: 0, totalPurchases: 0, conversionRate: 0 };
    }
  }

  // Helper method to track user activity
  async trackUserActivity(userId: string): Promise<void> {
    try {
      await redis.sadd('active:users:current', userId);
      await redis.expire('active:users:current', 300); // 5 minutes
    } catch (error) {
      console.error('Error tracking user activity:', error);
    }
  }

  // Helper method to track content views
  async trackContentView(contentId: string): Promise<void> {
    try {
      await redis.incr('metrics:total:views');
      await redis.incr(`metrics:content:${contentId}:views`);
    } catch (error) {
      console.error('Error tracking content view:', error);
    }
  }
}

export const realtimeMetricsService = new RealtimeMetricsService();
