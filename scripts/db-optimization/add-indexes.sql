-- Add Optimized Indexes for KnowTon Platform
-- This script adds indexes to improve query performance

-- ============================================
-- User and Creator Tables
-- ============================================

-- Index on wallet address (most common lookup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_address 
ON users(address);

-- Index on DID for decentralized identity lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_did 
ON users(did);

-- Index on created_at for time-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at 
ON users(created_at DESC);

-- Composite index for active users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active 
ON users(is_active, created_at DESC) 
WHERE is_active = true;

-- ============================================
-- NFT and Content Tables
-- ============================================

-- Index on token_id (primary lookup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nfts_token_id 
ON nfts(token_id);

-- Index on creator address
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nfts_creator 
ON nfts(creator_address);

-- Index on owner address
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nfts_owner 
ON nfts(owner_address);

-- Index on content hash for duplicate detection
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nfts_content_hash 
ON nfts(content_hash);

-- Index on category for filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nfts_category 
ON nfts(category);

-- Composite index for marketplace listings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nfts_marketplace 
ON nfts(category, created_at DESC) 
WHERE is_listed = true;

-- Full-text search index on title and description
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nfts_search 
ON nfts USING gin(to_tsvector('english', title || ' ' || description));

-- Index on minted_at for time-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nfts_minted_at 
ON nfts(minted_at DESC);

-- ============================================
-- Transaction and Trading Tables
-- ============================================

-- Index on transaction hash
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_hash 
ON transactions(tx_hash);

-- Index on from address
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_from 
ON transactions(from_address);

-- Index on to address
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_to 
ON transactions(to_address);

-- Index on token_id for NFT transaction history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_token_id 
ON transactions(token_id);

-- Composite index for user transaction history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_history 
ON transactions(from_address, timestamp DESC);

-- Index on timestamp for time-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_timestamp 
ON transactions(timestamp DESC);

-- Index on status for pending transactions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_status 
ON transactions(status) 
WHERE status = 'pending';

-- ============================================
-- Order Book Tables
-- ============================================

-- Index on token_id for order book queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_token_id 
ON orders(token_id);

-- Index on maker address
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_maker 
ON orders(maker_address);

-- Composite index for active orders
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_active 
ON orders(token_id, order_type, price) 
WHERE status = 'open';

-- Index on created_at for order history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at 
ON orders(created_at DESC);

-- Composite index for price sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_price_sort 
ON orders(token_id, order_type, price ASC) 
WHERE status = 'open';

-- ============================================
-- Royalty and Revenue Tables
-- ============================================

-- Index on token_id for royalty lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_royalties_token_id 
ON royalties(token_id);

-- Index on beneficiary address
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_royalties_beneficiary 
ON royalties(beneficiary_address);

-- Composite index for claimable royalties
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_royalties_claimable 
ON royalties(beneficiary_address, status) 
WHERE status = 'pending';

-- Index on distributed_at for time-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_royalties_distributed_at 
ON royalties(distributed_at DESC);

-- ============================================
-- Fractionalization Tables
-- ============================================

-- Index on vault_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vaults_id 
ON fractional_vaults(vault_id);

-- Index on NFT token_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vaults_token_id 
ON fractional_vaults(nft_token_id);

-- Index on fractional token address
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vaults_token_address 
ON fractional_vaults(fractional_token_address);

-- Composite index for active vaults
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vaults_active 
ON fractional_vaults(is_redeemable, created_at DESC);

-- ============================================
-- Analytics and Metrics Tables
-- ============================================

-- Index on metric_name for analytics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_name 
ON metrics(metric_name);

-- Composite index for time-series data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_timeseries 
ON metrics(metric_name, timestamp DESC);

-- Index on entity_id for entity-specific metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_entity 
ON metrics(entity_type, entity_id, timestamp DESC);

-- ============================================
-- Audit Log Tables
-- ============================================

-- Index on user_address for audit queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_user 
ON audit_logs(user_address);

-- Index on action for filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_action 
ON audit_logs(action);

-- Composite index for user audit history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_user_history 
ON audit_logs(user_address, timestamp DESC);

-- Index on timestamp for time-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_timestamp 
ON audit_logs(timestamp DESC);

-- Partial index for failed actions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_failed 
ON audit_logs(action, timestamp DESC) 
WHERE status = 'failed';

-- ============================================
-- Verify Index Creation
-- ============================================

-- List all indexes with their sizes
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as times_used
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;

-- Show index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY idx_scan DESC;
