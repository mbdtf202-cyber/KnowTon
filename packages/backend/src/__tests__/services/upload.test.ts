import { UploadService } from '../../services/upload.service';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const prisma = new PrismaClient();

describe('UploadService', () => {
  let uploadService: UploadService;
  const testUploadDir = path.join(process.cwd(), 'test-uploads');
  const testUserId = 'test-user-123';

  beforeAll(() => {
    // Set test upload directory
    process.env.UPLOAD_DIR = testUploadDir;
    
    // Create test upload directory
    if (!fs.existsSync(testUploadDir)) {
      fs.mkdirSync(testUploadDir, { recursive: true });
    }

    uploadService = new UploadService();
  });

  afterAll(async () => {
    // Clean up test uploads
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true });
    }

    await prisma.$disconnect();
  });

  describe('File Validation', () => {
    it('should accept valid file types', () => {
      const validTypes = [
        'application/pdf',
        'video/mp4',
        'audio/mpeg',
        'application/zip',
      ];

      validTypes.forEach((filetype) => {
        expect(() => {
          (uploadService as any).validateFileType(filetype);
        }).not.toThrow();
      });
    });

    it('should reject invalid file types', () => {
      const invalidTypes = [
        'application/x-executable',
        'text/html',
        'application/javascript',
      ];

      invalidTypes.forEach((filetype) => {
        expect(() => {
          (uploadService as any).validateFileType(filetype);
        }).toThrow();
      });
    });
  });

  describe('Metadata Parsing', () => {
    it('should parse upload metadata correctly', () => {
      const metadata = [
        `filename ${Buffer.from('test.pdf').toString('base64')}`,
        `filetype ${Buffer.from('application/pdf').toString('base64')}`,
        `userId ${Buffer.from(testUserId).toString('base64')}`,
        `title ${Buffer.from('Test Document').toString('base64')}`,
      ].join(',');

      const parsed = (uploadService as any).parseMetadata(metadata);

      expect(parsed.filename).toBe('test.pdf');
      expect(parsed.filetype).toBe('application/pdf');
      expect(parsed.userId).toBe(testUserId);
      expect(parsed.title).toBe('Test Document');
    });

    it('should handle missing metadata fields', () => {
      const metadata = `userId ${Buffer.from(testUserId).toString('base64')}`;
      const parsed = (uploadService as any).parseMetadata(metadata);

      expect(parsed.userId).toBe(testUserId);
      expect(parsed.filename).toBe('unknown');
      expect(parsed.filetype).toBe('application/octet-stream');
    });
  });

  describe('File Hash Generation', () => {
    it('should generate consistent file hash', async () => {
      // Create a test file
      const testFilePath = path.join(testUploadDir, 'test-hash.txt');
      const testContent = 'This is a test file for hash generation';
      fs.writeFileSync(testFilePath, testContent);

      // Generate hash using service
      const hash1 = await (uploadService as any).generateFileHash(testFilePath);
      const hash2 = await (uploadService as any).generateFileHash(testFilePath);

      // Verify hash consistency
      expect(hash1).toBe(hash2);

      // Verify hash correctness
      const expectedHash = crypto.createHash('sha256').update(testContent).digest('hex');
      expect(hash1).toBe(expectedHash);

      // Clean up
      fs.unlinkSync(testFilePath);
    });
  });

  describe('Upload Status', () => {
    it('should retrieve upload status', async () => {
      // Create a test upload record
      const uploadId = 'test-upload-' + Date.now();
      await prisma.upload.create({
        data: {
          id: uploadId,
          userId: testUserId,
          filename: 'test.pdf',
          filetype: 'application/pdf',
          filesize: 1024000,
          uploadOffset: 512000,
          status: 'uploading',
        },
      });

      // Get status
      const status = await uploadService.getUploadStatus(uploadId, testUserId);

      expect(status.id).toBe(uploadId);
      expect(status.filename).toBe('test.pdf');
      expect(status.status).toBe('uploading');
      expect(status.progress).toBe(50); // 512000 / 1024000 * 100

      // Clean up
      await prisma.upload.delete({ where: { id: uploadId } });
    });

    it('should throw error for non-existent upload', async () => {
      await expect(
        uploadService.getUploadStatus('non-existent-id', testUserId)
      ).rejects.toThrow('Upload not found');
    });

    it('should not allow access to other users uploads', async () => {
      const uploadId = 'test-upload-' + Date.now();
      await prisma.upload.create({
        data: {
          id: uploadId,
          userId: 'other-user',
          filename: 'test.pdf',
          filetype: 'application/pdf',
          filesize: 1024000,
          status: 'uploading',
        },
      });

      await expect(
        uploadService.getUploadStatus(uploadId, testUserId)
      ).rejects.toThrow('Upload not found');

      // Clean up
      await prisma.upload.delete({ where: { id: uploadId } });
    });
  });

  describe('User Uploads List', () => {
    it('should retrieve user uploads', async () => {
      // Create multiple test uploads
      const uploadIds = [];
      for (let i = 0; i < 3; i++) {
        const uploadId = `test-upload-${Date.now()}-${i}`;
        uploadIds.push(uploadId);
        await prisma.upload.create({
          data: {
            id: uploadId,
            userId: testUserId,
            filename: `test-${i}.pdf`,
            filetype: 'application/pdf',
            filesize: 1024000,
            status: 'completed',
          },
        });
      }

      // Get uploads
      const uploads = await uploadService.getUserUploads(testUserId, 10);

      expect(uploads.length).toBeGreaterThanOrEqual(3);
      expect(uploads[0].filename).toContain('test-');

      // Clean up
      for (const uploadId of uploadIds) {
        await prisma.upload.delete({ where: { id: uploadId } });
      }
    });

    it('should respect limit parameter', async () => {
      const uploads = await uploadService.getUserUploads(testUserId, 2);
      expect(uploads.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Upload Deletion', () => {
    it('should delete upload and file', async () => {
      const uploadId = 'test-upload-' + Date.now();
      const testFilePath = path.join(testUploadDir, uploadId);

      // Create test file
      fs.writeFileSync(testFilePath, 'test content');

      // Create upload record
      await prisma.upload.create({
        data: {
          id: uploadId,
          userId: testUserId,
          filename: 'test.pdf',
          filetype: 'application/pdf',
          filesize: 1024,
          status: 'completed',
        },
      });

      // Delete upload
      await uploadService.deleteUpload(uploadId, testUserId);

      // Verify file deleted
      expect(fs.existsSync(testFilePath)).toBe(false);

      // Verify record deleted
      const record = await prisma.upload.findUnique({ where: { id: uploadId } });
      expect(record).toBeNull();
    });

    it('should throw error when deleting non-existent upload', async () => {
      await expect(
        uploadService.deleteUpload('non-existent-id', testUserId)
      ).rejects.toThrow('Upload not found');
    });
  });

  describe('Large File Support', () => {
    it('should handle file size calculations correctly', async () => {
      const largeFileSize = 1.5 * 1024 * 1024 * 1024; // 1.5GB
      const uploadId = 'test-large-' + Date.now();

      await prisma.upload.create({
        data: {
          id: uploadId,
          userId: testUserId,
          filename: 'large-file.mp4',
          filetype: 'video/mp4',
          filesize: largeFileSize,
          uploadOffset: largeFileSize / 2,
          status: 'uploading',
        },
      });

      const status = await uploadService.getUploadStatus(uploadId, testUserId);
      expect(status.progress).toBe(50);
      expect(status.filesize).toBe(largeFileSize);

      // Clean up
      await prisma.upload.delete({ where: { id: uploadId } });
    });
  });
});
