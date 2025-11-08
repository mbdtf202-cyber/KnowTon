import { ClickHouse } from 'clickhouse';
import { Redis } from 'ioredis';
import { historicalAnalyticsService, TimeRange, TrendData } from './historical-analytics.service';

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

export interface PredictionResult {
  predictions: TrendData[];
  confidence: number;
  method: string;
  metadata: {
    historicalDataPoints: number;
    predictionHorizon: number;
    modelAccuracy?: number;
  };
}

export interface RevenuePrediction extends PredictionResult {
  totalPredicted: number;
  growthRate: number;
  seasonalFactors?: { [key: string]: number };
}

export interface UserGrowthPrediction extends PredictionResult {
  expectedUsers: number;
  churnRate: number;
  acquisitionRate: number;
}

export interface TrendPrediction {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  strength: number;
  predictions: TrendData[];
  confidence: number;
}

/**
 * Predictive Analytics Service
 * Implements time series forecasting for revenue, user growth, and trends
 */
export class PredictiveAnalyticsService {
  /**
   * Predict future revenue using exponential smoothing and linear regression
   */
  async predictRevenue(
    historicalDays: number = 90,
    forecastDays: number = 30
  ): Promise<RevenuePrediction> {
    try {
      const cacheKey = `predictive:revenue:${historicalDays}:${forecastDays}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get historical data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - historicalDays);

      const historical = await historicalAnalyticsService.getRevenueHistory(
        { startDate, endDate },
        'daily'
      );

      if (historical.trend.length < 7) {
        throw new Error('Insufficient historical data for prediction');
      }

      // Apply multiple forecasting methods and ensemble
      const linearPrediction = this.linearRegressionForecast(historical.trend, forecastDays);
      const exponentialPrediction = this.exponentialSmoothingForecast(historical.trend, forecastDays);
      const movingAvgPrediction = this.movingAverageForecast(historical.trend, forecastDays);

      // Ensemble predictions (weighted average)
      const predictions = this.ensemblePredictions([
        { predictions: linearPrediction, weight: 0.3 },
        { predictions: exponentialPrediction, weight: 0.5 },
        { predictions: movingAvgPrediction, weight: 0.2 },
      ]);

      // Calculate seasonal factors
      const seasonalFactors = this.calculateSeasonalFactors(historical.trend);

      // Apply seasonal adjustment
      const adjustedPredictions = this.applySeasonalAdjustment(predictions, seasonalFactors);

      const totalPredicted = adjustedPredictions.reduce((sum, p) => sum + p.value, 0);
      const growthRate = this.calculateGrowthRate(historical.trend);
      const confidence = this.calculateConfidence(historical.trend, adjustedPredictions);

      const result: RevenuePrediction = {
        predictions: adjustedPredictions,
        confidence,
        method: 'ensemble',
        totalPredicted,
        growthRate,
        seasonalFactors,
        metadata: {
          historicalDataPoints: historical.trend.length,
          predictionHorizon: forecastDays,
        },
      };

      // Cache for 1 hour
      await redis.setex(cacheKey, 3600, JSON.stringify(result));

      return result;
    } catch (error: any) {
      console.error('Error predicting revenue:', error);
      throw new Error(`Failed to predict revenue: ${error.message}`);
    }
  }

  /**
   * Predict user growth using logistic growth model
   */
  async predictUserGrowth(
    historicalDays: number = 90,
    forecastDays: number = 30
  ): Promise<UserGrowthPrediction> {
    try {
      const cacheKey = `predictive:users:${historicalDays}:${forecastDays}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get historical user data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - historicalDays);

      const historical = await historicalAnalyticsService.getUserActivityHistory(
        { startDate, endDate },
        'daily'
      );

      if (historical.trend.length < 7) {
        throw new Error('Insufficient historical data for prediction');
      }

      // Calculate churn and acquisition rates
      const churnRate = await this.calculateChurnRate({ startDate, endDate });
      const acquisitionRate = this.calculateAcquisitionRate(historical.trend);

      // Use logistic growth model for user prediction
      const predictions = this.logisticGrowthForecast(
        historical.trend,
        forecastDays,
        acquisitionRate,
        churnRate
      );

      const expectedUsers = predictions[predictions.length - 1]?.value || 0;
      const confidence = this.calculateConfidence(historical.trend, predictions);

      const result: UserGrowthPrediction = {
        predictions,
        confidence,
        method: 'logistic_growth',
        expectedUsers,
        churnRate,
        acquisitionRate,
        metadata: {
          historicalDataPoints: historical.trend.length,
          predictionHorizon: forecastDays,
        },
      };

      // Cache for 1 hour
      await redis.setex(cacheKey, 3600, JSON.stringify(result));

      return result;
    } catch (error: any) {
      console.error('Error predicting user growth:', error);
      throw new Error(`Failed to predict user growth: ${error.message}`);
    }
  }

  /**
   * Detect and predict trends across multiple metrics
   */
  async predictTrends(
    historicalDays: number = 90,
    forecastDays: number = 30
  ): Promise<TrendPrediction[]> {
    try {
      const cacheKey = `predictive:trends:${historicalDays}:${forecastDays}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - historicalDays);

      // Get historical data for multiple metrics
      const [revenue, users, transactions, content] = await Promise.all([
        historicalAnalyticsService.getRevenueHistory({ startDate, endDate }, 'daily'),
        historicalAnalyticsService.getUserActivityHistory({ startDate, endDate }, 'daily'),
        historicalAnalyticsService.getTransactionHistory({ startDate, endDate }, 'daily'),
        historicalAnalyticsService.getContentPerformanceHistory({ startDate, endDate }, 'daily'),
      ]);

      const trends: TrendPrediction[] = [];

      // Analyze revenue trend
      trends.push(
        this.analyzeTrend('revenue', revenue.trend, forecastDays)
      );

      // Analyze user growth trend
      trends.push(
        this.analyzeTrend('users', users.trend, forecastDays)
      );

      // Analyze transaction trend
      trends.push(
        this.analyzeTrend('transactions', transactions.trend, forecastDays)
      );

      // Analyze content performance trend
      trends.push(
        this.analyzeTrend('content_views', content.trend, forecastDays)
      );

      // Cache for 1 hour
      await redis.setex(cacheKey, 3600, JSON.stringify(trends));

      return trends;
    } catch (error: any) {
      console.error('Error predicting trends:', error);
      throw new Error(`Failed to predict trends: ${error.message}`);
    }
  }

  /**
   * Predict category-specific revenue trends
   */
  async predictCategoryRevenue(
    category: string,
    historicalDays: number = 90,
    forecastDays: number = 30
  ): Promise<RevenuePrediction> {
    try {
      const cacheKey = `predictive:category:${category}:${historicalDays}:${forecastDays}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - historicalDays);

      // Get category-specific historical data
      const categoryTrends = await historicalAnalyticsService.getCategoryTrends(
        { startDate, endDate },
        'daily'
      );

      const categoryData = categoryTrends.find(c => c.category === category);
      if (!categoryData || categoryData.trend.length < 7) {
        throw new Error(`Insufficient data for category: ${category}`);
      }

      // Use exponential smoothing for category prediction
      const predictions = this.exponentialSmoothingForecast(categoryData.trend, forecastDays);
      const totalPredicted = predictions.reduce((sum, p) => sum + p.value, 0);
      const growthRate = this.calculateGrowthRate(categoryData.trend);
      const confidence = this.calculateConfidence(categoryData.trend, predictions);

      const result: RevenuePrediction = {
        predictions,
        confidence,
        method: 'exponential_smoothing',
        totalPredicted,
        growthRate,
        metadata: {
          historicalDataPoints: categoryData.trend.length,
          predictionHorizon: forecastDays,
        },
      };

      // Cache for 1 hour
      await redis.setex(cacheKey, 3600, JSON.stringify(result));

      return result;
    } catch (error: any) {
      console.error('Error predicting category revenue:', error);
      throw new Error(`Failed to predict category revenue: ${error.message}`);
    }
  }

  // ==================== Forecasting Algorithms ====================

  /**
   * Linear regression forecast
   */
  private linearRegressionForecast(historical: TrendData[], forecastDays: number): TrendData[] {
    const n = historical.length;
    const values = historical.map(d => d.value);
    
    // Calculate linear regression coefficients
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((sum, v) => sum + v, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;
    
    // Generate predictions
    const predictions: TrendData[] = [];
    const lastDate = new Date(historical[historical.length - 1].date);
    
    for (let i = 1; i <= forecastDays; i++) {
      const predictedValue = Math.max(0, intercept + slope * (n + i - 1));
      const date = new Date(lastDate);
      date.setDate(date.getDate() + i);
      
      predictions.push({
        date: date.toISOString().split('T')[0],
        value: predictedValue,
      });
    }
    
    return predictions;
  }

  /**
   * Exponential smoothing forecast (Holt's method)
   */
  private exponentialSmoothingForecast(historical: TrendData[], forecastDays: number): TrendData[] {
    const alpha = 0.3; // Level smoothing parameter
    const beta = 0.1;  // Trend smoothing parameter
    
    const values = historical.map(d => d.value);
    let level = values[0];
    let trend = values[1] - values[0];
    
    // Apply exponential smoothing to historical data
    for (let i = 1; i < values.length; i++) {
      const prevLevel = level;
      level = alpha * values[i] + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }
    
    // Generate predictions
    const predictions: TrendData[] = [];
    const lastDate = new Date(historical[historical.length - 1].date);
    
    for (let i = 1; i <= forecastDays; i++) {
      const predictedValue = Math.max(0, level + i * trend);
      const date = new Date(lastDate);
      date.setDate(date.getDate() + i);
      
      predictions.push({
        date: date.toISOString().split('T')[0],
        value: predictedValue,
      });
    }
    
    return predictions;
  }

  /**
   * Moving average forecast
   */
  private movingAverageForecast(historical: TrendData[], forecastDays: number): TrendData[] {
    const windowSize = Math.min(7, Math.floor(historical.length / 3));
    const values = historical.map(d => d.value);
    
    // Calculate moving average
    const movingAvg = values.slice(-windowSize).reduce((sum, v) => sum + v, 0) / windowSize;
    
    // Calculate trend from recent data
    const recentTrend = (values[values.length - 1] - values[values.length - windowSize]) / windowSize;
    
    // Generate predictions
    const predictions: TrendData[] = [];
    const lastDate = new Date(historical[historical.length - 1].date);
    
    for (let i = 1; i <= forecastDays; i++) {
      const predictedValue = Math.max(0, movingAvg + i * recentTrend);
      const date = new Date(lastDate);
      date.setDate(date.getDate() + i);
      
      predictions.push({
        date: date.toISOString().split('T')[0],
        value: predictedValue,
      });
    }
    
    return predictions;
  }

  /**
   * Logistic growth forecast for user growth
   */
  private logisticGrowthForecast(
    historical: TrendData[],
    forecastDays: number,
    acquisitionRate: number,
    churnRate: number
  ): TrendData[] {
    const values = historical.map(d => d.value);
    const currentUsers = values[values.length - 1];
    
    // Estimate carrying capacity (market saturation)
    const maxUsers = currentUsers * 10; // Assume 10x current as max
    
    const predictions: TrendData[] = [];
    const lastDate = new Date(historical[historical.length - 1].date);
    
    let users = currentUsers;
    
    for (let i = 1; i <= forecastDays; i++) {
      // Logistic growth: dN/dt = r*N*(1 - N/K) - c*N
      // where r = acquisition rate, K = carrying capacity, c = churn rate
      const growth = acquisitionRate * users * (1 - users / maxUsers) - churnRate * users;
      users = Math.max(0, users + growth);
      
      const date = new Date(lastDate);
      date.setDate(date.getDate() + i);
      
      predictions.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(users),
      });
    }
    
    return predictions;
  }

  // ==================== Helper Methods ====================

  /**
   * Ensemble multiple predictions with weights
   */
  private ensemblePredictions(
    predictions: { predictions: TrendData[]; weight: number }[]
  ): TrendData[] {
    const length = predictions[0].predictions.length;
    const ensemble: TrendData[] = [];
    
    for (let i = 0; i < length; i++) {
      let weightedSum = 0;
      let totalWeight = 0;
      
      predictions.forEach(({ predictions: pred, weight }) => {
        weightedSum += pred[i].value * weight;
        totalWeight += weight;
      });
      
      ensemble.push({
        date: predictions[0].predictions[i].date,
        value: weightedSum / totalWeight,
      });
    }
    
    return ensemble;
  }

  /**
   * Calculate seasonal factors (day of week patterns)
   */
  private calculateSeasonalFactors(historical: TrendData[]): { [key: string]: number } {
    const dayFactors: { [key: number]: number[] } = {};
    
    historical.forEach(item => {
      const date = new Date(item.date);
      const dayOfWeek = date.getDay();
      
      if (!dayFactors[dayOfWeek]) {
        dayFactors[dayOfWeek] = [];
      }
      dayFactors[dayOfWeek].push(item.value);
    });
    
    // Calculate average for each day
    const avgByDay: { [key: string]: number } = {};
    const overallAvg = historical.reduce((sum, item) => sum + item.value, 0) / historical.length;
    
    Object.keys(dayFactors).forEach(day => {
      const dayAvg = dayFactors[parseInt(day)].reduce((sum, v) => sum + v, 0) / dayFactors[parseInt(day)].length;
      avgByDay[day] = overallAvg > 0 ? dayAvg / overallAvg : 1;
    });
    
    return avgByDay;
  }

  /**
   * Apply seasonal adjustment to predictions
   */
  private applySeasonalAdjustment(
    predictions: TrendData[],
    seasonalFactors: { [key: string]: number }
  ): TrendData[] {
    return predictions.map(item => {
      const date = new Date(item.date);
      const dayOfWeek = date.getDay();
      const factor = seasonalFactors[dayOfWeek.toString()] || 1;
      
      return {
        date: item.date,
        value: item.value * factor,
      };
    });
  }

  /**
   * Calculate growth rate from historical data
   */
  private calculateGrowthRate(historical: TrendData[]): number {
    if (historical.length < 2) return 0;
    
    const firstValue = historical[0].value;
    const lastValue = historical[historical.length - 1].value;
    
    if (firstValue === 0) return lastValue > 0 ? 100 : 0;
    
    return ((lastValue - firstValue) / firstValue) * 100;
  }

  /**
   * Calculate prediction confidence based on historical variance
   */
  private calculateConfidence(historical: TrendData[], predictions: TrendData[]): number {
    // Calculate coefficient of variation for historical data
    const values = historical.map(d => d.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 1;
    
    // Lower CV = higher confidence
    // Confidence ranges from 0 to 100
    const confidence = Math.max(0, Math.min(100, (1 - cv) * 100));
    
    return Math.round(confidence);
  }

  /**
   * Calculate churn rate from user data
   */
  private async calculateChurnRate(timeRange: TimeRange): Promise<number> {
    try {
      const query = `
        SELECT 
          count(DISTINCT user_address) as total_users,
          count(DISTINCT CASE 
            WHEN last_activity_date < today() - INTERVAL 30 DAY 
            THEN user_address 
          END) as churned_users
        FROM (
          SELECT 
            user_address,
            max(event_date) as last_activity_date
          FROM user_behavior_events
          WHERE event_date >= toDate('${this.formatDate(timeRange.startDate)}')
            AND event_date <= toDate('${this.formatDate(timeRange.endDate)}')
          GROUP BY user_address
        )
      `;

      const result = await clickhouse.query(query).toPromise();
      
      if (result.length > 0) {
        const totalUsers = parseInt(result[0].total_users) || 0;
        const churnedUsers = parseInt(result[0].churned_users) || 0;
        
        return totalUsers > 0 ? churnedUsers / totalUsers : 0.05; // Default 5% churn
      }
      
      return 0.05; // Default churn rate
    } catch (error) {
      console.error('Error calculating churn rate:', error);
      return 0.05; // Default churn rate
    }
  }

  /**
   * Calculate acquisition rate from user growth
   */
  private calculateAcquisitionRate(historical: TrendData[]): number {
    if (historical.length < 2) return 0.1; // Default 10% growth
    
    const values = historical.map(d => d.value);
    const growthRates: number[] = [];
    
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] > 0) {
        growthRates.push((values[i] - values[i - 1]) / values[i - 1]);
      }
    }
    
    // Average growth rate
    const avgGrowth = growthRates.reduce((sum, r) => sum + r, 0) / growthRates.length;
    
    return Math.max(0, avgGrowth);
  }

  /**
   * Analyze trend direction and strength
   */
  private analyzeTrend(metric: string, historical: TrendData[], forecastDays: number): TrendPrediction {
    // Calculate trend using linear regression
    const predictions = this.linearRegressionForecast(historical, forecastDays);
    
    // Determine trend direction
    const firstValue = historical[0].value;
    const lastValue = historical[historical.length - 1].value;
    const change = lastValue - firstValue;
    const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0;
    
    let direction: 'up' | 'down' | 'stable';
    if (Math.abs(changePercent) < 5) {
      direction = 'stable';
    } else if (changePercent > 0) {
      direction = 'up';
    } else {
      direction = 'down';
    }
    
    // Calculate trend strength (0-100)
    const strength = Math.min(100, Math.abs(changePercent));
    
    const confidence = this.calculateConfidence(historical, predictions);
    
    return {
      metric,
      direction,
      strength: Math.round(strength),
      predictions,
      confidence,
    };
  }

  /**
   * Format date for ClickHouse query
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

export const predictiveAnalyticsService = new PredictiveAnalyticsService();
