import { Request, Response } from 'express';
import { recommendationService } from '../services/recommendation.service';

export class RecommendationController {
  /**
   * Get personalized recommendations
   */
  async getRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.walletAddress;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
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
  }

  /**
   * Get user-based recommendations
   */
  async getUserBasedRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.walletAddress;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
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
  }

  /**
   * Get item-based recommendations
   */
  async getItemBasedRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.walletAddress;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
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
  }

  /**
   * Find similar users
   */
  async findSimilarUsers(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.walletAddress;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
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
  }

  /**
   * Find similar content
   */
  async findSimilarContent(req: Request, res: Response): Promise<void> {
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
        },
      });
    } catch (error: any) {
      console.error('Error finding similar content:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to find similar content',
      });
    }
  }

  /**
   * Train recommendation models
   */
  async trainModels(req: Request, res: Response): Promise<void> {
    try {
      // Check if user is admin
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
        return;
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
  }

  /**
   * Evaluate recommendation accuracy
   */
  async evaluateAccuracy(req: Request, res: Response): Promise<void> {
    try {
      // Check if user is admin
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
        return;
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
  }

  /**
   * Get content-based recommendations
   */
  async getContentBasedRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.walletAddress;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
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
  }

  /**
   * Find similar content by features
   */
  async findSimilarContentByFeatures(req: Request, res: Response): Promise<void> {
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
  }

  /**
   * Clear recommendation cache
   */
  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.walletAddress;
      
      if (!userId && req.user?.role !== 'admin') {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
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
  }

  /**
   * Get recommendations with A/B testing
   */
  async getRecommendationsWithABTest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.walletAddress;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
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
  }

  /**
   * Track recommendation interaction for A/B testing
   */
  async trackInteraction(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.walletAddress;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { contentId, interactionType, experimentId } = req.body;

      if (!contentId || !interactionType) {
        res.status(400).json({
          success: false,
          error: 'contentId and interactionType are required',
        });
        return;
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
  }

  /**
   * Get A/B test results (admin only)
   */
  async getABTestResults(req: Request, res: Response): Promise<void> {
    try {
      // Check if user is admin
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
        return;
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
  }

  /**
   * Get performance metrics (admin only)
   * REQ-1.7.2: Monitor API performance (<200ms)
   */
  async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      // Check if user is admin
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
        return;
      }

      const method = (req.query.method as string) || 'getRecommendations';
      const metrics = await recommendationService.getPerformanceMetrics(method);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error: any) {
      console.error('Error getting performance metrics:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get performance metrics',
      });
    }
  }

  /**
   * Get fallback recommendations
   * REQ-1.7.2: Implement fallback recommendations
   */
  async getFallbackRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.walletAddress;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const recommendations = await recommendationService.getFallbackRecommendations(userId, limit);

      res.json({
        success: true,
        data: {
          recommendations,
          count: recommendations.length,
          method: 'fallback',
        },
      });
    } catch (error: any) {
      console.error('Error getting fallback recommendations:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get fallback recommendations',
      });
    }
  }
}

export const recommendationController = new RecommendationController();
