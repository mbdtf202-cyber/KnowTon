# Churn Prediction System

## Overview

The Churn Prediction system uses machine learning algorithms and user behavior analytics to identify users at risk of churning (leaving the platform). It provides actionable retention recommendations and tracks churn metrics over time.

## Features

### 1. At-Risk User Identification
- **Multi-Factor Analysis**: Evaluates multiple user behavior factors
- **Risk Scoring**: Calculates churn probability (0-100%)
- **Risk Levels**: Categorizes users as low, medium, high, or critical risk
- **Reason Identification**: Identifies specific reasons for churn risk

### 2. Retention Recommendations
- **Personalized Actions**: Tailored recommendations for each user
- **Priority Ranking**: High, medium, and low priority actions
- **Impact Estimation**: Expected impact of each recommendation
- **Incentive Suggestions**: Discounts, free trials, and loyalty rewards

### 3. Churn Metrics Tracking
- **Historical Analysis**: Track churn rates over time
- **Retention Rates**: Monitor user retention trends
- **Lifetime Value**: Calculate average customer lifetime value
- **Cohort Analysis**: Compare different time periods

## API Endpoints

### Get At-Risk Users
```http
GET /api/v1/analytics/churn/at-risk
```

**Query Parameters:**
- `lookbackDays` (optional): Number of days to analyze (default: 90, range: 7-365)
- `limit` (optional): Maximum number of users to return (default: 100, range: 1-1000)

**Response:**
```json
{
  "totalUsers": 1523,
  "atRiskUsers": [
    {
      "userId": "user-123",
      "email": "user@example.com",
      "username": "john_doe",
      "churnProbability": 0.85,
      "riskLevel": "critical",
      "lastActivityDate": "2025-10-15",
      "daysSinceLastActivity": 23,
      "totalPurchases": 2,
      "totalSpent": 150.00,
      "avgSessionDuration": 45,
      "engagementScore": 25,
      "reasons": [
        "No activity in over 14 days",
        "Low engagement score",
        "Very short session durations"
      ]
    }
  ],
  "churnRate": 0.15,
  "predictedChurnRate": 0.22,
  "riskDistribution": {
    "low": 50,
    "medium": 120,
    "high": 80,
    "critical": 35
  },
  "confidence": 82,
  "generatedAt": "2025-11-07T10:30:00Z"
}
```

### Get Retention Recommendations
```http
GET /api/v1/analytics/churn/recommendations/:userId
```

**Path Parameters:**
- `userId` (required): User ID to get recommendations for

**Response:**
```json
{
  "userId": "user-123",
  "recommendations": [
    {
      "action": "Send re-engagement email",
      "priority": "high",
      "description": "Send personalized email highlighting new content and features",
      "expectedImpact": "Can increase re-engagement by 15-25%"
    },
    {
      "action": "Offer first-purchase discount",
      "priority": "high",
      "description": "Provide 20% discount code for first purchase",
      "expectedImpact": "Converts 10-15% of non-purchasers"
    }
  ],
  "personalizedMessage": "Hi John, we've noticed you haven't been active recently. We'd love to have you back! Check out our latest content and exclusive offers just for you.",
  "incentives": [
    {
      "type": "discount",
      "value": "30%",
      "description": "30% off your next purchase - valid for 7 days"
    },
    {
      "type": "loyalty_points",
      "value": "500",
      "description": "500 bonus loyalty points on your next purchase"
    }
  ]
}
```

### Get Churn Metrics
```http
GET /api/v1/analytics/churn/metrics
```

**Query Parameters:**
- `startDate` (optional): Start date (ISO 8601 format)
- `endDate` (optional): End date (ISO 8601 format)
- `interval` (optional): Time interval - daily, weekly, or monthly (default: monthly)

**Response:**
```json
[
  {
    "period": "October 2025",
    "totalUsers": 1500,
    "activeUsers": 1200,
    "churnedUsers": 225,
    "churnRate": 0.15,
    "retentionRate": 0.85,
    "avgLifetimeValue": 245.50
  }
]
```

## Churn Prediction Algorithm

### Factors Considered

The churn prediction model evaluates the following factors:

1. **Days Since Last Activity** (35% weight)
   - Users inactive for 30+ days have high churn risk
   - Recent activity indicates engagement

2. **Activity Rate** (25% weight)
   - Percentage of days user was active
   - Low activity rate indicates disengagement

3. **Engagement Score** (20% weight)
   - Composite score based on:
     - Content views
     - Content downloads
     - Login frequency
     - Purchase history
     - Active days

4. **Purchase Frequency** (15% weight)
   - Number of purchases made
   - Users with no purchases have higher churn risk

5. **Session Duration** (5% weight)
   - Average time spent per session
   - Very short sessions indicate low interest

### Risk Level Classification

- **Critical** (80-100%): Immediate intervention required
- **High** (60-79%): High priority for retention efforts
- **Medium** (40-59%): Monitor and engage proactively
- **Low** (30-39%): Maintain current engagement

### Engagement Score Calculation

Engagement score is calculated on a 0-100 scale:

```
Engagement Score = 
  (Content Views / 50) × 20 +
  (Content Downloads / 10) × 20 +
  (Login Count / 30) × 20 +
  (Total Purchases / 5) × 20 +
  (Active Days / 60) × 20
```

## Retention Strategies

### High-Risk Users (Critical/High)

1. **Immediate Actions**
   - Send personalized re-engagement email
   - Offer significant discount (30%)
   - Provide free trial or premium access
   - Direct outreach from customer success team

2. **Incentives**
   - Time-limited offers (7 days)
   - Exclusive content access
   - Loyalty bonus points
   - Personalized content recommendations

### Medium-Risk Users

1. **Proactive Engagement**
   - Weekly content digest emails
   - Personalized recommendations
   - Moderate discounts (20%)
   - Feature highlights and tutorials

2. **Engagement Boosters**
   - Gamification elements
   - Community involvement
   - Early access to new features
   - Referral rewards

### Low-Risk Users

1. **Maintenance**
   - Regular newsletters
   - Loyalty program benefits
   - Community events
   - Feedback requests

## Data Requirements

### Minimum Requirements
- **User Activity Data**: At least 7 days of history
- **Event Tracking**: Login, content view, purchase events
- **User Profile**: Email or username for personalization

### Recommended
- **Historical Data**: 90+ days for accurate predictions
- **Rich Event Data**: Session duration, content interactions
- **Purchase History**: Transaction amounts and frequency

## Performance Metrics

### Prediction Accuracy
- **Confidence Score**: Based on data quality and sample size
- **Sample Size**: More users = higher confidence
- **Data Completeness**: Complete profiles improve accuracy

### Success Metrics
- **Retention Rate**: Percentage of users retained
- **Churn Rate Reduction**: Decrease in churn over time
- **Recommendation Effectiveness**: Impact of retention actions
- **ROI**: Cost of retention vs. customer lifetime value

## Usage Examples

### Backend Integration

```typescript
import { churnPredictionService } from './services/churn-prediction.service';

// Identify at-risk users
const atRiskUsers = await churnPredictionService.identifyAtRiskUsers(90, 100);

// Get recommendations for a specific user
const recommendations = await churnPredictionService.generateRetentionRecommendations(
  'user-123'
);

// Get churn metrics
const startDate = new Date('2025-01-01');
const endDate = new Date('2025-11-07');
const metrics = await churnPredictionService.getChurnMetrics(
  startDate,
  endDate,
  'monthly'
);
```

### Frontend Integration

```typescript
import { useChurnPrediction } from '../hooks/useChurnPrediction';

function ChurnDashboard() {
  const {
    atRiskUsers,
    recommendations,
    loading,
    fetchAtRiskUsers,
    fetchRetentionRecommendations,
  } = useChurnPrediction();

  useEffect(() => {
    fetchAtRiskUsers(90, 100);
  }, []);

  return (
    <div>
      {atRiskUsers && (
        <div>
          <h2>At-Risk Users: {atRiskUsers.atRiskUsers.length}</h2>
          <p>Churn Rate: {(atRiskUsers.churnRate * 100).toFixed(1)}%</p>
        </div>
      )}
    </div>
  );
}
```

## Best Practices

1. **Regular Monitoring**: Check at-risk users daily or weekly
2. **Timely Intervention**: Act quickly on critical-risk users
3. **Personalization**: Tailor messages and offers to user behavior
4. **A/B Testing**: Test different retention strategies
5. **Feedback Loop**: Track effectiveness of retention actions
6. **Continuous Improvement**: Refine prediction model based on results

## Limitations

- **Historical Data Required**: Needs sufficient user activity history
- **Behavioral Patterns**: Works best with consistent user behavior
- **External Factors**: Cannot predict churn from external events
- **New Users**: Less accurate for users with limited history
- **Seasonal Variations**: May need adjustment for seasonal patterns

## Future Enhancements

- [ ] Machine learning model training with historical churn data
- [ ] Automated retention campaign triggers
- [ ] Cohort-based churn analysis
- [ ] Predictive lifetime value calculation
- [ ] Integration with email marketing platforms
- [ ] A/B testing framework for retention strategies
- [ ] Real-time churn risk alerts
- [ ] Advanced segmentation and targeting

## References

- [Customer Churn Prediction](https://en.wikipedia.org/wiki/Customer_attrition)
- [Retention Marketing](https://www.optimizely.com/optimization-glossary/retention-marketing/)
- [Customer Lifetime Value](https://en.wikipedia.org/wiki/Customer_lifetime_value)

---

**Document Version**: 1.0  
**Last Updated**: November 7, 2025  
**Status**: Production Ready
