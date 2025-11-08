import { ClickHouse } from 'clickhouse';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const prisma = new PrismaClient();

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

export interface AtRiskUser {
  userId: string;
  email?: string;
  username?: string;
  churnProbability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastActivityDate: string;
  daysSinceLastActivity: number;
  totalPurchases: number;
  totalSpent: number;
  avgSessionDuration: number;
  engagementScore: number;
  reasons: string[];
}

export interface ChurnPredictionResult {
  totalUsers: number;
  atRiskUsers: AtRiskUser[];
  churnRate: number;
  predictedChurnRate: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  confidence: number;
  generatedAt: string;
}

export interface RetentionRecommendation {
  userId: string;
  recommendations: {
    action: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
    expectedImpact: string;
  }[];
  personalizedMessage?: string;
  incentives?: {
    type: string;
    value: string;
    description: string;
  }[];
}

export interface ChurnMetrics {
  period: string;
  totalUsers: number;
  activeUsers: number;
  churnedUsers: number;
  churnRate: number;
  retentionRate: number;
  avgLifetimeValue: number;
}

/**
 * Churn Prediction Service
 * Identifies at-risk users and provides retention recommendations
 */
export class ChurnPredictionService {
  /**
   * Identify users at risk of churning
   */
  async identifyAtRiskUsers(
    lookbackDays: number = 90,
    limit: number = 100
  ): Promise<ChurnPredictionResult> {
    try {
      const cacheKey = `churn:at-risk:${lookbackDays}:${limit}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get user activity data from ClickHouse
      const userActivity = await this.getUserActivityMetrics(lookbackDays);
      
      // Calculate churn probability for each user
      const atRiskUsers: AtRiskUser[] = [];
      
      for (const user of userActivity) {
        const churnProbability = this.calculateChurnProbability(user);
        
        if (churnProbability > 0.3) { // Only include users with >30% churn risk
          const riskLevel = this.determineRiskLevel(churnProbability);
          const reasons = this.identifyChurnReasons(user);
          
          atRiskUsers.push({
            userId: user.userId,
            email: user.email,
            username: user.username,
            churnProbability: Math.round(churnProbability * 100) / 100,
            riskLevel,
            lastActivityDate: user.lastActivityDate,
            daysSinceLastActivity: user.daysSinceLastActivity,
            totalPurchases: user.totalPurchases,
            totalSpent: user.totalSpent,
            avgSessionDuration: user.avgSessionDuration,
            engagementScore: user.engagementScore,
            reasons,
          });
        }
      }

      // Sort by churn probability (highest first)
      atRiskUsers.sort((a, b) => b.churnProbability - a.churnProbability);
      
      // Limit results
      const limitedUsers = atRiskUsers.slice(0, limit);

      // Calculate risk distribution
      const riskDistribution = {
        low: atRiskUsers.filter(u => u.riskLevel === 'low').length,
        medium: atRiskUsers.filter(u => u.riskLevel === 'medium').length,
        high: atRiskUsers.filter(u => u.riskLevel === 'high').length,
        critical: atRiskUsers.filter(u => u.riskLevel === 'critical').length,
      };

      // Calculate current and predicted churn rates
      const totalUsers = userActivity.length;
      const churnedUsers = userActivity.filter(u => u.daysSinceLastActivity > 30).length;
      const churnRate = totalUsers > 0 ? churnedUsers / totalUsers : 0;
      const predictedChurnRate = totalUsers > 0 ? atRiskUsers.length / totalUsers : 0;

      // Calculate confidence based on data quality
      const confidence = this.calculatePredictionConfidence(userActivity);

      const result: ChurnPredictionResult = {
        totalUsers,
        atRiskUsers: limitedUsers,
        churnRate: Math.round(churnRate * 100) / 100,
        predictedChurnRate: Math.round(predictedChurnRate * 100) / 100,
        riskDistribution,
        confidence,
        generatedAt: new Date().toISOString(),
      };

      // Cache for 2 hours
      await redis.setex(cacheKey, 7200, JSON.stringify(result));

      return result;
    } catch (error: any) {
      console.error('Error identifying at-risk users:', error);
      throw new Error(`Failed to identify at-risk users: ${error.message}`);
    }
  }

  /**
   * Generate retention recommendations for at-risk users
   */
  async generateRetentionRecommendations(
    userId: string
  ): Promise<RetentionRecommendation> {
    try {
      const cacheKey = `churn:recommendations:${userId}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get user activity metrics
      const userMetrics = await this.getUserActivityMetrics(90, userId);
      
      if (userMetrics.length === 0) {
        throw new Error('No activity data found for user');
      }

      const metrics = userMetrics[0];
      const churnProbability = this.calculateChurnProbability(metrics);
      const reasons = this.identifyChurnReasons(metrics);

      // Generate personalized recommendations
      const recommendations = this.generateRecommendations(metrics, reasons);
      
      // Generate personalized message
      const personalizedMessage = this.generatePersonalizedMessage(
        user.username || user.email || 'User',
        churnProbability,
        reasons
      );

      // Generate incentives
      const incentives = this.generateIncentives(metrics, churnProbability);

      const result: RetentionRecommendation = {
        userId,
        recommendations,
        personalizedMessage,
        incentives,
      };

      // Cache for 1 hour
      await redis.setex(cacheKey, 3600, JSON.stringify(result));

      return result;
    } catch (error: any) {
      console.error('Error generating retention recommendations:', error);
      throw new Error(`Failed to generate recommendations: ${error.message}`);
    }
  }

  /**
   * Get churn metrics over time
   */
  async getChurnMetrics(
    startDate: Date,
    endDate: Date,
    interval: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ): Promise<ChurnMetrics[]> {
    try {
      const cacheKey = `churn:metrics:${startDate.toISOString()}:${endDate.toISOString()}:${interval}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const metrics: ChurnMetrics[] = [];
      const periods = this.generatePeriods(startDate, endDate, interval);

      for (const period of periods) {
        const periodMetrics = await this.calculatePeriodMetrics(
          period.start,
          period.end
        );
        
        metrics.push({
          period: period.label,
          ...periodMetrics,
        });
      }

      // Cache for 6 hours
      await redis.setex(cacheKey, 21600, JSON.stringify(metrics));

      return metrics;
    } catch (error: any) {
      console.error('Error getting churn metrics:', error);
      throw new Error(`Failed to get churn metrics: ${error.message}`);
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Get user activity metrics from ClickHouse
   */
  private async getUserActivityMetrics(
    lookbackDays: number,
    userId?: string
  ): Promise<any[]> {
    const userFilter = userId ? `AND user_id = '${userId}'` : '';
    
    const query = `
      WITH user_stats AS (
        SELECT 
          user_id,
          max(event_date) as last_activity_date,
          dateDiff('day', max(event_date), today()) as days_since_last_activity,
          count(DISTINCT event_date) as active_days,
          count(*) as total_events,
          countIf(event_type = 'purchase') as total_purchases,
          sumIf(toFloat64OrZero(JSONExtractString(properties, 'amount')), event_type = 'purchase') as total_spent,
          avg(toFloat64OrZero(JSONExtractString(properties, 'duration'))) as avg_session_duration,
          countIf(event_type = 'content_view') as content_views,
          countIf(event_type = 'content_download') as content_downloads,
          countIf(event_type = 'login') as login_count
        FROM analytics_events
        WHERE event_date >= today() - INTERVAL ${lookbackDays} DAY
          ${userFilter}
        GROUP BY user_id
      )
      SELECT 
        us.*,
        u.email,
        u.username,
        (us.active_days / ${lookbackDays}) * 100 as activity_rate,
        (us.total_events / ${lookbackDays}) as avg_events_per_day
      FROM user_stats us
      LEFT JOIN (
        SELECT id as user_id, email, username
        FROM users
      ) u ON us.user_id = u.user_id
      WHERE us.total_events > 0
      ORDER BY us.days_since_last_activity DESC
    `;

    try {
      const result = await clickhouse.query(query).toPromise();
      
      return result.map((row: any) => ({
        userId: row.user_id,
        email: row.email,
        username: row.username,
        lastActivityDate: row.last_activity_date,
        daysSinceLastActivity: parseInt(row.days_since_last_activity) || 0,
        activeDays: parseInt(row.active_days) || 0,
        totalEvents: parseInt(row.total_events) || 0,
        totalPurchases: parseInt(row.total_purchases) || 0,
        totalSpent: parseFloat(row.total_spent) || 0,
        avgSessionDuration: parseFloat(row.avg_session_duration) || 0,
        contentViews: parseInt(row.content_views) || 0,
        contentDownloads: parseInt(row.content_downloads) || 0,
        loginCount: parseInt(row.login_count) || 0,
        activityRate: parseFloat(row.activity_rate) || 0,
        avgEventsPerDay: parseFloat(row.avg_events_per_day) || 0,
        engagementScore: this.calculateEngagementScore(row),
      }));
    } catch (error) {
      console.error('Error fetching user activity metrics:', error);
      return [];
    }
  }

  /**
   * Calculate churn probability using multiple factors
   */
  private calculateChurnProbability(user: any): number {
    // Weighted factors for churn prediction
    const weights = {
      daysSinceLastActivity: 0.35,
      activityRate: 0.25,
      engagementScore: 0.20,
      purchaseFrequency: 0.15,
      sessionDuration: 0.05,
    };

    // Normalize factors to 0-1 scale
    const factors = {
      daysSinceLastActivity: Math.min(user.daysSinceLastActivity / 30, 1), // 30 days = max
      activityRate: 1 - (user.activityRate / 100), // Invert: low activity = high churn
      engagementScore: 1 - (user.engagementScore / 100), // Invert: low engagement = high churn
      purchaseFrequency: user.totalPurchases === 0 ? 1 : Math.max(0, 1 - (user.totalPurchases / 10)), // 10+ purchases = low churn
      sessionDuration: user.avgSessionDuration < 60 ? 0.8 : user.avgSessionDuration < 300 ? 0.5 : 0.2, // <1min = high churn
    };

    // Calculate weighted probability
    let probability = 0;
    for (const [factor, weight] of Object.entries(weights)) {
      probability += factors[factor as keyof typeof factors] * weight;
    }

    return Math.min(Math.max(probability, 0), 1); // Clamp to 0-1
  }

  /**
   * Calculate engagement score (0-100)
   */
  private calculateEngagementScore(user: any): number {
    const contentViews = parseInt(user.content_views) || 0;
    const contentDownloads = parseInt(user.content_downloads) || 0;
    const loginCount = parseInt(user.login_count) || 0;
    const totalPurchases = parseInt(user.total_purchases) || 0;
    const activeDays = parseInt(user.active_days) || 0;

    // Scoring components
    const viewScore = Math.min(contentViews / 50, 1) * 20; // Max 20 points
    const downloadScore = Math.min(contentDownloads / 10, 1) * 20; // Max 20 points
    const loginScore = Math.min(loginCount / 30, 1) * 20; // Max 20 points
    const purchaseScore = Math.min(totalPurchases / 5, 1) * 20; // Max 20 points
    const activityScore = Math.min(activeDays / 60, 1) * 20; // Max 20 points

    return Math.round(viewScore + downloadScore + loginScore + purchaseScore + activityScore);
  }

  /**
   * Determine risk level based on churn probability
   */
  private determineRiskLevel(probability: number): 'low' | 'medium' | 'high' | 'critical' {
    if (probability >= 0.8) return 'critical';
    if (probability >= 0.6) return 'high';
    if (probability >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Identify specific reasons for churn risk
   */
  private identifyChurnReasons(user: any): string[] {
    const reasons: string[] = [];

    if (user.daysSinceLastActivity > 30) {
      reasons.push('No activity in over 30 days');
    } else if (user.daysSinceLastActivity > 14) {
      reasons.push('Declining activity (14+ days since last visit)');
    }

    if (user.activityRate < 20) {
      reasons.push('Low activity rate (active less than 20% of days)');
    }

    if (user.totalPurchases === 0) {
      reasons.push('No purchases made');
    } else if (user.totalPurchases < 2) {
      reasons.push('Limited purchase history');
    }

    if (user.engagementScore < 30) {
      reasons.push('Low engagement score');
    }

    if (user.avgSessionDuration < 60) {
      reasons.push('Very short session durations');
    }

    if (user.contentViews < 5) {
      reasons.push('Minimal content exploration');
    }

    if (user.loginCount < 5) {
      reasons.push('Infrequent logins');
    }

    return reasons;
  }

  /**
   * Generate personalized retention recommendations
   */
  private generateRecommendations(
    user: any,
    reasons: string[]
  ): RetentionRecommendation['recommendations'] {
    const recommendations: RetentionRecommendation['recommendations'] = [];

    // Recommendation based on inactivity
    if (user.daysSinceLastActivity > 14) {
      recommendations.push({
        action: 'Send re-engagement email',
        priority: 'high',
        description: 'Send personalized email highlighting new content and features',
        expectedImpact: 'Can increase re-engagement by 15-25%',
      });
    }

    // Recommendation based on no purchases
    if (user.totalPurchases === 0) {
      recommendations.push({
        action: 'Offer first-purchase discount',
        priority: 'high',
        description: 'Provide 20% discount code for first purchase',
        expectedImpact: 'Converts 10-15% of non-purchasers',
      });
    }

    // Recommendation based on low engagement
    if (user.engagementScore < 30) {
      recommendations.push({
        action: 'Personalized content recommendations',
        priority: 'medium',
        description: 'Send curated content based on browsing history',
        expectedImpact: 'Increases engagement by 20-30%',
      });
    }

    // Recommendation based on short sessions
    if (user.avgSessionDuration < 60) {
      recommendations.push({
        action: 'Improve onboarding experience',
        priority: 'medium',
        description: 'Provide guided tour and highlight key features',
        expectedImpact: 'Increases session duration by 40-50%',
      });
    }

    // Recommendation based on minimal content views
    if (user.contentViews < 5) {
      recommendations.push({
        action: 'Showcase popular content',
        priority: 'medium',
        description: 'Send weekly digest of trending and recommended content',
        expectedImpact: 'Increases content discovery by 35%',
      });
    }

    // Recommendation based on infrequent logins
    if (user.loginCount < 5) {
      recommendations.push({
        action: 'Enable push notifications',
        priority: 'low',
        description: 'Encourage enabling notifications for new content alerts',
        expectedImpact: 'Increases login frequency by 25%',
      });
    }

    // General retention recommendation
    recommendations.push({
      action: 'Loyalty program enrollment',
      priority: 'low',
      description: 'Invite to join loyalty program with rewards for engagement',
      expectedImpact: 'Improves retention by 15-20%',
    });

    return recommendations;
  }

  /**
   * Generate personalized message for user
   */
  private generatePersonalizedMessage(
    username: string,
    churnProbability: number,
    reasons: string[]
  ): string {
    const riskLevel = this.determineRiskLevel(churnProbability);
    
    if (riskLevel === 'critical') {
      return `Hi ${username}, we've noticed you haven't been active recently. We'd love to have you back! Check out our latest content and exclusive offers just for you.`;
    } else if (riskLevel === 'high') {
      return `Hi ${username}, we miss you! There's so much new content waiting for you. Come back and explore what's new.`;
    } else if (riskLevel === 'medium') {
      return `Hi ${username}, we have some exciting new content that matches your interests. Don't miss out!`;
    } else {
      return `Hi ${username}, thanks for being part of our community! Here are some personalized recommendations for you.`;
    }
  }

  /**
   * Generate incentives to retain user
   */
  private generateIncentives(
    user: any,
    churnProbability: number
  ): RetentionRecommendation['incentives'] {
    const incentives: RetentionRecommendation['incentives'] = [];
    const riskLevel = this.determineRiskLevel(churnProbability);

    if (riskLevel === 'critical' || riskLevel === 'high') {
      // High-value incentives for high-risk users
      incentives.push({
        type: 'discount',
        value: '30%',
        description: '30% off your next purchase - valid for 7 days',
      });
      
      if (user.totalPurchases === 0) {
        incentives.push({
          type: 'free_trial',
          value: '30 days',
          description: 'Free premium access for 30 days',
        });
      }
    } else if (riskLevel === 'medium') {
      // Moderate incentives
      incentives.push({
        type: 'discount',
        value: '20%',
        description: '20% off your next purchase - valid for 14 days',
      });
    }

    // Loyalty points for all users
    incentives.push({
      type: 'loyalty_points',
      value: '500',
      description: '500 bonus loyalty points on your next purchase',
    });

    return incentives;
  }

  /**
   * Calculate prediction confidence
   */
  private calculatePredictionConfidence(userActivity: any[]): number {
    if (userActivity.length === 0) return 0;

    // Factors affecting confidence
    const sampleSize = userActivity.length;
    const avgEventsPerUser = userActivity.reduce((sum, u) => sum + u.totalEvents, 0) / sampleSize;
    const dataCompleteness = userActivity.filter(u => u.email || u.username).length / sampleSize;

    // Calculate confidence score (0-100)
    const sizeScore = Math.min(sampleSize / 100, 1) * 40; // Max 40 points
    const eventsScore = Math.min(avgEventsPerUser / 50, 1) * 40; // Max 40 points
    const completenessScore = dataCompleteness * 20; // Max 20 points

    return Math.round(sizeScore + eventsScore + completenessScore);
  }

  /**
   * Calculate metrics for a specific period
   */
  private async calculatePeriodMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<Omit<ChurnMetrics, 'period'>> {
    const query = `
      WITH period_users AS (
        SELECT DISTINCT user_id
        FROM analytics_events
        WHERE event_date >= toDate('${this.formatDate(startDate)}')
          AND event_date <= toDate('${this.formatDate(endDate)}')
      ),
      active_users AS (
        SELECT DISTINCT user_id
        FROM analytics_events
        WHERE event_date >= toDate('${this.formatDate(startDate)}')
          AND event_date <= toDate('${this.formatDate(endDate)}')
          AND event_type IN ('login', 'content_view', 'purchase')
      ),
      churned_users AS (
        SELECT user_id
        FROM (
          SELECT 
            user_id,
            max(event_date) as last_activity
          FROM analytics_events
          WHERE event_date <= toDate('${this.formatDate(endDate)}')
          GROUP BY user_id
        )
        WHERE last_activity < toDate('${this.formatDate(endDate)}') - INTERVAL 30 DAY
      ),
      lifetime_value AS (
        SELECT 
          user_id,
          sum(toFloat64OrZero(JSONExtractString(properties, 'amount'))) as total_spent
        FROM analytics_events
        WHERE event_type = 'purchase'
          AND event_date <= toDate('${this.formatDate(endDate)}')
        GROUP BY user_id
      )
      SELECT 
        (SELECT count(*) FROM period_users) as total_users,
        (SELECT count(*) FROM active_users) as active_users,
        (SELECT count(*) FROM churned_users) as churned_users,
        (SELECT avg(total_spent) FROM lifetime_value) as avg_lifetime_value
    `;

    try {
      const result = await clickhouse.query(query).toPromise();
      
      if (result.length === 0) {
        return {
          totalUsers: 0,
          activeUsers: 0,
          churnedUsers: 0,
          churnRate: 0,
          retentionRate: 0,
          avgLifetimeValue: 0,
        };
      }

      const row = result[0];
      const totalUsers = parseInt(row.total_users) || 0;
      const activeUsers = parseInt(row.active_users) || 0;
      const churnedUsers = parseInt(row.churned_users) || 0;
      const avgLifetimeValue = parseFloat(row.avg_lifetime_value) || 0;

      const churnRate = totalUsers > 0 ? churnedUsers / totalUsers : 0;
      const retentionRate = totalUsers > 0 ? (totalUsers - churnedUsers) / totalUsers : 0;

      return {
        totalUsers,
        activeUsers,
        churnedUsers,
        churnRate: Math.round(churnRate * 100) / 100,
        retentionRate: Math.round(retentionRate * 100) / 100,
        avgLifetimeValue: Math.round(avgLifetimeValue * 100) / 100,
      };
    } catch (error) {
      console.error('Error calculating period metrics:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        churnedUsers: 0,
        churnRate: 0,
        retentionRate: 0,
        avgLifetimeValue: 0,
      };
    }
  }

  /**
   * Generate time periods for metrics
   */
  private generatePeriods(
    startDate: Date,
    endDate: Date,
    interval: 'daily' | 'weekly' | 'monthly'
  ): { start: Date; end: Date; label: string }[] {
    const periods: { start: Date; end: Date; label: string }[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const periodStart = new Date(current);
      let periodEnd: Date;
      let label: string;

      if (interval === 'daily') {
        periodEnd = new Date(current);
        label = periodStart.toISOString().split('T')[0];
        current.setDate(current.getDate() + 1);
      } else if (interval === 'weekly') {
        periodEnd = new Date(current);
        periodEnd.setDate(periodEnd.getDate() + 6);
        label = `Week of ${periodStart.toISOString().split('T')[0]}`;
        current.setDate(current.getDate() + 7);
      } else {
        periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        label = `${periodStart.toLocaleString('default', { month: 'long' })} ${periodStart.getFullYear()}`;
        current.setMonth(current.getMonth() + 1);
      }

      if (periodEnd > endDate) {
        periodEnd = new Date(endDate);
      }

      periods.push({ start: periodStart, end: periodEnd, label });
    }

    return periods;
  }

  /**
   * Format date for ClickHouse query
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

export const churnPredictionService = new ChurnPredictionService();
