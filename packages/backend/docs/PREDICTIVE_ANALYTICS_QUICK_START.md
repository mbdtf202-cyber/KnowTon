# Predictive Analytics - Quick Start Guide

## Overview

Get started with predictive analytics in 5 minutes. This guide shows you how to integrate revenue forecasting, user growth predictions, and trend analysis into your application.

## Prerequisites

- Backend server running
- ClickHouse database with historical data
- Redis cache configured
- At least 7 days of historical data

## Quick Setup

### 1. Verify Data Availability

Check that you have sufficient historical data:

```bash
curl http://localhost:3001/api/v1/analytics/historical/metrics?startDate=2025-08-01&endDate=2025-11-07&granularity=daily
```

### 2. Test Revenue Prediction

Get a 30-day revenue forecast:

```bash
curl http://localhost:3001/api/v1/analytics/predict/revenue?historicalDays=90&forecastDays=30
```

**Expected Response:**
```json
{
  "predictions": [
    { "date": "2025-11-08", "value": 15234.56 },
    { "date": "2025-11-09", "value": 15456.78 }
  ],
  "confidence": 85,
  "totalPredicted": 456789.12,
  "growthRate": 12.5
}
```

### 3. Test User Growth Prediction

Get user growth forecast:

```bash
curl http://localhost:3001/api/v1/analytics/predict/user-growth?historicalDays=90&forecastDays=30
```

### 4. Test Trend Analysis

Get trend predictions for all metrics:

```bash
curl http://localhost:3001/api/v1/analytics/predict/trends?historicalDays=90&forecastDays=30
```

## Frontend Integration

### 1. Install Dependencies

The required dependencies are already included in the project.

### 2. Add to Dashboard

```typescript
import { PredictiveAnalyticsDashboard } from '../components/PredictiveAnalyticsDashboard';

function AnalyticsPage() {
  return (
    <div>
      <h1>Analytics Dashboard</h1>
      <PredictiveAnalyticsDashboard 
        historicalDays={90} 
        forecastDays={30} 
      />
    </div>
  );
}
```

### 3. Use the Hook

```typescript
import { usePredictiveAnalytics } from '../hooks/usePredictiveAnalytics';

function MyComponent() {
  const {
    revenuePrediction,
    userGrowthPrediction,
    loading,
    error,
    fetchAllPredictions,
  } = usePredictiveAnalytics();

  useEffect(() => {
    fetchAllPredictions(90, 30);
  }, []);

  if (loading) return <div>Loading predictions...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Revenue Forecast</h2>
      <p>Predicted: ${revenuePrediction?.totalPredicted.toFixed(2)}</p>
      <p>Confidence: {revenuePrediction?.confidence}%</p>
      <p>Growth Rate: {revenuePrediction?.growthRate.toFixed(1)}%</p>
    </div>
  );
}
```

## Common Use Cases

### 1. Revenue Planning

```typescript
// Get 90-day revenue forecast
const forecast = await predictiveAnalyticsService.predictRevenue(180, 90);

console.log(`Expected revenue: $${forecast.totalPredicted.toFixed(2)}`);
console.log(`Growth rate: ${forecast.growthRate.toFixed(1)}%`);
console.log(`Confidence: ${forecast.confidence}%`);
```

### 2. User Acquisition Planning

```typescript
// Predict user growth for next quarter
const userGrowth = await predictiveAnalyticsService.predictUserGrowth(90, 90);

console.log(`Expected users: ${userGrowth.expectedUsers}`);
console.log(`Acquisition rate: ${(userGrowth.acquisitionRate * 100).toFixed(1)}%`);
console.log(`Churn rate: ${(userGrowth.churnRate * 100).toFixed(1)}%`);
```

### 3. Trend Monitoring

```typescript
// Get trend analysis for all metrics
const trends = await predictiveAnalyticsService.predictTrends(90, 30);

trends.forEach(trend => {
  console.log(`${trend.metric}: ${trend.direction} (${trend.strength}% strength)`);
});
```

### 4. Category Performance

```typescript
// Predict revenue for specific category
const categoryForecast = await predictiveAnalyticsService.predictCategoryRevenue(
  'education',
  90,
  30
);

console.log(`Category forecast: $${categoryForecast.totalPredicted.toFixed(2)}`);
```

## Configuration

### Adjust Forecast Parameters

```typescript
// Short-term forecast (high accuracy)
const shortTerm = await predictiveAnalyticsService.predictRevenue(30, 7);

// Medium-term forecast (balanced)
const mediumTerm = await predictiveAnalyticsService.predictRevenue(90, 30);

// Long-term forecast (strategic planning)
const longTerm = await predictiveAnalyticsService.predictRevenue(180, 90);
```

### Cache Configuration

Predictions are cached for 1 hour by default. To adjust:

```typescript
// In predictive-analytics.service.ts
await redis.setex(cacheKey, 3600, JSON.stringify(result)); // 1 hour

// Change to 30 minutes
await redis.setex(cacheKey, 1800, JSON.stringify(result));
```

## Interpreting Results

### Confidence Levels

- **80-100%**: High confidence - Use for planning and budgeting
- **60-79%**: Medium confidence - Use with caution, monitor closely
- **0-59%**: Low confidence - Insufficient data or high volatility

### Growth Rates

- **Positive**: Revenue/users increasing
- **Negative**: Revenue/users decreasing
- **Near Zero**: Stable, no significant change

### Trend Strength

- **70-100%**: Strong trend - High probability of continuation
- **40-69%**: Moderate trend - May change direction
- **0-39%**: Weak trend - Unstable, likely to fluctuate

## Troubleshooting

### Issue: "Insufficient historical data"

**Solution**: Ensure you have at least 7 days of data in ClickHouse.

```bash
# Check data availability
curl http://localhost:3001/api/v1/analytics/historical/revenue?startDate=2025-10-01&endDate=2025-11-07&granularity=daily
```

### Issue: Low confidence predictions

**Causes:**
- High data volatility
- Insufficient historical data
- Recent significant changes

**Solutions:**
- Increase `historicalDays` parameter
- Wait for more stable data
- Use shorter forecast horizons

### Issue: Predictions seem inaccurate

**Solutions:**
1. Verify historical data quality
2. Check for data gaps or anomalies
3. Increase historical data window
4. Consider external factors (campaigns, holidays)

### Issue: Slow response times

**Solutions:**
1. Check Redis cache is working
2. Optimize ClickHouse queries
3. Reduce forecast horizon
4. Use shorter historical windows

## Performance Tips

1. **Use Caching**: Predictions are cached for 1 hour
2. **Batch Requests**: Use `fetchAllPredictions()` instead of individual calls
3. **Appropriate Horizons**: Shorter forecasts are more accurate
4. **Regular Updates**: Refresh predictions daily for best results

## Next Steps

1. **Integrate into Dashboard**: Add `PredictiveAnalyticsDashboard` component
2. **Set Up Alerts**: Monitor low confidence predictions
3. **Validate Accuracy**: Compare predictions with actual results
4. **Customize Models**: Adjust algorithm weights based on your data
5. **Explore Advanced Features**: Category predictions, seasonal analysis

## API Reference

See [PREDICTIVE_ANALYTICS.md](./PREDICTIVE_ANALYTICS.md) for complete API documentation.

## Support

For issues or questions:
- Check the main documentation
- Review error logs
- Verify data availability
- Test with smaller date ranges

## Example Dashboard

```typescript
import React from 'react';
import { PredictiveAnalyticsDashboard } from '../components/PredictiveAnalyticsDashboard';

export const PredictiveDashboardPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Predictive Analytics
        </h1>
        <p className="text-gray-600 mt-2">
          AI-powered forecasts for revenue, users, and trends
        </p>
      </div>
      
      <PredictiveAnalyticsDashboard 
        historicalDays={90}
        forecastDays={30}
      />
    </div>
  );
};
```

## Success Metrics

After implementation, you should see:
- ✅ Revenue predictions with 70%+ confidence
- ✅ User growth forecasts with trend analysis
- ✅ Multi-metric trend predictions
- ✅ Response times < 2 seconds (with cache)
- ✅ Daily prediction updates

## Resources

- [Full Documentation](./PREDICTIVE_ANALYTICS.md)
- [Time Series Forecasting Guide](https://otexts.com/fpp3/)
- [ClickHouse Analytics](https://clickhouse.com/docs/en/guides/developer/cascading-materialized-views/)
