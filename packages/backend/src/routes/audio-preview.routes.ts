import express, { Request, Response } from 'express';
import { AudioPreviewService } from '../services/audio-preview.service';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const audioPreviewService = new AudioPreviewService();
const prisma = new PrismaClient();

/**
 * Generate audio preview
 * POST /api/v1/audio-preview/generate
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { uploadId, duration, watermarkInterval, watermarkVolume } = req.body;
    const userId = (req as any).user?.id || req.body.userId;

    if (!uploadId) {
      return res.status(400).json({
        success: false,
        error: 'Upload ID is required',
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    // Get upload record
    const upload = await prisma.upload.findFirst({
      where: {
        id: uploadId,
        userId,
      },
    });

    if (!upload) {
      return res.status(404).json({
        success: false,
        error: 'Upload not found',
      });
    }

    // Check if file is audio
    if (!upload.filetype.startsWith('audio/')) {
      return res.status(400).json({
        success: false,
        error: 'Upload is not an audio file',
      });
    }

    // Get audio file path
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const audioPath = path.join(uploadDir, uploadId);

    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({
        success: false,
        error: 'Audio file not found',
      });
    }

    // Generate preview
    const result = await audioPreviewService.generatePreview(
      uploadId,
      audioPath,
      userId,
      {
        duration: duration ? parseInt(duration, 10) : 30,
        watermarkInterval: watermarkInterval ? parseInt(watermarkInterval, 10) : 10,
        watermarkVolume: watermarkVolume ? parseFloat(watermarkVolume) : 0.3,
      }
    );

    res.json({
      success: true,
      data: {
        uploadId,
        previewUrl: audioPreviewService.getPreviewUrl(uploadId),
        duration: result.duration,
        fileSize: result.fileSize,
        bitrate: result.bitrate,
        sampleRate: result.sampleRate,
        channels: result.channels,
      },
    });
  } catch (error) {
    logger.error('Error generating audio preview', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate preview',
    });
  }
});

/**
 * Stream audio preview
 * GET /api/v1/audio-preview/:uploadId
 */
router.get('/:uploadId', async (req: Request, res: Response) => {
  try {
    const { uploadId } = req.params;
    const userId = (req as any).user?.id;

    // Get preview path
    const previewPath = audioPreviewService.getPreviewPath(uploadId);

    if (!previewPath) {
      return res.status(404).json({
        success: false,
        error: 'Preview not found',
      });
    }

    // Track preview play
    if (userId) {
      await audioPreviewService.trackPreviewPlay(uploadId, userId, {
        device: req.headers['user-agent'],
        ipAddress: req.ip,
      });
    }

    // Get file stats
    const stat = fs.statSync(previewPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Handle range request for audio streaming
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(previewPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
      });

      file.pipe(res);
    } else {
      // Send entire file
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
      });

      fs.createReadStream(previewPath).pipe(res);
    }
  } catch (error) {
    logger.error('Error streaming audio preview', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to stream preview',
    });
  }
});

/**
 * Get preview analytics
 * GET /api/v1/audio-preview/analytics/:uploadId
 */
router.get('/analytics/:uploadId', async (req: Request, res: Response) => {
  try {
    const { uploadId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    // Verify user owns the upload
    const upload = await prisma.upload.findFirst({
      where: {
        id: uploadId,
        userId,
      },
    });

    if (!upload) {
      return res.status(404).json({
        success: false,
        error: 'Upload not found',
      });
    }

    // Get analytics
    const analytics = await audioPreviewService.getPreviewAnalytics(uploadId);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error getting preview analytics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics',
    });
  }
});

/**
 * Delete preview
 * DELETE /api/v1/audio-preview/:uploadId
 */
router.delete('/:uploadId', async (req: Request, res: Response) => {
  try {
    const { uploadId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    // Verify user owns the upload
    const upload = await prisma.upload.findFirst({
      where: {
        id: uploadId,
        userId,
      },
    });

    if (!upload) {
      return res.status(404).json({
        success: false,
        error: 'Upload not found',
      });
    }

    // Delete preview
    await audioPreviewService.deletePreview(uploadId);

    res.json({
      success: true,
      message: 'Preview deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting preview', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to delete preview',
    });
  }
});

export default router;
