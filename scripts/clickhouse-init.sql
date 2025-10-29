-- Initialize ClickHouse for Analytics

-- Create database
CREATE DATABASE IF NOT EXISTS knowton;

-- Use database
USE knowton;

-- NFT transactions analytics table
CREATE TABLE IF NOT EXISTS nft_transactions (
    event_date Date,
    event_time DateTime,
    tx_hash String,
    block_number UInt64,
    token_id UInt256,
    from_address String,
    to_address String,
    transaction_type Enum8('mint' = 1, 'transfer' = 2, 'sale' = 3, 'burn' = 4),
    price Decimal(78, 18),
    currency String,
    gas_used UInt64,
    gas_price UInt64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, event_time, token_id)
TTL event_date + INTERVAL 2 YEAR;

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
