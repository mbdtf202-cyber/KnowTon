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
