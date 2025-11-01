import { PlagiarismDetectionService } from '../../services/plagiarism-detection.service';
import { SimilarityService } from '../../services/similarity.service';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('../../services/similarity.service');
jest.mock('@prisma/client');

describe('PlagiarismDetectionService', () => {
  let service: PlagiarismDetectionService;
  let mockSimilarityService: jest.Mocked<SimilarityService>;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create service instance
    service = new PlagiarismDetectionService();

    // Get mocked instances
    mockSimilarityService = SimilarityService.prototype as jest.Mocked<SimilarityService>;
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
  });

  describe('detectOnUpload', () => {
    it('should reject upload when similarity >= 95%', async () => {
      // Mock high similarity detection
      mockSimilarityService.detectPlagiarism = jest.fn().mockResolvedValue({
        is_plagiarism: true,
        confidence: 0.97,
        similar_content: [
          {
            content_id: 'test-content-1',
            similarity_score: 0.97,
          },
        ],
        analysis: {
          max_similarity: 0.97,
          threshold_used: 0.95,
          total_matches: 1,
        },
      });

      const mockCreate = jest.fn().mockResolvedValue({
        id: 'detection-1',
        uploadId: 'upload-1',
        isPlagiarism: true,
        maxSimilarity: 0.97,
        action: 'rejected',
      });

      (mockPrisma.plagiarismDetection as any) = {
        create: mockCreate,
      };

      (mockPrisma.upload as any) = {
        update: jest.fn().mockResolvedValue({}),
      };

      const result = await service.detectOnUpload(
        'upload-1',
        'http://example.com/content.jpg',
        'image'
      );

      expect(result.action).toBe('rejected');
      expect(result.isPlagiarism).toBe(true);
      expect(result.maxSimilarity).toBe(0.97);
    });

    it('should show warning when similarity is 85-95%', async () => {
      // Mock medium similarity detection
      mockSimilarityService.detectPlagiarism = jest.fn().mockResolvedValue({
        is_plagiarism: false,
        confidence: 0.88,
        similar_content: [
          {
            content_id: 'test-content-1',
            similarity_score: 0.88,
          },
        ],
        analysis: {
          max_similarity: 0.88,
          threshold_used: 0.95,
          total_matches: 1,
        },
      });

      const mockCreate = jest.fn().mockResolvedValue({
        id: 'detection-1',
        uploadId: 'upload-1',
        isPlagiarism: false,
        maxSimilarity: 0.88,
        action: 'warning',
      });

      (mockPrisma.plagiarismDetection as any) = {
        create: mockCreate,
      };

      const result = await service.detectOnUpload(
        'upload-1',
        'http://example.com/content.jpg',
        'image'
      );

      expect(result.action).toBe('warning');
      expect(result.isPlagiarism).toBe(false);
      expect(result.maxSimilarity).toBe(0.88);
    });

    it('should approve when similarity < 85%', async () => {
      // Mock low similarity detection
      mockSimilarityService.detectPlagiarism = jest.fn().mockResolvedValue({
        is_plagiarism: false,
        confidence: 0.45,
        similar_content: [],
        analysis: {
          max_similarity: 0.45,
          threshold_used: 0.95,
          total_matches: 0,
        },
      });

      const mockCreate = jest.fn().mockResolvedValue({
        id: 'detection-1',
        uploadId: 'upload-1',
        isPlagiarism: false,
        maxSimilarity: 0.45,
        action: 'approved',
      });

      (mockPrisma.plagiarismDetection as any) = {
        create: mockCreate,
      };

      const result = await service.detectOnUpload(
        'upload-1',
        'http://example.com/content.jpg',
        'image'
      );

      expect(result.action).toBe('approved');
      expect(result.isPlagiarism).toBe(false);
      expect(result.maxSimilarity).toBe(0.45);
    });
  });

  describe('submitAppeal', () => {
    it('should create appeal successfully', async () => {
      const mockDetection = {
        id: 'detection-1',
        uploadId: 'upload-1',
        upload: {
          userId: 'user-1',
        },
      };

      (mockPrisma.plagiarismDetection as any) = {
        findUnique: jest.fn().mockResolvedValue(mockDetection),
        update: jest.fn().mockResolvedValue({}),
      };

      (mockPrisma.plagiarismAppeal as any) = {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'appeal-1',
          status: 'pending',
        }),
      };

      const result = await service.submitAppeal({
        detectionId: 'detection-1',
        userId: 'user-1',
        reason: 'This is my original work. I created it from scratch and have proof of the creation process.',
      });

      expect(result.status).toBe('pending');
      expect(result.id).toBe('appeal-1');
    });

    it('should reject appeal if user does not own upload', async () => {
      const mockDetection = {
        id: 'detection-1',
        uploadId: 'upload-1',
        upload: {
          userId: 'user-2', // Different user
        },
      };

      (mockPrisma.plagiarismDetection as any) = {
        findUnique: jest.fn().mockResolvedValue(mockDetection),
      };

      await expect(
        service.submitAppeal({
          detectionId: 'detection-1',
          userId: 'user-1',
          reason: 'This is my original work.',
        })
      ).rejects.toThrow('Access denied');
    });
  });

  describe('reviewAppeal', () => {
    it('should approve appeal and update upload status', async () => {
      const mockAppeal = {
        id: 'appeal-1',
        detectionId: 'detection-1',
        status: 'pending',
        detection: {
          uploadId: 'upload-1',
          upload: {},
        },
      };

      (mockPrisma.plagiarismAppeal as any) = {
        findUnique: jest.fn().mockResolvedValue(mockAppeal),
        update: jest.fn().mockResolvedValue({}),
      };

      (mockPrisma.plagiarismDetection as any) = {
        update: jest.fn().mockResolvedValue({}),
      };

      (mockPrisma.upload as any) = {
        update: jest.fn().mockResolvedValue({}),
      };

      const result = await service.reviewAppeal(
        'appeal-1',
        'admin-1',
        'approved',
        'Appeal approved after review'
      );

      expect(result.success).toBe(true);
    });

    it('should reject appeal without updating upload status', async () => {
      const mockAppeal = {
        id: 'appeal-1',
        detectionId: 'detection-1',
        status: 'pending',
        detection: {
          uploadId: 'upload-1',
          upload: {},
        },
      };

      (mockPrisma.plagiarismAppeal as any) = {
        findUnique: jest.fn().mockResolvedValue(mockAppeal),
        update: jest.fn().mockResolvedValue({}),
      };

      (mockPrisma.plagiarismDetection as any) = {
        update: jest.fn().mockResolvedValue({}),
      };

      const result = await service.reviewAppeal(
        'appeal-1',
        'admin-1',
        'rejected',
        'Appeal rejected - insufficient evidence'
      );

      expect(result.success).toBe(true);
    });
  });
});
