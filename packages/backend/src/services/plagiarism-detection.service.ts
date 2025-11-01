import { PrismaClient } from '@prisma/client';
import { SimilarityService, SimilarContentItem } from './similarity.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const similarityService = new SimilarityService();

export interface PlagiarismDetectionResult {
  id: string;
  uploadId: string;
  isPlagiarism: boolean;
  maxSimilarity: number;
  threshold: number;
  totalMatches: number;
  similarContent: SimilarContentItem[];
  action: 'warning' | 'rejected' | 'approved';
  message: string;
}

export interface AppealSubmission {
  detectionId: string;
  userId: string;
  reason: string;
  evidence?: {
    urls?: string[];
    documents?: string[];
    description?: string;
  };
}

export class PlagiarismDetectionService {
  /**
   * Detect plagiarism for uploaded content
   * This is called automatically during the upload process
   */
  async detectOnUpload(
    uploadId: string,
    contentUrl: string,
    contentType: 'image' | 'audio' | 'video' | 'text'
  ): Promise<PlagiarismDetectionResult> {
    try {
      logger.info('Starting plagiarism detection', { uploadId, contentType });

      // Perform plagiarism detection using similarity service
      const detectionResult = await similarityService.detectPlagiarism(
        contentUrl,
        contentType
      );

      // Determine action based on similarity score
      let action: 'warning' | 'rejected' | 'approved';
      let message: string;

      if (detectionResult.analysis.max_similarity >= 0.95) {
        // High similarity (>= 95%) - Reject upload
        action = 'rejected';
        message = 'Upload rejected: Content is too similar to existing content (>95% similarity). This may indicate plagiarism or copyright infringement.';
      } else if (detectionResult.analysis.max_similarity >= 0.85) {
        // Medium similarity (85-95%) - Show warning
        action = 'warning';
        message = 'Warning: Content shows significant similarity to existing content (85-95%). Please review and ensure you have proper rights to this content.';
      } else {
        // Low similarity (< 85%) - Approve
        action = 'approved';
        message = 'Content approved: No significant similarity detected.';
      }

      // Create plagiarism detection record
      const detection = await prisma.plagiarismDetection.create({
        data: {
          uploadId,
          contentUrl,
          contentType,
          isPlagiarism: detectionResult.is_plagiarism,
          maxSimilarity: detectionResult.analysis.max_similarity,
          threshold: detectionResult.analysis.threshold_used,
          totalMatches: detectionResult.analysis.total_matches,
          similarContent: detectionResult.similar_content as any,
          status: 'detected',
          action,
          detectedAt: new Date(),
        },
      });

      logger.info('Plagiarism detection completed', {
        uploadId,
        detectionId: detection.id,
        isPlagiarism: detection.isPlagiarism,
        maxSimilarity: detection.maxSimilarity,
        action,
      });

      // Update upload status based on action
      if (action === 'rejected') {
        await prisma.upload.update({
          where: { id: uploadId },
          data: {
            status: 'rejected',
            error: message,
            updatedAt: new Date(),
          },
        });
      }

      return {
        id: detection.id,
        uploadId: detection.uploadId,
        isPlagiarism: detection.isPlagiarism,
        maxSimilarity: detection.maxSimilarity,
        threshold: detection.threshold,
        totalMatches: detection.totalMatches,
        similarContent: detectionResult.similar_content,
        action,
        message,
      };
    } catch (error) {
      logger.error('Plagiarism detection failed', { uploadId, error });
      throw error;
    }
  }

  /**
   * Get plagiarism detection results for an upload
   */
  async getDetectionResults(uploadId: string, userId: string): Promise<PlagiarismDetectionResult | null> {
    try {
      // Verify user owns the upload
      const upload = await prisma.upload.findFirst({
        where: {
          id: uploadId,
          userId,
        },
      });

      if (!upload) {
        throw new Error('Upload not found or access denied');
      }

      // Get detection record
      const detection = await prisma.plagiarismDetection.findFirst({
        where: { uploadId },
        orderBy: { detectedAt: 'desc' },
      });

      if (!detection) {
        return null;
      }

      return {
        id: detection.id,
        uploadId: detection.uploadId,
        isPlagiarism: detection.isPlagiarism,
        maxSimilarity: detection.maxSimilarity,
        threshold: detection.threshold,
        totalMatches: detection.totalMatches,
        similarContent: (detection.similarContent as unknown) as SimilarContentItem[],
        action: detection.action as 'warning' | 'rejected' | 'approved',
        message: this.getMessageForAction(detection.action as string, detection.maxSimilarity),
      };
    } catch (error) {
      logger.error('Failed to get detection results', { uploadId, error });
      throw error;
    }
  }

  /**
   * Submit an appeal for a plagiarism detection
   */
  async submitAppeal(appealData: AppealSubmission): Promise<{
    id: string;
    status: string;
    message: string;
  }> {
    try {
      logger.info('Submitting plagiarism appeal', {
        detectionId: appealData.detectionId,
        userId: appealData.userId,
      });

      // Verify detection exists and user owns it
      const detection = await prisma.plagiarismDetection.findUnique({
        where: { id: appealData.detectionId },
        include: {
          upload: true,
        },
      });

      if (!detection) {
        throw new Error('Detection record not found');
      }

      if (detection.upload.userId !== appealData.userId) {
        throw new Error('Access denied: You do not own this upload');
      }

      // Check if already appealed
      const existingAppeal = await prisma.plagiarismAppeal.findFirst({
        where: {
          detectionId: appealData.detectionId,
          userId: appealData.userId,
          status: { in: ['pending', 'approved'] },
        },
      });

      if (existingAppeal) {
        throw new Error('An appeal is already pending or has been approved for this detection');
      }

      // Create appeal
      const appeal = await prisma.plagiarismAppeal.create({
        data: {
          detectionId: appealData.detectionId,
          userId: appealData.userId,
          reason: appealData.reason,
          evidence: appealData.evidence as any,
          status: 'pending',
          submittedAt: new Date(),
        },
      });

      // Update detection status
      await prisma.plagiarismDetection.update({
        where: { id: appealData.detectionId },
        data: {
          status: 'appealed',
        },
      });

      logger.info('Appeal submitted successfully', {
        appealId: appeal.id,
        detectionId: appealData.detectionId,
      });

      return {
        id: appeal.id,
        status: appeal.status,
        message: 'Appeal submitted successfully. Our team will review it within 48 hours.',
      };
    } catch (error) {
      logger.error('Failed to submit appeal', { error });
      throw error;
    }
  }

  /**
   * Get appeal status
   */
  async getAppealStatus(appealId: string, userId: string): Promise<{
    id: string;
    detectionId: string;
    status: string;
    reason: string;
    evidence?: any;
    submittedAt: Date;
    reviewedAt?: Date | null;
    reviewNote?: string | null;
  }> {
    try {
      const appeal = await prisma.plagiarismAppeal.findFirst({
        where: {
          id: appealId,
          userId,
        },
      });

      if (!appeal) {
        throw new Error('Appeal not found or access denied');
      }

      return {
        id: appeal.id,
        detectionId: appeal.detectionId,
        status: appeal.status,
        reason: appeal.reason,
        evidence: appeal.evidence,
        submittedAt: appeal.submittedAt,
        reviewedAt: appeal.reviewedAt,
        reviewNote: appeal.reviewNote,
      };
    } catch (error) {
      logger.error('Failed to get appeal status', { appealId, error });
      throw error;
    }
  }

  /**
   * Get all appeals for a user
   */
  async getUserAppeals(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const appeals = await prisma.plagiarismAppeal.findMany({
        where: { userId },
        include: {
          detection: {
            include: {
              upload: true,
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
        take: limit,
      });

      return appeals.map((appeal) => ({
        id: appeal.id,
        detectionId: appeal.detectionId,
        uploadId: appeal.detection.uploadId,
        filename: appeal.detection.upload.filename,
        status: appeal.status,
        reason: appeal.reason,
        submittedAt: appeal.submittedAt,
        reviewedAt: appeal.reviewedAt,
        reviewNote: appeal.reviewNote,
      }));
    } catch (error) {
      logger.error('Failed to get user appeals', { userId, error });
      throw error;
    }
  }

  /**
   * Review an appeal (admin only)
   */
  async reviewAppeal(
    appealId: string,
    adminUserId: string,
    decision: 'approved' | 'rejected',
    reviewNote: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      logger.info('Reviewing appeal', { appealId, decision, adminUserId });

      // Get appeal with detection
      const appeal = await prisma.plagiarismAppeal.findUnique({
        where: { id: appealId },
        include: {
          detection: {
            include: {
              upload: true,
            },
          },
        },
      });

      if (!appeal) {
        throw new Error('Appeal not found');
      }

      if (appeal.status !== 'pending') {
        throw new Error('Appeal has already been reviewed');
      }

      // Update appeal
      await prisma.plagiarismAppeal.update({
        where: { id: appealId },
        data: {
          status: decision,
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
          reviewNote,
        },
      });

      // Update detection status
      await prisma.plagiarismDetection.update({
        where: { id: appeal.detectionId },
        data: {
          status: decision === 'approved' ? 'resolved' : 'dismissed',
          resolvedAt: new Date(),
          resolvedBy: adminUserId,
          resolutionNote: reviewNote,
        },
      });

      // If approved, update upload status to allow it
      if (decision === 'approved') {
        await prisma.upload.update({
          where: { id: appeal.detection.uploadId },
          data: {
            status: 'completed',
            error: null,
            updatedAt: new Date(),
          },
        });
      }

      logger.info('Appeal reviewed successfully', {
        appealId,
        decision,
        detectionId: appeal.detectionId,
      });

      return {
        success: true,
        message: `Appeal ${decision}. User has been notified.`,
      };
    } catch (error) {
      logger.error('Failed to review appeal', { appealId, error });
      throw error;
    }
  }

  /**
   * Get all detection logs (for audit purposes)
   */
  async getDetectionLogs(
    filters: {
      uploadId?: string;
      userId?: string;
      isPlagiarism?: boolean;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100,
    offset: number = 0
  ): Promise<{
    total: number;
    logs: any[];
  }> {
    try {
      const where: any = {};

      if (filters.uploadId) {
        where.uploadId = filters.uploadId;
      }

      if (filters.isPlagiarism !== undefined) {
        where.isPlagiarism = filters.isPlagiarism;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.startDate || filters.endDate) {
        where.detectedAt = {};
        if (filters.startDate) {
          where.detectedAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.detectedAt.lte = filters.endDate;
        }
      }

      // If userId filter is provided, join with upload
      if (filters.userId) {
        where.upload = {
          userId: filters.userId,
        };
      }

      const [total, logs] = await Promise.all([
        prisma.plagiarismDetection.count({ where }),
        prisma.plagiarismDetection.findMany({
          where,
          include: {
            upload: {
              select: {
                userId: true,
                filename: true,
                filetype: true,
              },
            },
            appeals: {
              select: {
                id: true,
                status: true,
                submittedAt: true,
              },
            },
          },
          orderBy: { detectedAt: 'desc' },
          take: limit,
          skip: offset,
        }),
      ]);

      return {
        total,
        logs: logs.map((log) => ({
          id: log.id,
          uploadId: log.uploadId,
          userId: log.upload.userId,
          filename: log.upload.filename,
          filetype: log.upload.filetype,
          contentType: log.contentType,
          isPlagiarism: log.isPlagiarism,
          maxSimilarity: log.maxSimilarity,
          threshold: log.threshold,
          totalMatches: log.totalMatches,
          status: log.status,
          action: log.action,
          detectedAt: log.detectedAt,
          resolvedAt: log.resolvedAt,
          appeals: log.appeals,
        })),
      };
    } catch (error) {
      logger.error('Failed to get detection logs', { error });
      throw error;
    }
  }

  private getMessageForAction(action: string, similarity: number): string {
    switch (action) {
      case 'rejected':
        return `Upload rejected: Content is too similar to existing content (${(similarity * 100).toFixed(1)}% similarity). This may indicate plagiarism or copyright infringement.`;
      case 'warning':
        return `Warning: Content shows significant similarity to existing content (${(similarity * 100).toFixed(1)}%). Please review and ensure you have proper rights to this content.`;
      case 'approved':
        return 'Content approved: No significant similarity detected.';
      default:
        return 'Unknown action';
    }
  }
}
