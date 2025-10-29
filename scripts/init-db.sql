-- Initialize PostgreSQL database for KnowTon Platform

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS knowton;

-- Set search path
SET search_path TO knowton, public;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    did VARCHAR(255) UNIQUE,
    username VARCHAR(50),
    email VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    reputation_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content metadata table
CREATE TABLE IF NOT EXISTS content_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES users(id),
    content_hash VARCHAR(255) UNIQUE NOT NULL,
    ipfs_cid VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    content_type VARCHAR(100),
    file_size BIGINT,
    fingerprint TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NFT tokens table
CREATE TABLE IF NOT EXISTS nft_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_id BIGINT UNIQUE NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    content_id UUID REFERENCES content_metadata(id),
    owner_address VARCHAR(42) NOT NULL,
    creator_address VARCHAR(42) NOT NULL,
    metadata_uri TEXT,
    royalty_percentage INTEGER,
    minted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    block_number BIGINT,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42),
    token_id BIGINT,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(78, 0),
    gas_used BIGINT,
    gas_price BIGINT,
    status VARCHAR(20) DEFAULT 'pending',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Royalty distributions table
CREATE TABLE IF NOT EXISTS royalty_distributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_id BIGINT NOT NULL,
    sale_price DECIMAL(78, 0) NOT NULL,
    beneficiary_address VARCHAR(42) NOT NULL,
    amount DECIMAL(78, 0) NOT NULL,
    percentage INTEGER NOT NULL,
    tx_hash VARCHAR(66),
    distributed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_content_creator ON content_metadata(creator_id);
CREATE INDEX idx_content_hash ON content_metadata(content_hash);
CREATE INDEX idx_nft_token_id ON nft_tokens(token_id);
CREATE INDEX idx_nft_owner ON nft_tokens(owner_address);
CREATE INDEX idx_tx_hash ON transactions(tx_hash);
CREATE INDEX idx_tx_from ON transactions(from_address);
CREATE INDEX idx_tx_to ON transactions(to_address);
CREATE INDEX idx_royalty_token ON royalty_distributions(token_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON content_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA knowton TO knowton;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA knowton TO knowton;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA knowton TO knowton;
