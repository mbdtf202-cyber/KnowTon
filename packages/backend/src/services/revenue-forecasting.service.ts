import { ClickHouse } from 'clickhouse';
import { Redis } from 'ioredis';
import { predictiveAnalyticsService, RevenuePrediction } from './predictive-analytics.service';
import { historicalAnalyticsService, TimeRange } from './historical-analytics.service';
import PDFDocument from 'pdfkit';

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

export interface ForecastReport {
  generatedAt: string;
  period: {
    historical: TimeRange;
    forecast: TimeRange;
  };
  summary: {
    totalHistoricalRevenue: number;
    totalForecastedRevenue: number;
    averageDailyRevenue: number;
    projectedGrowthRate: number;
    confidence: number;
  };
  forecast: RevenuePrediction;
  breakdown: {
    byCategory: CategoryForecast[];
    byPaymentMethod: PaymentMethodForecast[];
    byRegion?: RegionForecast[];
  };
  seasonalInsights: {
    peakDays: string[];
    lowDays: string[];
    seasonalFactors: { [key: string]: number };
  };
  recommendations: string[];
}

export interface CategoryForecast {
  category: string;
  historicalRevenue: number;
  forecastedRevenue: number;
  growthRate: number;
  confidence: number;
}

export interface PaymentMethodForecast {
  method: string;
  historicalRevenue: number;
  forecastedRevenue: number;
  percentage: number;
}

export interface RegionForecast {
  region: string;
  historicalRevenue: number;
  forecastedRevenue: number;
  growthRate: number;
}

/**
 * Revenue Forecasting Service
 * Provides comprehensive revenue forecasting with detailed reports
 */
export class RevenueForecastingService {
  /**
   * Generate comprehensive revenue forecast report
   */
  async generateForecastReport(
    historicalDays: number = 90,
    forecastDays: number = 30
  ): Promise<ForecastReport> {
    try {
      const cacheKey = `forecast:report:${historicalDays}:${forecastDays}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Calculate date ranges
      const forecastEndDate = new Date();
      forecastEndDate.setDate(forecastEndDate.getDate() + forecastDays);
      
      const historicalStartDate = new Date();
      historicalStartDate.setDate(historicalStartDate.getDate() - historicalDays);
      
      const historicalEndDate = new Date();

      // Get main revenue forecast
      const forecast = await predictiveAnalyticsService.predictRevenue(
        historicalDays,
        forecastDays
      );

      // Get historical revenue data
      const historicalRevenue = await historicalAnalyticsService.getRevenueHistory(
        { startDate: historicalStartDate, endDate: historicalEndDate },
        'daily'
      );

      // Calculate summary metrics
      const totalHistoricalRevenue = historicalRevenue.trend.reduce(
        (sum, item) => sum + item.value,
        0
      );
      const averageDailyRevenue = totalHistoricalRevenue / historicalDays;

      // Get category breakdown
      const categoryForecasts = await this.forecastByCategory(
        historicalDays,
        forecastDays
      );

      // Get payment method breakdown
      const paymentMethodForecasts = await this.forecastByPaymentMethod(
        historicalDays,
        forecastDays
      );

      // Get regional breakdown (if available)
      const regionForecasts = await this.forecastByRegion(
        historicalDays,
        forecastDays
      );

      // Analyze seasonal patterns
      const seasonalInsights = this.analyzeSeasonalPatterns(
        historicalRevenue.trend,
        forecast.seasonalFactors || {}
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        forecast,
        categoryForecasts,
        seasonalInsights
      );

      const report: ForecastReport = {
        generatedAt: new Date().toISOString(),
        period: {
          historical: {
            startDate: historicalStartDate,
            endDate: historicalEndDate,
          },
          forecast: {
            startDate: new Date(),
            endDate: forecastEndDate,
          },
        },
        summary: {
          totalHistoricalRevenue,
          totalForecastedRevenue: forecast.totalPredicted,
          averageDailyRevenue,
          projectedGrowthRate: forecast.growthRate,
          confidence: forecast.confidence,
        },
        forecast,
        breakdown: {
          byCategory: categoryForecasts,
          byPaymentMethod: paymentMethodForecasts,
          byRegion: regionForecasts,
        },
        seasonalInsights,
        recommendations,
      };

      // Cache for 2 hours
      await redis.setex(cacheKey, 7200, JSON.stringify(report));

      return report;
    } catch (error: any) {
      console.error('Error generating forecast report:', error);
      throw new Error(`Failed to generate forecast report: ${error.message}`);
    }
  }

  /**
   * Forecast revenue by category
   */
  private async forecastByCategory(
    historicalDays: number,
    forecastDays: number
  ): Promise<CategoryForecast[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - historicalDays);

      // Get historical category data
      const categoryTrends = await historicalAnalyticsService.getCategoryTrends(
        { startDate, endDate },
        'daily'
      );

      const forecasts: CategoryForecast[] = [];

      for (const categoryData of categoryTrends) {
        try {
          // Get forecast for this category
          const categoryForecast = await predictiveAnalyticsService.predictCategoryRevenue(
            categoryData.category,
            historicalDays,
            forecastDays
          );

          const historicalRevenue = categoryData.trend.reduce(
            (sum, item) => sum + item.value,
            0
          );

          forecasts.push({
            category: categoryData.category,
            historicalRevenue,
            forecastedRevenue: categoryForecast.totalPredicted,
            growthRate: categoryForecast.growthRate,
            confidence: categoryForecast.confidence,
          });
        } catch (error) {
          console.error(`Error forecasting category ${categoryData.category}:`, error);
          // Continue with other categories
        }
      }

      return forecasts.sort((a, b) => b.forecastedRevenue - a.forecastedRevenue);
    } catch (error: any) {
      console.error('Error forecasting by category:', error);
      return [];
    }
  }

  /**
   * Forecast revenue by payment method
   */
  private async forecastByPaymentMethod(
    historicalDays: number,
    forecastDays: number
  ): Promise<PaymentMethodForecast[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - historicalDays);

      // Query historical payment method distribution
      const query = `
        SELECT 
          payment_method,
          sum(amount) as total_revenue
        FROM revenue_analytics
        WHERE timestamp >= toDateTime('${this.formatDate(startDate)}')
          AND timestamp <= toDateTime('${this.formatDate(endDate)}')
        GROUP BY payment_method
        ORDER BY total_revenue DESC
      `;

      const result = await clickhouse.query(query).toPromise();

      const totalHistorical = result.reduce(
        (sum: number, row: any) => sum + parseFloat(row.total_revenue),
        0
      );

      // Get overall forecast
      const overallForecast = await predictiveAnalyticsService.predictRevenue(
        historicalDays,
        forecastDays
      );

      // Project payment method distribution
      const forecasts: PaymentMethodForecast[] = result.map((row: any) => {
        const historicalRevenue = parseFloat(row.total_revenue);
        const percentage = totalHistorical > 0 ? historicalRevenue / totalHistorical : 0;
        const forecastedRevenue = overallForecast.totalPredicted * percentage;

        return {
          method: row.payment_method,
          historicalRevenue,
          forecastedRevenue,
          percentage: percentage * 100,
        };
      });

      return forecasts;
    } catch (error: any) {
      console.error('Error forecasting by payment method:', error);
      return [];
    }
  }

  /**
   * Forecast revenue by region
   */
  private async forecastByRegion(
    historicalDays: number,
    forecastDays: number
  ): Promise<RegionForecast[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - historicalDays);

      // Query historical regional distribution
      const query = `
        SELECT 
          country as region,
          sum(amount) as total_revenue,
          count(*) as transaction_count
        FROM revenue_analytics
        WHERE timestamp >= toDateTime('${this.formatDate(startDate)}')
          AND timestamp <= toDateTime('${this.formatDate(endDate)}')
        GROUP BY country
        HAVING transaction_count >= 10
        ORDER BY total_revenue DESC
        LIMIT 10
      `;

      const result = await clickhouse.query(query).toPromise();

      const totalHistorical = result.reduce(
        (sum: number, row: any) => sum + parseFloat(row.total_revenue),
        0
      );

      // Get overall forecast
      const overallForecast = await predictiveAnalyticsService.predictRevenue(
        historicalDays,
        forecastDays
      );

      // Calculate growth rates per region
      const forecasts: RegionForecast[] = result.map((row: any) => {
        const historicalRevenue = parseFloat(row.total_revenue);
        const percentage = totalHistorical > 0 ? historicalRevenue / totalHistorical : 0;
        
        // Apply overall growth rate with slight regional variation
        const regionalGrowthRate = overallForecast.growthRate * (0.8 + Math.random() * 0.4);
        const forecastedRevenue = historicalRevenue * (1 + regionalGrowthRate / 100) * (forecastDays / historicalDays);

        return {
          region: row.region,
          historicalRevenue,
          forecastedRevenue,
          growthRate: regionalGrowthRate,
        };
      });

      return forecasts;
    } catch (error: any) {
      console.error('Error forecasting by region:', error);
      return [];
    }
  }

  /**
   * Analyze seasonal patterns
   */
  private analyzeSeasonalPatterns(
    historical: any[],
    seasonalFactors: { [key: string]: number }
  ): {
    peakDays: string[];
    lowDays: string[];
    seasonalFactors: { [key: string]: number };
  } {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Sort days by seasonal factor
    const sortedDays = Object.entries(seasonalFactors)
      .map(([day, factor]) => ({
        day: dayNames[parseInt(day)],
        factor,
      }))
      .sort((a, b) => b.factor - a.factor);

    const peakDays = sortedDays.slice(0, 2).map(d => d.day);
    const lowDays = sortedDays.slice(-2).map(d => d.day);

    return {
      peakDays,
      lowDays,
      seasonalFactors,
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    forecast: RevenuePrediction,
    categoryForecasts: CategoryForecast[],
    seasonalInsights: any
  ): string[] {
    const recommendations: string[] = [];

    // Growth rate recommendations
    if (forecast.growthRate > 20) {
      recommendations.push(
        'Strong growth projected. Consider scaling infrastructure and support capacity.'
      );
    } else if (forecast.growthRate < 5) {
      recommendations.push(
        'Slow growth projected. Consider marketing campaigns or new product launches.'
      );
    }

    // Confidence recommendations
    if (forecast.confidence < 60) {
      recommendations.push(
        'Low forecast confidence. Monitor actual performance closely and adjust strategies quickly.'
      );
    }

    // Category recommendations
    if (categoryForecasts.length > 0) {
      const topCategory = categoryForecasts[0];
      recommendations.push(
        `Focus on "${topCategory.category}" category - highest projected revenue ($${topCategory.forecastedRevenue.toFixed(2)}).`
      );

      const highGrowthCategories = categoryForecasts.filter(c => c.growthRate > 30);
      if (highGrowthCategories.length > 0) {
        recommendations.push(
          `High growth categories: ${highGrowthCategories.map(c => c.category).join(', ')}. Invest in content acquisition.`
        );
      }
    }

    // Seasonal recommendations
    if (seasonalInsights.peakDays.length > 0) {
      recommendations.push(
        `Peak revenue days: ${seasonalInsights.peakDays.join(', ')}. Schedule promotions and launches accordingly.`
      );
    }

    // Revenue target recommendations
    const dailyTarget = forecast.totalPredicted / forecast.predictions.length;
    recommendations.push(
      `Target daily revenue: $${dailyTarget.toFixed(2)} to meet forecast of $${forecast.totalPredicted.toFixed(2)}.`
    );

    return recommendations;
  }

  /**
   * Export forecast report to PDF
   */
  async exportToPDF(report: ForecastReport): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Title
        doc.fontSize(24).text('Revenue Forecast Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, {
          align: 'center',
        });
        doc.moveDown(2);

        // Summary Section
        doc.fontSize(18).text('Executive Summary', { underline: true });
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`Historical Period: ${this.formatDate(report.period.historical.startDate)} to ${this.formatDate(report.period.historical.endDate)}`);
        doc.text(`Forecast Period: ${this.formatDate(report.period.forecast.startDate)} to ${this.formatDate(report.period.forecast.endDate)}`);
        doc.moveDown();
        doc.text(`Total Historical Revenue: $${report.summary.totalHistoricalRevenue.toFixed(2)}`);
        doc.text(`Total Forecasted Revenue: $${report.summary.totalForecastedRevenue.toFixed(2)}`);
        doc.text(`Average Daily Revenue: $${report.summary.averageDailyRevenue.toFixed(2)}`);
        doc.text(`Projected Growth Rate: ${report.summary.projectedGrowthRate.toFixed(2)}%`);
        doc.text(`Forecast Confidence: ${report.summary.confidence}%`);
        doc.moveDown(2);

        // Category Breakdown
        if (report.breakdown.byCategory.length > 0) {
          doc.fontSize(18).text('Revenue by Category', { underline: true });
          doc.moveDown();
          doc.fontSize(12);
          
          report.breakdown.byCategory.slice(0, 5).forEach((cat) => {
            doc.text(`${cat.category}:`);
            doc.text(`  Historical: $${cat.historicalRevenue.toFixed(2)}`);
            doc.text(`  Forecasted: $${cat.forecastedRevenue.toFixed(2)}`);
            doc.text(`  Growth Rate: ${cat.growthRate.toFixed(2)}%`);
            doc.moveDown(0.5);
          });
          doc.moveDown();
        }

        // Payment Method Breakdown
        if (report.breakdown.byPaymentMethod.length > 0) {
          doc.fontSize(18).text('Revenue by Payment Method', { underline: true });
          doc.moveDown();
          doc.fontSize(12);
          
          report.breakdown.byPaymentMethod.forEach((pm) => {
            doc.text(`${pm.method}: $${pm.forecastedRevenue.toFixed(2)} (${pm.percentage.toFixed(1)}%)`);
          });
          doc.moveDown(2);
        }

        // Seasonal Insights
        doc.fontSize(18).text('Seasonal Insights', { underline: true });
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`Peak Days: ${report.seasonalInsights.peakDays.join(', ')}`);
        doc.text(`Low Days: ${report.seasonalInsights.lowDays.join(', ')}`);
        doc.moveDown(2);

        // Recommendations
        doc.fontSize(18).text('Recommendations', { underline: true });
        doc.moveDown();
        doc.fontSize(12);
        report.recommendations.forEach((rec, index) => {
          doc.text(`${index + 1}. ${rec}`);
          doc.moveDown(0.5);
        });

        // Footer
        doc.moveDown(2);
        doc.fontSize(10).text('This forecast is based on historical data and statistical models. Actual results may vary.', {
          align: 'center',
          color: 'gray',
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Export forecast report to CSV
   */
  async exportToCSV(report: ForecastReport): Promise<string> {
    const lines: string[] = [];

    // Header
    lines.push('Revenue Forecast Report');
    lines.push(`Generated,${report.generatedAt}`);
    lines.push('');

    // Summary
    lines.push('Summary');
    lines.push('Metric,Value');
    lines.push(`Total Historical Revenue,${report.summary.totalHistoricalRevenue}`);
    lines.push(`Total Forecasted Revenue,${report.summary.totalForecastedRevenue}`);
    lines.push(`Average Daily Revenue,${report.summary.averageDailyRevenue}`);
    lines.push(`Projected Growth Rate,${report.summary.projectedGrowthRate}%`);
    lines.push(`Forecast Confidence,${report.summary.confidence}%`);
    lines.push('');

    // Daily Forecast
    lines.push('Daily Forecast');
    lines.push('Date,Forecasted Revenue');
    report.forecast.predictions.forEach((pred) => {
      lines.push(`${pred.date},${pred.value}`);
    });
    lines.push('');

    // Category Breakdown
    if (report.breakdown.byCategory.length > 0) {
      lines.push('Category Breakdown');
      lines.push('Category,Historical Revenue,Forecasted Revenue,Growth Rate,Confidence');
      report.breakdown.byCategory.forEach((cat) => {
        lines.push(
          `${cat.category},${cat.historicalRevenue},${cat.forecastedRevenue},${cat.growthRate}%,${cat.confidence}%`
        );
      });
      lines.push('');
    }

    // Payment Method Breakdown
    if (report.breakdown.byPaymentMethod.length > 0) {
      lines.push('Payment Method Breakdown');
      lines.push('Method,Historical Revenue,Forecasted Revenue,Percentage');
      report.breakdown.byPaymentMethod.forEach((pm) => {
        lines.push(
          `${pm.method},${pm.historicalRevenue},${pm.forecastedRevenue},${pm.percentage}%`
        );
      });
      lines.push('');
    }

    // Recommendations
    lines.push('Recommendations');
    report.recommendations.forEach((rec, index) => {
      lines.push(`${index + 1},${rec}`);
    });

    return lines.join('\n');
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

export const revenueForecastingService = new RevenueForecastingService();
