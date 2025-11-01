import { Router, Request, Response } from 'express';
import { PlagiarismDetectionService } from '../services/plagiarism-detection.service';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const plagiarismService = new PlagiarismDetectionService();

/**
 * GET /api/v1/plagiarism/detection/:uploadId
 * Get plagiarism detection results for an upload
 */
router.get('/detection/:uploadId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uploadId } = req.params;
    const userId = req.user?.userId || req.user?.address;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await plagiarismService.getDetectionResults(uploadId, userId);

    if (!result) {
      res.status(404).json({ error: 'No plagiarism detection found for this upload' });
      return;
    }

    res.json(result);
  } catch (error) {
    logger.error('Get detection results error:', error);
    res.status(500).json({
      error: 'Failed to get detection results',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/plagiarism/appeal
 * Submit an appeal for a plagiarism detection
 */
router.post('/appeal', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.address;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { detectionId, reason, evidence } = req.body;

    // Validate required fields
    if (!detectionId) {
      res.status(400).json({ error: 'detectionId is required' });
      return;
    }

    if (!reason || reason.trim().length === 0) {
      res.status(400).json({ error: 'reason is required and cannot be empty' });
      return;
    }

    if (reason.length < 50) {
      res.status(400).json({ error: 'reason must be at least 50 characters' });
      return;
    }

    if (reason.length > 2000) {
      res.status(400).json({ error: 'reason must not exceed 2000 characters' });
      return;
    }

    const result = await plagiarismService.submitAppeal({
      detectionId,
      userId,
      reason,
      evidence,
    });

    res.json(result);
  } catch (error) {
    logger.error('Submit appeal error:', error);
    res.status(500).json({
      error: 'Failed to submit appeal',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/plagiarism/appeal/:appealId
 * Get appeal status
 */
router.get('/appeal/:appealId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { appealId } = req.params;
    const userId = req.user?.userId || req.user?.address;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const appeal = await plagiarismService.getAppealStatus(appealId, userId);
    res.json(appeal);
  } catch (error) {
    logger.error('Get appeal status error:', error);
    res.status(500).json({
      error: 'Failed to get appeal status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/plagiarism/appeals
 * Get all appeals for the current user
 */
router.get('/appeals', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.address;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (limit < 1 || limit > 100) {
      res.status(400).json({ error: 'limit must be between 1 and 100' });
      return;
    }

    const appeals = await plagiarismService.getUserAppeals(userId, limit);
    res.json({ appeals });
  } catch (error) {
    logger.error('Get user appeals error:', error);
    res.status(500).json({
      error: 'Failed to get appeals',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/plagiarism/appeal/:appealId/review
 * Review an appeal (admin only)
 */
router.post('/appeal/:appealId/review', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { appealId } = req.params;
    const { decision, reviewNote } = req.body;
    const adminUserId = req.user?.userId || req.user?.address;

    if (!adminUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if user is admin
    // TODO: Implement proper admin role check
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'moderator') {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    // Validate required fields
    if (!decision) {
      res.status(400).json({ error: 'decision is required' });
      return;
    }

    if (!['approved', 'rejected'].includes(decision)) {
      res.status(400).json({ error: 'decision must be either "approved" or "rejected"' });
      return;
    }

    if (!reviewNote || reviewNote.trim().length === 0) {
      res.status(400).json({ error: 'reviewNote is required' });
      return;
    }

    const result = await plagiarismService.reviewAppeal(
      appealId,
      adminUserId,
      decision,
      reviewNote
    );

    res.json(result);
  } catch (error) {
    logger.error('Review appeal error:', error);
    res.status(500).json({
      error: 'Failed to review appeal',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/plagiarism/logs
 * Get detection logs for audit (admin only)
 */
router.get('/logs', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const adminUserId = req.user?.userId || req.user?.address;

    if (!adminUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if user is admin
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'moderator') {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    const {
      uploadId,
      userId,
      isPlagiarism,
      status,
      startDate,
      endDate,
      limit,
      offset,
    } = req.query;

    const filters: any = {};

    if (uploadId) filters.uploadId = uploadId as string;
    if (userId) filters.userId = userId as string;
    if (isPlagiarism !== undefined) filters.isPlagiarism = isPlagiarism === 'true';
    if (status) filters.status = status as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const limitNum = limit ? parseInt(limit as string) : 100;
    const offsetNum = offset ? parseInt(offset as string) : 0;

    if (limitNum < 1 || limitNum > 1000) {
      res.status(400).json({ error: 'limit must be between 1 and 1000' });
      return;
    }

    if (offsetNum < 0) {
      res.status(400).json({ error: 'offset must be >= 0' });
      return;
    }

    const result = await plagiarismService.getDetectionLogs(filters, limitNum, offsetNum);
    res.json(result);
  } catch (error) {
    logger.error('Get detection logs error:', error);
    res.status(500).json({
      error: 'Failed to get detection logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
