import express, { Request, Response } from 'express';
import { VideoPreviewService } from '../services/video-preview.service';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const videoPreviewService = new VideoPreviewService();
const prisma = new PrismaClient();

/**
 * Generate video preview
 * POST /api/v1/preview/generate
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { uploadId, duration, watermarkPosition, generateHLS } = req.body;
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

    // Check if file is a video
    if (!upload.filetype.startsWith('video/')) {
      return res.status(400).json({
        success: false,
        error: 'Upload is not a video file',
      });
    }

    // Get video file path
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const videoPath = path.join(uploadDir, uploadId);

    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({
        success: false,
        error: 'Video file not found',
      });
    }

    // Generate preview
    const result = await videoPreviewService.generatePreview(
      uploadId,
      videoPath,
      userId,
      {
        duration: duration ? parseInt(duration, 10) : 180,
        watermarkPosition: watermarkPosition || 'bottom-right',
        generateHLS: generateHLS !== false,
      }
    );

    res.json({
      success: true,
      data: {
        uploadId,
        previewUrl: videoPreviewService.getPreviewUrl(uploadId),
        hlsManifestUrl: videoPreviewService.getHLSManifestUrl(uploadId),
        duration: result.duration,
        fileSize: result.fileSize,
        resolution: result.resolution,
      },
    });
  } catch (error) {
    logger.error('Error generating video preview', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate preview',
    });
  }
});

/**
 * Stream video preview
 * GET /api/v1/preview/video/:uploadId
 */
router.get('/video/:uploadId', async (req: Request, res: Response) => {
  try {
    const { uploadId } = req.params;
    const userId = (req as any).user?.id;

    // Get preview path
    const previewPath = videoPreviewService.getPreviewPath(uploadId);

    if (!previewPath) {
      return res.status(404).json({
        success: false,
        error: 'Preview not found',
      });
    }

    // Track preview view
    if (userId) {
      await videoPreviewService.trackPreviewView(uploadId, userId, {
        device: req.headers['user-agent'],
        ipAddress: req.ip,
      });
    }

    // Get file stats
    const stat = fs.statSync(previewPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Handle range request for video streaming
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(previewPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      });

      file.pipe(res);
    } else {
      // Send entire file
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });

      fs.createReadStream(previewPath).pipe(res);
    }
  } catch (error) {
    logger.error('Error streaming video preview', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to stream preview',
    });
  }
});

/**
 * Get HLS manifest
 * GET /api/v1/preview/hls/:uploadId/playlist.m3u8
 */
router.get('/hls/:uploadId/playlist.m3u8', async (req: Request, res: Response) => {
  try {
    const { uploadId } = req.params;
    const userId = (req as any).user?.id;

    // Get HLS manifest path
    const manifestPath = videoPreviewService.getHLSManifestPath(uploadId);

    if (!manifestPath) {
      return res.status(404).json({
        success: false,
        error: 'HLS manifest not found',
      });
    }

    // Track preview view
    if (userId) {
      await videoPreviewService.trackPreviewView(uploadId, userId, {
        quality: 'hls',
        device: req.headers['user-agent'],
        ipAddress: req.ip,
      });
    }

    // Send manifest file
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache');
    fs.createReadStream(manifestPath).pipe(res);
  } catch (error) {
    logger.error('Error serving HLS manifest', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to serve HLS manifest',
    });
  }
});

/**
 * Get HLS segment
 * GET /api/v1/preview/hls/:uploadId/:quality/:segment
 */
router.get('/hls/:uploadId/:quality/:segment', async (req: Request, res: Response) => {
  try {
    const { uploadId, quality, segment } = req.params;

    // Validate quality
    if (!['360p', '480p', '720p'].includes(quality)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quality',
      });
    }

    // Get segment path
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const segmentPath = path.join(uploadDir, 'hls', uploadId, segment);

    if (!fs.existsSync(segmentPath)) {
      return res.status(404).json({
        success: false,
        error: 'Segment not found',
      });
    }

    // Send segment file
    res.setHeader('Content-Type', 'video/mp2t');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    fs.createReadStream(segmentPath).pipe(res);
  } catch (error) {
    logger.error('Error serving HLS segment', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to serve HLS segment',
    });
  }
});

/**
 * Get HLS quality playlist
 * GET /api/v1/preview/hls/:uploadId/:quality.m3u8
 */
router.get('/hls/:uploadId/:quality.m3u8', async (req: Request, res: Response) => {
  try {
    const { uploadId, quality } = req.params;

    // Validate quality
    if (!['360p', '480p', '720p'].includes(quality)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quality',
      });
    }

    // Get playlist path
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const playlistPath = path.join(uploadDir, 'hls', uploadId, `${quality}.m3u8`);

    if (!fs.existsSync(playlistPath)) {
      return res.status(404).json({
        success: false,
        error: 'Playlist not found',
      });
    }

    // Send playlist file
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache');
    fs.createReadStream(playlistPath).pipe(res);
  } catch (error) {
    logger.error('Error serving HLS playlist', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to serve HLS playlist',
    });
  }
});

/**
 * Get preview analytics
 * GET /api/v1/preview/analytics/:uploadId
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
    const analytics = await videoPreviewService.getPreviewAnalytics(uploadId);

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
 * DELETE /api/v1/preview/:uploadId
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
    await videoPreviewService.deletePreview(uploadId);

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
