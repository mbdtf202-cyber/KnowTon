import { ClickHouse } from 'clickhouse';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

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

export interface UserJourney {
  sessionId: string;
  userAddress: string;
  startTime: string;
  endTime: string;
  events: JourneyEvent[];
  duration: number;
  converted: boolean;
}

export interface JourneyEvent {
  eventType: string;
  targetId: string;
  targetType: string;
  timestamp: string;
  metadata?: any;
}

export interface FunnelStage {
  stage: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
}

export interface FunnelAnalysis {
  stages: FunnelStage[];
  totalUsers: number;
  overallConversionRate: number;
  averageTimeToConvert: number;
}

export interface ContentHeatmap {
  contentId: string;
  tokenId: string;
  title: string;
  category: string;
  views: number;
  likes: number;
  shares: number;
  purchases: number;
  engagementScore: number;
  position: {
    x: number;
    y: number;
  };
}

export interface CohortData {
  cohortDate: string;
  cohortSize: number;
  retention: {
    [key: string]: number; // day/week/month -> retention %
  };
  revenue: {
    [key: string]: number; // day/week/month -> revenue
  };
}

export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

export class UserBehaviorAnalyticsService {
  /**
   * Track user journey through content
   * REQ-1.7.2: User behavior analysis
   */
  async getUserJourneys(
    timeRange: TimeRange,
    userAddress?: string,
    limit: number = 100
  ): Promise<UserJourney[]> {
    try {
      const cacheKey = `analytics:journeys:${timeRange.startDate.toISOString()}:${timeRange.endDate.toISOString()}:${userAddress || 'all'}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const userFilter = userAddress ? `AND user_address = '${userAddress}'` : '';
      
      const query = `
        SELECT 
          session_id,
          user_address,
          min(event_time) as start_time,
          max(event_time) as end_time,
          groupArray(tuple(
            event_type,
            target_id,
            target_type,
            event_time,
            metadata
          )) as events,
          dateDiff('second', min(event_time), max(event_time)) as duration,
          countIf(event_type = 'purchase_complete') > 0 as converted
        FROM user_behavior_events
        WHERE event_date >= toDate('${this.formatDate(timeRange.startDate)}')
          AND event_date <= toDate('${this.formatDate(timeRange.endDate)}')
          ${userFilter}
        GROUP BY session_id, user_address
        ORDER BY start_time DESC
        LIMIT ${limit}
      `;

      const result = await clickhouse.query(query).toPromise();
      
      const journeys: UserJourney[] = result.map((row: any) => ({
        sessionId: row.session_id,
        userAddress: row.user_address,
        startTime: row.start_time,
        endTime: row.end_time,
        events: row.events.map((e: any) => ({
          eventType: e[0],
          targetId: e[1],
          targetType: e[2],
          timestamp: e[3],
          metadata: e[4] ? JSON.parse(e[4]) : undefined,
        })),
        duration: parseInt(row.duration),
        converted: row.converted === 1,
      }));

      await redis.setex(cacheKey, 300, JSON.stringify(journeys));
      return journeys;
    } catch (error: any) {
      console.error('Error getting user journeys:', error);
      throw new Error(`Failed to get user journeys: ${error.message}`);
    }
  }

  /**
   * Analyze conversion funnel (view → purchase)
   * REQ-1.7.2: Funnel analysis
   */
  async getFunnelAnalysis(
    timeRange: TimeRange,
    contentId?: string
  ): Promise<FunnelAnalysis> {
    try {
      const cacheKey = `analytics:funnel:${timeRange.startDate.toISOString()}:${timeRange.endDate.toISOString()}:${contentId || 'all'}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const contentFilter = contentId ? `AND target_id = '${contentId}'` : '';

      // Define funnel stages
      const stages = [
        { name: 'view', eventType: 'nft_view' },
        { name: 'like', eventType: 'nft_like' },
        { name: 'add_to_cart', eventType: 'add_to_cart' },
        { name: 'purchase_intent', eventType: 'purchase_intent' },
        { name: 'purchase', eventType: 'purchase_complete' },
      ];

      // Get user counts for each stage
      const stageQueries = stages.map((stage, index) => {
        const previousStages = stages.slice(0, index + 1).map(s => `'${s.eventType}'`).join(',');
        return `
          SELECT 
            '${stage.name}' as stage,
            uniq(user_address) as users
          FROM user_behavior_events
          WHERE event_date >= toDate('${this.formatDate(timeRange.startDate)}')
            AND event_date <= toDate('${this.formatDate(timeRange.endDate)}')
            AND event_type IN (${previousStages})
            ${contentFilter}
            AND user_address IN (
              SELECT DISTINCT user_address
              FROM user_behavior_events
              WHERE event_type = '${stage.eventType}'
                AND event_date >= toDate('${this.formatDate(timeRange.startDate)}')
                AND event_date <= toDate('${this.formatDate(timeRange.endDate)}')
                ${contentFilter}
            )
        `;
      });

      const query = stageQueries.join(' UNION ALL ');
      const result = await clickhouse.query(query).toPromise();

      const stageData = result.map((row: any) => ({
        stage: row.stage,
        users: parseInt(row.users),
      }));

      // Calculate conversion and dropoff rates
      const totalUsers = stageData[0]?.users || 0;
      const funnelStages: FunnelStage[] = stageData.map((data, index) => {
        const previousUsers = index > 0 ? stageData[index - 1].users : totalUsers;
        const conversionRate = previousUsers > 0 ? (data.users / previousUsers) * 100 : 0;
        const dropoffRate = 100 - conversionRate;

        return {
          stage: data.stage,
          users: data.users,
          conversionRate: Math.round(conversionRate * 100) / 100,
          dropoffRate: Math.round(dropoffRate * 100) / 100,
        };
      });

      const finalUsers = stageData[stageData.length - 1]?.users || 0;
      const overallConversionRate = totalUsers > 0 ? (finalUsers / totalUsers) * 100 : 0;

      // Calculate average time to convert
      const timeQuery = `
        SELECT 
          avg(dateDiff('second', 
            min(event_time) OVER (PARTITION BY session_id),
            max(event_time) OVER (PARTITION BY session_id)
          )) as avg_time
        FROM user_behavior_events
        WHERE event_date >= toDate('${this.formatDate(timeRange.startDate)}')
          AND event_date <= toDate('${this.formatDate(timeRange.endDate)}')
          AND event_type = 'purchase_complete'
          ${contentFilter}
      `;

      const timeResult = await clickhouse.query(timeQuery).toPromise();
      const averageTimeToConvert = timeResult[0]?.avg_time || 0;

      const analysis: FunnelAnalysis = {
        stages: funnelStages,
        totalUsers,
        overallConversionRate: Math.round(overallConversionRate * 100) / 100,
        averageTimeToConvert: Math.round(averageTimeToConvert),
      };

      await redis.setex(cacheKey, 300, JSON.stringify(analysis));
      return analysis;
    } catch (error: any) {
      console.error('Error getting funnel analysis:', error);
      throw new Error(`Failed to get funnel analysis: ${error.message}`);
    }
  }

  /**
   * Generate content heatmap showing popular content
   * REQ-1.7.2: Content heatmaps
   */
  async getContentHeatmap(
    timeRange: TimeRange,
    category?: string,
    limit: number = 50
  ): Promise<ContentHeatmap[]> {
    try {
      const cacheKey = `analytics:heatmap:${timeRange.startDate.toISOString()}:${timeRange.endDate.toISOString()}:${category || 'all'}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const categoryFilter = category ? `AND category = '${category}'` : '';

      const query = `
        SELECT 
          target_id as content_id,
          any(target_type) as token_id,
          countIf(event_type = 'nft_view') as views,
          countIf(event_type = 'nft_like') as likes,
          countIf(event_type = 'nft_share') as shares,
          countIf(event_type = 'purchase_complete') as purchases,
          (
            countIf(event_type = 'nft_view') * 1 +
            countIf(event_type = 'nft_like') * 3 +
            countIf(event_type = 'nft_share') * 5 +
            countIf(event_type = 'purchase_complete') * 10
          ) as engagement_score
        FROM user_behavior_events
        WHERE event_date >= toDate('${this.formatDate(timeRange.startDate)}')
          AND event_date <= toDate('${this.formatDate(timeRange.endDate)}')
          AND target_id != ''
          ${categoryFilter}
        GROUP BY target_id
        ORDER BY engagement_score DESC
        LIMIT ${limit}
      `;

      const result = await clickhouse.query(query).toPromise();

      // Get content details from PostgreSQL
      const contentIds = result.map((row: any) => row.content_id);
      const contents = await prisma.content.findMany({
        where: {
          id: {
            in: contentIds,
          },
        },
        select: {
          id: true,
          title: true,
          category: true,
        },
      });

      const contentMap = new Map(contents.map(c => [c.id, c]));

      // Generate heatmap positions (grid layout)
      const gridSize = Math.ceil(Math.sqrt(result.length));
      
      const heatmap: ContentHeatmap[] = result.map((row: any, index: number) => {
        const content = contentMap.get(row.content_id);
        const x = (index % gridSize) / gridSize;
        const y = Math.floor(index / gridSize) / gridSize;

        return {
          contentId: row.content_id,
          tokenId: row.token_id,
          title: content?.title || 'Unknown',
          category: content?.category || 'Unknown',
          views: parseInt(row.views),
          likes: parseInt(row.likes),
          shares: parseInt(row.shares),
          purchases: parseInt(row.purchases),
          engagementScore: parseFloat(row.engagement_score),
          position: { x, y },
        };
      });

      await redis.setex(cacheKey, 300, JSON.stringify(heatmap));
      return heatmap;
    } catch (error: any) {
      console.error('Error getting content heatmap:', error);
      throw new Error(`Failed to get content heatmap: ${error.message}`);
    }
  }

  /**
   * Perform cohort analysis for user retention
   * REQ-1.7.2: Cohort analysis
   */
  async getCohortAnalysis(
    cohortType: 'daily' | 'weekly' | 'monthly' = 'weekly',
    periodsToAnalyze: number = 12
  ): Promise<CohortData[]> {
    try {
      const cacheKey = `analytics:cohort:${cohortType}:${periodsToAnalyze}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Determine date grouping based on cohort type
      const dateGrouping = cohortType === 'daily' 
        ? 'toDate(created_at)'
        : cohortType === 'weekly'
        ? 'toMonday(created_at)'
        : 'toStartOfMonth(created_at)';

      // Get user cohorts from PostgreSQL
      const cohortQuery = `
        SELECT 
          ${dateGrouping} as cohort_date,
          COUNT(DISTINCT id) as cohort_size
        FROM users
        WHERE created_at >= NOW() - INTERVAL '${periodsToAnalyze} ${cohortType === 'daily' ? 'days' : cohortType === 'weekly' ? 'weeks' : 'months'}'
        GROUP BY cohort_date
        ORDER BY cohort_date DESC
      `;

      // Note: This is a simplified version. In production, you'd use raw SQL or a proper ORM query
      const users = await prisma.user.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - periodsToAnalyze * (cohortType === 'daily' ? 86400000 : cohortType === 'weekly' ? 604800000 : 2592000000)),
          },
        },
        select: {
          id: true,
          createdAt: true,
          walletAddress: true,
        },
      });

      // Group users by cohort
      const cohortMap = new Map<string, Set<string>>();
      users.forEach(user => {
        const cohortDate = this.getCohortDate(user.createdAt, cohortType);
        if (!cohortMap.has(cohortDate)) {
          cohortMap.set(cohortDate, new Set());
        }
        cohortMap.get(cohortDate)!.add(user.walletAddress || user.id);
      });

      // Calculate retention for each cohort
      const cohorts: CohortData[] = [];
      
      for (const [cohortDate, userSet] of cohortMap.entries()) {
        const cohortSize = userSet.size;
        const retention: { [key: string]: number } = {};
        const revenue: { [key: string]: number } = {};

        // Calculate retention for each period
        for (let period = 0; period <= periodsToAnalyze; period++) {
          const periodStart = this.addPeriods(new Date(cohortDate), period, cohortType);
          const periodEnd = this.addPeriods(periodStart, 1, cohortType);

          // Query ClickHouse for active users in this period
          const retentionQuery = `
            SELECT 
              uniq(user_address) as active_users,
              sum(usd_value) as period_revenue
            FROM revenue_breakdown
            WHERE event_date >= toDate('${this.formatDate(periodStart)}')
              AND event_date < toDate('${this.formatDate(periodEnd)}')
              AND recipient_address IN (${Array.from(userSet).map(u => `'${u}'`).join(',')})
          `;

          try {
            const retentionResult = await clickhouse.query(retentionQuery).toPromise();
            const activeUsers = retentionResult[0]?.active_users || 0;
            const periodRevenue = retentionResult[0]?.period_revenue || 0;

            const periodKey = `period_${period}`;
            retention[periodKey] = cohortSize > 0 ? Math.round((activeUsers / cohortSize) * 10000) / 100 : 0;
            revenue[periodKey] = parseFloat(periodRevenue);
          } catch (error) {
            console.error(`Error calculating retention for period ${period}:`, error);
            retention[`period_${period}`] = 0;
            revenue[`period_${period}`] = 0;
          }
        }

        cohorts.push({
          cohortDate,
          cohortSize,
          retention,
          revenue,
        });
      }

      await redis.setex(cacheKey, 600, JSON.stringify(cohorts));
      return cohorts;
    } catch (error: any) {
      console.error('Error getting cohort analysis:', error);
      throw new Error(`Failed to get cohort analysis: ${error.message}`);
    }
  }

  /**
   * Get user engagement patterns
   */
  async getUserEngagementPatterns(
    timeRange: TimeRange,
    userAddress?: string
  ): Promise<{
    hourlyActivity: { hour: number; events: number }[];
    dayOfWeekActivity: { day: string; events: number }[];
    topActions: { action: string; count: number }[];
  }> {
    try {
      const userFilter = userAddress ? `AND user_address = '${userAddress}'` : '';

      // Hourly activity
      const hourlyQuery = `
        SELECT 
          toHour(event_time) as hour,
          count() as events
        FROM user_behavior_events
        WHERE event_date >= toDate('${this.formatDate(timeRange.startDate)}')
          AND event_date <= toDate('${this.formatDate(timeRange.endDate)}')
          ${userFilter}
        GROUP BY hour
        ORDER BY hour
      `;

      // Day of week activity
      const dayQuery = `
        SELECT 
          toDayOfWeek(event_date) as day_num,
          count() as events
        FROM user_behavior_events
        WHERE event_date >= toDate('${this.formatDate(timeRange.startDate)}')
          AND event_date <= toDate('${this.formatDate(timeRange.endDate)}')
          ${userFilter}
        GROUP BY day_num
        ORDER BY day_num
      `;

      // Top actions
      const actionsQuery = `
        SELECT 
          event_type as action,
          count() as count
        FROM user_behavior_events
        WHERE event_date >= toDate('${this.formatDate(timeRange.startDate)}')
          AND event_date <= toDate('${this.formatDate(timeRange.endDate)}')
          ${userFilter}
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
      `;

      const [hourlyResult, dayResult, actionsResult] = await Promise.all([
        clickhouse.query(hourlyQuery).toPromise(),
        clickhouse.query(dayQuery).toPromise(),
        clickhouse.query(actionsQuery).toPromise(),
      ]);

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      return {
        hourlyActivity: hourlyResult.map((row: any) => ({
          hour: parseInt(row.hour),
          events: parseInt(row.events),
        })),
        dayOfWeekActivity: dayResult.map((row: any) => ({
          day: dayNames[parseInt(row.day_num) % 7],
          events: parseInt(row.events),
        })),
        topActions: actionsResult.map((row: any) => ({
          action: row.action,
          count: parseInt(row.count),
        })),
      };
    } catch (error: any) {
      console.error('Error getting engagement patterns:', error);
      throw new Error(`Failed to get engagement patterns: ${error.message}`);
    }
  }

  /**
   * Track user behavior event
   */
  async trackEvent(event: {
    sessionId: string;
    userAddress: string;
    eventType: string;
    targetId?: string;
    targetType?: string;
    metadata?: any;
    deviceType?: string;
    countryCode?: string;
  }): Promise<void> {
    try {
      const query = `
        INSERT INTO user_behavior_events (
          session_id,
          user_address,
          event_type,
          target_id,
          target_type,
          metadata,
          device_type,
          country_code
        ) VALUES (
          '${event.sessionId}',
          '${event.userAddress}',
          '${event.eventType}',
          '${event.targetId || ''}',
          '${event.targetType || ''}',
          '${event.metadata ? JSON.stringify(event.metadata) : ''}',
          '${event.deviceType || 'unknown'}',
          '${event.countryCode || ''}'
        )
      `;

      await clickhouse.query(query).toPromise();
    } catch (error: any) {
      console.error('Error tracking event:', error);
      // Don't throw - tracking failures shouldn't break the app
    }
  }

  // Helper methods

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getCohortDate(date: Date, cohortType: 'daily' | 'weekly' | 'monthly'): string {
    if (cohortType === 'daily') {
      return this.formatDate(date);
    } else if (cohortType === 'weekly') {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      return this.formatDate(new Date(d.setDate(diff)));
    } else {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    }
  }

  private addPeriods(date: Date, periods: number, cohortType: 'daily' | 'weekly' | 'monthly'): Date {
    const result = new Date(date);
    if (cohortType === 'daily') {
      result.setDate(result.getDate() + periods);
    } else if (cohortType === 'weekly') {
      result.setDate(result.getDate() + periods * 7);
    } else {
      result.setMonth(result.getMonth() + periods);
    }
    return result;
  }
}

export const userBehaviorAnalyticsService = new UserBehaviorAnalyticsService();
