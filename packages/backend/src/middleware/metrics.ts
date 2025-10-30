import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// Create a Registry to register the metrics
export const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics for KnowTon platform

// HTTP request duration histogram
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
  registers: [register],
});

// HTTP request counter
export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Active connections gauge
export const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

// NFT minting counter
export const nftMintTotal = new client.Counter({
  name: 'nft_mint_total',
  help: 'Total number of NFTs minted',
  labelNames: ['category', 'status'],
  registers: [register],
});

// Transaction gas fees gauge
export const transactionGasFees = new client.Histogram({
  name: 'transaction_gas_fees_gwei',
  help: 'Gas fees for blockchain transactions in Gwei',
  labelNames: ['transaction_type'],
  buckets: [1, 5, 10, 20, 50, 100, 200, 500, 1000],
  registers: [register],
});

// Trading volume gauge
export const tradingVolume = new client.Gauge({
  name: 'trading_volume_usd',
  help: 'Trading volume in USD',
  labelNames: ['token_id', 'pair'],
  registers: [register],
});

// Royalty distribution counter
export const royaltyDistributionTotal = new client.Counter({
  name: 'royalty_distribution_total',
  help: 'Total number of royalty distributions',
  labelNames: ['token_id', 'status'],
  registers: [register],
});

// Royalty amount histogram
export const royaltyAmount = new client.Histogram({
  name: 'royalty_amount_usd',
  help: 'Royalty distribution amounts in USD',
  labelNames: ['token_id'],
  buckets: [1, 10, 50, 100, 500, 1000, 5000, 10000],
  registers: [register],
});

// Content upload counter
export const contentUploadTotal = new client.Counter({
  name: 'content_upload_total',
  help: 'Total number of content uploads',
  labelNames: ['content_type', 'status'],
  registers: [register],
});

// Content size histogram
export const contentSize = new client.Histogram({
  name: 'content_size_bytes',
  help: 'Size of uploaded content in bytes',
  labelNames: ['content_type'],
  buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600, 1073741824],
  registers: [register],
});

// IPFS upload duration
export const ipfsUploadDuration = new client.Histogram({
  name: 'ipfs_upload_duration_seconds',
  help: 'Duration of IPFS uploads in seconds',
  labelNames: ['status'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [register],
});

// Database query duration
export const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

// Kafka message counter
export const kafkaMessageTotal = new client.Counter({
  name: 'kafka_messages_total',
  help: 'Total number of Kafka messages',
  labelNames: ['topic', 'status'],
  registers: [register],
});

// Redis cache hit/miss counter
export const redisCacheTotal = new client.Counter({
  name: 'redis_cache_total',
  help: 'Total number of Redis cache operations',
  labelNames: ['operation', 'result'],
  registers: [register],
});

// Staking operations counter
export const stakingOperationsTotal = new client.Counter({
  name: 'staking_operations_total',
  help: 'Total number of staking operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

// Staked amount gauge
export const stakedAmount = new client.Gauge({
  name: 'staked_amount_tokens',
  help: 'Total amount of tokens staked',
  labelNames: ['user_address'],
  registers: [register],
});

// Governance proposals counter
export const governanceProposalsTotal = new client.Counter({
  name: 'governance_proposals_total',
  help: 'Total number of governance proposals',
  labelNames: ['proposal_type', 'status'],
  registers: [register],
});

// Fractionalization operations counter
export const fractionalizationTotal = new client.Counter({
  name: 'fractionalization_operations_total',
  help: 'Total number of fractionalization operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

// API error counter
export const apiErrorTotal = new client.Counter({
  name: 'api_errors_total',
  help: 'Total number of API errors',
  labelNames: ['method', 'route', 'error_type'],
  registers: [register],
});

// Middleware to track HTTP metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Increment active connections
  activeConnections.inc();

  // Track response
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const statusCode = res.statusCode.toString();

    // Record metrics
    httpRequestDuration.labels(req.method, route, statusCode).observe(duration);
    httpRequestTotal.labels(req.method, route, statusCode).inc();
    
    // Decrement active connections
    activeConnections.dec();

    // Track errors
    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      apiErrorTotal.labels(req.method, route, errorType).inc();
    }
  });

  next();
};

// Metrics endpoint handler
export const metricsHandler = async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error);
  }
};
// KnowTon Business Metrics

// NFT minting rate
export const knowtonNftMintsTotal = new client.Counter({
  name: 'knowton_nft_mints_total',
  help: 'Total number of NFTs minted on KnowTon platform',
  labelNames: ['category', 'creator'],
  registers: [register],
});

// Trading volume in USD
export const knowtonTradingVolumeUsd = new client.Gauge({
  name: 'knowton_trading_volume_usd',
  help: 'Trading volume in USD',
  labelNames: ['pair', 'timeframe'],
  registers: [register],
});

// Royalty revenue in USD
export const knowtonRoyaltyRevenueUsd = new client.Gauge({
  name: 'knowton_royalty_revenue_usd',
  help: 'Royalty revenue in USD',
  labelNames: ['creator', 'nft_id'],
  registers: [register],
});

// Active users
export const knowtonActiveUsersTotal = new client.Gauge({
  name: 'knowton_active_users_total',
  help: 'Number of active users',
  labelNames: ['timeframe'],
  registers: [register],
});

// Total NFTs on platform
export const knowtonTotalNfts = new client.Gauge({
  name: 'knowton_total_nfts',
  help: 'Total number of NFTs on KnowTon platform',
  registers: [register],
});

// Active IP bonds
export const knowtonActiveBondsTotal = new client.Gauge({
  name: 'knowton_active_bonds_total',
  help: 'Number of active IP bonds',
  registers: [register],
});

// Total value locked
export const knowtonTotalValueLockedUsd = new client.Gauge({
  name: 'knowton_total_value_locked_usd',
  help: 'Total value locked in USD',
  registers: [register],
});

// NFTs by category
export const knowtonNftsByCategory = new client.Gauge({
  name: 'knowton_nfts_by_category',
  help: 'Number of NFTs by category',
  labelNames: ['category'],
  registers: [register],
});

// AI processing duration
export const knowtonAiProcessingDuration = new client.Histogram({
  name: 'knowton_ai_processing_duration_seconds',
  help: 'AI processing duration in seconds',
  labelNames: ['service', 'operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

// Gas fees spent
export const knowtonGasFeesTotal = new client.Counter({
  name: 'knowton_gas_fees_total',
  help: 'Total gas fees spent in ETH',
  labelNames: ['operation', 'network'],
  registers: [register],
});

// Transaction errors
export const knowtonTransactionErrors = new client.Counter({
  name: 'knowton_transaction_errors_total',
  help: 'Total number of transaction errors',
  labelNames: ['operation', 'error_type'],
  registers: [register],
});

// Content fingerprinting operations
export const knowtonFingerprintingTotal = new client.Counter({
  name: 'knowton_fingerprinting_total',
  help: 'Total number of content fingerprinting operations',
  labelNames: ['content_type', 'status'],
  registers: [register],
});

// IP valuation operations
export const knowtonValuationTotal = new client.Counter({
  name: 'knowton_valuation_total',
  help: 'Total number of IP valuation operations',
  labelNames: ['status'],
  registers: [register],
});

// Recommendation requests
export const knowtonRecommendationTotal = new client.Counter({
  name: 'knowton_recommendation_total',
  help: 'Total number of recommendation requests',
  labelNames: ['user_type'],
  registers: [register],
});

// Bond issuance operations
export const knowtonBondIssuanceTotal = new client.Counter({
  name: 'knowton_bond_issuance_total',
  help: 'Total number of bond issuance operations',
  labelNames: ['bond_type', 'status'],
  registers: [register],
});

// Bond investment amount
export const knowtonBondInvestmentUsd = new client.Histogram({
  name: 'knowton_bond_investment_usd',
  help: 'Bond investment amounts in USD',
  labelNames: ['tranche_type'],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
  registers: [register],
});

// Utility functions to update business metrics

export const updateNftMintMetrics = (category: string, creator: string) => {
  knowtonNftMintsTotal.labels(category, creator).inc();
  knowtonTotalNfts.inc();
  knowtonNftsByCategory.labels(category).inc();
};

export const updateTradingMetrics = (volumeUsd: number, pair: string) => {
  knowtonTradingVolumeUsd.labels(pair, '24h').set(volumeUsd);
};

export const updateRoyaltyMetrics = (revenueUsd: number, creator: string, nftId: string) => {
  knowtonRoyaltyRevenueUsd.labels(creator, nftId).set(revenueUsd);
};

export const updateActiveUsersMetrics = (count: number, timeframe: string) => {
  knowtonActiveUsersTotal.labels(timeframe).set(count);
};

export const updateBondMetrics = (activeBonds: number, tvlUsd: number) => {
  knowtonActiveBondsTotal.set(activeBonds);
  knowtonTotalValueLockedUsd.set(tvlUsd);
};

export const recordAiProcessingTime = (service: string, operation: string, durationSeconds: number) => {
  knowtonAiProcessingDuration.labels(service, operation).observe(durationSeconds);
};

export const recordGasFees = (operation: string, network: string, feeEth: number) => {
  knowtonGasFeesTotal.labels(operation, network).inc(feeEth);
};

export const recordTransactionError = (operation: string, errorType: string) => {
  knowtonTransactionErrors.labels(operation, errorType).inc();
};

export const recordFingerprintingOperation = (contentType: string, status: string) => {
  knowtonFingerprintingTotal.labels(contentType, status).inc();
};

export const recordValuationOperation = (status: string) => {
  knowtonValuationTotal.labels(status).inc();
};

export const recordRecommendationRequest = (userType: string) => {
  knowtonRecommendationTotal.labels(userType).inc();
};

export const recordBondIssuance = (bondType: string, status: string) => {
  knowtonBondIssuanceTotal.labels(bondType, status).inc();
};

export const recordBondInvestment = (trancheType: string, amountUsd: number) => {
  knowtonBondInvestmentUsd.labels(trancheType).observe(amountUsd);
};