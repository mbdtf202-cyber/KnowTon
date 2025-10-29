# ClickHouse Analytics Schema Guide

## Overview

This document describes the ClickHouse analytics database schema for the KnowTon Web3 IP Platform. The schema is designed to support real-time analytics, user behavior tracking, revenue analysis, and market metrics.

## Database Structure

### Database: `knowton`
- **Engine**: Atomic
- **Purpose**: Analytics and OLAP queries for Web3 IP platform
- **Requirements**: 11.1 (Real-time metrics), 11.2 (Data aggregation), 11.3 (Analytics API)

## Table Categories

### 1. Core Transaction Analytics

#### `nft_transactions`
Primary table for all NFT transaction events.

**Key Features:**
- Comprehensive transaction tracking (mint, transfer, sale, burn, list, delist)
- USD pricing and gas cost tracking
- Royalty and platform fee tracking
- Bloom filter indexes for address lookups
- 3-year data retention

**Partitioning:** Monthly by `event_date`
**Ordering:** `(event_date, event_time, token_id, tx_hash)`
**TTL:** 3 years

**Use Cases:**
- Transaction history queries
- Volume analysis
- Gas cost optimization
- Royalty tracking

#### `trading_volume`
Aggregated trading volume metrics.

**Engine:** SummingMergeTree
**Aggregations:** Volume, trade count, unique traders
**Partitioning:** Monthly

#### `user_activity`
User action aggregations.

**Engine:** SummingMergeTree
**Tracks:** Action types, counts, and total values per user
**Partitioning:** Monthly

### 2. Revenue & Earnings Analytics

#### `revenue_breakdown`
Detailed revenue tracking by source.

**Revenue Sources:**
- Primary sales
- Secondary sales
- Royalties
- Fractionalization
- Staking rewards
- Lending interest
- Bond yields
- Platform fees

**Key Features:**
- Gross/net amount tracking
- Fee breakdown
- USD conversion
- Creator attribution
- 5-year retention

**Partitioning:** Monthly by `event_date`
**Ordering:** `(event_date, event_time, revenue_source, token_id)`

#### `daily_creator_revenue`
Aggregated daily revenue per creator.

**Engine:** SummingMergeTree
**Metrics:** Total revenue, transaction count, unique buyers
**Partitioning:** Monthly
**TTL:** 3 years

#### `creator_earnings`
Creator earnings by type.

**Engine:** SummingMergeTree
**Revenue Types:** Sale, royalty, staking, other
**Partitioning:** Monthly

### 3. User Behavior Analytics

#### `user_behavior_events`
Comprehensive user behavior tracking.

**Event Types:**
- Page views
- NFT interactions (view, like, share)
- Search and filtering
- Wallet connections
- Purchase funnel (cart, intent, complete)
- Bidding and offers
- Creator follows

**Key Features:**
- Session tracking
- Device type detection
- Geographic data (country code)
- Referrer tracking
- 1-year retention (privacy consideration)

**Partitioning:** Monthly by `event_date`
**Ordering:** `(event_date, event_time, user_address, session_id)`

#### `user_engagement_metrics`
Daily user engagement aggregations.

**Metrics:**
- Session count
- Total events
- Page views
- NFT views
- Interactions
- Time spent
- Conversion events

**Engine:** SummingMergeTree
**TTL:** 2 years

#### `content_interaction_matrix`
User-content interaction matrix for recommendations.

**Purpose:** Collaborative filtering and recommendation engine
**Metrics:** Views, likes, shares, purchases, interaction score
**TTL:** 6 months

### 4. Market Analytics

#### `price_history`
OHLCV price data for charting.

**Metrics:**
- Open, High, Low, Close prices
- Volume
- Trade count
- VWAP (Volume Weighted Average Price)

**Engine:** ReplacingMergeTree
**Partitioning:** Monthly
**TTL:** 2 years

#### `floor_price_tracking`
Floor price tracking by category and collection.

**Metrics:**
- Floor price (ETH and USD)
- Listed count
- Holder count
- Market cap

**Engine:** ReplacingMergeTree
**Granularity:** Hourly
**TTL:** 1 year

#### `liquidity_pool_analytics`
DeFi liquidity pool metrics.

**Metrics:**
- Reserves
- Total liquidity (USD)
- 24h volume and fees
- APY

**Engine:** ReplacingMergeTree
**TTL:** 1 year

### 5. DeFi Analytics

#### `staking_analytics`
Staking activity tracking.

**Actions:** Stake, unstake, claim
**Metrics:** Amount, lock period, APY, rewards
**Partitioning:** Monthly

#### `governance_analytics`
DAO governance activity.

**Actions:** Proposal created, voted, executed, cancelled
**Metrics:** Vote weight, support
**Partitioning:** Monthly

#### `fractionalization_analytics`
NFT fractionalization tracking.

**Actions:** Created, bought, sold, redeemed
**Metrics:** Amount, price
**Partitioning:** Monthly

#### `bond_analytics`
Bond issuance and investment tracking.

**Actions:** Issued, invested, distributed, redeemed
**Metrics:** Tranche ID, amount
**Partitioning:** Monthly

#### `lending_analytics`
Lending protocol activity.

**Actions:** Supply, borrow, repay, withdraw
**Metrics:** Asset, amount, health factor
**Partitioning:** Monthly

### 6. Content & Platform Metrics

#### `content_metrics`
Content performance tracking.

**Metrics:**
- Views and unique viewers
- Likes and shares
- Revenue

**Engine:** SummingMergeTree
**Partitioning:** Monthly

#### `platform_metrics`
General platform metrics.

**Engine:** ReplacingMergeTree
**Granularity:** Hourly
**Purpose:** Custom metric storage

#### `gas_analytics`
Gas usage tracking.

**Metrics:** Gas used, gas price, total cost
**Purpose:** Cost optimization
**Partitioning:** Monthly

## Materialized Views

### Real-Time Aggregations

#### `daily_trading_stats`
Daily trading statistics by category.

**Source:** `nft_transactions`
**Aggregations:** Total volume, trade count, unique traders

#### `revenue_aggregation_mv`
Real-time revenue aggregation by recipient and source.

**Source:** `revenue_breakdown`
**Aggregations:** Gross, fees, net, USD value, transaction count

#### `user_engagement_mv`
User engagement metrics aggregation.

**Source:** `user_behavior_events`
**Aggregations:** Sessions, events, views, interactions, conversions

#### `hourly_transaction_summary_mv`
Hourly transaction summaries for fast queries.

**Source:** `nft_transactions`
**Aggregations:** TX count, volume, gas costs, unique users

#### `top_traders_mv`
Top traders by volume.

**Source:** `nft_transactions`
**Aggregations:** Trade count, volume, unique tokens

#### `category_performance_mv`
Category performance metrics.

**Source:** `nft_transactions`
**Aggregations:** Transactions, volume, avg/median price, unique tokens/traders

#### `creator_performance_mv`
Creator performance aggregation.

**Source:** `creator_earnings`
**Aggregations:** Total earnings, transaction count

#### `platform_daily_stats_mv`
Platform-wide daily statistics.

**Source:** `nft_transactions`
**Aggregations:** Active NFTs, users, volume, transactions

#### `trending_content_mv`
Trending content aggregation.

**Source:** `content_metrics`
**Aggregations:** Views, likes, shares, revenue

### Pre-Computed Views

#### `top_content_7d`
Top performing content in last 7 days.

**Source:** `content_metrics`
**Limit:** 100 items
**Order:** By total revenue

## Indexing Strategy

### Bloom Filter Indexes
Used for address lookups (high cardinality):
- `from_address`
- `to_address`
- `creator_address`
- `user_address`
- `recipient_address`

### MinMax Indexes
Used for numeric ranges:
- `token_id`
- `block_number`

### Set Indexes
Used for low cardinality enums:
- `category`
- `event_type`
- `transaction_type`

## Partitioning Strategy

All tables use **monthly partitioning** by date:
- Format: `toYYYYMM(date_column)`
- Benefits: Efficient data pruning, parallel query execution
- Maintenance: Automatic partition dropping based on TTL

## Data Retention Policies (TTL)

| Data Type | Retention Period | Rationale |
|-----------|-----------------|-----------|
| Raw transactions | 3 years | Regulatory compliance |
| Revenue data | 5 years | Financial records |
| User behavior | 1 year | Privacy consideration |
| Aggregated metrics | 2-3 years | Historical analysis |
| Market data | 1-2 years | Recent trends focus |

## Performance Optimization

### Table Settings

```sql
-- Wide part optimization for large tables
min_bytes_for_wide_part = 10485760  -- 10MB
min_rows_for_wide_part = 100000

-- Smaller threshold for behavior events
min_bytes_for_wide_part = 5242880   -- 5MB
min_rows_for_wide_part = 50000
```

### Query Optimization Tips

1. **Always filter by date first** - Leverages partitioning
2. **Use materialized views** - Pre-aggregated data
3. **Limit result sets** - Use LIMIT clause
4. **Use appropriate indexes** - Bloom filters for addresses
5. **Avoid SELECT *** - Specify needed columns

## Sample Queries

### Top NFTs by Volume (Last 7 Days)
```sql
SELECT 
    token_id,
    sum(price) as total_volume,
    count() as trade_count,
    avg(price) as avg_price
FROM nft_transactions
WHERE event_date >= today() - 7 
    AND transaction_type = 'sale'
GROUP BY token_id
ORDER BY total_volume DESC
LIMIT 10;
```

### Creator Earnings Breakdown (Last 30 Days)
```sql
SELECT 
    creator_address,
    revenue_source,
    sum(net_amount) as total_earnings,
    sum(usd_value) as total_usd,
    count() as transaction_count
FROM revenue_breakdown
WHERE event_date >= today() - 30
GROUP BY creator_address, revenue_source
ORDER BY total_usd DESC;
```

### User Engagement Metrics (Last 7 Days)
```sql
SELECT 
    user_address,
    sum(session_count) as total_sessions,
    sum(page_views) as total_page_views,
    sum(conversion_events) as total_conversions,
    sum(conversion_events) * 100.0 / sum(page_views) as conversion_rate
FROM user_engagement_metrics
WHERE date >= today() - 7
GROUP BY user_address
HAVING total_sessions > 0
ORDER BY total_conversions DESC
LIMIT 100;
```

### Trending Content (Real-time)
```sql
SELECT 
    token_id,
    content_id,
    sum(views) as total_views,
    sum(revenue) as total_revenue,
    sum(likes) as total_likes,
    sum(shares) as total_shares
FROM content_metrics
WHERE date >= today() - 7
GROUP BY token_id, content_id
ORDER BY total_revenue DESC
LIMIT 50;
```

### Category Performance Comparison
```sql
SELECT 
    category,
    sum(total_transactions) as transactions,
    sum(total_volume) as volume,
    avg(avg_price) as avg_price,
    sum(unique_tokens) as unique_tokens
FROM category_performance_mv
WHERE date >= today() - 30
GROUP BY category
ORDER BY volume DESC;
```

### Hourly Trading Activity (Today)
```sql
SELECT 
    hour,
    sum(tx_count) as transactions,
    sum(total_volume) as volume,
    sum(unique_senders) as sellers,
    sum(unique_receivers) as buyers
FROM hourly_transaction_summary_mv
WHERE date = today()
GROUP BY hour
ORDER BY hour;
```

## Integration with Backend Services

### Analytics Service
- Queries aggregated data from materialized views
- Provides REST API endpoints for dashboards
- Implements caching layer (Redis) for frequently accessed metrics

### Data Sync Service
- Consumes Kafka events from blockchain indexer
- Transforms and inserts data into ClickHouse
- Handles batch inserts for performance
- Implements retry logic for failed inserts

### Recommendation Engine
- Uses `content_interaction_matrix` for collaborative filtering
- Queries user behavior patterns
- Generates personalized recommendations

## Monitoring & Maintenance

### Key Metrics to Monitor
- Query execution time
- Insert throughput
- Disk usage per partition
- Merge operations
- Replication lag (if using replication)

### Maintenance Tasks
- Monitor TTL cleanup
- Check partition sizes
- Optimize table settings
- Review slow queries
- Update materialized views if schema changes

## Security Considerations

1. **PII Protection**: User behavior data has shorter retention
2. **IP Hashing**: Store hashed IPs, not raw IPs
3. **Access Control**: Implement role-based access
4. **Encryption**: Enable encryption at rest
5. **Audit Logging**: Track data access patterns

## Future Enhancements

1. **Real-time Dashboards**: Integrate with Grafana
2. **Machine Learning**: Export data for ML model training
3. **Cross-chain Analytics**: Add chain_id column for multi-chain support
4. **Advanced Metrics**: Implement cohort analysis, retention curves
5. **Data Lake Integration**: Export to S3 for long-term storage

## References

- [ClickHouse Documentation](https://clickhouse.com/docs)
- [MergeTree Engine Family](https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/)
- [Materialized Views](https://clickhouse.com/docs/en/guides/developer/cascading-materialized-views)
- [TTL for Columns and Tables](https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl)
