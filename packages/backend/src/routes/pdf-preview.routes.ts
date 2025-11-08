import express, { Request, Response } from 'express';
import { PDFPreviewService } from '../services/pdf-preview.service';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const pdfPreviewService = new PDFPreviewService();
const prisma = new PrismaClient();

/**
 * Generate PDF preview
 * POST /api/v1/preview/pdf/generate
 */
router.post('/pdf/generate', async (req: Request, res: Response) => {
  try {
    const { uploadId, previewPercentage, watermarkOpacity } = req.body;
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

    // Check if file is a PDF
    if (upload.filetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        error: 'Upload is not a PDF file',
      });
    }

    // Get PDF file path
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const pdfPath = path.join(uploadDir, uploadId);

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({
        success: false,
        error: 'PDF file not found',
      });
    }

    // Generate preview
    const result = await pdfPreviewService.generatePreview(
      uploadId,
      pdfPath,
      userId,
      {
        previewPercentage: previewPercentage ? parseInt(previewPercentage, 10) : 10,
        watermarkOpacity: watermarkOpacity ? parseFloat(watermarkOpacity) : 0.3,
      }
    );

    res.json({
      success: true,
      data: {
        uploadId,
        previewUrl: pdfPreviewService.getPreviewUrl(uploadId),
        totalPages: result.totalPages,
        previewPages: result.previewPages,
        fileSize: result.fileSize,
      },
    });
  } catch (error) {
    logger.error('Error generating PDF preview', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate preview',
    });
  }
});

/**
 * View PDF preview (with download prevention headers)
 * GET /api/v1/preview/pdf/:uploadId
 */
router.get('/pdf/:uploadId', async (req: Request, res: Response) => {
  try {
    const { uploadId } = req.params;
    const userId = (req as any).user?.id;

    // Get preview path
    const previewPath = pdfPreviewService.getPreviewPath(uploadId);

    if (!previewPath) {
      return res.status(404).json({
        success: false,
        error: 'Preview not found',
      });
    }

    // Track preview view
    if (userId) {
      await pdfPreviewService.trackPreviewView(uploadId, userId, {
        device: req.headers['user-agent'],
        ipAddress: req.ip,
      });
    }

    // Set headers to prevent download and enable in-browser viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Additional security headers to prevent download
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "default-src 'self'");

    // Stream the file
    const fileStream = fs.createReadStream(previewPath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      logger.error('Error streaming PDF preview', { error });
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to stream preview',
        });
      }
    });
  } catch (error) {
    logger.error('Error serving PDF preview', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to serve preview',
    });
  }
});

/**
 * Get preview analytics
 * GET /api/v1/preview/pdf/analytics/:uploadId
 */
router.get('/pdf/analytics/:uploadId', async (req: Request, res: Response) => {
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
    const analytics = await pdfPreviewService.getPreviewAnalytics(uploadId);

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
 * Delete PDF preview
 * DELETE /api/v1/preview/pdf/:uploadId
 */
router.delete('/pdf/:uploadId', async (req: Request, res: Response) => {
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
    await pdfPreviewService.deletePreview(uploadId);

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
