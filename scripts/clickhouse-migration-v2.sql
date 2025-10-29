-- ============================================================================
-- ClickHouse Schema Migration v2
-- ============================================================================
-- Purpose: Upgrade existing ClickHouse schema with enhanced analytics tables
-- Date: 2025-10-29
-- Requirements: 11.1, 11.2, 11.3
-- ============================================================================

USE knowton;

-- ============================================================================
-- STEP 1: Add new revenue analytics tables
-- ============================================================================

-- Check if revenue_breakdown exists, create if not
CREATE TABLE IF NOT EXISTS revenue_breakdown (
    event_date Date DEFAULT toDate(event_time),
    event_time DateTime64(3) DEFAULT now64(),
    tx_hash String,
    token_id UInt256,
    revenue_source Enum8(
        'primary_sale' = 1,
        'secondary_sale' = 2,
        'royalty' = 3,
        'fractionalization' = 4,
        'staking_reward' = 5,
        'lending_interest' = 6,
        'bond_yield' = 7,
        'platform_fee' = 8
    ),
    payer_address String,
    recipient_address String,
    gross_amount Decimal(78, 18),
    fee_amount Decimal(78, 18),
    net_amount Decimal(78, 18),
    currency String DEFAULT 'ETH',
    usd_value Decimal(78, 6),
    category String DEFAULT '',
    creator_address String DEFAULT '',
    INDEX idx_recipient recipient_address TYPE bloom_filter GRANULARITY 4,
    INDEX idx_creator creator_address TYPE bloom_filter GRANULARITY 4,
    INDEX idx_token token_id TYPE minmax GRANULARITY 4
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, event_time, revenue_source, token_id)
TTL event_date + INTERVAL 5 YEAR DELETE
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS daily_creator_revenue (
    date Date,
    creator_address String,
    category String,
    revenue_source String,
    total_revenue Decimal(78, 18),
    total_revenue_usd Decimal(78, 6),
    transaction_count UInt64,
    unique_buyers UInt64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, creator_address, category, revenue_source)
TTL date + INTERVAL 3 YEAR DELETE;

-- ============================================================================
-- STEP 2: Add user behavior analytics tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_behavior_events (
    event_date Date DEFAULT toDate(event_time),
    event_time DateTime64(3) DEFAULT now64(),
    session_id String,
    user_address String,
    event_type Enum16(
        'page_view' = 1,
        'nft_view' = 2,
        'nft_like' = 3,
        'nft_share' = 4,
        'search' = 5,
        'filter' = 6,
        'wallet_connect' = 7,
        'wallet_disconnect' = 8,
        'add_to_cart' = 9,
        'remove_from_cart' = 10,
        'purchase_intent' = 11,
        'purchase_complete' = 12,
        'bid_placed' = 13,
        'offer_made' = 14,
        'follow_creator' = 15,
        'unfollow_creator' = 16
    ),
    target_id String DEFAULT '',
    target_type String DEFAULT '',
    metadata String DEFAULT '',
    referrer String DEFAULT '',
    user_agent String DEFAULT '',
    ip_hash String DEFAULT '',
    country_code String DEFAULT '',
    device_type Enum8('desktop' = 1, 'mobile' = 2, 'tablet' = 3, 'unknown' = 4),
    INDEX idx_user user_address TYPE bloom_filter GRANULARITY 4,
    INDEX idx_target target_id TYPE bloom_filter GRANULARITY 4,
    INDEX idx_event_type event_type TYPE set(20) GRANULARITY 4
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, event_time, user_address, session_id)
TTL event_date + INTERVAL 1 YEAR DELETE
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS user_engagement_metrics (
    date Date,
    user_address String,
    session_count UInt32,
    total_events UInt64,
    page_views UInt64,
    nft_views UInt64,
    interactions UInt64,
    time_spent_seconds UInt64,
    conversion_events UInt32
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, user_address)
TTL date + INTERVAL 2 YEAR DELETE;

CREATE TABLE IF NOT EXISTS content_interaction_matrix (
    date Date,
    user_address String,
    token_id UInt256,
    category String,
    view_count UInt32,
    like_count UInt32,
    share_count UInt32,
    purchase_count UInt32,
    interaction_score Float64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, user_address, token_id)
TTL date + INTERVAL 6 MONTH DELETE;

-- ============================================================================
-- STEP 3: Add market analytics tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_history (
    timestamp DateTime,
    interval_start DateTime,
    interval_end DateTime,
    token_id UInt256,
    currency String DEFAULT 'ETH',
    open_price Decimal(78, 18),
    high_price Decimal(78, 18),
    low_price Decimal(78, 18),
    close_price Decimal(78, 18),
    volume Decimal(78, 18),
    trade_count UInt32,
    vwap Decimal(78, 18)
) ENGINE = ReplacingMergeTree(timestamp)
PARTITION BY toYYYYMM(interval_start)
ORDER BY (interval_start, token_id, currency)
TTL interval_start + INTERVAL 2 YEAR DELETE;

CREATE TABLE IF NOT EXISTS floor_price_tracking (
    date Date,
    hour UInt8,
    category String,
    collection_address String,
    floor_price Decimal(78, 18),
    floor_price_usd Decimal(78, 6),
    listed_count UInt32,
    holder_count UInt32,
    market_cap Decimal(78, 6)
) ENGINE = ReplacingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, hour, category, collection_address)
TTL date + INTERVAL 1 YEAR DELETE;

CREATE TABLE IF NOT EXISTS liquidity_pool_analytics (
    event_date Date DEFAULT toDate(event_time),
    event_time DateTime64(3),
    pool_address String,
    token0_address String,
    token1_address String,
    reserve0 Decimal(78, 18),
    reserve1 Decimal(78, 18),
    total_liquidity_usd Decimal(78, 6),
    volume_24h Decimal(78, 18),
    fee_24h Decimal(78, 18),
    apy Float64,
    INDEX idx_pool pool_address TYPE bloom_filter GRANULARITY 4
) ENGINE = ReplacingMergeTree(event_time)
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, event_time, pool_address)
TTL event_date + INTERVAL 1 YEAR DELETE;

-- ============================================================================
-- STEP 4: Create new materialized views
-- ============================================================================

-- Drop existing views if they exist (for idempotency)
DROP VIEW IF EXISTS revenue_aggregation_mv;
DROP VIEW IF EXISTS user_engagement_mv;
DROP VIEW IF EXISTS hourly_transaction_summary_mv;
DROP VIEW IF EXISTS top_traders_mv;
DROP VIEW IF EXISTS category_performance_mv;

-- Create revenue aggregation view
CREATE MATERIALIZED VIEW IF NOT EXISTS revenue_aggregation_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, recipient_address, revenue_source)
AS SELECT
    event_date as date,
    recipient_address,
    revenue_source,
    sum(gross_amount) as total_gross,
    sum(fee_amount) as total_fees,
    sum(net_amount) as total_net,
    sum(usd_value) as total_usd,
    count() as transaction_count
FROM revenue_breakdown
GROUP BY date, recipient_address, revenue_source;

-- Create user engagement view
CREATE MATERIALIZED VIEW IF NOT EXISTS user_engagement_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, user_address)
AS SELECT
    event_date as date,
    user_address,
    uniq(session_id) as session_count,
    count() as total_events,
    countIf(event_type = 'page_view') as page_views,
    countIf(event_type = 'nft_view') as nft_views,
    countIf(event_type IN ('nft_like', 'nft_share', 'follow_creator')) as interactions,
    countIf(event_type IN ('purchase_complete', 'bid_placed')) as conversion_events
FROM user_behavior_events
GROUP BY date, user_address;

-- Create hourly transaction summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_transaction_summary_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, hour, category)
AS SELECT
    toDate(event_time) as date,
    toHour(event_time) as hour,
    category,
    transaction_type,
    count() as tx_count,
    sum(price) as total_volume,
    sum(price_usd) as total_volume_usd,
    sum(gas_cost_eth) as total_gas_eth,
    uniq(from_address) as unique_senders,
    uniq(to_address) as unique_receivers
FROM nft_transactions
GROUP BY date, hour, category, transaction_type;

-- Create top traders view
CREATE MATERIALIZED VIEW IF NOT EXISTS top_traders_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, trader_address)
AS SELECT
    toDate(event_time) as date,
    from_address as trader_address,
    count() as trade_count,
    sum(price) as total_volume,
    sum(price_usd) as total_volume_usd,
    uniq(token_id) as unique_tokens
FROM nft_transactions
WHERE transaction_type = 'sale'
GROUP BY date, trader_address;

-- Create category performance view
CREATE MATERIALIZED VIEW IF NOT EXISTS category_performance_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, category)
AS SELECT
    toDate(event_time) as date,
    category,
    count() as total_transactions,
    sum(price) as total_volume,
    avg(price) as avg_price,
    quantile(0.5)(price) as median_price,
    uniq(token_id) as unique_tokens,
    uniq(from_address, to_address) as unique_traders
FROM nft_transactions
WHERE transaction_type = 'sale' AND category != ''
GROUP BY date, category;

-- ============================================================================
-- STEP 5: Optimize existing tables
-- ============================================================================

-- Optimize nft_transactions table settings
ALTER TABLE nft_transactions MODIFY SETTING 
    min_bytes_for_wide_part = 10485760,
    min_rows_for_wide_part = 100000;

-- Optimize revenue_breakdown table settings
ALTER TABLE revenue_breakdown MODIFY SETTING
    min_bytes_for_wide_part = 10485760,
    min_rows_for_wide_part = 100000;

-- Optimize user_behavior_events table settings
ALTER TABLE user_behavior_events MODIFY SETTING
    min_bytes_for_wide_part = 5242880,
    min_rows_for_wide_part = 50000;

-- ============================================================================
-- STEP 6: Create currency rates table
-- ============================================================================

CREATE TABLE IF NOT EXISTS currency_rates (
    date Date,
    currency String,
    usd_rate Decimal(18, 6)
) ENGINE = ReplacingMergeTree()
ORDER BY (date, currency);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all tables exist
SELECT 
    'Tables created:' as status,
    count() as count
FROM system.tables
WHERE database = 'knowton';

-- Verify materialized views
SELECT 
    'Materialized views created:' as status,
    count() as count
FROM system.tables
WHERE database = 'knowton' AND engine LIKE '%MaterializedView%';

-- Show all tables
SELECT 
    name as table_name,
    engine,
    total_rows,
    formatReadableSize(total_bytes) as size
FROM system.tables
WHERE database = 'knowton'
ORDER BY name;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Verify data is being inserted correctly
-- 2. Monitor query performance
-- 3. Set up Grafana dashboards
-- 4. Configure alerts for data quality
-- ============================================================================
