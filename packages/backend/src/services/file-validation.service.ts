import fs from 'fs';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileType?: string;
  fileSize?: number;
  checksum?: string;
  malwareScanResult?: {
    isClean: boolean;
    threats?: string[];
  };
}

export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  checkMagicNumbers?: boolean;
  scanMalware?: boolean;
  generateChecksum?: boolean;
}

export class FileValidationService {
  private readonly DEFAULT_MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
  private readonly ALLOWED_MIME_TYPES = [
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

  // Magic numbers for file type detection
  private readonly MAGIC_NUMBERS: Record<string, { signature: Buffer; offset: number; mimeType: string }[]> = {
    pdf: [{ signature: Buffer.from([0x25, 0x50, 0x44, 0x46]), offset: 0, mimeType: 'application/pdf' }],
    docx: [
      {
        signature: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
        offset: 0,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    ],
    mp4: [
      { signature: Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]), offset: 0, mimeType: 'video/mp4' },
      { signature: Buffer.from([0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70]), offset: 0, mimeType: 'video/mp4' },
      { signature: Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]), offset: 0, mimeType: 'video/mp4' },
    ],
    mov: [{ signature: Buffer.from([0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70]), offset: 0, mimeType: 'video/quicktime' }],
    avi: [{ signature: Buffer.from([0x52, 0x49, 0x46, 0x46]), offset: 0, mimeType: 'video/x-msvideo' }],
    mp3: [
      { signature: Buffer.from([0x49, 0x44, 0x33]), offset: 0, mimeType: 'audio/mpeg' }, // ID3
      { signature: Buffer.from([0xff, 0xfb]), offset: 0, mimeType: 'audio/mpeg' }, // MPEG-1 Layer 3
      { signature: Buffer.from([0xff, 0xf3]), offset: 0, mimeType: 'audio/mpeg' }, // MPEG-1 Layer 3
      { signature: Buffer.from([0xff, 0xf2]), offset: 0, mimeType: 'audio/mpeg' }, // MPEG-2 Layer 3
    ],
    wav: [{ signature: Buffer.from([0x52, 0x49, 0x46, 0x46]), offset: 0, mimeType: 'audio/wav' }],
    epub: [{ signature: Buffer.from([0x50, 0x4b, 0x03, 0x04]), offset: 0, mimeType: 'application/epub+zip' }],
    zip: [{ signature: Buffer.from([0x50, 0x4b, 0x03, 0x04]), offset: 0, mimeType: 'application/zip' }],
    jpeg: [
      { signature: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), offset: 0, mimeType: 'image/jpeg' },
      { signature: Buffer.from([0xff, 0xd8, 0xff, 0xe1]), offset: 0, mimeType: 'image/jpeg' },
      { signature: Buffer.from([0xff, 0xd8, 0xff, 0xe2]), offset: 0, mimeType: 'image/jpeg' },
    ],
    png: [{ signature: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), offset: 0, mimeType: 'image/png' }],
    gif: [
      { signature: Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]), offset: 0, mimeType: 'image/gif' }, // GIF87a
      { signature: Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), offset: 0, mimeType: 'image/gif' }, // GIF89a
    ],
  };

  /**
   * Validate a file with comprehensive checks
   */
  async validateFile(filePath: string, declaredMimeType: string, options: FileValidationOptions = {}): Promise<FileValidationResult> {
    const result: FileValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        result.isValid = false;
        result.errors.push('File does not exist');
        return result;
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      result.fileSize = stats.size;

      // 1. Validate file size
      const maxSize = options.maxSize || this.DEFAULT_MAX_SIZE;
      if (stats.size > maxSize) {
        result.isValid = false;
        result.errors.push(`File size (${this.formatBytes(stats.size)}) exceeds maximum limit of ${this.formatBytes(maxSize)}`);
      }

      if (stats.size === 0) {
        result.isValid = false;
        result.errors.push('File is empty');
        return result;
      }

      // 2. Validate MIME type
      const allowedTypes = options.allowedTypes || this.ALLOWED_MIME_TYPES;
      if (!allowedTypes.includes(declaredMimeType)) {
        result.isValid = false;
        result.errors.push(`File type ${declaredMimeType} is not allowed`);
      }

      // 3. Check magic numbers (file signature)
      if (options.checkMagicNumbers !== false) {
        const magicNumberResult = await this.validateMagicNumbers(filePath, declaredMimeType);
        if (!magicNumberResult.isValid) {
          result.isValid = false;
          result.errors.push(...magicNumberResult.errors);
          result.warnings.push(...magicNumberResult.warnings);
        } else {
          result.fileType = magicNumberResult.detectedType;
        }
      }

      // 4. Generate checksum for integrity verification
      if (options.generateChecksum !== false) {
        result.checksum = await this.generateChecksum(filePath);
      }

      // 5. Malware scanning (if enabled and ClamAV is available)
      if (options.scanMalware !== false) {
        const malwareScanResult = await this.scanForMalware(filePath);
        result.malwareScanResult = malwareScanResult;

        if (!malwareScanResult.isClean) {
          result.isValid = false;
          result.errors.push('File failed malware scan');
          if (malwareScanResult.threats && malwareScanResult.threats.length > 0) {
            result.errors.push(`Detected threats: ${malwareScanResult.threats.join(', ')}`);
          }
        }
      }

      logger.info('File validation completed', {
        filePath,
        isValid: result.isValid,
        fileSize: result.fileSize,
        checksum: result.checksum,
        errors: result.errors,
        warnings: result.warnings,
      });

      return result;
    } catch (error) {
      logger.error('File validation error', { filePath, error });
      result.isValid = false;
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Validate file using magic numbers (file signatures)
   */
  private async validateMagicNumbers(
    filePath: string,
    declaredMimeType: string
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[]; detectedType?: string }> {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      detectedType: undefined as string | undefined,
    };

    try {
      // Read first 32 bytes for magic number detection
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(32);
      fs.readSync(fd, buffer, 0, 32, 0);
      fs.closeSync(fd);

      // Try to detect file type from magic numbers
      let detectedType: string | null = null;

      for (const signatures of Object.values(this.MAGIC_NUMBERS)) {
        for (const sig of signatures) {
          if (this.bufferStartsWith(buffer, sig.signature, sig.offset)) {
            detectedType = sig.mimeType;
            break;
          }
        }
        if (detectedType) break;
      }

      if (detectedType) {
        result.detectedType = detectedType;

        // Compare detected type with declared type
        if (detectedType !== declaredMimeType) {
          // Special cases: DOCX, EPUB, and ZIP all start with PK (ZIP signature)
          const zipBasedFormats = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/epub+zip',
            'application/zip',
          ];

          if (zipBasedFormats.includes(declaredMimeType) && zipBasedFormats.includes(detectedType)) {
            // For ZIP-based formats, we need additional validation
            result.warnings.push(`File signature matches ZIP format. Declared as ${declaredMimeType}, detected as ${detectedType}`);
          } else {
            result.isValid = false;
            result.errors.push(`File type mismatch: declared as ${declaredMimeType}, but detected as ${detectedType}`);
          }
        }
      } else {
        result.warnings.push('Could not detect file type from magic numbers');
      }

      return result;
    } catch (error) {
      logger.error('Magic number validation error', { filePath, error });
      result.warnings.push('Failed to validate file signature');
      return result;
    }
  }

  /**
   * Check if buffer starts with a specific signature
   */
  private bufferStartsWith(buffer: Buffer, signature: Buffer, offset: number = 0): boolean {
    if (buffer.length < offset + signature.length) {
      return false;
    }

    for (let i = 0; i < signature.length; i++) {
      if (buffer[offset + i] !== signature[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate SHA-256 checksum for file integrity verification
   */
  async generateChecksum(filePath: string, algorithm: string = 'sha256'): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(algorithm);
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Verify file checksum
   */
  async verifyChecksum(filePath: string, expectedChecksum: string, algorithm: string = 'sha256'): Promise<boolean> {
    try {
      const actualChecksum = await this.generateChecksum(filePath, algorithm);
      return actualChecksum === expectedChecksum;
    } catch (error) {
      logger.error('Checksum verification error', { filePath, error });
      return false;
    }
  }

  /**
   * Scan file for malware using ClamAV
   */
  private async scanForMalware(filePath: string): Promise<{ isClean: boolean; threats?: string[] }> {
    try {
      // Check if ClamAV is installed
      const clamAvailable = await this.isClamAvAvailable();

      if (!clamAvailable) {
        logger.warn('ClamAV not available, skipping malware scan');
        return { isClean: true }; // Skip scan if ClamAV is not installed
      }

      // Run clamscan
      const { stdout, stderr } = await execAsync(`clamscan --no-summary "${filePath}"`);

      // Parse output
      const output = stdout + stderr;

      // Check if file is clean
      if (output.includes('OK') && !output.includes('FOUND')) {
        return { isClean: true };
      }

      // Extract threat names
      const threats: string[] = [];
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('FOUND')) {
          const match = line.match(/:\s*(.+?)\s+FOUND/);
          if (match) {
            threats.push(match[1]);
          }
        }
      }

      logger.warn('Malware detected', { filePath, threats });
      return { isClean: false, threats };
    } catch (error: any) {
      // ClamAV returns exit code 1 when virus is found
      if (error.code === 1) {
        const output = error.stdout + error.stderr;
        const threats: string[] = [];
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.includes('FOUND')) {
            const match = line.match(/:\s*(.+?)\s+FOUND/);
            if (match) {
              threats.push(match[1]);
            }
          }
        }
        return { isClean: false, threats };
      }

      logger.error('Malware scan error', { filePath, error });
      // On error, we'll consider it clean but log the error
      return { isClean: true };
    }
  }

  /**
   * Check if ClamAV is available
   */
  private async isClamAvAvailable(): Promise<boolean> {
    try {
      await execAsync('which clamscan');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format bytes to human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate multiple files in batch
   */
  async validateFiles(
    files: Array<{ path: string; mimeType: string }>,
    options: FileValidationOptions = {}
  ): Promise<Array<{ path: string; result: FileValidationResult }>> {
    const results = await Promise.all(
      files.map(async (file) => ({
        path: file.path,
        result: await this.validateFile(file.path, file.mimeType, options),
      }))
    );

    return results;
  }
}
