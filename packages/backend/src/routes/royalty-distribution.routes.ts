import express from 'express';
import { RoyaltyDistributionService } from '../services/royalty-distribution.service';

const router = express.Router();
const distributionService = new RoyaltyDistributionService();

/**
 * Calculate distribution off-chain
 * POST /api/royalty-distribution/calculate
 */
router.post('/calculate', async (req, res) => {
  try {
    const { tokenId, totalAmount, beneficiaries } = req.body;

    if (!tokenId || !totalAmount || !beneficiaries) {
      return res.status(400).json({
        error: 'Missing required fields: tokenId, totalAmount, beneficiaries',
      });
    }

    const calculation = await distributionService.calculateDistribution(
      tokenId,
      totalAmount,
      beneficiaries
    );

    res.json({
      success: true,
      data: calculation,
    });
  } catch (error: any) {
    console.error('Error calculating distribution:', error);
    res.status(500).json({
      error: error.message || 'Failed to calculate distribution',
    });
  }
});

/**
 * Batch multiple distributions
 * POST /api/royalty-distribution/batch
 */
router.post('/batch', async (req, res) => {
  try {
    const { distributions } = req.body;

    if (!distributions || !Array.isArray(distributions)) {
      return res.status(400).json({
        error: 'Missing or invalid distributions array',
      });
    }

    const batch = await distributionService.batchDistributions(distributions);

    res.json({
      success: true,
      data: batch,
    });
  } catch (error: any) {
    console.error('Error batching distributions:', error);
    res.status(500).json({
      error: error.message || 'Failed to batch distributions',
    });
  }
});

/**
 * Execute a single distribution
 * POST /api/royalty-distribution/execute
 */
router.post('/execute', async (req, res) => {
  try {
    const { tokenId, amount, retryConfig } = req.body;

    if (!tokenId || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: tokenId, amount',
      });
    }

    const result = await distributionService.executeDistribution(
      tokenId,
      amount,
      retryConfig
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error executing distribution:', error);
    res.status(500).json({
      error: error.message || 'Failed to execute distribution',
    });
  }
});

/**
 * Execute batch distributions
 * POST /api/royalty-distribution/execute-batch
 */
router.post('/execute-batch', async (req, res) => {
  try {
    const { distributions, retryConfig } = req.body;

    if (!distributions || !Array.isArray(distributions)) {
      return res.status(400).json({
        error: 'Missing or invalid distributions array',
      });
    }

    const results = await distributionService.executeBatchDistributions(
      distributions,
      retryConfig
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('Error executing batch distributions:', error);
    res.status(500).json({
      error: error.message || 'Failed to execute batch distributions',
    });
  }
});

/**
 * Get gas price estimate
 * GET /api/royalty-distribution/gas-estimate
 */
router.get('/gas-estimate', async (req, res) => {
  try {
    const estimate = await distributionService.getGasPriceEstimate();

    res.json({
      success: true,
      data: estimate,
    });
  } catch (error: any) {
    console.error('Error getting gas estimate:', error);
    res.status(500).json({
      error: error.message || 'Failed to get gas estimate',
    });
  }
});

/**
 * Get pending distributions
 * GET /api/royalty-distribution/pending
 */
router.get('/pending', async (req, res) => {
  try {
    const pending = await distributionService.getPendingDistributions();

    res.json({
      success: true,
      data: pending,
    });
  } catch (error: any) {
    console.error('Error getting pending distributions:', error);
    res.status(500).json({
      error: error.message || 'Failed to get pending distributions',
    });
  }
});

/**
 * Process pending distributions
 * POST /api/royalty-distribution/process-pending
 */
router.post('/process-pending', async (req, res) => {
  try {
    const result = await distributionService.processPendingDistributions();

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error processing pending distributions:', error);
    res.status(500).json({
      error: error.message || 'Failed to process pending distributions',
    });
  }
});

/**
 * Get distribution history for a creator
 * GET /api/royalty-distribution/history/:creatorAddress
 */
router.get('/history/:creatorAddress', async (req, res) => {
  try {
    const { creatorAddress } = req.params;
    const { page = '1', limit = '10' } = req.query;

    if (!creatorAddress) {
      return res.status(400).json({
        error: 'Creator address is required',
      });
    }

    const history = await distributionService.getDistributionHistory(
      creatorAddress,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error('Error getting distribution history:', error);
    res.status(500).json({
      error: error.message || 'Failed to get distribution history',
    });
  }
});

/**
 * Get distribution statistics for a creator
 * GET /api/royalty-distribution/stats/:creatorAddress
 */
router.get('/stats/:creatorAddress', async (req, res) => {
  try {
    const { creatorAddress } = req.params;

    if (!creatorAddress) {
      return res.status(400).json({
        error: 'Creator address is required',
      });
    }

    const stats = await distributionService.getDistributionStats(creatorAddress);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error getting distribution stats:', error);
    res.status(500).json({
      error: error.message || 'Failed to get distribution stats',
    });
  }
});

export default router;
