import { Router, Request, Response } from 'express';
import { getCDNPurgeService } from '../services/cdn-purge.service';
import { invalidateByTag } from '../middleware/cache.middleware';

const router = Router();

/**
 * Cache management routes
 */

// Purge all cache
router.post('/purge/all', async (req: Request, res: Response) => {
  try {
    const cdnService = getCDNPurgeService();
    const success = await cdnService.purgeAll();
    
    if (success) {
      res.json({
        success: true,
        message: 'All cache purged successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to purge cache'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Purge specific files
router.post('/purge/files', async (req: Request, res: Response) => {
  try {
    const { files } = req.body;
    
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({
        success: false,
        message: 'Files array is required'
      });
    }
    
    const cdnService = getCDNPurgeService();
    const success = await cdnService.purgeFiles(files);
    
    res.json({
      success,
      message: success ? `Purged ${files.length} files` : 'Failed to purge files',
      files
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Purge by tags
router.post('/purge/tags', async (req: Request, res: Response) => {
  try {
    const { tags } = req.body;
    
    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        message: 'Tags array is required'
      });
    }
    
    const cdnService = getCDNPurgeService();
    const redis = (req as any).redis;
    
    // Purge CDN cache
    const cdnSuccess = await cdnService.purgeTags(tags);
    
    // Purge Redis cache by tags
    if (redis) {
      for (const tag of tags) {
        await invalidateByTag(redis, tag);
      }
    }
    
    res.json({
      success: cdnSuccess,
      message: cdnSuccess ? `Purged tags: ${tags.join(', ')}` : 'Failed to purge tags',
      tags
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Purge static assets
router.post('/purge/static', async (req: Request, res: Response) => {
  try {
    const { domain = 'knowton.io' } = req.body;
    
    const cdnService = getCDNPurgeService();
    const success = await cdnService.purgeStaticAssets(domain);
    
    res.json({
      success,
      message: success ? 'Static assets purged' : 'Failed to purge static assets'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Purge API cache
router.post('/purge/api', async (req: Request, res: Response) => {
  try {
    const { domain = 'knowton.io' } = req.body;
    
    const cdnService = getCDNPurgeService();
    const success = await cdnService.purgeAPI(domain);
    
    res.json({
      success,
      message: success ? 'API cache purged' : 'Failed to purge API cache'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Purge NFT metadata
router.post('/purge/nft/:tokenId', async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const { domain = 'knowton.io' } = req.body;
    
    const cdnService = getCDNPurgeService();
    const success = await cdnService.purgeNFTMetadata(tokenId, domain);
    
    res.json({
      success,
      message: success ? `NFT ${tokenId} cache purged` : 'Failed to purge NFT cache',
      tokenId
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Purge IPFS content
router.post('/purge/ipfs/:cid', async (req: Request, res: Response) => {
  try {
    const { cid } = req.params;
    const { domain = 'knowton.io' } = req.body;
    
    const cdnService = getCDNPurgeService();
    const success = await cdnService.purgeIPFS(cid, domain);
    
    res.json({
      success,
      message: success ? `IPFS ${cid} cache purged` : 'Failed to purge IPFS cache',
      cid
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get cache statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const cdnService = getCDNPurgeService();
    const stats = await cdnService.getCacheStats();
    
    if (stats) {
      res.json({
        success: true,
        stats
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to get cache stats'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get Redis cache info
router.get('/redis/info', async (req: Request, res: Response) => {
  try {
    const redis = (req as any).redis;
    
    if (!redis) {
      return res.status(503).json({
        success: false,
        message: 'Redis not available'
      });
    }
    
    const info = await redis.info('stats');
    const dbsize = await redis.dbsize();
    const memory = await redis.info('memory');
    
    res.json({
      success: true,
      redis: {
        dbsize,
        stats: info,
        memory
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Clear Redis cache by pattern
router.post('/redis/clear', async (req: Request, res: Response) => {
  try {
    const { pattern = '*' } = req.body;
    const redis = (req as any).redis;
    
    if (!redis) {
      return res.status(503).json({
        success: false,
        message: 'Redis not available'
      });
    }
    
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    res.json({
      success: true,
      message: `Cleared ${keys.length} keys`,
      count: keys.length,
      pattern
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Health check
router.get('/health', async (req: Request, res: Response) => {
  try {
    const redis = (req as any).redis;
    
    const health = {
      redis: false,
      cdn: false
    };
    
    // Check Redis
    if (redis) {
      try {
        await redis.ping();
        health.redis = true;
      } catch (error) {
        health.redis = false;
      }
    }
    
    // Check CDN service
    try {
      const cdnService = getCDNPurgeService();
      health.cdn = !!cdnService;
    } catch (error) {
      health.cdn = false;
    }
    
    const allHealthy = health.redis && health.cdn;
    
    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      health
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
