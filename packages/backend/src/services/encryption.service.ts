import crypto from 'crypto';
import fs from 'fs';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { logger } from '../utils/logger';
import { KeyManagementService } from './key-management.service';

export interface EncryptionOptions {
  algorithm?: string;
  chunkSize?: number;
  generateIV?: boolean;
}

export interface EncryptionResult {
  encryptedPath: string;
  keyId: string;
  iv: string;
  algorithm: string;
  originalSize: number;
  encryptedSize: number;
  encryptionTime: number;
}

export interface DecryptionOptions {
  keyId: string;
  iv: string;
  algorithm?: string;
}

export interface DecryptionResult {
  decryptedPath: string;
  originalSize: number;
  decryptionTime: number;
}

/**
 * Content Encryption Service
 * Implements AES-256 encryption for content files with streaming support
 * for large files to minimize memory usage
 */
export class EncryptionService {
  private keyManagementService: KeyManagementService;
  private readonly DEFAULT_ALGORITHM = 'aes-256-cbc';
  private readonly DEFAULT_CHUNK_SIZE = 64 * 1024; // 64KB chunks

  constructor() {
    this.keyManagementService = new KeyManagementService();
  }

  /**
   * Encrypt a file using AES-256-CBC with streaming
   * @param inputPath Path to the file to encrypt
   * @param outputPath Path where encrypted file will be saved
   * @param options Encryption options
   * @returns Encryption result with metadata
   */
  async encryptFile(
    inputPath: string,
    outputPath: string,
    options: EncryptionOptions = {}
  ): Promise<EncryptionResult> {
    const startTime = Date.now();

    try {
      // Validate input file exists
      if (!fs.existsSync(inputPath)) {
        throw new Error(`Input file not found: ${inputPath}`);
      }

      const algorithm = options.algorithm || this.DEFAULT_ALGORITHM;
      
      // Generate or retrieve encryption key from KMS
      const keyData = await this.keyManagementService.generateDataKey();
      const key = Buffer.from(keyData.plaintext, 'base64');

      // Generate initialization vector (IV)
      const iv = options.generateIV !== false 
        ? crypto.randomBytes(16) 
        : Buffer.alloc(16);

      // Get file stats
      const stats = fs.statSync(inputPath);
      const originalSize = stats.size;

      // Create cipher
      const cipher = crypto.createCipheriv(algorithm, key, iv);

      // Create streams
      const inputStream = fs.createReadStream(inputPath, {
        highWaterMark: options.chunkSize || this.DEFAULT_CHUNK_SIZE,
      });
      const outputStream = fs.createWriteStream(outputPath);

      // Write IV at the beginning of the encrypted file
      outputStream.write(iv);

      // Pipe input through cipher to output
      await pipeline(inputStream, cipher, outputStream);

      // Get encrypted file size
      const encryptedStats = fs.statSync(outputPath);
      const encryptedSize = encryptedStats.size;

      const encryptionTime = Date.now() - startTime;

      const result: EncryptionResult = {
        encryptedPath: outputPath,
        keyId: keyData.keyId,
        iv: iv.toString('hex'),
        algorithm,
        originalSize,
        encryptedSize,
        encryptionTime,
      };

      logger.info('File encrypted successfully', {
        inputPath,
        outputPath,
        originalSize,
        encryptedSize,
        encryptionTime,
        overhead: ((encryptedSize - originalSize) / originalSize * 100).toFixed(2) + '%',
      });

      return result;
    } catch (error) {
      logger.error('File encryption failed', {
        inputPath,
        outputPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Decrypt a file using AES-256-CBC with streaming
   * @param inputPath Path to the encrypted file
   * @param outputPath Path where decrypted file will be saved
   * @param options Decryption options including keyId and IV
   * @returns Decryption result with metadata
   */
  async decryptFile(
    inputPath: string,
    outputPath: string,
    options: DecryptionOptions
  ): Promise<DecryptionResult> {
    const startTime = Date.now();

    try {
      // Validate input file exists
      if (!fs.existsSync(inputPath)) {
        throw new Error(`Encrypted file not found: ${inputPath}`);
      }

      const algorithm = options.algorithm || this.DEFAULT_ALGORITHM;

      // Retrieve decryption key from KMS
      const keyData = await this.keyManagementService.decryptDataKey(options.keyId);
      const key = Buffer.from(keyData, 'base64');

      // Read IV from the beginning of the encrypted file
      const ivBuffer = Buffer.alloc(16);
      const fd = fs.openSync(inputPath, 'r');
      fs.readSync(fd, ivBuffer, 0, 16, 0);
      fs.closeSync(fd);

      // Verify IV matches if provided
      if (options.iv && ivBuffer.toString('hex') !== options.iv) {
        throw new Error('IV mismatch - file may be corrupted');
      }

      // Create decipher
      const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer);

      // Create streams (skip first 16 bytes which contain the IV)
      const inputStream = fs.createReadStream(inputPath, {
        start: 16, // Skip IV
        highWaterMark: this.DEFAULT_CHUNK_SIZE,
      });
      const outputStream = fs.createWriteStream(outputPath);

      // Pipe input through decipher to output
      await pipeline(inputStream, decipher, outputStream);

      // Get decrypted file size
      const stats = fs.statSync(outputPath);
      const originalSize = stats.size;

      const decryptionTime = Date.now() - startTime;

      const result: DecryptionResult = {
        decryptedPath: outputPath,
        originalSize,
        decryptionTime,
      };

      logger.info('File decrypted successfully', {
        inputPath,
        outputPath,
        originalSize,
        decryptionTime,
      });

      return result;
    } catch (error) {
      logger.error('File decryption failed', {
        inputPath,
        outputPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Encrypt data in memory (for small files or data chunks)
   * @param data Data to encrypt
   * @param keyId Optional key ID to use specific key
   * @returns Encrypted data with metadata
   */
  async encryptData(
    data: Buffer | string,
    keyId?: string
  ): Promise<{ encrypted: Buffer; keyId: string; iv: string }> {
    try {
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

      // Generate or retrieve encryption key
      const keyData = keyId
        ? await this.keyManagementService.decryptDataKey(keyId)
        : await this.keyManagementService.generateDataKey();

      const key = Buffer.from(
        keyId ? keyData : keyData.plaintext,
        'base64'
      );
      const actualKeyId = keyId || keyData.keyId;

      // Generate IV
      const iv = crypto.randomBytes(16);

      // Create cipher and encrypt
      const cipher = crypto.createCipheriv(this.DEFAULT_ALGORITHM, key, iv);
      const encrypted = Buffer.concat([
        cipher.update(buffer),
        cipher.final(),
      ]);

      return {
        encrypted,
        keyId: actualKeyId,
        iv: iv.toString('hex'),
      };
    } catch (error) {
      logger.error('Data encryption failed', { error });
      throw error;
    }
  }

  /**
   * Decrypt data in memory
   * @param encrypted Encrypted data
   * @param keyId Key ID used for encryption
   * @param iv Initialization vector
   * @returns Decrypted data
   */
  async decryptData(
    encrypted: Buffer,
    keyId: string,
    iv: string
  ): Promise<Buffer> {
    try {
      // Retrieve decryption key
      const keyData = await this.keyManagementService.decryptDataKey(keyId);
      const key = Buffer.from(keyData, 'base64');

      // Convert IV from hex
      const ivBuffer = Buffer.from(iv, 'hex');

      // Create decipher and decrypt
      const decipher = crypto.createDecipheriv(
        this.DEFAULT_ALGORITHM,
        key,
        ivBuffer
      );
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return decrypted;
    } catch (error) {
      logger.error('Data decryption failed', { error });
      throw error;
    }
  }

  /**
   * Create an encryption transform stream for piping
   * @param key Encryption key
   * @param iv Initialization vector
   * @returns Transform stream
   */
  createEncryptionStream(key: Buffer, iv: Buffer): Transform {
    return crypto.createCipheriv(this.DEFAULT_ALGORITHM, key, iv);
  }

  /**
   * Create a decryption transform stream for piping
   * @param key Decryption key
   * @param iv Initialization vector
   * @returns Transform stream
   */
  createDecryptionStream(key: Buffer, iv: Buffer): Transform {
    return crypto.createDecipheriv(this.DEFAULT_ALGORITHM, key, iv);
  }

  /**
   * Encrypt file with segmentation for video/audio streaming
   * @param inputPath Input file path
   * @param outputDir Output directory for segments
   * @param segmentDuration Duration of each segment in seconds
   * @returns Array of encrypted segment paths with metadata
   */
  async encryptFileSegmented(
    inputPath: string,
    outputDir: string,
    segmentDuration: number = 10
  ): Promise<Array<EncryptionResult & { segmentIndex: number }>> {
    // This is a placeholder for segmented encryption
    // Full implementation would require video/audio processing libraries
    // For now, we'll encrypt the entire file
    logger.info('Segmented encryption requested', {
      inputPath,
      outputDir,
      segmentDuration,
    });

    const outputPath = `${outputDir}/encrypted_full.enc`;
    const result = await this.encryptFile(inputPath, outputPath);

    return [
      {
        ...result,
        segmentIndex: 0,
      },
    ];
  }

  /**
   * Generate a secure random key for testing purposes
   * @returns 32-byte key for AES-256
   */
  generateRandomKey(): Buffer {
    return crypto.randomBytes(32);
  }

  /**
   * Generate a secure random IV
   * @returns 16-byte IV
   */
  generateRandomIV(): Buffer {
    return crypto.randomBytes(16);
  }
}
