import { FileValidationService } from '../../services/file-validation.service';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

describe('FileValidationService', () => {
  let service: FileValidationService;
  let testDir: string;

  beforeAll(() => {
    service = new FileValidationService();
    testDir = path.join(__dirname, '../../../test-files');
    
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('File Size Validation', () => {
    it('should reject files exceeding 2GB limit', async () => {
      // Create a small test file
      const testFile = path.join(testDir, 'test.pdf');
      fs.writeFileSync(testFile, Buffer.alloc(100));

      const result = await service.validateFile(testFile, 'application/pdf', {
        maxSize: 50, // Set very small limit
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('exceeds maximum limit'));
    });

    it('should accept files within size limit', async () => {
      const testFile = path.join(testDir, 'test-small.pdf');
      // Create PDF with magic number
      const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
      fs.writeFileSync(testFile, pdfHeader);

      const result = await service.validateFile(testFile, 'application/pdf', {
        maxSize: 2 * 1024 * 1024 * 1024,
        scanMalware: false, // Skip malware scan for speed
      });

      expect(result.isValid).toBe(true);
      expect(result.fileSize).toBeLessThanOrEqual(2 * 1024 * 1024 * 1024);
    });

    it('should reject empty files', async () => {
      const testFile = path.join(testDir, 'empty.pdf');
      fs.writeFileSync(testFile, '');

      const result = await service.validateFile(testFile, 'application/pdf');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is empty');
    });
  });

  describe('MIME Type Validation', () => {
    it('should reject disallowed MIME types', async () => {
      const testFile = path.join(testDir, 'test.exe');
      fs.writeFileSync(testFile, Buffer.alloc(100));

      const result = await service.validateFile(testFile, 'application/x-msdownload', {
        scanMalware: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('not allowed'));
    });

    it('should accept allowed MIME types', async () => {
      const testFile = path.join(testDir, 'test-allowed.pdf');
      const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
      fs.writeFileSync(testFile, pdfHeader);

      const result = await service.validateFile(testFile, 'application/pdf', {
        scanMalware: false,
      });

      expect(result.isValid).toBe(true);
    });
  });

  describe('Magic Number Validation', () => {
    it('should detect PDF files by magic number', async () => {
      const testFile = path.join(testDir, 'test-magic.pdf');
      const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
      fs.writeFileSync(testFile, pdfHeader);

      const result = await service.validateFile(testFile, 'application/pdf', {
        checkMagicNumbers: true,
        scanMalware: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.fileType).toBe('application/pdf');
    });

    it('should detect PNG files by magic number', async () => {
      const testFile = path.join(testDir, 'test.png');
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      fs.writeFileSync(testFile, pngHeader);

      const result = await service.validateFile(testFile, 'image/png', {
        checkMagicNumbers: true,
        scanMalware: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.fileType).toBe('image/png');
    });

    it('should detect JPEG files by magic number', async () => {
      const testFile = path.join(testDir, 'test.jpg');
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      fs.writeFileSync(testFile, jpegHeader);

      const result = await service.validateFile(testFile, 'image/jpeg', {
        checkMagicNumbers: true,
        scanMalware: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.fileType).toBe('image/jpeg');
    });

    it('should detect file type mismatch', async () => {
      const testFile = path.join(testDir, 'fake.pdf');
      // Write PNG header but declare as PDF
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      fs.writeFileSync(testFile, pngHeader);

      const result = await service.validateFile(testFile, 'application/pdf', {
        checkMagicNumbers: true,
        scanMalware: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('type mismatch'));
    });
  });

  describe('Checksum Generation and Verification', () => {
    it('should generate SHA-256 checksum', async () => {
      const testFile = path.join(testDir, 'checksum-test.txt');
      const content = 'Hello, World!';
      fs.writeFileSync(testFile, content);

      const checksum = await service.generateChecksum(testFile);

      // Verify checksum format (64 hex characters for SHA-256)
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);

      // Verify checksum is correct
      const expectedChecksum = crypto.createHash('sha256').update(content).digest('hex');
      expect(checksum).toBe(expectedChecksum);
    });

    it('should verify correct checksum', async () => {
      const testFile = path.join(testDir, 'verify-test.txt');
      const content = 'Test content';
      fs.writeFileSync(testFile, content);

      const checksum = await service.generateChecksum(testFile);
      const isValid = await service.verifyChecksum(testFile, checksum);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect checksum', async () => {
      const testFile = path.join(testDir, 'verify-fail.txt');
      fs.writeFileSync(testFile, 'Original content');

      const wrongChecksum = 'a'.repeat(64);
      const isValid = await service.verifyChecksum(testFile, wrongChecksum);

      expect(isValid).toBe(false);
    });

    it('should include checksum in validation result', async () => {
      const testFile = path.join(testDir, 'checksum-validation.pdf');
      const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]);
      fs.writeFileSync(testFile, pdfHeader);

      const result = await service.validateFile(testFile, 'application/pdf', {
        generateChecksum: true,
        scanMalware: false,
      });

      expect(result.checksum).toBeDefined();
      expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple files', async () => {
      const files = [
        { path: path.join(testDir, 'batch1.pdf'), mimeType: 'application/pdf' },
        { path: path.join(testDir, 'batch2.png'), mimeType: 'image/png' },
      ];

      // Create test files
      fs.writeFileSync(files[0].path, Buffer.from([0x25, 0x50, 0x44, 0x46])); // PDF
      fs.writeFileSync(files[1].path, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])); // PNG

      const results = await service.validateFiles(files, {
        scanMalware: false,
      });

      expect(results).toHaveLength(2);
      expect(results[0].result.isValid).toBe(true);
      expect(results[1].result.isValid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent files', async () => {
      const result = await service.validateFile('/non/existent/file.pdf', 'application/pdf');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File does not exist');
    });

    it('should handle validation errors gracefully', async () => {
      const testFile = path.join(testDir, 'error-test.pdf');
      fs.writeFileSync(testFile, Buffer.alloc(100));

      // This should not throw, but return validation result
      const result = await service.validateFile(testFile, 'application/pdf', {
        scanMalware: false,
      });

      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
    });
  });

  describe('Malware Scanning', () => {
    it('should skip malware scan when ClamAV is not available', async () => {
      const testFile = path.join(testDir, 'malware-test.pdf');
      const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]);
      fs.writeFileSync(testFile, pdfHeader);

      const result = await service.validateFile(testFile, 'application/pdf', {
        scanMalware: true,
      });

      // Should still pass validation even if ClamAV is not installed
      expect(result.malwareScanResult).toBeDefined();
    });
  });
});
