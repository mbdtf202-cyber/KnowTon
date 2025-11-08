# Churn Prediction - Quick Start Guide

## Overview

This guide will help you quickly integrate and use the Churn Prediction system to identify at-risk users and implement retention strategies.

## Prerequisites

- Backend server running
- ClickHouse database with user activity data
- Redis for caching
- User activity events tracked in `analytics_events` table

## Quick Setup

### 1. Verify Data Collection

Ensure user activity events are being tracked:

```sql
-- Check if analytics_events table has data
SELECT count(*) FROM analytics_events;

-- Check event types
SELECT event_type, count(*) as count
FROM analytics_events
GROUP BY event_type;
```

### 2. Test API Endpoints

```bash
# Get at-risk users
curl http://localhost:3001/api/v1/analytics/churn/at-risk?lookbackDays=90&limit=10

# Get recommendations for a user
curl http://localhost:3001/api/v1/analytics/churn/recommendations/USER_ID

# Get churn metrics
curl "http://localhost:3001/api/v1/analytics/churn/metrics?interval=monthly"
```

## Basic Usage

### Backend

```typescript
import { churnPredictionService } from './services/churn-prediction.service';

// Identify at-risk users
const result = await churnPredictionService.identifyAtRiskUsers(90, 100);

console.log(`Total users: ${result.totalUsers}`);
console.log(`At-risk users: ${result.atRiskUsers.length}`);
console.log(`Churn rate: ${(result.churnRate * 100).toFixed(1)}%`);

// Get recommendations for high-risk users
for (const user of result.atRiskUsers.filter(u => u.riskLevel === 'critical')) {
  const recommendations = await churnPredictionService.generateRetentionRecommendations(
    user.userId
  );
  
  console.log(`Recommendations for ${user.email}:`);
  recommendations.recommendations.forEach(rec => {
    console.log(`- ${rec.action} (${rec.priority})`);
  });
}
```

### Frontend

```typescript
import { useChurnPrediction } from '../hooks/useChurnPrediction';
import { ChurnPredictionDashboard } from '../components/ChurnPredictionDashboard';

function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <ChurnPredictionDashboard />
    </div>
  );
}
```

## Understanding Results

### Risk Levels

- **Critical (80-100%)**: Immediate action required
  - Send personalized email within 24 hours
  - Offer 30% discount or free trial
  - Consider direct outreach

- **High (60-79%)**: High priority
  - Send re-engagement campaign
  - Offer 20% discount
  - Highlight new features

- **Medium (40-59%)**: Monitor closely
  - Send weekly content digest
  - Personalized recommendations
  - Engagement campaigns

- **Low (30-39%)**: Maintain engagement
  - Regular newsletters
  - Loyalty program benefits

### Churn Reasons

Common reasons identified:

1. **No activity in 30+ days**: User hasn't logged in recently
2. **Low activity rate**: Active less than 20% of days
3. **No purchases made**: Never converted to paying customer
4. **Low engagement score**: Minimal interaction with content
5. **Short session durations**: Spending very little time on platform
6. **Minimal content exploration**: Viewing few pieces of content
7. **Infrequent logins**: Logging in rarely

## Implementing Retention Strategies

### 1. Automated Email Campaigns

```typescript
// Example: Send re-engagement emails to critical-risk users
const atRiskUsers = await churnPredictionService.identifyAtRiskUsers(90, 100);

for (const user of atRiskUsers.atRiskUsers.filter(u => u.riskLevel === 'critical')) {
  const recommendations = await churnPredictionService.generateRetentionRecommendations(
    user.userId
  );
  
  // Send email with personalized message and incentives
  await emailService.send({
    to: user.email,
    subject: 'We miss you! Here\'s a special offer',
    body: recommendations.personalizedMessage,
    incentives: recommendations.incentives,
  });
}
```

### 2. Dashboard Monitoring

Add the Churn Prediction Dashboard to your admin panel:

```typescript
import { ChurnPredictionDashboard } from '../components/ChurnPredictionDashboard';

function AdminPanel() {
  return (
    <div className="admin-panel">
      <nav>
        <Link to="/admin/churn">Churn Prediction</Link>
      </nav>
      
      <Route path="/admin/churn">
        <ChurnPredictionDashboard />
      </Route>
    </div>
  );
}
```

### 3. Scheduled Reports

Set up daily or weekly churn reports:

```typescript
// cron job or scheduled task
async function generateChurnReport() {
  const result = await churnPredictionService.identifyAtRiskUsers(90, 100);
  
  const report = {
    date: new Date().toISOString(),
    totalUsers: result.totalUsers,
    atRiskCount: result.atRiskUsers.length,
    churnRate: result.churnRate,
    criticalUsers: result.riskDistribution.critical,
    highRiskUsers: result.riskDistribution.high,
  };
  
  // Send report to admin team
  await emailService.sendReport(report);
}

// Run daily at 9 AM
schedule.scheduleJob('0 9 * * *', generateChurnReport);
```

## Monitoring and Optimization

### Track Retention Success

```typescript
// Track effectiveness of retention actions
async function trackRetentionSuccess(userId: string, action: string) {
  // Record the action taken
  await analytics.track({
    event: 'retention_action',
    userId,
    action,
    timestamp: new Date(),
  });
  
  // Check if user returned within 7 days
  setTimeout(async () => {
    const userActivity = await getUserActivity(userId, 7);
    if (userActivity.hasActivity) {
      await analytics.track({
        event: 'retention_success',
        userId,
        action,
      });
    }
  }, 7 * 24 * 60 * 60 * 1000); // 7 days
}
```

### A/B Testing

Test different retention strategies:

```typescript
const atRiskUsers = await churnPredictionService.identifyAtRiskUsers(90, 100);

// Split users into test groups
const groupA = atRiskUsers.atRiskUsers.filter((_, i) => i % 2 === 0);
const groupB = atRiskUsers.atRiskUsers.filter((_, i) => i % 2 === 1);

// Group A: 30% discount
for (const user of groupA) {
  await sendRetentionEmail(user, { discount: 0.30 });
}

// Group B: Free trial
for (const user of groupB) {
  await sendRetentionEmail(user, { freeTrial: 30 });
}

// Compare results after 2 weeks
```

## Common Issues

### Low Confidence Score

**Problem**: Prediction confidence is below 60%

**Solutions**:
- Collect more user activity data
- Ensure event tracking is working correctly
- Wait for more historical data to accumulate
- Verify data quality and completeness

### No At-Risk Users Found

**Problem**: System reports 0 at-risk users

**Solutions**:
- Check if analytics events are being tracked
- Verify ClickHouse connection and data
- Lower the churn probability threshold
- Increase lookback period

### High Churn Rate

**Problem**: Churn rate is consistently high (>20%)

**Solutions**:
- Implement aggressive retention campaigns
- Improve onboarding experience
- Add more engaging content
- Offer better incentives
- Gather user feedback

## Next Steps

1. **Set up automated monitoring**: Create daily/weekly churn reports
2. **Implement retention campaigns**: Use recommendations to engage users
3. **Track effectiveness**: Measure impact of retention actions
4. **Optimize strategies**: A/B test different approaches
5. **Continuous improvement**: Refine based on results

## Support

For issues or questions:
- Check the full documentation: `CHURN_PREDICTION.md`
- Review API reference
- Contact the development team

---

**Quick Start Version**: 1.0  
**Last Updated**: November 7, 2025
