import { UploadService } from '../../services/upload.service';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    upload: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

// Mock fs
jest.mock('fs');

describe('UploadService - Batch Operations', () => {
  let uploadService: UploadService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    uploadService = new UploadService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getBatchUploadStatus', () => {
    it('should return status for multiple uploads', async () => {
      const userId = 'user-123';
      const uploadIds = ['upload-1', 'upload-2', 'upload-3'];

      const mockUploads = [
        {
          id: 'upload-1',
          userId,
          filename: 'file1.pdf',
          filetype: 'application/pdf',
          filesize: BigInt(1000000),
          uploadOffset: BigInt(500000),
          status: 'uploading',
          createdAt: new Date(),
          completedAt: null,
          error: null,
        },
        {
          id: 'upload-2',
          userId,
          filename: 'file2.mp4',
          filetype: 'video/mp4',
          filesize: BigInt(2000000),
          uploadOffset: BigInt(2000000),
          status: 'completed',
          createdAt: new Date(),
          completedAt: new Date(),
          error: null,
        },
        {
          id: 'upload-3',
          userId,
          filename: 'file3.docx',
          filetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          filesize: BigInt(500000),
          uploadOffset: BigInt(0),
          status: 'failed',
          createdAt: new Date(),
          completedAt: null,
          error: 'Network error',
        },
      ];

      mockPrisma.upload.findMany.mockResolvedValue(mockUploads);

      const result = await uploadService.getBatchUploadStatus(uploadIds, userId);

      expect(mockPrisma.upload.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: uploadIds },
          userId,
        },
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        id: 'upload-1',
        filename: 'file1.pdf',
        status: 'uploading',
        progress: 50,
      });
      expect(result[1]).toMatchObject({
        id: 'upload-2',
        filename: 'file2.mp4',
        status: 'completed',
        progress: 100,
      });
      expect(result[2]).toMatchObject({
        id: 'upload-3',
        filename: 'file3.docx',
        status: 'failed',
        progress: 0,
        error: 'Network error',
      });
    });

    it('should return empty array when no uploads found', async () => {
      const userId = 'user-123';
      const uploadIds = ['upload-1', 'upload-2'];

      mockPrisma.upload.findMany.mockResolvedValue([]);

      const result = await uploadService.getBatchUploadStatus(uploadIds, userId);

      expect(result).toHaveLength(0);
    });
  });

  describe('deleteBatchUploads', () => {
    it('should delete multiple uploads successfully', async () => {
      const userId = 'user-123';
      const uploadIds = ['upload-1', 'upload-2'];

      mockPrisma.upload.findFirst
        .mockResolvedValueOnce({
          id: 'upload-1',
          userId,
          filename: 'file1.pdf',
        })
        .mockResolvedValueOnce({
          id: 'upload-2',
          userId,
          filename: 'file2.mp4',
        });

      mockPrisma.upload.delete.mockResolvedValue({});
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

      const result = await uploadService.deleteBatchUploads(uploadIds, userId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ uploadId: 'upload-1', success: true });
      expect(result[1]).toEqual({ uploadId: 'upload-2', success: true });
      expect(mockPrisma.upload.delete).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures', async () => {
      const userId = 'user-123';
      const uploadIds = ['upload-1', 'upload-2', 'upload-3'];

      mockPrisma.upload.findFirst
        .mockResolvedValueOnce({
          id: 'upload-1',
          userId,
          filename: 'file1.pdf',
        })
        .mockResolvedValueOnce(null) // Upload not found
        .mockResolvedValueOnce({
          id: 'upload-3',
          userId,
          filename: 'file3.mp4',
        });

      mockPrisma.upload.delete.mockResolvedValue({});
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

      const result = await uploadService.deleteBatchUploads(uploadIds, userId);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ uploadId: 'upload-1', success: true });
      expect(result[1]).toMatchObject({
        uploadId: 'upload-2',
        success: false,
        error: 'Upload not found',
      });
      expect(result[2]).toEqual({ uploadId: 'upload-3', success: true });
    });

    it('should handle file system errors', async () => {
      const userId = 'user-123';
      const uploadIds = ['upload-1'];

      mockPrisma.upload.findFirst.mockResolvedValue({
        id: 'upload-1',
        userId,
        filename: 'file1.pdf',
      });

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await uploadService.deleteBatchUploads(uploadIds, userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        uploadId: 'upload-1',
        success: false,
        error: 'Permission denied',
      });
    });
  });
});
