-- ============================================================================
-- PostgreSQL CDC (Change Data Capture) Setup
-- ============================================================================
-- Purpose: Enable logical replication and CDC for KnowTon platform
-- Requirements: 数据一致性需求
-- ============================================================================

-- Enable logical replication (requires PostgreSQL 10+)
-- This should be set in postgresql.conf:
-- wal_level = logical
-- max_replication_slots = 10
-- max_wal_senders = 10

-- Create publication for CDC
DROP PUBLICATION IF EXISTS knowton_publication;

CREATE PUBLICATION knowton_publication FOR TABLE
    "User",
    "Creator",
    "Content",
    "NFT",
    "Transaction",
    "RoyaltyPayment",
    "Stake",
    "Proposal",
    "Vote",
    "FractionalVault"
WITH (publish = 'insert,update,delete');

-- Create replication slot (will be created by Debezium, but can be pre-created)
-- SELECT pg_create_logical_replication_slot('knowton_replication_slot', 'pgoutput');

-- Create heartbeat table for monitoring
CREATE TABLE IF NOT EXISTS heartbeat (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Grant necessary permissions to replication user
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO knowton;
-- GRANT USAGE ON SCHEMA public TO knowton;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO knowton;

-- Create function to track table changes (optional, for monitoring)
CREATE OR REPLACE FUNCTION track_table_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- This can be used to log changes or trigger additional actions
    -- For now, it's a placeholder for custom CDC logic
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for change tracking (optional)
-- These are not needed for Debezium CDC, but can be useful for custom logic

-- Example trigger for User table
-- CREATE TRIGGER user_changes_trigger
-- AFTER INSERT OR UPDATE OR DELETE ON "User"
-- FOR EACH ROW EXECUTE FUNCTION track_table_changes();

-- View to check replication status
CREATE OR REPLACE VIEW replication_status AS
SELECT
    slot_name,
    plugin,
    slot_type,
    database,
    active,
    restart_lsn,
    confirmed_flush_lsn,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as replication_lag
FROM pg_replication_slots
WHERE slot_name LIKE 'knowton%';

-- View to check publication status
CREATE OR REPLACE VIEW publication_status AS
SELECT
    pubname,
    puballtables,
    pubinsert,
    pubupdate,
    pubdelete,
    pubtruncate
FROM pg_publication
WHERE pubname = 'knowton_publication';

-- View to check published tables
CREATE OR REPLACE VIEW published_tables AS
SELECT
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'knowton_publication'
ORDER BY schemaname, tablename;

-- Function to check CDC health
CREATE OR REPLACE FUNCTION check_cdc_health()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check if publication exists
    RETURN QUERY
    SELECT
        'Publication Exists'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'FAIL' END::TEXT,
        'knowton_publication'::TEXT
    FROM pg_publication
    WHERE pubname = 'knowton_publication';
    
    -- Check if replication slot exists
    RETURN QUERY
    SELECT
        'Replication Slot'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'NOT CREATED' END::TEXT,
        COALESCE(string_agg(slot_name, ', '), 'None')::TEXT
    FROM pg_replication_slots
    WHERE slot_name LIKE 'knowton%';
    
    -- Check WAL level
    RETURN QUERY
    SELECT
        'WAL Level'::TEXT,
        CASE WHEN setting = 'logical' THEN 'OK' ELSE 'FAIL' END::TEXT,
        setting::TEXT
    FROM pg_settings
    WHERE name = 'wal_level';
    
    -- Check max replication slots
    RETURN QUERY
    SELECT
        'Max Replication Slots'::TEXT,
        CASE WHEN setting::INT >= 5 THEN 'OK' ELSE 'LOW' END::TEXT,
        setting::TEXT
    FROM pg_settings
    WHERE name = 'max_replication_slots';
    
    -- Check published tables count
    RETURN QUERY
    SELECT
        'Published Tables'::TEXT,
        'INFO'::TEXT,
        COUNT(*)::TEXT
    FROM pg_publication_tables
    WHERE pubname = 'knowton_publication';
END;
$$ LANGUAGE plpgsql;

-- Create index on frequently queried CDC-related columns
CREATE INDEX IF NOT EXISTS idx_user_updated_at ON "User"(updated_at);
CREATE INDEX IF NOT EXISTS idx_creator_updated_at ON "Creator"(updated_at);
CREATE INDEX IF NOT EXISTS idx_content_updated_at ON "Content"(updated_at);
CREATE INDEX IF NOT EXISTS idx_nft_updated_at ON "NFT"(updated_at);
CREATE INDEX IF NOT EXISTS idx_transaction_created_at ON "Transaction"(created_at);
CREATE INDEX IF NOT EXISTS idx_royalty_created_at ON "RoyaltyPayment"(created_at);

-- Grant permissions for CDC monitoring
GRANT SELECT ON replication_status TO PUBLIC;
GRANT SELECT ON publication_status TO PUBLIC;
GRANT SELECT ON published_tables TO PUBLIC;
GRANT EXECUTE ON FUNCTION check_cdc_health() TO PUBLIC;

-- Display CDC health check
SELECT * FROM check_cdc_health();

-- Display published tables
SELECT * FROM published_tables;

COMMENT ON PUBLICATION knowton_publication IS 'CDC publication for KnowTon platform data synchronization';
COMMENT ON TABLE heartbeat IS 'Heartbeat table for CDC monitoring and health checks';
COMMENT ON FUNCTION check_cdc_health() IS 'Function to check CDC configuration health';
