/**
 * Valuation Client - Integrates with Oracle Adapter for NFT valuation
 */

import axios, { AxiosInstance } from 'axios';
import { createClient } from 'redis';

// Simple logger
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
};

interface ValuationRequest {
  token_id: number;
  metadata: {
    title?: string;
    description?: string;
    category?: string;
    creator?: string;
    quality_score?: number;
    rarity?: number;
    views?: number;
    likes?: number;
    shares?: number;
    has_license?: boolean;
    is_verified?: boolean;
  };
  historical_data?: Array<{
    price: number;
    volume?: number;
    timestamp?: number;
    quality_score?: number;
  }>;
}

interface ValuationResponse {
  estimated_value: number;
  confidence_interval: [number, number];
  comparable_sales: Array<{
    price: number;
    similarity_score?: number;
    timestamp?: number;
  }>;
  factors: {
    base_factors?: Record<string, any>;
    market_factors?: Record<string, any>;
    historical_factors?: Record<string, any>;
    risk_factors?: Record<string, any>;
    overall_confidence?: number;
  };
  model_uncertainty?: number;
  processing_time_ms?: number;
}

interface LTVCalculation {
  ltv_ratio: number;
  max_loan_amount: number;
  liquidation_threshold: number;
  risk_level: 'low' | 'medium' | 'high';
  recommended_ltv: number;
}

interface RiskParameters {
  volatility_score: number;
  liquidity_score: number;
  market_risk: string;
  creator_risk: string;
  overall_risk_score: number;
  risk_adjusted_value: number;
}

export class ValuationClient {
  private client: AxiosInstance;
  private redisClient: any;
  private cacheEnabled: boolean;
  private cacheTTL: number; // seconds

  constructor() {
    const oracleUrl = process.env.ORACLE_ADAPTER_URL || 'http://oracle-adapter:8000';
    
    this.client = axios.create({
      baseURL: oracleUrl,
      timeout: 30000, // 30 second timeout for AI processing
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.cacheEnabled = process.env.VALUATION_CACHE_ENABLED !== 'false';
    this.cacheTTL = parseInt(process.env.VALUATION_CACHE_TTL || '3600'); // 1 hour default

    // Initialize Redis client for caching
    if (this.cacheEnabled) {
      this.initializeRedis();
    }
  }

  private async initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
      this.redisClient = createClient({ url: redisUrl });
      
      this.redisClient.on('error', (err: Error) => {
        logger.error('Redis client error', { error: err.message });
      });

      await this.redisClient.connect();
      logger.info('Valuation cache (Redis) connected');
    } catch (error) {
      logger.warn('Failed to initialize Redis cache', { error });
      this.cacheEnabled = false;
    }
  }

  /**
   * Get NFT valuation from Oracle Adapter with caching
   */
  async getValuation(request: ValuationRequest): Promise<ValuationResponse> {
    const cacheKey = `valuation:${request.token_id}`;

    try {
      // Check cache first
      if (this.cacheEnabled && this.redisClient) {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          logger.info('Valuation cache hit', { token_id: request.token_id });
          return JSON.parse(cached);
        }
      }

      // Call Oracle Adapter
      logger.info('Requesting valuation from Oracle Adapter', { token_id: request.token_id });
      
      const response = await this.client.post<ValuationResponse>(
        '/api/v1/oracle/valuation',
        request
      );

      const valuation = response.data;

      // Cache the result
      if (this.cacheEnabled && this.redisClient) {
        await this.redisClient.setEx(
          cacheKey,
          this.cacheTTL,
          JSON.stringify(valuation)
        );
        logger.info('Valuation cached', { token_id: request.token_id, ttl: this.cacheTTL });
      }

      logger.info('Valuation retrieved successfully', {
        token_id: request.token_id,
        estimated_value: valuation.estimated_value,
        confidence_interval: valuation.confidence_interval,
      });

      return valuation;
    } catch (error: any) {
      logger.error('Failed to get valuation', {
        token_id: request.token_id,
        error: error.message,
      });
      throw new Error(`Valuation service error: ${error.message}`);
    }
  }

  /**
   * Calculate Loan-to-Value (LTV) ratio and lending parameters
   */
  calculateLTV(
    collateralValue: number,
    loanAmount: number,
    riskFactors?: RiskParameters
  ): LTVCalculation {
    // Base LTV limits for IP-NFTs
    const baseLTV = 50; // 50% base LTV
    const conservativeLTV = 40; // 40% for high-risk assets
    const aggressiveLTV = 60; // 60% for low-risk assets

    // Adjust LTV based on risk factors
    let recommendedLTV = baseLTV;
    let liquidationThreshold = 65; // 65% liquidation threshold

    if (riskFactors) {
      const riskScore = riskFactors.overall_risk_score;
      
      if (riskScore < 0.3) {
        // Low risk - allow higher LTV
        recommendedLTV = aggressiveLTV;
        liquidationThreshold = 70;
      } else if (riskScore > 0.6) {
        // High risk - require lower LTV
        recommendedLTV = conservativeLTV;
        liquidationThreshold = 60;
      }

      // Adjust for liquidity
      if (riskFactors.liquidity_score < 0.3) {
        recommendedLTV -= 5; // Reduce LTV for illiquid assets
        liquidationThreshold -= 5;
      }
    }

    const ltvRatio = collateralValue > 0 ? (loanAmount / collateralValue) * 100 : 0;
    const maxLoanAmount = collateralValue * (recommendedLTV / 100);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    if (ltvRatio < 40) {
      riskLevel = 'low';
    } else if (ltvRatio > 55) {
      riskLevel = 'high';
    }

    return {
      ltv_ratio: Math.round(ltvRatio * 100) / 100,
      max_loan_amount: Math.round(maxLoanAmount * 100) / 100,
      liquidation_threshold: liquidationThreshold,
      risk_level: riskLevel,
      recommended_ltv: recommendedLTV,
    };
  }

  /**
   * Extract risk parameters from valuation response
   */
  extractRiskParameters(valuation: ValuationResponse): RiskParameters {
    const factors = valuation.factors || {};
    const riskFactors = factors.risk_factors || {};
    const marketFactors = factors.market_factors || {};

    // Extract risk scores
    const overallRiskScore = riskFactors.overall_risk_score || 0.5;
    const marketRisk = riskFactors.market_risk || 'medium';
    const creatorRisk = riskFactors.creator_risk || 'medium';
    const liquidityScore = marketFactors.liquidity?.score || 0.5;
    const volatilityScore = marketFactors.volatility?.score || 0.2;

    // Calculate risk-adjusted value (apply haircut based on risk)
    const riskHaircut = 1 - (overallRiskScore * 0.3); // Up to 30% haircut for high risk
    const riskAdjustedValue = valuation.estimated_value * riskHaircut;

    return {
      volatility_score: volatilityScore,
      liquidity_score: liquidityScore,
      market_risk: marketRisk,
      creator_risk: creatorRisk,
      overall_risk_score: overallRiskScore,
      risk_adjusted_value: Math.round(riskAdjustedValue * 100) / 100,
    };
  }

  /**
   * Calculate health factor for lending positions
   */
  calculateHealthFactor(
    totalCollateralValue: number,
    totalDebtValue: number,
    liquidationThreshold: number = 65
  ): number {
    if (totalDebtValue === 0) {
      return Infinity;
    }

    // Health Factor = (Collateral Value * Liquidation Threshold) / Total Debt
    const healthFactor = (totalCollateralValue * (liquidationThreshold / 100)) / totalDebtValue;
    
    return Math.round(healthFactor * 100) / 100;
  }

  /**
   * Invalidate cached valuation (e.g., after significant market changes)
   */
  async invalidateCache(tokenId: number): Promise<void> {
    if (this.cacheEnabled && this.redisClient) {
      const cacheKey = `valuation:${tokenId}`;
      await this.redisClient.del(cacheKey);
      logger.info('Valuation cache invalidated', { token_id: tokenId });
    }
  }

  /**
   * Batch get valuations for multiple NFTs
   */
  async getBatchValuations(
    requests: ValuationRequest[]
  ): Promise<Map<number, ValuationResponse>> {
    const results = new Map<number, ValuationResponse>();

    // Process in parallel with concurrency limit
    const concurrency = 5;
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const promises = batch.map(req => 
        this.getValuation(req)
          .then(val => ({ tokenId: req.token_id, valuation: val }))
          .catch(err => {
            logger.error('Batch valuation failed', { token_id: req.token_id, error: err.message });
            return null;
          })
      );

      const batchResults = await Promise.all(promises);
      
      for (const result of batchResults) {
        if (result) {
          results.set(result.tokenId, result.valuation);
        }
      }
    }

    return results;
  }

  /**
   * Get valuation with automatic retry on failure
   */
  async getValuationWithRetry(
    request: ValuationRequest,
    maxRetries: number = 3
  ): Promise<ValuationResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.getValuation(request);
      } catch (error: any) {
        lastError = error;
        logger.warn('Valuation attempt failed', {
          token_id: request.token_id,
          attempt,
          max_retries: maxRetries,
          error: error.message,
        });

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Valuation failed after retries');
  }

  /**
   * Check if Oracle Adapter service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return response.data.status === 'healthy';
    } catch (error) {
      logger.error('Oracle Adapter health check failed', { error });
      return false;
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
      logger.info('Valuation client closed');
    }
  }
}

// Export singleton instance
export const valuationClient = new ValuationClient();
