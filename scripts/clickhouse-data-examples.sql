-- ============================================================================
-- ClickHouse Data Insertion Examples
-- ============================================================================
-- Purpose: Example queries for inserting data into analytics tables
-- Note: These are examples - actual data should come from blockchain events
-- ============================================================================

USE knowton;

-- ============================================================================
-- EXAMPLE 1: Insert NFT Transaction
-- ============================================================================

INSERT INTO nft_transactions (
    event_date,
    event_time,
    tx_hash,
    block_number,
    block_timestamp,
    token_id,
    contract_address,
    from_address,
    to_address,
    transaction_type,
    price,
    currency,
    currency_usd_price,
    price_usd,
    gas_used,
    gas_price_gwei,
    gas_cost_eth,
    gas_cost_usd,
    marketplace,
    category,
    creator_address,
    royalty_amount,
    platform_fee,
    is_first_sale
) VALUES (
    today(),
    now(),
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    18500000,
    now(),
    1,
    '0xContractAddress123',
    '0xSellerAddress123',
    '0xBuyerAddress123',
    'sale',
    1.5,
    'ETH',
    2000.00,
    3000.00,
    150000,
    50.0,
    0.0075,
    15.00,
    'KnowTon',
    'music',
    '0xCreatorAddress123',
    0.15,
    0.025,
    false
);

-- ============================================================================
-- EXAMPLE 2: Insert Revenue Breakdown
-- ============================================================================

INSERT INTO revenue_breakdown (
    event_date,
    event_time,
    tx_hash,
    token_id,
    revenue_source,
    payer_address,
    recipient_address,
    gross_amount,
    fee_amount,
    net_amount,
    currency,
    usd_value,
    category,
    creator_address
) VALUES (
    today(),
    now(),
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    1,
    'royalty',
    '0xBuyerAddress123',
    '0xCreatorAddress123',
    0.15,
    0.015,
    0.135,
    'ETH',
    270.00,
    'music',
    '0xCreatorAddress123'
);

-- ============================================================================
-- EXAMPLE 3: Insert User Behavior Events
-- ============================================================================

INSERT INTO user_behavior_events (
    event_date,
    event_time,
    session_id,
    user_address,
    event_type,
    target_id,
    target_type,
    metadata,
    referrer,
    country_code,
    device_type
) VALUES 
(
    today(),
    now(),
    'session_abc123',
    '0xUserAddress123',
    'nft_view',
    '1',
    'nft',
    '{"duration": 45}',
    'https://knowton.io/marketplace',
    'US',
    'desktop'
),
(
    today(),
    now(),
    'session_abc123',
    '0xUserAddress123',
    'nft_like',
    '1',
    'nft',
    '{}',
    '',
    'US',
    'desktop'
),
(
    today(),
    now(),
    'session_abc123',
    '0xUserAddress123',
    'purchase_complete',
    '1',
    'nft',
    '{"price": 1.5, "currency": "ETH"}',
    '',
    'US',
    'desktop'
);

-- ============================================================================
-- EXAMPLE 4: Insert Content Metrics
-- ============================================================================

INSERT INTO content_metrics (
    date,
    content_id,
    token_id,
    views,
    unique_viewers,
    likes,
    shares,
    revenue
) VALUES (
    today(),
    'content_123',
    1,
    1500,
    850,
    120,
    45,
    2.5
);

-- ============================================================================
-- EXAMPLE 5: Insert Staking Analytics
-- ============================================================================

INSERT INTO staking_analytics (
    date,
    event_time,
    user_address,
    action_type,
    amount,
    lock_period,
    apy,
    rewards
) VALUES (
    today(),
    now(),
    '0xStakerAddress123',
    'stake',
    1000.0,
    2592000,  -- 30 days in seconds
    12.5,
    0.0
);

-- ============================================================================
-- EXAMPLE 6: Insert Governance Analytics
-- ============================================================================

INSERT INTO governance_analytics (
    date,
    event_time,
    proposal_id,
    proposer,
    action_type,
    voter,
    vote_weight,
    support
) VALUES (
    today(),
    now(),
    'proposal_001',
    '0xProposerAddress123',
    'voted',
    '0xVoterAddress123',
    500.0,
    1  -- 1 = for, 0 = against, -1 = abstain
);

-- ============================================================================
-- EXAMPLE 7: Insert Fractionalization Analytics
-- ============================================================================

INSERT INTO fractionalization_analytics (
    date,
    event_time,
    vault_id,
    token_id,
    action_type,
    user_address,
    amount,
    price
) VALUES (
    today(),
    now(),
    'vault_001',
    1,
    'created',
    '0xCreatorAddress123',
    1000000.0,  -- 1M fractional tokens
    0.0
);

-- ============================================================================
-- EXAMPLE 8: Insert Bond Analytics
-- ============================================================================

INSERT INTO bond_analytics (
    date,
    event_time,
    bond_id,
    ipnft_id,
    action_type,
    investor,
    tranche_id,
    amount
) VALUES (
    today(),
    now(),
    'bond_001',
    'ipnft_001',
    'invested',
    '0xInvestorAddress123',
    1,  -- Senior tranche
    5000.0
);

-- ============================================================================
-- EXAMPLE 9: Insert Lending Analytics
-- ============================================================================

INSERT INTO lending_analytics (
    date,
    event_time,
    user_address,
    action_type,
    asset,
    amount,
    health_factor
) VALUES (
    today(),
    now(),
    '0xBorrowerAddress123',
    'borrow',
    'USDC',
    10000.0,
    1.85
);

-- ============================================================================
-- EXAMPLE 10: Insert Price History (OHLCV)
-- ============================================================================

INSERT INTO price_history (
    timestamp,
    interval_start,
    interval_end,
    token_id,
    currency,
    open_price,
    high_price,
    low_price,
    close_price,
    volume,
    trade_count,
    vwap
) VALUES (
    now(),
    toStartOfHour(now()),
    toStartOfHour(now()) + INTERVAL 1 HOUR,
    1,
    'ETH',
    1.4,
    1.6,
    1.3,
    1.5,
    15.5,
    12,
    1.48
);

-- ============================================================================
-- EXAMPLE 11: Insert Floor Price Tracking
-- ============================================================================

INSERT INTO floor_price_tracking (
    date,
    hour,
    category,
    collection_address,
    floor_price,
    floor_price_usd,
    listed_count,
    holder_count,
    market_cap
) VALUES (
    today(),
    toHour(now()),
    'music',
    '0xCollectionAddress123',
    0.5,
    1000.00,
    25,
    150,
    75000.00
);

-- ============================================================================
-- EXAMPLE 12: Insert Liquidity Pool Analytics
-- ============================================================================

INSERT INTO liquidity_pool_analytics (
    event_date,
    event_time,
    pool_address,
    token0_address,
    token1_address,
    reserve0,
    reserve1,
    total_liquidity_usd,
    volume_24h,
    fee_24h,
    apy
) VALUES (
    today(),
    now(),
    '0xPoolAddress123',
    '0xToken0Address',
    '0xToken1Address',
    100000.0,
    200000.0,
    500000.00,
    50000.0,
    150.0,
    25.5
);

-- ============================================================================
-- EXAMPLE 13: Insert Currency Rates
-- ============================================================================

INSERT INTO currency_rates (
    date,
    currency,
    usd_rate
) VALUES 
(today(), 'ETH', 2000.00),
(today(), 'BTC', 45000.00),
(today(), 'MATIC', 0.85),
(today(), 'ARB', 1.20);

-- ============================================================================
-- EXAMPLE 14: Batch Insert (More Efficient)
-- ============================================================================

-- Insert multiple transactions at once
INSERT INTO nft_transactions 
(event_date, event_time, tx_hash, block_number, block_timestamp, token_id, 
 contract_address, from_address, to_address, transaction_type, price, 
 currency, category, creator_address)
VALUES 
(today(), now(), '0xhash1', 18500001, now(), 2, '0xContract', '0xFrom1', '0xTo1', 'mint', 0, 'ETH', 'video', '0xCreator1'),
(today(), now(), '0xhash2', 18500002, now(), 3, '0xContract', '0xFrom2', '0xTo2', 'mint', 0, 'ETH', 'ebook', '0xCreator2'),
(today(), now(), '0xhash3', 18500003, now(), 4, '0xContract', '0xFrom3', '0xTo3', 'mint', 0, 'ETH', 'course', '0xCreator3');

-- ============================================================================
-- EXAMPLE 15: Insert from SELECT (Data Migration)
-- ============================================================================

-- Example: Populate daily_creator_revenue from revenue_breakdown
INSERT INTO daily_creator_revenue
SELECT 
    event_date as date,
    creator_address,
    category,
    toString(revenue_source) as revenue_source,
    sum(net_amount) as total_revenue,
    sum(usd_value) as total_revenue_usd,
    count() as transaction_count,
    uniq(payer_address) as unique_buyers
FROM revenue_breakdown
WHERE event_date = today()
GROUP BY date, creator_address, category, revenue_source;

-- ============================================================================
-- EXAMPLE 16: Insert User Engagement Metrics (Aggregated)
-- ============================================================================

INSERT INTO user_engagement_metrics
SELECT 
    event_date as date,
    user_address,
    uniq(session_id) as session_count,
    count() as total_events,
    countIf(event_type = 'page_view') as page_views,
    countIf(event_type = 'nft_view') as nft_views,
    countIf(event_type IN ('nft_like', 'nft_share', 'follow_creator')) as interactions,
    0 as time_spent_seconds,
    countIf(event_type IN ('purchase_complete', 'bid_placed')) as conversion_events
FROM user_behavior_events
WHERE event_date = today()
GROUP BY date, user_address;

-- ============================================================================
-- EXAMPLE 17: Insert Content Interaction Matrix
-- ============================================================================

INSERT INTO content_interaction_matrix
SELECT 
    event_date as date,
    user_address,
    toUInt256(target_id) as token_id,
    '' as category,
    countIf(event_type = 'nft_view') as view_count,
    countIf(event_type = 'nft_like') as like_count,
    countIf(event_type = 'nft_share') as share_count,
    countIf(event_type = 'purchase_complete') as purchase_count,
    (countIf(event_type = 'nft_view') * 1.0 + 
     countIf(event_type = 'nft_like') * 2.0 + 
     countIf(event_type = 'nft_share') * 3.0 + 
     countIf(event_type = 'purchase_complete') * 10.0) as interaction_score
FROM user_behavior_events
WHERE event_date = today() 
  AND target_type = 'nft'
  AND target_id != ''
GROUP BY date, user_address, token_id;

-- ============================================================================
-- NOTES ON DATA INSERTION
-- ============================================================================

-- 1. Use batch inserts for better performance (1000-10000 rows per batch)
-- 2. Insert data in time order when possible
-- 3. Use appropriate data types (UInt256 for token_id, Decimal for prices)
-- 4. Set default values for optional fields
-- 5. Use materialized views for automatic aggregations
-- 6. Monitor insert performance with system.query_log
-- 7. Use async inserts for high-throughput scenarios
-- 8. Implement retry logic for failed inserts
-- 9. Validate data before insertion
-- 10. Use transactions for related inserts (if needed)

-- ============================================================================
-- PERFORMANCE TIPS
-- ============================================================================

-- Enable async inserts for high throughput
-- SET async_insert = 1;
-- SET wait_for_async_insert = 0;

-- Optimize batch size
-- SET max_insert_block_size = 1048576;

-- Use native format for fastest inserts
-- INSERT INTO table FORMAT Native

-- Monitor insert performance
-- SELECT * FROM system.query_log 
-- WHERE type = 'QueryFinish' 
--   AND query LIKE 'INSERT%' 
-- ORDER BY event_time DESC 
-- LIMIT 10;
