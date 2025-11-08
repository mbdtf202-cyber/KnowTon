import { Router, Request, Response } from 'express';
import { recommendationService } from '../services/recommendation.service';

const router = Router();

/**
 * GET /api/v1/recommendations
 * Get personalized recommendations for the authenticated user
 * 
 * Query params:
 * - limit: number (default: 20)
 * - minScore: number (default: 0.1)
 * - excludeViewed: boolean (default: true)
 * - excludePurchased: boolean (default: true)
 * - diversityFactor: number (default: 0.3)
 * - useContentBased: boolean (default: true)
 * - contentBasedWeight: number (default: 0.3)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.walletAddress;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const options = {
      limit: parseInt(req.query.limit as string) || 20,
      minScore: parseFloat(req.query.minScore as string) || 0.1,
      excludeViewed: req.query.excludeViewed !== 'false',
      excludePurchased: req.query.excludePurchased !== 'false',
      diversityFactor: parseFloat(req.query.diversityFactor as string) || 0.3,
      useContentBased: req.query.useContentBased !== 'false',
      contentBasedWeight: parseFloat(req.query.contentBasedWeight as string) || 0.3,
    };

    const recommendations = await recommendationService.getRecommendations(userId, options);

    res.json({
      success: true,
      data: {
        recommendations,
        count: recommendations.length,
        options,
      },
    });
  } catch (error: any) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get recommendations',
    });
  }
});

/**
 * GET /api/v1/recommendations/user-based
 * Get user-based collaborative filtering recommendations
 */
router.get('/user-based', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.walletAddress;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const recommendations = await recommendationService.getUserBasedRecommendations(userId, limit);

    res.json({
      success: true,
      data: {
        recommendations,
        count: recommendations.length,
        method: 'user-based',
      },
    });
  } catch (error: any) {
    console.error('Error getting user-based recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user-based recommendations',
    });
  }
});

/**
 * GET /api/v1/recommendations/item-based
 * Get item-based collaborative filtering recommendations
 */
router.get('/item-based', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.walletAddress;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const recommendations = await recommendationService.getItemBasedRecommendations(userId, limit);

    res.json({
      success: true,
      data: {
        recommendations,
        count: recommendations.length,
        method: 'item-based',
      },
    });
  } catch (error: any) {
    console.error('Error getting item-based recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get item-based recommendations',
    });
  }
});

/**
 * GET /api/v1/recommendations/similar-users
 * Find users similar to the authenticated user
 */
router.get('/similar-users', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.walletAddress;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const similarUsers = await recommendationService.findSimilarUsers(userId, limit);

    res.json({
      success: true,
      data: {
        similarUsers,
        count: similarUsers.length,
      },
    });
  } catch (error: any) {
    console.error('Error finding similar users:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to find similar users',
    });
  }
});

/**
 * GET /api/v1/recommendations/content-based
 * Get content-based filtering recommendations
 */
router.get('/content-based', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.walletAddress;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const recommendations = await recommendationService.getContentBasedRecommendations(userId, limit);

    res.json({
      success: true,
      data: {
        recommendations,
        count: recommendations.length,
        method: 'content-based',
      },
    });
  } catch (error: any) {
    console.error('Error getting content-based recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get content-based recommendations',
    });
  }
});

/**
 * GET /api/v1/recommendations/similar-content/:contentId
 * Find content similar to the specified content (collaborative filtering)
 */
router.get('/similar-content/:contentId', async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const similarContent = await recommendationService.findSimilarContent(contentId, limit);

    res.json({
      success: true,
      data: {
        contentId,
        similarContent,
        count: similarContent.length,
        method: 'collaborative',
      },
    });
  } catch (error: any) {
    console.error('Error finding similar content:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to find similar content',
    });
  }
});

/**
 * GET /api/v1/recommendations/similar-content-features/:contentId
 * Find content similar to the specified content (content-based features)
 */
router.get('/similar-content-features/:contentId', async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const similarContent = await recommendationService.findSimilarContentByFeatures(contentId, limit);

    res.json({
      success: true,
      data: {
        contentId,
        similarContent,
        count: similarContent.length,
        method: 'content-features',
      },
    });
  } catch (error: any) {
    console.error('Error finding similar content by features:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to find similar content by features',
    });
  }
});

/**
 * POST /api/v1/recommendations/train
 * Train/update recommendation models (admin only)
 */
router.post('/train', async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    // Run training in background
    recommendationService.trainModels().catch(error => {
      console.error('Error in background training:', error);
    });

    res.json({
      success: true,
      message: 'Model training started in background',
    });
  } catch (error: any) {
    console.error('Error starting model training:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start model training',
    });
  }
});

/**
 * POST /api/v1/recommendations/evaluate
 * Evaluate recommendation accuracy (admin only)
 */
router.post('/evaluate', async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const testSetSize = parseInt(req.body.testSetSize) || 100;
    const results = await recommendationService.evaluateAccuracy(testSetSize);

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('Error evaluating recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to evaluate recommendations',
    });
  }
});

/**
 * DELETE /api/v1/recommendations/cache
 * Clear recommendation cache
 */
router.delete('/cache', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.walletAddress;
    
    if (!userId && req.user?.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Admin can clear all cache, users can only clear their own
    const targetUserId = req.user?.role === 'admin' ? undefined : userId;
    
    await recommendationService.clearCache(targetUserId);

    res.json({
      success: true,
      message: targetUserId 
        ? 'User recommendation cache cleared' 
        : 'All recommendation cache cleared',
    });
  } catch (error: any) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear cache',
    });
  }
});

/**
 * GET /api/v1/recommendations/ab-test
 * Get recommendations with A/B testing
 * Automatically assigns user to test group and returns appropriate recommendations
 */
router.get('/ab-test', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.walletAddress;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const options = {
      limit: parseInt(req.query.limit as string) || 20,
      minScore: parseFloat(req.query.minScore as string) || 0.1,
      excludeViewed: req.query.excludeViewed !== 'false',
      excludePurchased: req.query.excludePurchased !== 'false',
      diversityFactor: parseFloat(req.query.diversityFactor as string) || 0.3,
    };

    const result = await recommendationService.getRecommendationsWithABTest(userId, options);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting A/B test recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get A/B test recommendations',
    });
  }
});

/**
 * POST /api/v1/recommendations/track-interaction
 * Track user interaction with recommended content for A/B testing
 * 
 * Body:
 * - contentId: string (required)
 * - interactionType: 'view' | 'click' | 'purchase' (required)
 * - experimentId: string (optional)
 */
router.post('/track-interaction', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.walletAddress;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { contentId, interactionType, experimentId } = req.body;

    if (!contentId || !interactionType) {
      return res.status(400).json({
        success: false,
        error: 'contentId and interactionType are required',
      });
    }

    if (!['view', 'click', 'purchase'].includes(interactionType)) {
      return res.status(400).json({
        success: false,
        error: 'interactionType must be one of: view, click, purchase',
      });
    }

    await recommendationService.trackRecommendationInteraction(
      userId,
      contentId,
      interactionType,
      experimentId
    );

    res.json({
      success: true,
      message: 'Interaction tracked successfully',
    });
  } catch (error: any) {
    console.error('Error tracking interaction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to track interaction',
    });
  }
});

/**
 * GET /api/v1/recommendations/ab-test/results
 * Get A/B test results and metrics (admin only)
 * 
 * Returns metrics for all test groups and determines winner
 */
router.get('/ab-test/results', async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const results = await recommendationService.getABTestResults();

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('Error getting A/B test results:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get A/B test results',
    });
  }
});

/**
 * GET /api/v1/recommendations/performance
 * Get API performance metrics (admin only)
 * REQ-1.7.2: Monitor API performance (<200ms)
 * 
 * Query params:
 * - method: string (default: 'getRecommendations')
 * 
 * Returns:
 * - averageResponseTime: Average response time in ms
 * - p50, p95, p99: Percentile response times
 * - cacheHitRate: Percentage of requests served from cache
 * - fallbackRate: Percentage of requests using fallback
 * - slowRequestRate: Percentage of requests exceeding threshold
 * - totalRequests: Total number of requests tracked
 */
router.get('/performance', async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const method = (req.query.method as string) || 'getRecommendations';
    const metrics = await recommendationService.getPerformanceMetrics(method);

    res.json({
      success: true,
      data: metrics,
      meta: {
        threshold: 200, // ms
        status: metrics.p95 < 200 ? 'healthy' : 'degraded',
      },
    });
  } catch (error: any) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get performance metrics',
    });
  }
});

/**
 * GET /api/v1/recommendations/fallback
 * Get fallback recommendations (popularity-based)
 * REQ-1.7.2: Implement fallback recommendations
 * 
 * Used when main recommendation algorithm fails or for testing
 * 
 * Query params:
 * - limit: number (default: 20)
 */
router.get('/fallback', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.walletAddress;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const recommendations = await recommendationService.getFallbackRecommendations(userId, limit);

    res.json({
      success: true,
      data: {
        recommendations,
        count: recommendations.length,
        method: 'fallback-popular',
      },
    });
  } catch (error: any) {
    console.error('Error getting fallback recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get fallback recommendations',
    });
  }
});

export default router;
