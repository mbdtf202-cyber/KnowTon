-- Query Optimization Examples for KnowTon Platform
-- This script shows optimized versions of common queries

-- ============================================
-- 1. NFT Marketplace Listing (BEFORE)
-- ============================================
-- SLOW: Full table scan without proper filtering
-- SELECT * FROM nfts WHERE is_listed = true ORDER BY created_at DESC LIMIT 20;

-- OPTIMIZED: Use covering index and specific columns
SELECT 
    token_id,
    title,
    creator_address,
    owner_address,
    category,
    price,
    created_at
FROM nfts
WHERE is_listed = true
    AND category = 'artwork'  -- Add category filter
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- 2. User Transaction History (BEFORE)
-- ============================================
-- SLOW: OR condition prevents index usage
-- SELECT * FROM transactions 
-- WHERE from_address = '0x...' OR to_address = '0x...'
-- ORDER BY timestamp DESC;

-- OPTIMIZED: Use UNION ALL with separate indexed queries
(
    SELECT 
        tx_hash,
        from_address,
        to_address,
        token_id,
        amount,
        timestamp,
        'sent' as direction
    FROM transactions
    WHERE from_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    ORDER BY timestamp DESC
    LIMIT 50
)
UNION ALL
(
    SELECT 
        tx_hash,
        from_address,
        to_address,
        token_id,
        amount,
        timestamp,
        'received' as direction
    FROM transactions
    WHERE to_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    ORDER BY timestamp DESC
    LIMIT 50
)
ORDER BY timestamp DESC
LIMIT 50;

-- ============================================
-- 3. Order Book Query (BEFORE)
-- ============================================
-- SLOW: Separate queries for buy and sell orders
-- SELECT * FROM orders WHERE token_id = 123 AND order_type = 'buy' AND status = 'open';
-- SELECT * FROM orders WHERE token_id = 123 AND order_type = 'sell' AND status = 'open';

-- OPTIMIZED: Single query with conditional aggregation
SELECT 
    order_type,
    price,
    amount,
    maker_address,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY order_type ORDER BY 
        CASE WHEN order_type = 'buy' THEN price END DESC,
        CASE WHEN order_type = 'sell' THEN price END ASC
    ) as rank
FROM orders
WHERE token_id = 123
    AND status = 'open'
    AND order_type IN ('buy', 'sell')
ORDER BY order_type, rank
LIMIT 20;

-- ============================================
-- 4. NFT Search (BEFORE)
-- ============================================
-- SLOW: LIKE with leading wildcard prevents index usage
-- SELECT * FROM nfts WHERE title LIKE '%artwork%' OR description LIKE '%artwork%';

-- OPTIMIZED: Use full-text search with GIN index
SELECT 
    token_id,
    title,
    description,
    category,
    ts_rank(to_tsvector('english', title || ' ' || description), query) as rank
FROM nfts, to_tsquery('english', 'artwork') query
WHERE to_tsvector('english', title || ' ' || description) @@ query
ORDER BY rank DESC
LIMIT 20;

-- ============================================
-- 5. Trending NFTs (BEFORE)
-- ============================================
-- SLOW: Subquery in SELECT list
-- SELECT 
--     n.*,
--     (SELECT COUNT(*) FROM transactions WHERE token_id = n.token_id) as trade_count
-- FROM nfts n
-- ORDER BY trade_count DESC;

-- OPTIMIZED: Use JOIN with aggregation
SELECT 
    n.token_id,
    n.title,
    n.creator_address,
    n.price,
    COUNT(t.id) as trade_count,
    SUM(t.amount) as total_volume
FROM nfts n
LEFT JOIN transactions t ON n.token_id = t.token_id
    AND t.timestamp > NOW() - INTERVAL '24 hours'
GROUP BY n.token_id, n.title, n.creator_address, n.price
HAVING COUNT(t.id) > 0
ORDER BY trade_count DESC, total_volume DESC
LIMIT 20;

-- ============================================
-- 6. Creator Portfolio (BEFORE)
-- ============================================
-- SLOW: Multiple separate queries
-- SELECT COUNT(*) FROM nfts WHERE creator_address = '0x...';
-- SELECT SUM(price) FROM nfts WHERE creator_address = '0x...';
-- SELECT COUNT(*) FROM transactions WHERE from_address = '0x...';

-- OPTIMIZED: Single query with CTEs
WITH creator_nfts AS (
    SELECT 
        COUNT(*) as nft_count,
        SUM(price) as total_value,
        AVG(price) as avg_price
    FROM nfts
    WHERE creator_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
),
creator_trades AS (
    SELECT 
        COUNT(*) as trade_count,
        SUM(amount) as total_volume
    FROM transactions
    WHERE from_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
        AND timestamp > NOW() - INTERVAL '30 days'
)
SELECT 
    cn.nft_count,
    cn.total_value,
    cn.avg_price,
    ct.trade_count,
    ct.total_volume
FROM creator_nfts cn
CROSS JOIN creator_trades ct;

-- ============================================
-- 7. Royalty Distribution (BEFORE)
-- ============================================
-- SLOW: N+1 query pattern
-- For each NFT:
--   SELECT * FROM royalties WHERE token_id = ?

-- OPTIMIZED: Batch query with aggregation
SELECT 
    r.token_id,
    n.title,
    r.beneficiary_address,
    SUM(r.amount) as total_royalties,
    COUNT(*) as distribution_count,
    MAX(r.distributed_at) as last_distribution
FROM royalties r
JOIN nfts n ON r.token_id = n.token_id
WHERE r.beneficiary_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    AND r.status = 'completed'
GROUP BY r.token_id, n.title, r.beneficiary_address
ORDER BY total_royalties DESC;

-- ============================================
-- 8. Analytics Dashboard (BEFORE)
-- ============================================
-- SLOW: Multiple COUNT(*) queries
-- SELECT COUNT(*) FROM nfts;
-- SELECT COUNT(*) FROM users;
-- SELECT COUNT(*) FROM transactions;

-- OPTIMIZED: Use table statistics (much faster)
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE tablename IN ('nfts', 'users', 'transactions')
ORDER BY tablename;

-- For exact counts when needed, use parallel aggregation
SELECT 
    (SELECT COUNT(*) FROM nfts) as nft_count,
    (SELECT COUNT(*) FROM users) as user_count,
    (SELECT COUNT(*) FROM transactions) as transaction_count;

-- ============================================
-- 9. Pagination (BEFORE)
-- ============================================
-- SLOW: OFFSET becomes slower with large offsets
-- SELECT * FROM nfts ORDER BY created_at DESC LIMIT 20 OFFSET 10000;

-- OPTIMIZED: Use keyset pagination (seek method)
SELECT 
    token_id,
    title,
    creator_address,
    created_at
FROM nfts
WHERE created_at < '2024-01-01 00:00:00'  -- Last seen timestamp
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- 10. Aggregate Queries (BEFORE)
-- ============================================
-- SLOW: Aggregating over entire table
-- SELECT category, COUNT(*) FROM nfts GROUP BY category;

-- OPTIMIZED: Use materialized view for frequently accessed aggregates
CREATE MATERIALIZED VIEW IF NOT EXISTS nft_category_stats AS
SELECT 
    category,
    COUNT(*) as nft_count,
    AVG(price) as avg_price,
    SUM(price) as total_value,
    MAX(created_at) as latest_nft
FROM nfts
GROUP BY category;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_nft_category_stats_category 
ON nft_category_stats(category);

-- Refresh materialized view (run periodically)
REFRESH MATERIALIZED VIEW CONCURRENTLY nft_category_stats;

-- Query the materialized view (much faster)
SELECT * FROM nft_category_stats ORDER BY nft_count DESC;

-- ============================================
-- Query Performance Tips
-- ============================================

-- 1. Use EXPLAIN ANALYZE to understand query plans
EXPLAIN ANALYZE
SELECT * FROM nfts WHERE creator_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

-- 2. Check if indexes are being used
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM nfts WHERE token_id = 123;

-- 3. Identify missing indexes
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
    AND tablename = 'nfts'
ORDER BY abs(correlation) DESC;

-- 4. Monitor query performance over time
SELECT 
    query,
    calls,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%nfts%'
ORDER BY mean_exec_time DESC
LIMIT 10;
