import express, { Request, Response } from 'express';
import { ScreenRecordingPreventionService } from '../services/screen-recording-prevention.service';
import { logger } from '../utils/logger';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();
const preventionService = new ScreenRecordingPreventionService();

/**
 * Generate dynamic watermark configuration for playback session
 * POST /api/v1/screen-recording-prevention/watermark
 */
router.post('/watermark', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { contentId, sessionId } = req.body;
    const userId = (req as any).user.id;

    if (!contentId || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Content ID and session ID are required',
      });
    }

    // Check if user is banned
    const isBanned = await preventionService.isUserBanned(userId, contentId);
    if (isBanned) {
      return res.status(403).json({
        success: false,
        error: 'Access temporarily restricted due to security violations',
      });
    }

    const config = await preventionService.generateDynamicWatermark(
      userId,
      contentId,
      sessionId
    );

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Error generating watermark config', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate watermark configuration',
    });
  }
});

/**
 * Log a recording attempt
 * POST /api/v1/screen-recording-prevention/log-attempt
 */
router.post('/log-attempt', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      contentId,
      detectionMethod,
      toolName,
      severity,
      deviceInfo,
    } = req.body;
    const userId = (req as any).user.id;

    if (!contentId || !detectionMethod || !severity) {
      return res.status(400).json({
        success: false,
        error: 'Content ID, detection method, and severity are required',
      });
    }

    await preventionService.logRecordingAttempt({
      userId,
      contentId,
      detectionMethod,
      toolName,
      severity,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceInfo,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: 'Recording attempt logged',
    });
  } catch (error) {
    logger.error('Error logging recording attempt', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to log recording attempt',
    });
  }
});

/**
 * Check if user is banned
 * GET /api/v1/screen-recording-prevention/ban-status/:contentId
 */
router.get('/ban-status/:contentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const userId = (req as any).user.id;

    const isBanned = await preventionService.isUserBanned(userId, contentId);

    res.json({
      success: true,
      data: {
        isBanned,
      },
    });
  } catch (error) {
    logger.error('Error checking ban status', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to check ban status',
    });
  }
});

/**
 * Detect recording tools from user agent
 * POST /api/v1/screen-recording-prevention/detect-tools
 */
router.post('/detect-tools', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { processNames, extensions } = req.body;
    const userAgent = req.headers['user-agent'] || '';

    const toolDetection = preventionService.detectRecordingTool(
      userAgent,
      processNames
    );

    const extensionDetection = extensions
      ? preventionService.detectSuspiciousExtensions(extensions)
      : { detected: false, confidence: 0 };

    res.json({
      success: true,
      data: {
        toolDetection,
        extensionDetection,
      },
    });
  } catch (error) {
    logger.error('Error detecting recording tools', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to detect recording tools',
    });
  }
});

/**
 * Get recording prevention statistics (admin/creator only)
 * GET /api/v1/screen-recording-prevention/stats
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { contentId, startDate, endDate } = req.query;

    // Check if user is admin or content creator
    // For now, allow all authenticated users
    // In production, add proper authorization check

    const stats = await preventionService.getPreventionStats(
      contentId as string | undefined,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting prevention stats', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get prevention statistics',
    });
  }
});

/**
 * Get user's recording attempt history (admin only)
 * GET /api/v1/screen-recording-prevention/history/:userId
 */
router.get('/history/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;

    // Check if requester is admin
    // For now, allow all authenticated users
    // In production, add proper authorization check

    const history = await preventionService.getUserAttemptHistory(
      userId,
      limit ? parseInt(limit as string) : 50
    );

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    logger.error('Error getting attempt history', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get attempt history',
    });
  }
});

/**
 * Clear expired bans (admin only)
 * POST /api/v1/screen-recording-prevention/clear-expired-bans
 */
router.post('/clear-expired-bans', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if requester is admin
    // For now, allow all authenticated users
    // In production, add proper authorization check

    const count = await preventionService.clearExpiredBans();

    res.json({
      success: true,
      data: {
        clearedCount: count,
      },
    });
  } catch (error) {
    logger.error('Error clearing expired bans', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to clear expired bans',
    });
  }
});

/**
 * Manually unban a user (admin only)
 * POST /api/v1/screen-recording-prevention/unban
 */
router.post('/unban', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId, contentId } = req.body;

    if (!userId || !contentId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and content ID are required',
      });
    }

    // Check if requester is admin
    // For now, allow all authenticated users
    // In production, add proper authorization check

    await preventionService.unbanUser(userId, contentId);

    res.json({
      success: true,
      message: 'User unbanned successfully',
    });
  } catch (error) {
    logger.error('Error unbanning user', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to unban user',
    });
  }
});

export default router;
