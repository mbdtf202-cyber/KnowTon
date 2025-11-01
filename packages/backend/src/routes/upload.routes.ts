import { Router, Request, Response } from 'express';
import { UploadService } from '../services/upload.service';
import { FileValidationService } from '../services/file-validation.service';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import path from 'path';

const router = Router();
const uploadService = new UploadService();
const fileValidationService = new FileValidationService();

/**
 * GET /api/v1/upload/status/:uploadId
 * Get upload status and progress
 */
router.get('/status/:uploadId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uploadId } = req.params;
    const userId = req.user?.userId || req.user?.address;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const status = await uploadService.getUploadStatus(uploadId, userId);
    res.json(status);
  } catch (error) {
    logger.error('Get upload status error:', error);
    res.status(404).json({ error: 'Upload not found' });
  }
});

/**
 * GET /api/v1/upload/list
 * Get user's uploads
 */
router.get('/list', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.address;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const uploads = await uploadService.getUserUploads(userId, limit);
    res.json({ uploads });
  } catch (error) {
    logger.error('Get uploads error:', error);
    res.status(500).json({ error: 'Failed to fetch uploads' });
  }
});

/**
 * DELETE /api/v1/upload/:uploadId
 * Delete an upload
 */
router.delete('/:uploadId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uploadId } = req.params;
    const userId = req.user?.userId || req.user?.address;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await uploadService.deleteUpload(uploadId, userId);
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete upload error:', error);
    res.status(404).json({ error: 'Upload not found' });
  }
});

/**
 * POST /api/v1/upload/batch/status
 * Get status for multiple uploads
 */
router.post('/batch/status', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uploadIds } = req.body;
    const userId = req.user?.userId || req.user?.address;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!Array.isArray(uploadIds) || uploadIds.length === 0) {
      res.status(400).json({ error: 'uploadIds must be a non-empty array' });
      return;
    }

    if (uploadIds.length > 50) {
      res.status(400).json({ error: 'Maximum 50 upload IDs allowed' });
      return;
    }

    const statuses = await uploadService.getBatchUploadStatus(uploadIds, userId);
    res.json({ statuses });
  } catch (error) {
    logger.error('Get batch upload status error:', error);
    res.status(500).json({ error: 'Failed to fetch batch upload status' });
  }
});

/**
 * DELETE /api/v1/upload/batch
 * Delete multiple uploads
 */
router.delete('/batch', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uploadIds } = req.body;
    const userId = req.user?.userId || req.user?.address;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!Array.isArray(uploadIds) || uploadIds.length === 0) {
      res.status(400).json({ error: 'uploadIds must be a non-empty array' });
      return;
    }

    if (uploadIds.length > 50) {
      res.status(400).json({ error: 'Maximum 50 upload IDs allowed' });
      return;
    }

    const results = await uploadService.deleteBatchUploads(uploadIds, userId);
    res.json({ results });
  } catch (error) {
    logger.error('Delete batch uploads error:', error);
    res.status(500).json({ error: 'Failed to delete batch uploads' });
  }
});

/**
 * GET /api/v1/upload/thumbnails/:uploadId
 * Get thumbnail for an upload
 */
router.get('/thumbnails/:uploadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { uploadId } = req.params;
    const thumbnailPath = uploadService.getThumbnailPath(uploadId);

    if (!thumbnailPath) {
      res.status(404).json({ error: 'Thumbnail not found' });
      return;
    }

    res.sendFile(thumbnailPath);
  } catch (error) {
    logger.error('Get thumbnail error:', error);
    res.status(500).json({ error: 'Failed to fetch thumbnail' });
  }
});

/**
 * GET /api/v1/upload/metadata/:uploadId
 * Get extracted metadata for an upload
 */
router.get('/metadata/:uploadId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uploadId } = req.params;
    const userId = req.user?.userId || req.user?.address;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const metadata = await uploadService.getExtractedMetadata(uploadId, userId);
    
    if (!metadata) {
      res.status(404).json({ error: 'Metadata not found or not yet extracted' });
      return;
    }

    res.json({ metadata });
  } catch (error) {
    logger.error('Get metadata error:', error);
    res.status(404).json({ error: 'Upload not found' });
  }
});

/**
 * POST /api/v1/upload/verify-checksum/:uploadId
 * Verify file integrity using checksum
 */
router.post('/verify-checksum/:uploadId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uploadId } = req.params;
    const { checksum } = req.body;
    const userId = req.user?.userId || req.user?.address;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!checksum) {
      res.status(400).json({ error: 'Checksum is required' });
      return;
    }

    // Get upload record
    const status = await uploadService.getUploadStatus(uploadId, userId);
    
    // Get file path
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, uploadId);

    // Verify checksum
    const isValid = await fileValidationService.verifyChecksum(filePath, checksum);

    res.json({
      uploadId,
      isValid,
      providedChecksum: checksum,
      storedChecksum: status.fileHash || null,
    });
  } catch (error) {
    logger.error('Verify checksum error:', error);
    res.status(500).json({ error: 'Failed to verify checksum' });
  }
});

/**
 * POST /api/v1/upload/validate/:uploadId
 * Manually trigger file validation
 */
router.post('/validate/:uploadId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uploadId } = req.params;
    const userId = req.user?.userId || req.user?.address;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get upload record
    const status = await uploadService.getUploadStatus(uploadId, userId);
    
    // Get file path
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, uploadId);

    // Perform validation
    const validationResult = await fileValidationService.validateFile(
      filePath,
      status.filetype,
      {
        maxSize: 2 * 1024 * 1024 * 1024, // 2GB
        checkMagicNumbers: true,
        scanMalware: true,
        generateChecksum: true,
      }
    );

    res.json({
      uploadId,
      validation: validationResult,
    });
  } catch (error) {
    logger.error('Validate file error:', error);
    res.status(500).json({ error: 'Failed to validate file' });
  }
});

export default router;
export { uploadService };
