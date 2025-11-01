-- Analyze Slow Queries in PostgreSQL
-- This script helps identify and analyze slow queries

-- 1. Top 20 slowest queries by total execution time
SELECT 
    query,
    calls,
    total_exec_time / 1000 as total_time_seconds,
    mean_exec_time / 1000 as mean_time_seconds,
    max_exec_time / 1000 as max_time_seconds,
    stddev_exec_time / 1000 as stddev_time_seconds,
    rows,
    100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) AS cache_hit_ratio
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- 2. Queries with lowest cache hit ratio (potential index issues)
SELECT 
    query,
    calls,
    shared_blks_hit,
    shared_blks_read,
    100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) AS cache_hit_ratio
FROM pg_stat_statements
WHERE shared_blks_read > 0
ORDER BY cache_hit_ratio ASC
LIMIT 20;

-- 3. Most frequently called queries
SELECT 
    query,
    calls,
    mean_exec_time / 1000 as mean_time_seconds,
    total_exec_time / 1000 as total_time_seconds
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 20;

-- 4. Queries with high variance (inconsistent performance)
SELECT 
    query,
    calls,
    mean_exec_time / 1000 as mean_time_seconds,
    stddev_exec_time / 1000 as stddev_time_seconds,
    max_exec_time / 1000 as max_time_seconds
FROM pg_stat_statements
WHERE stddev_exec_time > mean_exec_time
ORDER BY stddev_exec_time DESC
LIMIT 20;

-- 5. Table statistics (identify tables needing optimization)
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;

-- 6. Missing indexes (tables with high sequential scans)
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    seq_tup_read / NULLIF(seq_scan, 0) as avg_seq_tup_read,
    CASE 
        WHEN seq_scan > 0 AND idx_scan = 0 THEN 'Missing Index'
        WHEN seq_scan > idx_scan THEN 'Consider Index'
        ELSE 'OK'
    END as recommendation
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 20;

-- 7. Index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- 8. Unused indexes (candidates for removal)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
    AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 9. Table bloat analysis
SELECT 
    schemaname,
    tablename,
    n_live_tup,
    n_dead_tup,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_tuple_percent,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY dead_tuple_percent DESC;

-- 10. Lock contention analysis
SELECT 
    locktype,
    database,
    relation::regclass,
    mode,
    transactionid,
    pid,
    granted
FROM pg_locks
WHERE NOT granted
ORDER BY relation;

-- Reset statistics (use with caution)
-- SELECT pg_stat_statements_reset();
