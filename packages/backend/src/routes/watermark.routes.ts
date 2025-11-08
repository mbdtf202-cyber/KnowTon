import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { WatermarkService } from '../services/watermark.service';
import { logger } from '../utils/logger';

const router = express.Router();
const watermarkService = new WatermarkService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const tempDir = path.join(uploadDir, 'temp');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB
  },
});

/**
 * POST /api/v1/watermark/apply
 * Apply watermark to content
 */
router.post('/apply', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const {
      contentId,
      type = 'visible',
      text,
      userId,
      position = 'bottom-right',
      opacity = 0.5,
      fontSize = 24,
      color = '#FFFFFF',
    } = req.body;

    if (!contentId) {
      return res.status(400).json({
        success: false,
        error: 'Content ID is required',
      });
    }

    logger.info('Applying watermark via API', {
      contentId,
      type,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });

    const result = await watermarkService.applyWatermark(
      contentId,
      req.file.path,
      req.file.mimetype,
      {
        type: type as 'visible' | 'invisible',
        text,
        userId,
        position: position as any,
        opacity: parseFloat(opacity),
        fontSize: parseInt(fontSize, 10),
        color,
      }
    );

    // Clean up original uploaded file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      data: {
        watermarkedPath: result.watermarkedPath,
        watermarkType: result.watermarkType,
        fileSize: result.fileSize,
        processingTime: result.processingTime,
        downloadUrl: `/api/v1/watermark/download/${contentId}`,
      },
    });
  } catch (error) {
    logger.error('Error applying watermark', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      error: 'Failed to apply watermark',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/watermark/extract
 * Extract watermark from content
 */
router.post('/extract', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    logger.info('Extracting watermark via API', {
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });

    const result = await watermarkService.extractWatermark(
      req.file.path,
      req.file.mimetype
    );

    // Clean up uploaded file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error extracting watermark', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      error: 'Failed to extract watermark',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/watermark/test-persistence
 * Test watermark persistence through compression
 */
router.post('/test-persistence', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    logger.info('Testing watermark persistence via API', {
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });

    const result = await watermarkService.testWatermarkPersistence(
      req.file.path,
      req.file.mimetype
    );

    // Clean up uploaded file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error testing watermark persistence', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      error: 'Failed to test watermark persistence',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/watermark/download/:contentId
 * Download watermarked content
 */
router.get('/download/:contentId', async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { type = 'visible' } = req.query;

    logger.info('Downloading watermarked content', {
      contentId,
      type,
    });

    // Find watermarked file
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const watermarkedDir = path.join(uploadDir, 'watermarked');

    // Search for file with contentId prefix
    const files = fs.readdirSync(watermarkedDir);
    const watermarkedFile = files.find(
      (file) => file.startsWith(`${contentId}-${type}`)
    );

    if (!watermarkedFile) {
      return res.status(404).json({
        success: false,
        error: 'Watermarked content not found',
      });
    }

    const filePath = path.join(watermarkedDir, watermarkedFile);

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${watermarkedFile}"`);

    // Stream file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    logger.error('Error downloading watermarked content', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      error: 'Failed to download watermarked content',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/watermark/batch
 * Apply watermark to multiple files
 */
router.post('/batch', upload.array('files', 50), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
      });
    }

    const {
      type = 'visible',
      text,
      userId,
      position = 'bottom-right',
      opacity = 0.5,
      fontSize = 24,
      color = '#FFFFFF',
    } = req.body;

    logger.info('Applying watermark to batch', {
      fileCount: files.length,
      type,
    });

    const results = await Promise.all(
      files.map(async (file, index) => {
        try {
          const contentId = `batch-${Date.now()}-${index}`;

          const result = await watermarkService.applyWatermark(
            contentId,
            file.path,
            file.mimetype,
            {
              type: type as 'visible' | 'invisible',
              text,
              userId,
              position: position as any,
              opacity: parseFloat(opacity),
              fontSize: parseInt(fontSize, 10),
              color,
            }
          );

          // Clean up original file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }

          return {
            success: true,
            contentId,
            originalName: file.originalname,
            watermarkedPath: result.watermarkedPath,
            fileSize: result.fileSize,
            processingTime: result.processingTime,
          };
        } catch (error) {
          logger.error('Error processing file in batch', {
            filename: file.originalname,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          return {
            success: false,
            originalName: file.originalname,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      data: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
        results,
      },
    });
  } catch (error) {
    logger.error('Error applying watermark to batch', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      error: 'Failed to apply watermark to batch',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
