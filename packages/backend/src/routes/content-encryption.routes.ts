import { Router, Request, Response } from 'express';
import { EncryptionService } from '../services/encryption.service';
import { ContentAccessControlService } from '../services/content-access-control.service';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const router = Router();
const encryptionService = new EncryptionService();
const accessControlService = new ContentAccessControlService();
const prisma = new PrismaClient();

/**
 * POST /api/v1/content-encryption/encrypt
 * Encrypt a content file
 * Requires: creator or admin role
 */
router.post('/encrypt', async (req: Request, res: Response) => {
  try {
    const { contentId, inputPath, deleteOriginal = false } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!contentId || !inputPath) {
      return res.status(400).json({
        error: 'Missing required fields: contentId, inputPath',
      });
    }

    // Verify user has permission to encrypt this content
    const hasPermission = await accessControlService.canEncryptContent(
      userId,
      contentId
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'You do not have permission to encrypt this content',
      });
    }

    // Check if content is already encrypted
    const existingEncryption = await prisma.encryptedContent.findUnique({
      where: { contentId },
    });

    if (existingEncryption) {
      return res.status(400).json({
        error: 'Content is already encrypted',
        encryptedContentId: existingEncryption.id,
      });
    }

    // Generate output path
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const encryptedDir = path.join(uploadDir, 'encrypted');
    
    if (!fs.existsSync(encryptedDir)) {
      fs.mkdirSync(encryptedDir, { recursive: true });
    }

    const outputPath = path.join(
      encryptedDir,
      `${contentId}.enc`
    );

    // Encrypt the file
    const result = await encryptionService.encryptFile(
      inputPath,
      outputPath
    );

    // Store encryption metadata in database
    const encryptedContent = await prisma.encryptedContent.create({
      data: {
        contentId,
        encryptedPath: outputPath,
        originalPath: deleteOriginal ? null : inputPath,
        keyId: result.keyId,
        iv: result.iv,
        algorithm: result.algorithm,
        originalSize: BigInt(result.originalSize),
        encryptedSize: BigInt(result.encryptedSize),
        encryptionTime: result.encryptionTime,
        isSegmented: false,
        segmentCount: 1,
      },
    });

    // Delete original file if requested
    if (deleteOriginal && fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
      logger.info('Original file deleted after encryption', {
        contentId,
        inputPath,
      });
    }

    logger.info('Content encrypted successfully', {
      contentId,
      encryptedContentId: encryptedContent.id,
      encryptionTime: result.encryptionTime,
    });

    res.json({
      success: true,
      encryptedContentId: encryptedContent.id,
      contentId,
      encryptionTime: result.encryptionTime,
      originalSize: result.originalSize,
      encryptedSize: result.encryptedSize,
      overhead: ((result.encryptedSize - result.originalSize) / result.originalSize * 100).toFixed(2) + '%',
    });
  } catch (error) {
    logger.error('Content encryption failed', { error });
    res.status(500).json({
      error: 'Failed to encrypt content',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/content-encryption/decrypt
 * Decrypt a content file (for authorized users)
 * Requires: valid purchase or access token
 */
router.post('/decrypt', async (req: Request, res: Response) => {
  try {
    const { contentId, accessToken } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!contentId) {
      return res.status(400).json({
        error: 'Missing required field: contentId',
      });
    }

    // Verify user has access to this content
    const hasAccess = await accessControlService.verifyContentAccess(
      userId,
      contentId,
      accessToken
    );

    if (!hasAccess.granted) {
      // Log access denial
      await prisma.contentAccessLog.create({
        data: {
          contentId,
          userId,
          accessType: 'download',
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'],
          accessGranted: false,
          denialReason: hasAccess.reason,
        },
      });

      return res.status(403).json({
        error: 'Access denied',
        reason: hasAccess.reason,
      });
    }

    // Get encrypted content metadata
    const encryptedContent = await prisma.encryptedContent.findUnique({
      where: { contentId },
    });

    if (!encryptedContent) {
      return res.status(404).json({
        error: 'Encrypted content not found',
      });
    }

    // Generate temporary decrypted file path
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const tempDir = path.join(uploadDir, 'temp');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempOutputPath = path.join(
      tempDir,
      `${contentId}_${Date.now()}.tmp`
    );

    // Decrypt the file
    const result = await encryptionService.decryptFile(
      encryptedContent.encryptedPath,
      tempOutputPath,
      {
        keyId: encryptedContent.keyId,
        iv: encryptedContent.iv,
        algorithm: encryptedContent.algorithm,
      }
    );

    // Log successful access
    await prisma.contentAccessLog.create({
      data: {
        contentId,
        userId,
        accessType: 'download',
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
        accessGranted: true,
        bytesServed: BigInt(result.originalSize),
      },
    });

    logger.info('Content decrypted successfully', {
      contentId,
      userId,
      decryptionTime: result.decryptionTime,
    });

    // Send the decrypted file
    res.download(tempOutputPath, (err) => {
      // Clean up temp file after download
      if (fs.existsSync(tempOutputPath)) {
        fs.unlinkSync(tempOutputPath);
      }

      if (err) {
        logger.error('Error sending decrypted file', { error: err });
      }
    });
  } catch (error) {
    logger.error('Content decryption failed', { error });
    res.status(500).json({
      error: 'Failed to decrypt content',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/content-encryption/stream/:contentId
 * Stream encrypted content with on-the-fly decryption
 * Requires: valid purchase or access token
 */
router.get('/stream/:contentId', async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { accessToken } = req.query;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user has access to this content
    const hasAccess = await accessControlService.verifyContentAccess(
      userId,
      contentId,
      accessToken as string
    );

    if (!hasAccess.granted) {
      return res.status(403).json({
        error: 'Access denied',
        reason: hasAccess.reason,
      });
    }

    // Get encrypted content metadata
    const encryptedContent = await prisma.encryptedContent.findUnique({
      where: { contentId },
    });

    if (!encryptedContent) {
      return res.status(404).json({
        error: 'Encrypted content not found',
      });
    }

    // For streaming, we'll decrypt and stream in chunks
    // This is a simplified implementation
    const tempOutputPath = path.join(
      process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
      'temp',
      `${contentId}_stream_${Date.now()}.tmp`
    );

    // Decrypt to temp file
    await encryptionService.decryptFile(
      encryptedContent.encryptedPath,
      tempOutputPath,
      {
        keyId: encryptedContent.keyId,
        iv: encryptedContent.iv,
        algorithm: encryptedContent.algorithm,
      }
    );

    // Log access
    await prisma.contentAccessLog.create({
      data: {
        contentId,
        userId,
        accessType: 'stream',
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
        accessGranted: true,
      },
    });

    // Stream the decrypted file
    const stat = fs.statSync(tempOutputPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(tempOutputPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'application/octet-stream',
      });

      file.pipe(res);

      file.on('end', () => {
        // Clean up temp file
        if (fs.existsSync(tempOutputPath)) {
          fs.unlinkSync(tempOutputPath);
        }
      });
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'application/octet-stream',
      });

      const file = fs.createReadStream(tempOutputPath);
      file.pipe(res);

      file.on('end', () => {
        // Clean up temp file
        if (fs.existsSync(tempOutputPath)) {
          fs.unlinkSync(tempOutputPath);
        }
      });
    }
  } catch (error) {
    logger.error('Content streaming failed', { error });
    res.status(500).json({
      error: 'Failed to stream content',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/content-encryption/status/:contentId
 * Get encryption status for a content
 */
router.get('/status/:contentId', async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const encryptedContent = await prisma.encryptedContent.findUnique({
      where: { contentId },
    });

    if (!encryptedContent) {
      return res.json({
        encrypted: false,
        contentId,
      });
    }

    res.json({
      encrypted: true,
      contentId,
      encryptedContentId: encryptedContent.id,
      algorithm: encryptedContent.algorithm,
      originalSize: encryptedContent.originalSize.toString(),
      encryptedSize: encryptedContent.encryptedSize.toString(),
      encryptionTime: encryptedContent.encryptionTime,
      isSegmented: encryptedContent.isSegmented,
      segmentCount: encryptedContent.segmentCount,
      createdAt: encryptedContent.createdAt,
    });
  } catch (error) {
    logger.error('Failed to get encryption status', { error });
    res.status(500).json({
      error: 'Failed to get encryption status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/content-encryption/access-logs/:contentId
 * Get access logs for a content (creator/admin only)
 */
router.get('/access-logs/:contentId', async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const userId = (req as any).user?.id;
    const { limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user has permission to view access logs
    const hasPermission = await accessControlService.canViewAccessLogs(
      userId,
      contentId
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'You do not have permission to view access logs',
      });
    }

    const logs = await prisma.contentAccessLog.findMany({
      where: { contentId },
      orderBy: { timestamp: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.contentAccessLog.count({
      where: { contentId },
    });

    res.json({
      logs: logs.map((log) => ({
        ...log,
        bytesServed: log.bytesServed?.toString(),
      })),
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    logger.error('Failed to get access logs', { error });
    res.status(500).json({
      error: 'Failed to get access logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
