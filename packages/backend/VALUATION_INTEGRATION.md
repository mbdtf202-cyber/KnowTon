# NFT Valuation Integration

## Overview

This document describes the integration of AI-powered NFT valuation into the Lending and Bonding services. The integration provides real-time asset valuation, risk assessment, and LTV (Loan-to-Value) calculation for IP-NFTs.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Oracle Adapter Service                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Valuation Service (Python)                            │ │
│  │  - Neural Network Model                                │ │
│  │  - Ensemble Models (RF + GB)                           │ │
│  │  - Feature Engineering (30+ features)                  │ │
│  │  - Risk Assessment                                     │ │
│  │  - Confidence Interval Calculation                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP API
┌─────────────────────────────────────────────────────────────┐
│                    Valuation Client (TS)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  - API Integration with Oracle Adapter                 │ │
│  │  - Redis Caching (1 hour TTL)                          │ │
│  │  - LTV Calculation                                     │ │
│  │  - Risk Parameter Extraction                           │ │
│  │  - Health Factor Calculation                           │ │
│  │  - Batch Operations                                    │ │
│  │  - Retry Logic                                         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                    ↓                        ↓
        ┌───────────────────┐    ┌───────────────────┐
        │  Lending Service  │    │  Bonding Service  │
        │  - Collateral     │    │  - Bond Issuance  │
        │  - Borrowing      │    │  - Risk-Adjusted  │
        │  - Health Factor  │    │    Tranches       │
        │  - Liquidation    │    │  - Valuation      │
        │    Monitoring     │    │    Monitoring     │
        └───────────────────┘    └───────────────────┘
```

## Components

### 1. Valuation Client (`utils/valuation-client.ts`)

Central client for interacting with the Oracle Adapter valuation service.

**Key Features:**
- HTTP client for Oracle Adapter API
- Redis caching with configurable TTL
- Automatic retry with exponential backoff
- Batch valuation support
- LTV and health factor calculation
- Risk parameter extraction

**Configuration:**
```typescript
// Environment variables
ORACLE_ADAPTER_URL=http://oracle-adapter:8000
REDIS_URL=redis://redis:6379
VALUATION_CACHE_ENABLED=true
VALUATION_CACHE_TTL=3600  // 1 hour
```

### 2. Lending Service Integration

Enhanced lending service with real-time valuation and risk assessment.

**New Features:**
- Real-time NFT valuation before collateral supply
- Risk-adjusted LTV calculation
- Dynamic liquidation thresholds
- Health factor with valuation updates
- Batch position valuation

**API Endpoints:**
```
GET  /api/v1/lending/valuation/:tokenId
     - Get current NFT valuation

GET  /api/v1/lending/max-borrow/:tokenId
     - Get max borrow amount with risk assessment
     - Returns: maxBorrow, ltv, valuation, riskLevel, liquidationThreshold

GET  /api/v1/lending/health-with-valuation/:userAddress
     - Get health factor with real-time valuations
     - Returns: healthFactor, collateralValue, borrowedValue, riskLevel, positions
```

**LTV Calculation:**
```typescript
// Base LTV: 50%
// Low Risk (score < 0.3): 60% LTV
// High Risk (score > 0.6): 40% LTV
// Illiquid assets: -5% LTV adjustment

const ltvCalc = valuationClient.calculateLTV(
  collateralValue,
  loanAmount,
  riskParameters
);
```

### 3. Bonding Service Integration

Enhanced bonding service with valuation-based bond issuance and monitoring.

**New Features:**
- Valuation validation before bond issuance
- Risk-adjusted tranche APYs
- Bond health monitoring
- Automatic valuation refresh
- Investment risk assessment

**API Endpoints:**
```
GET  /api/v1/bonding/bonds/:bondId/valuation
     - Get bond valuation and risk metrics
     - Returns: currentValuation, riskScore, healthScore, recommendation

POST /api/v1/bonding/bonds/refresh-valuations
     - Refresh all active bond valuations
```

**Bond Issuance Validation:**
```typescript
// Maximum bond value: 80% of NFT valuation
// APY adjustment based on risk score
// Risk multiplier: 1 + (riskScore * 0.5)

if (bondValue > valuation * 0.8) {
  throw new Error('Bond value exceeds maximum allowed');
}
```

## Valuation Request Format

```typescript
interface ValuationRequest {
  token_id: number;
  metadata: {
    title?: string;
    description?: string;
    category?: string;
    creator?: string;
    quality_score?: number;      // 0-1
    rarity?: number;              // 0-1
    views?: number;
    likes?: number;
    shares?: number;
    has_license?: boolean;
    is_verified?: boolean;
  };
  historical_data?: Array<{
    price: number;
    volume?: number;
    timestamp?: number;
  }>;
}
```

## Valuation Response Format

```typescript
interface ValuationResponse {
  estimated_value: number;                    // USD value
  confidence_interval: [number, number];      // [lower, upper]
  comparable_sales: Array<{
    price: number;
    similarity_score?: number;
    timestamp?: number;
  }>;
  factors: {
    base_factors?: {
      creator_reputation: { score: number; impact: string };
      content_quality: { score: number; impact: string };
      // ... more factors
    };
    market_factors?: {
      liquidity: { score: number; impact: string };
      volatility: { score: number; impact: string };
    };
    risk_factors?: {
      market_risk: string;
      creator_risk: string;
      overall_risk_score: number;
    };
  };
  model_uncertainty?: number;
  processing_time_ms?: number;
}
```

## Risk Parameters

```typescript
interface RiskParameters {
  volatility_score: number;        // 0-1, market volatility
  liquidity_score: number;         // 0-1, asset liquidity
  market_risk: string;             // 'low' | 'medium' | 'high'
  creator_risk: string;            // 'low' | 'medium' | 'high'
  overall_risk_score: number;      // 0-1, combined risk
  risk_adjusted_value: number;     // USD, with haircut applied
}
```

## LTV Calculation

```typescript
interface LTVCalculation {
  ltv_ratio: number;               // Current LTV %
  max_loan_amount: number;         // Maximum borrowable amount
  liquidation_threshold: number;   // Liquidation trigger %
  risk_level: 'low' | 'medium' | 'high';
  recommended_ltv: number;         // Recommended LTV %
}

// Liquidation thresholds:
// - Low risk: 70%
// - Medium risk: 65%
// - High risk: 60%
```

## Health Factor Calculation

```typescript
// Health Factor = (Collateral Value * Liquidation Threshold) / Total Debt

// Status indicators:
// - > 1.5: Healthy (✅)
// - 1.2 - 1.5: Warning (⚠️)
// - < 1.2: At Risk (❌)
// - < 1.0: Liquidation triggered (🚨)

const healthFactor = valuationClient.calculateHealthFactor(
  totalCollateralValue,
  totalDebtValue,
  liquidationThreshold
);
```

## Caching Strategy

**Cache Key Format:**
```
valuation:{tokenId}
```

**Cache TTL:**
- Default: 3600 seconds (1 hour)
- Configurable via `VALUATION_CACHE_TTL`

**Cache Invalidation:**
- Manual: `valuationClient.invalidateCache(tokenId)`
- Automatic: After significant market events
- Scheduled: Periodic refresh for active positions

## Error Handling

**Retry Logic:**
```typescript
// Automatic retry with exponential backoff
// Max retries: 3
// Backoff: 1s, 2s, 4s (capped at 10s)

const valuation = await valuationClient.getValuationWithRetry(request, 3);
```

**Fallback Strategy:**
1. Try Oracle Adapter API
2. Check Redis cache
3. Check database cache
4. Use conservative default ($1000)

## Testing

**Run Integration Tests:**
```bash
cd packages/backend
npm run test:valuation-integration
```

**Test Script:**
```bash
ts-node src/scripts/test-valuation-integration.ts
```

**Test Coverage:**
- ✅ Oracle Adapter health check
- ✅ Valuation retrieval
- ✅ Risk parameter extraction
- ✅ LTV calculation
- ✅ Health factor calculation
- ✅ Cache functionality
- ✅ Batch operations

## Monitoring

**Key Metrics:**
- Valuation request latency
- Cache hit rate
- Oracle Adapter availability
- Valuation accuracy (vs actual sales)
- Risk score distribution

**Prometheus Metrics:**
```
valuation_requests_total
valuation_request_duration_seconds
valuation_cache_hits_total
valuation_cache_misses_total
valuation_errors_total
```

## Best Practices

1. **Always use cached valuations** for read-heavy operations
2. **Invalidate cache** after significant market events
3. **Use batch operations** when valuing multiple NFTs
4. **Monitor health factors** for liquidation risk
5. **Refresh valuations** periodically for active positions
6. **Handle errors gracefully** with fallback strategies
7. **Log all valuation requests** for audit trail

## Security Considerations

1. **Rate Limiting:** Prevent abuse of valuation API
2. **Input Validation:** Sanitize all metadata inputs
3. **Access Control:** Restrict valuation refresh endpoints
4. **Audit Logging:** Log all valuation-based decisions
5. **Cache Security:** Secure Redis connection

## Performance Optimization

1. **Caching:** 1-hour TTL reduces API calls by ~95%
2. **Batch Operations:** Process multiple NFTs in parallel
3. **Async Processing:** Non-blocking valuation requests
4. **Connection Pooling:** Reuse HTTP connections
5. **Lazy Loading:** Fetch valuations only when needed

## Future Enhancements

- [ ] Real-time valuation updates via WebSocket
- [ ] Machine learning model retraining pipeline
- [ ] Historical valuation tracking and analytics
- [ ] Automated liquidation triggers
- [ ] Multi-chain valuation support
- [ ] Advanced risk modeling (VaR, CVaR)
- [ ] Valuation dispute resolution mechanism

## Support

For issues or questions:
- Check Oracle Adapter logs: `kubectl logs -f oracle-adapter-xxx`
- Check backend logs: `kubectl logs -f backend-xxx`
- Review Grafana dashboards for metrics
- Contact: dev@knowton.io
