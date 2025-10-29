-- ============================================================================
-- KnowTon Platform - ClickHouse Analytics Database Initialization
-- ============================================================================
-- Purpose: Create comprehensive analytics tables for Web3 IP platform
-- Requirements: 11.1 (Real-time metrics), 11.2 (Data aggregation), 11.3 (Analytics API)
-- Version: 1.0.0
-- ============================================================================

-- Create database with custom settings
CREATE DATABASE IF NOT EXISTS knowton
ENGINE = Atomic
COMMENT 'KnowTon Web3 IP Platform Analytics Database';

-- Use database
USE knowton;

-- ============================================================================
-- SECTION 1: CORE TRANSACTION ANALYTICS
-- ============================================================================

-- Primary NFT transactions table with comprehensive tracking
-- Requirement 11.1: Real-time transaction metrics
CREATE TABLE IF NOT EXISTS nft_transactions (
    event_date Date DEFAULT toDate(event_time),
    event_time DateTime64(3) DEFAULT now64(),
    tx_hash String,
    block_number UInt64,
    block_timestamp DateTime,
    token_id UInt256,
    contract_address String,
    from_address String,
    to_address String,
    transaction_type Enum8('mint' = 1, 'transfer' = 2, 'sale' = 3, 'burn' = 4, 'list' = 5, 'delist' = 6),
    price Decimal(78, 18) DEFAULT 0,
    currency String DEFAULT 'ETH',
    currency_usd_price Decimal(18, 6),
    price_usd Decimal(78, 6),
    gas_used UInt64,
    gas_price_gwei Decimal(18, 9),
    gas_cost_eth Decimal(78, 18),
    gas_cost_usd Decimal(78, 6),
    marketplace String DEFAULT '',
    category String DEFAULT '',
    creator_address String DEFAULT '',
    royalty_amount Decimal(78, 18) DEFAULT 0,
    platform_fee Decimal(78, 18) DEFAULT 0,
    is_first_sale Boolean DEFAULT false,
    metadata_updated Boolean DEFAULT false,
    INDEX idx_token_id token_id TYPE minmax GRANULARITY 4,
    INDEX idx_from_address from_address TYPE bloom_filter GRANULARITY 4,
    INDEX idx_to_address to_address TYPE bloom_filter GRANULARITY 4,
    INDEX idx_creator creator_address TYPE bloom_filter GRANULARITY 4,
    INDEX idx_category category TYPE set(100) GRANULARITY 4
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, event_time, token_id, tx_hash)
TTL event_date + INTERVAL 3 YEAR DELETE
SETTINGS index_granularity = 8192,
         storage_policy = 'default'
COMMENT 'Primary table for all NFT transaction events with USD pricing and gas tracking';

-- Trading volume analytics
CREATE TABLE IF NOT EXISTS trading_volume (
    date Date,
    hour UInt8,
    token_id UInt256,
    category String,
    volume Decimal(78, 18),
    trade_count UInt64,
    unique_traders UInt64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, hour, token_id);

-- User activity analytics
CREATE TABLE IF NOT EXISTS user_activity (
    date Date,
    user_address String,
    action_type String,
    action_count UInt64,
    total_value Decimal(78, 18)
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, user_address, action_type);

-- Content performance metrics
CREATE TABLE IF NOT EXISTS content_metrics (
    date Date,
    content_id String,
    token_id UInt256,
    views UInt64,
    unique_viewers UInt64,
    likes UInt64,
    shares UInt64,
    revenue Decimal(78, 18)
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, content_id);

-- Royalty distributions analytics
CREATE TABLE IF NOT EXISTS royalty_analytics (
    date Date,
    token_id UInt256,
    beneficiary_address String,
    total_distributed Decimal(78, 18),
    distribution_count UInt64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, token_id, beneficiary_address);

-- Create materialized views for real-time aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_trading_stats
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, category)
AS SELECT
    toDate(event_time) as date,
    category,
    sum(price) as total_volume,
    count() as trade_count,
    uniq(from_address, to_address) as unique_traders
FROM nft_transactions
WHERE transaction_type = 'sale'
GROUP BY date, category;

-- Create view for top performing content
CREATE VIEW IF NOT EXISTS top_content_7d AS
SELECT
    token_id,
    content_id,
    sum(views) as total_views,
    sum(revenue) as total_revenue,
    sum(likes) as total_likes
FROM content_metrics
WHERE date >= today() - 7
GROUP BY token_id, content_id
ORDER BY total_revenue DESC
LIMIT 100;

-- Staking analytics
CREATE TABLE IF NOT EXISTS staking_analytics (
    date Date,
    event_time DateTime,
    user_address String,
    action_type Enum8('stake' = 1, 'unstake' = 2, 'claim' = 3),
    amount Decimal(78, 18),
    lock_period UInt32,
    apy Float64,
    rewards Decimal(78, 18)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, event_time, user_address);

-- Governance analytics
CREATE TABLE IF NOT EXISTS governance_analytics (
    date Date,
    event_time DateTime,
    proposal_id String,
    proposer String,
    action_type Enum8('created' = 1, 'voted' = 2, 'executed' = 3, 'cancelled' = 4),
    voter String,
    vote_weight Decimal(78, 18),
    support Int8
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, event_time, proposal_id);

-- Fractionalization analytics
CREATE TABLE IF NOT EXISTS fractionalization_analytics (
    date Date,
    event_time DateTime,
    vault_id String,
    token_id UInt256,
    action_type Enum8('created' = 1, 'bought' = 2, 'sold' = 3, 'redeemed' = 4),
    user_address String,
    amount Decimal(78, 18),
    price Decimal(78, 18)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, event_time, vault_id);

-- Bond analytics
CREATE TABLE IF NOT EXISTS bond_analytics (
    date Date,
    event_time DateTime,
    bond_id String,
    ipnft_id String,
    action_type Enum8('issued' = 1, 'invested' = 2, 'distributed' = 3, 'redeemed' = 4),
    investor String,
    tranche_id UInt8,
    amount Decimal(78, 18)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, event_time, bond_id);

-- Lending analytics
CREATE TABLE IF NOT EXISTS lending_analytics (
    date Date,
    event_time DateTime,
    user_address String,
    action_type Enum8('supply' = 1, 'borrow' = 2, 'repay' = 3, 'withdraw' = 4),
    asset String,
    amount Decimal(78, 18),
    health_factor Float64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, event_time, user_address);

-- Creator earnings analytics
CREATE TABLE IF NOT EXISTS creator_earnings (
    date Date,
    creator_address String,
    revenue_type Enum8('sale' = 1, 'royalty' = 2, 'staking' = 3, 'other' = 4),
    amount Decimal(78, 18),
    token_id UInt256
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, creator_address, revenue_type);

-- Platform metrics
CREATE TABLE IF NOT EXISTS platform_metrics (
    date Date,
    hour UInt8,
    metric_name String,
    metric_value Float64
) ENGINE = ReplacingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, hour, metric_name);

-- Gas usage analytics
CREATE TABLE IF NOT EXISTS gas_analytics (
    date Date,
    event_time DateTime,
    tx_hash String,
    contract_address String,
    function_name String,
    gas_used UInt64,
    gas_price UInt64,
    total_cost Decimal(78, 18)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, event_time);

-- Materialized view for creator performance
CREATE MATERIALIZED VIEW IF NOT EXISTS creator_performance_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, creator_address)
AS SELECT
    date,
    creator_address,
    sum(amount) as total_earnings,
    count() as transaction_count
FROM creator_earnings
GROUP BY date, creator_address;

-- Materialized view for platform daily stats
CREATE MATERIALIZED VIEW IF NOT EXISTS platform_daily_stats_mv
ENGINE = ReplacingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY date
AS SELECT
    toDate(event_time) as date,
    count(DISTINCT token_id) as active_nfts,
    count(DISTINCT from_address) as active_sellers,
    count(DISTINCT to_address) as active_buyers,
    sum(price) as total_volume,
    count() as total_transactions
FROM nft_transactions
WHERE transaction_type = 'sale'
GROUP BY date;

-- Materialized view for trending content
CREATE MATERIALIZED VIEW IF NOT EXISTS trending_content_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, content_id)
AS SELECT
    date,
    content_id,
    token_id,
    sum(views) as total_views,
    sum(likes) as total_likes,
    sum(shares) as total_shares,
    sum(revenue) as total_revenue
FROM content_metrics
GROUP BY date, content_id, token_id;

-- ============================================================================
-- SECTION 2: ENHANCED REVENUE & EARNINGS ANALYTICS
-- ============================================================================

-- Detailed revenue breakdown table
-- Requirement 11.2: Revenue aggregation and analysis
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
SETTINGS index_granularity = 8192
COMMENT 'Detailed revenue breakdown by source with fee tracking';

-- Aggregated daily revenue by creator
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
TTL date + INTERVAL 3 YEAR DELETE
COMMENT 'Daily aggregated revenue per creator with buyer metrics';

-- Materialized view for real-time revenue aggregation
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

-- ============================================================================
-- SECTION 3: USER BEHAVIOR ANALYTICS
-- ============================================================================

-- Comprehensive user behavior tracking
-- Requirement 11.3: User behavior analysis for recommendations
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
SETTINGS index_granularity = 8192
COMMENT 'Detailed user behavior events for analytics and recommendations';

-- User engagement metrics aggregation
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
TTL date + INTERVAL 2 YEAR DELETE
COMMENT 'Daily user engagement metrics aggregation';

-- Content interaction matrix for recommendations
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
TTL date + INTERVAL 6 MONTH DELETE
COMMENT 'User-content interaction matrix for collaborative filtering';

-- Materialized view for user engagement
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

-- ============================================================================
-- SECTION 4: MARKET ANALYTICS & PRICE TRACKING
-- ============================================================================

-- Price history with OHLCV data
-- Requirement 11.1: Real-time price tracking
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
TTL interval_start + INTERVAL 2 YEAR DELETE
COMMENT 'OHLCV price data for charting and analysis';

-- Floor price tracking
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
TTL date + INTERVAL 1 YEAR DELETE
COMMENT 'Floor price tracking by category and collection';

-- Liquidity pool analytics
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
TTL event_date + INTERVAL 1 YEAR DELETE
COMMENT 'Liquidity pool metrics for DeFi analytics';

-- ============================================================================
-- SECTION 5: PERFORMANCE OPTIMIZATION VIEWS
-- ============================================================================

-- Hourly transaction summary for fast queries
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

-- Top traders by volume
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

-- Category performance metrics
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
-- SECTION 6: DATA RETENTION & OPTIMIZATION POLICIES
-- ============================================================================

-- Set TTL policies for old data cleanup
-- Raw events: 1-3 years depending on importance
-- Aggregated data: 3-5 years
-- User behavior: 1 year (privacy consideration)

-- Optimize table settings for better compression
ALTER TABLE nft_transactions MODIFY SETTING 
    min_bytes_for_wide_part = 10485760,
    min_rows_for_wide_part = 100000;

ALTER TABLE revenue_breakdown MODIFY SETTING
    min_bytes_for_wide_part = 10485760,
    min_rows_for_wide_part = 100000;

ALTER TABLE user_behavior_events MODIFY SETTING
    min_bytes_for_wide_part = 5242880,
    min_rows_for_wide_part = 50000;

-- ============================================================================
-- SECTION 7: UTILITY FUNCTIONS & QUERIES
-- ============================================================================

-- Create dictionary for currency conversion rates (optional)
-- This would be populated from external price feeds
CREATE TABLE IF NOT EXISTS currency_rates (
    date Date,
    currency String,
    usd_rate Decimal(18, 6)
) ENGINE = ReplacingMergeTree()
ORDER BY (date, currency);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Query to verify table creation
SELECT 
    database,
    name as table_name,
    engine,
    partition_key,
    sorting_key,
    total_rows,
    total_bytes
FROM system.tables
WHERE database = 'knowton'
ORDER BY name;

-- Query to check materialized views
SELECT 
    database,
    name as view_name,
    engine,
    total_rows
FROM system.tables
WHERE database = 'knowton' AND engine LIKE '%MaterializedView%'
ORDER BY name;

-- ============================================================================
-- SAMPLE QUERIES FOR ANALYTICS
-- ============================================================================

-- Example: Get top 10 NFTs by trading volume in last 7 days
-- SELECT 
--     token_id,
--     sum(price) as total_volume,
--     count() as trade_count,
--     avg(price) as avg_price
-- FROM nft_transactions
-- WHERE event_date >= today() - 7 AND transaction_type = 'sale'
-- GROUP BY token_id
-- ORDER BY total_volume DESC
-- LIMIT 10;

-- Example: Get creator earnings breakdown
-- SELECT 
--     creator_address,
--     revenue_source,
--     sum(net_amount) as total_earnings,
--     sum(usd_value) as total_usd
-- FROM revenue_breakdown
-- WHERE event_date >= today() - 30
-- GROUP BY creator_address, revenue_source
-- ORDER BY total_usd DESC;

-- Example: User engagement metrics
-- SELECT 
--     user_address,
--     sum(session_count) as total_sessions,
--     sum(page_views) as total_page_views,
--     sum(conversion_events) as total_conversions,
--     sum(conversion_events) * 100.0 / sum(page_views) as conversion_rate
-- FROM user_engagement_metrics
-- WHERE date >= today() - 7
-- GROUP BY user_address
-- HAVING total_sessions > 0
-- ORDER BY total_conversions DESC
-- LIMIT 100;
