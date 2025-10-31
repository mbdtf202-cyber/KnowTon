# Database Optimization Guide

This directory contains scripts and tools for optimizing database performance in the KnowTon platform.

## Overview

Database optimization is crucial for maintaining good performance as the platform scales. This guide covers:

1. Slow query logging and analysis
2. Index optimization
3. Query optimization
4. Caching strategies
5. Performance monitoring

## Quick Start

### 1. Enable Slow Query Logging

```bash
# Connect to PostgreSQL
psql -U postgres -d knowton

# Run the slow query logging script
\i scripts/db-optimization/enable-slow-query-log.sql
```

### 2. Analyze Slow Queries

```bash
# Run analysis script
\i scripts/db-optimization/analyze-slow-queries.sql
```

### 3. Add Optimized Indexes

```bash
# Add indexes (runs concurrently to avoid blocking)
\i scripts/db-optimization/add-indexes.sql
```

### 4. Implement Query Optimizations

```bash
# Review and apply optimized queries
\i scripts/db-optimization/optimize-queries.sql
```

### 5. Implement Caching

```typescript
import { QueryCache, CachedQuery } from './implement-caching';

const cache = new QueryCache('redis://localhost:6379');
const cachedQuery = new CachedQuery(cache);

// Use cached queries
const result = await cachedQuery.execute(
  'SELECT * FROM nfts WHERE category = $1',
  ['artwork'],
  () => db.query(...),
  { ttl: 300 }
);
```

## Performance Monitoring

### Key Metrics to Monitor

1. **Query Duration**
   - p50, p95, p99 latencies
   - Slow query count
   - Query execution time trends

2. **Database Load**
   - Active connections
   - Connection pool utilization
   - CPU and memory usage

3. **Index Usage**
   - Index scan vs sequential scan ratio
   - Unused indexes
   - Index bloat

4. **Cache Performance**
   - Cache hit ratio
   - Cache memory usage
   - Eviction rate

### Monitoring Queries

```sql
-- Active queries
SELECT pid, usename, state, query, now() - query_start as duration
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

-- Database size
SELECT pg_size_pretty(pg_database_size('knowton'));

-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Cache hit ratio (should be > 99%)
SELECT 
    sum(heap_blks_read) as heap_read,
    sum(heap_blks_hit) as heap_hit,
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;
```

## Optimization Strategies

### 1. Index Optimization

**When to Add Indexes:**
- Columns used in WHERE clauses
- Columns used in JOIN conditions
- Columns used in ORDER BY
- Foreign key columns
- Columns with high cardinality

**When NOT to Add Indexes:**
- Small tables (< 1000 rows)
- Columns with low cardinality
- Frequently updated columns
- Tables with high write:read ratio

**Index Types:**
- B-tree (default): Most common, good for equality and range queries
- Hash: Only for equality comparisons
- GIN: Full-text search, array columns
- GiST: Geometric data, full-text search
- BRIN: Very large tables with natural ordering

### 2. Query Optimization

**Common Issues:**
- SELECT * (fetch only needed columns)
- N+1 queries (use JOINs or batch queries)
- Missing indexes
- Inefficient JOINs
- Subqueries in SELECT list
- OR conditions (use UNION instead)
- LIKE with leading wildcard (use full-text search)

**Optimization Techniques:**
- Use EXPLAIN ANALYZE
- Add appropriate indexes
- Rewrite subqueries as JOINs
- Use CTEs for complex queries
- Implement pagination with keyset method
- Use materialized views for aggregates
- Batch operations when possible

### 3. Caching Strategy

**What to Cache:**
- Frequently accessed data
- Expensive queries
- Aggregated data
- Static or slowly changing data

**Cache Invalidation:**
- Time-based (TTL)
- Event-based (on data change)
- Manual invalidation
- Cache warming on startup

**Cache Layers:**
1. Application cache (Redis)
2. Query result cache
3. Object cache
4. HTTP cache (CDN)

### 4. Connection Pooling

```typescript
// Optimal pool configuration
const pool = new Pool({
  max: 20,                    // Maximum connections
  min: 5,                     // Minimum connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout for acquiring connection
});
```

**Pool Size Calculation:**
```
connections = ((core_count * 2) + effective_spindle_count)
```

For most applications: 10-20 connections per instance

### 5. Database Maintenance

**Regular Tasks:**

```sql
-- Vacuum (reclaim space)
VACUUM ANALYZE;

-- Reindex (rebuild indexes)
REINDEX DATABASE knowton;

-- Update statistics
ANALYZE;

-- Check for bloat
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY dead_pct DESC;
```

**Automated Maintenance:**
```sql
-- Configure autovacuum
ALTER SYSTEM SET autovacuum = on;
ALTER SYSTEM SET autovacuum_max_workers = 3;
ALTER SYSTEM SET autovacuum_naptime = '1min';
```

## Performance Benchmarks

### Target Metrics

| Metric | Target | Critical |
|--------|--------|----------|
| Query p95 | < 100ms | < 500ms |
| Query p99 | < 500ms | < 1000ms |
| Cache hit ratio | > 99% | > 95% |
| Connection pool utilization | < 80% | < 95% |
| Index scan ratio | > 95% | > 80% |
| Database CPU | < 70% | < 90% |

### Load Testing

```bash
# Run database load test
npm run test:load

# Monitor during load test
watch -n 1 'psql -U postgres -d knowton -c "SELECT count(*) FROM pg_stat_activity WHERE state = '\''active'\'';"'
```

## Troubleshooting

### High CPU Usage

1. Check for missing indexes
2. Identify slow queries
3. Review query plans
4. Check for table bloat
5. Verify autovacuum is running

### High Memory Usage

1. Check connection count
2. Review work_mem settings
3. Check for memory leaks
4. Monitor cache size
5. Review shared_buffers configuration

### Slow Queries

1. Run EXPLAIN ANALYZE
2. Check for missing indexes
3. Review query structure
4. Check table statistics
5. Consider query rewrite

### Lock Contention

```sql
-- Check for locks
SELECT 
    locktype,
    relation::regclass,
    mode,
    transactionid,
    pid,
    granted
FROM pg_locks
WHERE NOT granted;

-- Kill blocking query
SELECT pg_terminate_backend(pid);
```

## Best Practices

1. **Always use prepared statements** to prevent SQL injection
2. **Use connection pooling** to manage database connections
3. **Implement caching** for frequently accessed data
4. **Monitor query performance** regularly
5. **Add indexes strategically** based on query patterns
6. **Use transactions** for data consistency
7. **Implement retry logic** for transient failures
8. **Set appropriate timeouts** for queries
9. **Use read replicas** for read-heavy workloads
10. **Regular maintenance** (vacuum, analyze, reindex)

## Additional Resources

- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Use The Index, Luke](https://use-the-index-luke.com/)
- [PostgreSQL Explain Visualizer](https://explain.dalibo.com/)
- [PgHero](https://github.com/ankane/pghero) - Performance dashboard
