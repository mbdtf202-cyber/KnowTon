import { Router, Request, Response } from 'express';
import { SimilarityService } from '../services/similarity.service';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const similarityService = new SimilarityService();

/**
 * POST /api/v1/similarity/search
 * Search for similar content using AI fingerprinting
 */
router.post('/search', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { content_url, content_type, threshold, limit, offset } = req.body;

    // Validate required fields
    if (!content_url) {
      res.status(400).json({ error: 'content_url is required' });
      return;
    }

    if (!content_type) {
      res.status(400).json({ error: 'content_type is required' });
      return;
    }

    // Validate content type
    const validTypes = ['image', 'audio', 'video', 'text'];
    if (!validTypes.includes(content_type)) {
      res.status(400).json({
        error: `Invalid content_type. Must be one of: ${validTypes.join(', ')}`,
      });
      return;
    }

    // Validate threshold
    if (threshold !== undefined && (threshold < 0 || threshold > 1)) {
      res.status(400).json({ error: 'threshold must be between 0 and 1' });
      return;
    }

    // Validate limit
    if (limit !== undefined && (limit < 1 || limit > 100)) {
      res.status(400).json({ error: 'limit must be between 1 and 100' });
      return;
    }

    // Validate offset
    if (offset !== undefined && offset < 0) {
      res.status(400).json({ error: 'offset must be >= 0' });
      return;
    }

    const result = await similarityService.searchSimilarContent(
      content_url,
      content_type,
      {
        threshold: threshold || 0.85,
        limit: limit || 10,
        offset: offset || 0,
      }
    );

    res.json(result);
  } catch (error) {
    logger.error('Similarity search error:', error);
    res.status(500).json({
      error: 'Similarity search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/similarity/detect-plagiarism
 * Detect potential plagiarism by searching for highly similar content
 */
router.post('/detect-plagiarism', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { content_url, content_type } = req.body;

    // Validate required fields
    if (!content_url) {
      res.status(400).json({ error: 'content_url is required' });
      return;
    }

    if (!content_type) {
      res.status(400).json({ error: 'content_type is required' });
      return;
    }

    // Validate content type
    const validTypes = ['image', 'audio', 'video', 'text'];
    if (!validTypes.includes(content_type)) {
      res.status(400).json({
        error: `Invalid content_type. Must be one of: ${validTypes.join(', ')}`,
      });
      return;
    }

    const result = await similarityService.detectPlagiarism(content_url, content_type);

    res.json(result);
  } catch (error) {
    logger.error('Plagiarism detection error:', error);
    res.status(500).json({
      error: 'Plagiarism detection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/similarity/compare
 * Compare two content items for similarity
 */
router.post('/compare', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fingerprint1, fingerprint2 } = req.body;

    // Validate required fields
    if (!fingerprint1) {
      res.status(400).json({ error: 'fingerprint1 is required' });
      return;
    }

    if (!fingerprint2) {
      res.status(400).json({ error: 'fingerprint2 is required' });
      return;
    }

    const result = await similarityService.compareTwoContent(fingerprint1, fingerprint2);

    res.json(result);
  } catch (error) {
    logger.error('Content comparison error:', error);
    res.status(500).json({
      error: 'Content comparison failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/similarity/fingerprint
 * Generate fingerprint for content
 */
router.post('/fingerprint', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { content_url, content_type, metadata } = req.body;

    // Validate required fields
    if (!content_url) {
      res.status(400).json({ error: 'content_url is required' });
      return;
    }

    if (!content_type) {
      res.status(400).json({ error: 'content_type is required' });
      return;
    }

    // Validate content type
    const validTypes = ['image', 'audio', 'video', 'text'];
    if (!validTypes.includes(content_type)) {
      res.status(400).json({
        error: `Invalid content_type. Must be one of: ${validTypes.join(', ')}`,
      });
      return;
    }

    const result = await similarityService.generateFingerprint(
      content_url,
      content_type,
      metadata
    );

    res.json(result);
  } catch (error) {
    logger.error('Fingerprint generation error:', error);
    res.status(500).json({
      error: 'Fingerprint generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/similarity/health
 * Check if similarity service is available
 */
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const isHealthy = await similarityService.checkHealth();

    if (isHealthy) {
      res.json({
        status: 'healthy',
        service: 'similarity',
        oracle_adapter: 'connected',
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        service: 'similarity',
        oracle_adapter: 'disconnected',
        message: 'Oracle adapter service is not responding',
      });
    }
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'similarity',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
