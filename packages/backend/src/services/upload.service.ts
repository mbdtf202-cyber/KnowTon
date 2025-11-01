import { Server, EVENTS } from '@tus/server';
import { FileStore } from '@tus/file-store';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { MetadataExtractionService } from './metadata-extraction.service';
import { FileValidationService } from './file-validation.service';
import { PlagiarismDetectionService } from './plagiarism-detection.service';

const prisma = new PrismaClient();
const metadataService = new MetadataExtractionService();
const fileValidationService = new FileValidationService();
const plagiarismService = new PlagiarismDetectionService();

export interface UploadMetadata {
  filename: string;
  filetype: string;
  userId: string;
  contentId?: string;
  title?: string;
  description?: string;
  category?: string;
}

export class UploadService {
  private tusServer: Server;
  private uploadDir: string;

  constructor() {
    // Create uploads directory if it doesn't exist
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    // Initialize tus server with FileStore
    this.tusServer = new Server({
      path: '/api/v1/upload/files',
      datastore: new FileStore({
        directory: this.uploadDir,
      }),
      namingFunction: (_req, _metadata) => {
        // Generate unique filename
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString('hex');
        return `${timestamp}-${random}`;
      },
      onUploadCreate: async (req, res, upload) => {
        await this.handleUploadCreate(req, res, upload);
        return res;
      },
      onUploadFinish: async (req, res, upload) => {
        await this.handleUploadFinish(req, res, upload);
        return res;
      },
    });

    // Setup event listeners
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.tusServer.on(EVENTS.POST_CREATE, (_req, _res, upload) => {
      logger.info('Upload created', {
        uploadId: upload.id,
        size: upload.size,
        metadata: upload.metadata,
      });
    });

    this.tusServer.on(EVENTS.POST_RECEIVE, (_req, _res, upload) => {
      const progress = upload.size ? (upload.offset / upload.size) * 100 : 0;
      logger.info('Upload progress', {
        uploadId: upload.id,
        progress: progress.toFixed(2) + '%',
        offset: upload.offset,
        size: upload.size,
      });
    });

    this.tusServer.on(EVENTS.POST_FINISH, (_req, _res, upload) => {
      logger.info('Upload completed', {
        uploadId: upload.id,
        size: upload.size,
      });
    });

    this.tusServer.on(EVENTS.POST_TERMINATE, (_req, _res, id) => {
      logger.info('Upload terminated', { uploadId: id });
    });
  }

  private async handleUploadCreate(_req: any, _res: any, upload: any) {
    try {
      const metadata = this.parseMetadata(upload.metadata);
      
      // Validate file size (2GB max)
      const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
      if (upload.size > MAX_SIZE) {
        throw new Error('File size exceeds maximum limit of 2GB');
      }

      // Validate file type
      this.validateFileType(metadata.filetype);

      // Create upload record in database
      await prisma.upload.create({
        data: {
          id: upload.id,
          userId: metadata.userId,
          filename: metadata.filename,
          filetype: metadata.filetype,
          filesize: upload.size,
          status: 'uploading',
          uploadOffset: 0,
          metadata: metadata as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info('Upload record created', {
        uploadId: upload.id,
        userId: metadata.userId,
        filename: metadata.filename,
      });
    } catch (error) {
      logger.error('Error creating upload', { error });
      throw error;
    }
  }

  private async handleUploadFinish(_req: any, _res: any, upload: any) {
    try {
      // Get file path
      const filePath = path.join(this.uploadDir, upload.id);

      // Get upload metadata
      const uploadRecord = await prisma.upload.findUnique({
        where: { id: upload.id },
      });

      if (!uploadRecord) {
        throw new Error('Upload record not found');
      }

      // Update upload record status to validating
      await prisma.upload.update({
        where: { id: upload.id },
        data: {
          status: 'validating',
          uploadOffset: upload.size,
          updatedAt: new Date(),
        },
      });

      // Perform comprehensive file validation
      const validationResult = await fileValidationService.validateFile(
        filePath,
        uploadRecord.filetype,
        {
          maxSize: 2 * 1024 * 1024 * 1024, // 2GB
          checkMagicNumbers: true,
          scanMalware: true,
          generateChecksum: true,
        }
      );

      // If validation fails, mark upload as failed and delete file
      if (!validationResult.isValid) {
        logger.error('File validation failed', {
          uploadId: upload.id,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        });

        // Delete the file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        // Update status to failed
        await prisma.upload.update({
          where: { id: upload.id },
          data: {
            status: 'failed',
            error: `Validation failed: ${validationResult.errors.join(', ')}`,
            updatedAt: new Date(),
          },
        });

        return;
      }

      // Update with validation results
      await prisma.upload.update({
        where: { id: upload.id },
        data: {
          status: 'completed',
          fileHash: validationResult.checksum,
          metadata: {
            ...(uploadRecord.metadata as any),
            validation: {
              fileType: validationResult.fileType,
              checksum: validationResult.checksum,
              malwareScan: validationResult.malwareScanResult,
              warnings: validationResult.warnings,
              validatedAt: new Date().toISOString(),
            },
          },
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info('Upload finalized and validated', {
        uploadId: upload.id,
        fileHash: validationResult.checksum,
        fileType: validationResult.fileType,
        malwareScan: validationResult.malwareScanResult,
        warnings: validationResult.warnings,
      });

      // Trigger post-processing (metadata extraction, thumbnail generation, etc.)
      this.triggerPostProcessing(upload.id, filePath);
    } catch (error) {
      logger.error('Error finalizing upload', { error });
      
      // Update status to failed
      await prisma.upload.update({
        where: { id: upload.id },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date(),
        },
      });
    }
  }

  private parseMetadata(metadata: string): UploadMetadata {
    const parsed: any = {};
    
    if (metadata) {
      const pairs = metadata.split(',');
      pairs.forEach((pair) => {
        const [key, value] = pair.split(' ');
        if (key && value) {
          // Decode base64 value
          parsed[key] = Buffer.from(value, 'base64').toString('utf-8');
        }
      });
    }

    return {
      filename: parsed.filename || 'unknown',
      filetype: parsed.filetype || 'application/octet-stream',
      userId: parsed.userId,
      contentId: parsed.contentId,
      title: parsed.title,
      description: parsed.description,
      category: parsed.category,
    };
  }

  private validateFileType(filetype: string) {
    const ALLOWED_TYPES = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'application/epub+zip',
      'application/zip',
      'image/jpeg',
      'image/png',
      'image/gif',
    ];

    if (!ALLOWED_TYPES.includes(filetype)) {
      throw new Error(`File type ${filetype} is not allowed`);
    }
  }

  private async generateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private async triggerPostProcessing(uploadId: string, filePath: string) {
    try {
      logger.info('Post-processing triggered', { uploadId, filePath });

      // Get upload record to get filetype
      const upload = await prisma.upload.findUnique({
        where: { id: uploadId },
      });

      if (!upload) {
        throw new Error('Upload not found');
      }

      // Update status to processing
      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          status: 'processing',
          updatedAt: new Date(),
        },
      });

      // Extract metadata
      const extractedMetadata = await metadataService.extractMetadata(
        uploadId,
        filePath,
        upload.filetype
      );

      // Update upload record with extracted metadata
      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          metadata: {
            ...(upload.metadata as any),
            extracted: extractedMetadata,
          },
          updatedAt: new Date(),
        },
      });

      logger.info('Metadata extraction completed', {
        uploadId,
        extractedMetadata,
      });

      // Perform plagiarism detection
      const contentType = this.mapFileTypeToContentType(upload.filetype);
      if (contentType) {
        try {
          logger.info('Starting plagiarism detection', { uploadId, contentType });

          // For now, use file path as content URL
          // In production, this would be an S3/IPFS URL
          const contentUrl = `file://${filePath}`;

          const plagiarismResult = await plagiarismService.detectOnUpload(
            uploadId,
            contentUrl,
            contentType
          );

          logger.info('Plagiarism detection completed', {
            uploadId,
            isPlagiarism: plagiarismResult.isPlagiarism,
            action: plagiarismResult.action,
            maxSimilarity: plagiarismResult.maxSimilarity,
          });

          // If rejected, the upload status is already updated by plagiarism service
          if (plagiarismResult.action !== 'rejected') {
            // Update to completed if not rejected
            await prisma.upload.update({
              where: { id: uploadId },
              data: {
                status: 'completed',
                updatedAt: new Date(),
              },
            });
          }
        } catch (plagiarismError) {
          logger.error('Plagiarism detection failed, but continuing', {
            uploadId,
            error: plagiarismError,
          });

          // Don't fail the upload if plagiarism detection fails
          // Just mark as completed
          await prisma.upload.update({
            where: { id: uploadId },
            data: {
              status: 'completed',
              updatedAt: new Date(),
            },
          });
        }
      } else {
        // No plagiarism detection for this file type
        await prisma.upload.update({
          where: { id: uploadId },
          data: {
            status: 'completed',
            updatedAt: new Date(),
          },
        });
      }

      logger.info('Post-processing completed', { uploadId });

      // TODO: Future tasks
      // - Upload to IPFS/S3
    } catch (error) {
      logger.error('Post-processing failed', { uploadId, error });

      // Update status to failed
      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Post-processing failed',
          updatedAt: new Date(),
        },
      });
    }
  }

  public getServer(): Server {
    return this.tusServer;
  }

  public async getUploadStatus(uploadId: string, userId: string) {
    const upload = await prisma.upload.findFirst({
      where: {
        id: uploadId,
        userId,
      },
    });

    if (!upload) {
      throw new Error('Upload not found');
    }

    return {
      id: upload.id,
      filename: upload.filename,
      filetype: upload.filetype,
      filesize: upload.filesize,
      uploadOffset: upload.uploadOffset,
      status: upload.status,
      progress: upload.filesize > 0 ? Number((BigInt(upload.uploadOffset) * BigInt(100)) / BigInt(upload.filesize)) : 0,
      createdAt: upload.createdAt,
      completedAt: upload.completedAt,
      error: upload.error,
    };
  }

  public async getUserUploads(userId: string, limit: number = 50) {
    const uploads = await prisma.upload.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return uploads.map((upload) => ({
      id: upload.id,
      filename: upload.filename,
      filetype: upload.filetype,
      filesize: upload.filesize,
      status: upload.status,
      progress: upload.filesize > 0 ? Number((BigInt(upload.uploadOffset) * BigInt(100)) / BigInt(upload.filesize)) : 0,
      createdAt: upload.createdAt,
      completedAt: upload.completedAt,
    }));
  }

  public async deleteUpload(uploadId: string, userId: string) {
    const upload = await prisma.upload.findFirst({
      where: {
        id: uploadId,
        userId,
      },
    });

    if (!upload) {
      throw new Error('Upload not found');
    }

    // Delete file from disk
    const filePath = path.join(this.uploadDir, uploadId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete database record
    await prisma.upload.delete({
      where: { id: uploadId },
    });

    logger.info('Upload deleted', { uploadId, userId });
  }

  public async getBatchUploadStatus(uploadIds: string[], userId: string) {
    const uploads = await prisma.upload.findMany({
      where: {
        id: { in: uploadIds },
        userId,
      },
    });

    return uploads.map((upload) => ({
      id: upload.id,
      filename: upload.filename,
      filetype: upload.filetype,
      filesize: upload.filesize,
      uploadOffset: upload.uploadOffset,
      status: upload.status,
      progress: upload.filesize > 0 ? Number((BigInt(upload.uploadOffset) * BigInt(100)) / BigInt(upload.filesize)) : 0,
      createdAt: upload.createdAt,
      completedAt: upload.completedAt,
      error: upload.error,
    }));
  }

  public async deleteBatchUploads(uploadIds: string[], userId: string) {
    const results: Array<{ uploadId: string; success: boolean; error?: string }> = [];

    for (const uploadId of uploadIds) {
      try {
        await this.deleteUpload(uploadId, userId);
        results.push({ uploadId, success: true });
      } catch (error) {
        results.push({
          uploadId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  public getThumbnailPath(uploadId: string): string | null {
    return metadataService.getThumbnailPath(uploadId);
  }

  public async getExtractedMetadata(uploadId: string, userId: string) {
    const upload = await prisma.upload.findFirst({
      where: {
        id: uploadId,
        userId,
      },
    });

    if (!upload) {
      throw new Error('Upload not found');
    }

    const metadata = upload.metadata as any;
    return metadata?.extracted || null;
  }

  private mapFileTypeToContentType(filetype: string): 'image' | 'audio' | 'video' | 'text' | null {
    if (filetype.startsWith('image/')) {
      return 'image';
    } else if (filetype.startsWith('audio/')) {
      return 'audio';
    } else if (filetype.startsWith('video/')) {
      return 'video';
    } else if (
      filetype === 'application/pdf' ||
      filetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      filetype === 'text/plain'
    ) {
      return 'text';
    }
    return null;
  }
}
