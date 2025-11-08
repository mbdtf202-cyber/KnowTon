import { ClickHouse } from 'clickhouse';
import { Redis } from 'ioredis';
import { Parser } from 'json2csv';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// ClickHouse client configuration
const clickhouse = new ClickHouse({
  url: process.env.CLICKHOUSE_URL || 'http://localhost',
  port: parseInt(process.env.CLICKHOUSE_PORT || '8123'),
  debug: process.env.NODE_ENV === 'development',
  basicAuth: process.env.CLICKHOUSE_USER && process.env.CLICKHOUSE_PASSWORD
    ? {
        username: process.env.CLICKHOUSE_USER,
        password: process.env.CLICKHOUSE_PASSWORD,
      }
    : undefined,
  isUseGzip: true,
  format: 'json',
  config: {
    database: process.env.CLICKHOUSE_DATABASE || 'knowton',
  },
});

export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

export interface TrendData {
  date: string;
  value: number;
}

export interface HistoricalMetrics {
  revenue: {
    trend: TrendData[];
    total: number;
    growth: number;
  };
  users: {
    trend: TrendData[];
    total: number;
    growth: number;
  };
  transactions: {
    trend: TrendData[];
    total: number;
    growth: number;
  };
  content: {
    trend: TrendData[];
    total: number;
    growth: number;
  };
}

export type Granularity = 'daily' | 'weekly' | 'monthly';
export type ExportFormat = 'csv' | 'pdf';

export class HistoricalAnalyticsService {
  /**
   * Get historical revenue data with trend analysis
   */
  async getRevenueHistory(
    timeRange: TimeRange,
    granularity: Granularity = 'daily'
  ): Promise<{ trend: TrendData[]; total: number; growth: number }> {
    try {
      const cacheKey = `analytics:revenue:${timeRange.startDate.toISOString()}:${timeRange.endDate.toISOString()}:${granularity}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const dateFormat = this.getDateFormat(granularity);
      const query = `
        SELECT 
          ${dateFormat} as date,
          sum(net_amount) as value
        FROM revenue_breakdown
        WHERE event_date >= toDate('${this.formatDate(timeRange.startDate)}')
          AND event_date <= toDate('${this.formatDate(timeRange.endDate)}')
        GROUP BY date
        ORDER BY date ASC
      `;

      const result = await clickhouse.query(query).toPromise();
      const trend: TrendData[] = result.map((row: any) => ({
        date: row.date,
        value: parseFloat(row.value) || 0,
      }));

      const total = trend.reduce((sum, item) => sum + item.value, 0);
      const growth = this.calculateGrowth(trend);

      const data = { trend, total, growth };
      await redis.setex(cacheKey, 300, JSON.stringify(data));

      return data;
    } catch (error: any) {
      console.error('Error getting revenue history:', error);
      throw new Error(`Failed to get revenue history: ${error.message}`);
    }
  }

  /**
   * Get historical user activity data
   */
  async getUserActivityHistory(
    timeRange: TimeRange,
    granularity: Granularity = 'daily'
  ): Promise<{ trend: TrendData[]; total: number; growth: number }> {
    try {
      const cacheKey = `analytics:users:${timeRange.startDate.toISOString()}:${timeRange.endDate.toISOString()}:${granularity}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const dateFormat = this.getDateFormat(granularity);
      const query = `
        SELECT 
          ${dateFormat} as date,
          uniq(user_address) as value
        FROM user_behavior_events
        WHERE event_date >= toDate('${this.formatDate(timeRange.startDate)}')
          AND event_date <= toDate('${this.formatDate(timeRange.endDate)}')
        GROUP BY date
        ORDER BY date ASC
      `;

      const result = await clickhouse.query(query).toPromise();
      const trend: TrendData[] = result.map((row: any) => ({
        date: row.date,
        value: parseInt(row.value) || 0,
      }));

      const total = trend.reduce((sum, item) => sum + item.value, 0);
      const growth = this.calculateGrowth(trend);

      const data = { trend, total, growth };
      await redis.setex(cacheKey, 300, JSON.stringify(data));

      return data;
    } catch (error: any) {
      console.error('Error getting user activity history:', error);
      throw new Error(`Failed to get user activity history: ${error.message}`);
    }
  }

  /**
   * Get historical transaction data
   */
  async getTransactionHistory(
    timeRange: TimeRange,
    granularity: Granularity = 'daily'
  ): Promise<{ trend: TrendData[]; total: number; growth: number }> {
    try {
      const cacheKey = `analytics:transactions:${timeRange.startDate.toISOString()}:${timeRange.endDate.toISOString()}:${granularity}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const dateFormat = this.getDateFormat(granularity);
      const query = `
        SELECT 
          ${dateFormat} as date,
          count() as value
        FROM nft_transactions
        WHERE event_date >= toDate('${this.formatDate(timeRange.startDate)}')
          AND event_date <= toDate('${this.formatDate(timeRange.endDate)}')
          AND transaction_type = 'sale'
        GROUP BY date
        ORDER BY date ASC
      `;

      const result = await clickhouse.query(query).toPromise();
      const trend: TrendData[] = result.map((row: any) => ({
        date: row.date,
        value: parseInt(row.value) || 0,
      }));

      const total = trend.reduce((sum, item) => sum + item.value, 0);
      const growth = this.calculateGrowth(trend);

      const data = { trend, total, growth };
      await redis.setex(cacheKey, 300, JSON.stringify(data));

      return data;
    } catch (error: any) {
      console.error('Error getting transaction history:', error);
      throw new Error(`Failed to get transaction history: ${error.message}`);
    }
  }

  /**
   * Get historical content performance data
   */
  async getContentPerformanceHistory(
    timeRange: TimeRange,
    granularity: Granularity = 'daily'
  ): Promise<{ trend: TrendData[]; total: number; growth: number }> {
    try {
      const cacheKey = `analytics:content:${timeRange.startDate.toISOString()}:${timeRange.endDate.toISOString()}:${granularity}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const dateFormat = this.getDateFormat(granularity);
      const query = `
        SELECT 
          ${dateFormat} as date,
          sum(views) as value
        FROM content_metrics
        WHERE date >= toDate('${this.formatDate(timeRange.startDate)}')
          AND date <= toDate('${this.formatDate(timeRange.endDate)}')
        GROUP BY date
        ORDER BY date ASC
      `;

      const result = await clickhouse.query(query).toPromise();
      const trend: TrendData[] = result.map((row: any) => ({
        date: row.date,
        value: parseInt(row.value) || 0,
      }));

      const total = trend.reduce((sum, item) => sum + item.value, 0);
      const growth = this.calculateGrowth(trend);

      const data = { trend, total, growth };
      await redis.setex(cacheKey, 300, JSON.stringify(data));

      return data;
    } catch (error: any) {
      console.error('Error getting content performance history:', error);
      throw new Error(`Failed to get content performance history: ${error.message}`);
    }
  }

  /**
   * Get comprehensive historical metrics
   */
  async getHistoricalMetrics(
    timeRange: TimeRange,
    granularity: Granularity = 'daily'
  ): Promise<HistoricalMetrics> {
    try {
      const [revenue, users, transactions, content] = await Promise.all([
        this.getRevenueHistory(timeRange, granularity),
        this.getUserActivityHistory(timeRange, granularity),
        this.getTransactionHistory(timeRange, granularity),
        this.getContentPerformanceHistory(timeRange, granularity),
      ]);

      return {
        revenue,
        users,
        transactions,
        content,
      };
    } catch (error: any) {
      console.error('Error getting historical metrics:', error);
      throw new Error(`Failed to get historical metrics: ${error.message}`);
    }
  }

  /**
   * Get category performance trends
   */
  async getCategoryTrends(
    timeRange: TimeRange,
    granularity: Granularity = 'daily'
  ): Promise<{ category: string; trend: TrendData[]; total: number }[]> {
    try {
      const dateFormat = this.getDateFormat(granularity);
      const query = `
        SELECT 
          category,
          ${dateFormat} as date,
          sum(price) as value
        FROM nft_transactions
        WHERE event_date >= toDate('${this.formatDate(timeRange.startDate)}')
          AND event_date <= toDate('${this.formatDate(timeRange.endDate)}')
          AND transaction_type = 'sale'
          AND category != ''
        GROUP BY category, date
        ORDER BY category, date ASC
      `;

      const result = await clickhouse.query(query).toPromise();
      
      // Group by category
      const categoryMap = new Map<string, TrendData[]>();
      result.forEach((row: any) => {
        if (!categoryMap.has(row.category)) {
          categoryMap.set(row.category, []);
        }
        categoryMap.get(row.category)!.push({
          date: row.date,
          value: parseFloat(row.value) || 0,
        });
      });

      // Convert to array format
      const categories = Array.from(categoryMap.entries()).map(([category, trend]) => ({
        category,
        trend,
        total: trend.reduce((sum, item) => sum + item.value, 0),
      }));

      return categories.sort((a, b) => b.total - a.total);
    } catch (error: any) {
      console.error('Error getting category trends:', error);
      throw new Error(`Failed to get category trends: ${error.message}`);
    }
  }

  /**
   * Get top creators by revenue in time range
   */
  async getTopCreatorsByRevenue(
    timeRange: TimeRange,
    limit: number = 10
  ): Promise<{ address: string; revenue: number; transactions: number }[]> {
    try {
      const query = `
        SELECT 
          creator_address as address,
          sum(net_amount) as revenue,
          count() as transactions
        FROM revenue_breakdown
        WHERE event_date >= toDate('${this.formatDate(timeRange.startDate)}')
          AND event_date <= toDate('${this.formatDate(timeRange.endDate)}')
          AND creator_address != ''
        GROUP BY creator_address
        ORDER BY revenue DESC
        LIMIT ${limit}
      `;

      const result = await clickhouse.query(query).toPromise();
      return result.map((row: any) => ({
        address: row.address,
        revenue: parseFloat(row.revenue) || 0,
        transactions: parseInt(row.transactions) || 0,
      }));
    } catch (error: any) {
      console.error('Error getting top creators:', error);
      throw new Error(`Failed to get top creators: ${error.message}`);
    }
  }

  /**
   * Export analytics data to CSV
   */
  async exportToCSV(
    timeRange: TimeRange,
    granularity: Granularity = 'daily'
  ): Promise<string> {
    try {
      const metrics = await this.getHistoricalMetrics(timeRange, granularity);
      
      // Combine all trends into a single dataset
      const data = metrics.revenue.trend.map((item, index) => ({
        date: item.date,
        revenue: item.value,
        users: metrics.users.trend[index]?.value || 0,
        transactions: metrics.transactions.trend[index]?.value || 0,
        contentViews: metrics.content.trend[index]?.value || 0,
      }));

      const parser = new Parser({
        fields: ['date', 'revenue', 'users', 'transactions', 'contentViews'],
      });

      return parser.parse(data);
    } catch (error: any) {
      console.error('Error exporting to CSV:', error);
      throw new Error(`Failed to export to CSV: ${error.message}`);
    }
  }

  /**
   * Export analytics data to PDF (placeholder - would use a PDF library)
   */
  async exportToPDF(
    timeRange: TimeRange,
    granularity: Granularity = 'daily'
  ): Promise<Buffer> {
    try {
      // This is a placeholder. In production, you would use a library like pdfkit or puppeteer
      const metrics = await this.getHistoricalMetrics(timeRange, granularity);
      
      // For now, return a simple text representation
      const text = `
Analytics Report
Period: ${timeRange.startDate.toISOString()} to ${timeRange.endDate.toISOString()}
Granularity: ${granularity}

Revenue:
- Total: $${metrics.revenue.total.toFixed(2)}
- Growth: ${metrics.revenue.growth.toFixed(2)}%

Users:
- Total: ${metrics.users.total}
- Growth: ${metrics.users.growth.toFixed(2)}%

Transactions:
- Total: ${metrics.transactions.total}
- Growth: ${metrics.transactions.growth.toFixed(2)}%

Content Views:
- Total: ${metrics.content.total}
- Growth: ${metrics.content.growth.toFixed(2)}%
      `;

      return Buffer.from(text, 'utf-8');
    } catch (error: any) {
      console.error('Error exporting to PDF:', error);
      throw new Error(`Failed to export to PDF: ${error.message}`);
    }
  }

  /**
   * Helper: Get date format string for ClickHouse based on granularity
   */
  private getDateFormat(granularity: Granularity): string {
    switch (granularity) {
      case 'daily':
        return "toString(event_date)";
      case 'weekly':
        return "toString(toMonday(event_date))";
      case 'monthly':
        return "toString(toStartOfMonth(event_date))";
      default:
        return "toString(event_date)";
    }
  }

  /**
   * Helper: Format date for ClickHouse query
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Helper: Calculate growth percentage
   */
  private calculateGrowth(trend: TrendData[]): number {
    if (trend.length < 2) return 0;
    
    const firstValue = trend[0].value;
    const lastValue = trend[trend.length - 1].value;
    
    if (firstValue === 0) return lastValue > 0 ? 100 : 0;
    
    return ((lastValue - firstValue) / firstValue) * 100;
  }

  /**
   * Test ClickHouse connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await clickhouse.query('SELECT 1').toPromise();
      return result.length > 0;
    } catch (error) {
      console.error('ClickHouse connection test failed:', error);
      return false;
    }
  }
}

export const historicalAnalyticsService = new HistoricalAnalyticsService();
