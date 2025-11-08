import AWS from 'aws-sdk';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DataKeyResult {
  keyId: string;
  plaintext: string;
  ciphertext: string;
}

export interface KeyMetadata {
  keyId: string;
  algorithm: string;
  createdAt: Date;
  expiresAt?: Date;
  purpose: string;
  status: 'active' | 'rotated' | 'revoked';
}

/**
 * Key Management Service
 * Handles encryption key generation, storage, and retrieval using AWS KMS
 * Falls back to local key management if AWS KMS is not configured
 */
export class KeyManagementService {
  private kms: AWS.KMS | null = null;
  private masterKeyId: string | null = null;
  private useLocalKeys: boolean = false;
  private localMasterKey: Buffer | null = null;

  constructor() {
    this.initializeKMS();
  }

  /**
   * Initialize AWS KMS or fall back to local key management
   */
  private initializeKMS() {
    try {
      // Check if AWS KMS is configured
      const awsRegion = process.env.AWS_REGION;
      const kmsKeyId = process.env.AWS_KMS_KEY_ID;

      if (awsRegion && kmsKeyId) {
        // Initialize AWS KMS
        this.kms = new AWS.KMS({
          region: awsRegion,
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        });
        this.masterKeyId = kmsKeyId;
        this.useLocalKeys = false;

        logger.info('AWS KMS initialized', {
          region: awsRegion,
          keyId: kmsKeyId,
        });
      } else {
        // Fall back to local key management
        this.useLocalKeys = true;
        this.initializeLocalMasterKey();

        logger.warn('AWS KMS not configured, using local key management', {
          warning: 'Local key management is not recommended for production',
        });
      }
    } catch (error) {
      logger.error('Failed to initialize KMS, falling back to local keys', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.useLocalKeys = true;
      this.initializeLocalMasterKey();
    }
  }

  /**
   * Initialize local master key for development/testing
   */
  private initializeLocalMasterKey() {
    const localKeyEnv = process.env.LOCAL_MASTER_KEY;

    if (localKeyEnv) {
      // Use provided master key
      this.localMasterKey = Buffer.from(localKeyEnv, 'hex');
    } else {
      // Generate a new master key (WARNING: This will be lost on restart)
      this.localMasterKey = crypto.randomBytes(32);
      logger.warn('Generated temporary master key', {
        warning: 'This key will be lost on restart. Set LOCAL_MASTER_KEY env variable for persistence',
      });
    }
  }

  /**
   * Generate a new data encryption key
   * Uses AWS KMS or local key generation
   * @returns Data key with plaintext and encrypted versions
   */
  async generateDataKey(): Promise<DataKeyResult> {
    try {
      if (!this.useLocalKeys && this.kms && this.masterKeyId) {
        // Use AWS KMS to generate data key
        const result = await this.kms
          .generateDataKey({
            KeyId: this.masterKeyId,
            KeySpec: 'AES_256',
          })
          .promise();

        if (!result.Plaintext || !result.CiphertextBlob) {
          throw new Error('KMS failed to generate data key');
        }

        const keyId = crypto.randomBytes(16).toString('hex');

        // Store encrypted key in database
        await this.storeEncryptedKey(
          keyId,
          result.CiphertextBlob.toString('base64'),
          'aes-256-cbc',
          'content-encryption'
        );

        return {
          keyId,
          plaintext: result.Plaintext.toString('base64'),
          ciphertext: result.CiphertextBlob.toString('base64'),
        };
      } else {
        // Use local key generation
        return this.generateLocalDataKey();
      }
    } catch (error) {
      logger.error('Failed to generate data key', { error });
      throw error;
    }
  }

  /**
   * Generate data key using local master key
   * @returns Data key with plaintext and encrypted versions
   */
  private async generateLocalDataKey(): Promise<DataKeyResult> {
    if (!this.localMasterKey) {
      throw new Error('Local master key not initialized');
    }

    // Generate random data key
    const dataKey = crypto.randomBytes(32);
    const keyId = crypto.randomBytes(16).toString('hex');

    // Encrypt data key with master key
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      this.localMasterKey,
      iv
    );
    const encrypted = Buffer.concat([
      iv,
      cipher.update(dataKey),
      cipher.final(),
    ]);

    // Store encrypted key in database
    await this.storeEncryptedKey(
      keyId,
      encrypted.toString('base64'),
      'aes-256-cbc',
      'content-encryption'
    );

    return {
      keyId,
      plaintext: dataKey.toString('base64'),
      ciphertext: encrypted.toString('base64'),
    };
  }

  /**
   * Decrypt a data key using AWS KMS or local master key
   * @param keyId Key identifier
   * @returns Decrypted data key
   */
  async decryptDataKey(keyId: string): Promise<string> {
    try {
      // Retrieve encrypted key from database
      const keyRecord = await this.getEncryptedKey(keyId);

      if (!keyRecord) {
        throw new Error(`Key not found: ${keyId}`);
      }

      if (keyRecord.status !== 'active') {
        throw new Error(`Key is not active: ${keyId} (status: ${keyRecord.status})`);
      }

      const ciphertext = Buffer.from(keyRecord.encryptedKey, 'base64');

      if (!this.useLocalKeys && this.kms) {
        // Use AWS KMS to decrypt
        const result = await this.kms
          .decrypt({
            CiphertextBlob: ciphertext,
          })
          .promise();

        if (!result.Plaintext) {
          throw new Error('KMS failed to decrypt data key');
        }

        return result.Plaintext.toString('base64');
      } else {
        // Use local master key to decrypt
        return this.decryptLocalDataKey(ciphertext);
      }
    } catch (error) {
      logger.error('Failed to decrypt data key', { keyId, error });
      throw error;
    }
  }

  /**
   * Decrypt data key using local master key
   * @param ciphertext Encrypted data key
   * @returns Decrypted data key
   */
  private decryptLocalDataKey(ciphertext: Buffer): string {
    if (!this.localMasterKey) {
      throw new Error('Local master key not initialized');
    }

    // Extract IV (first 16 bytes)
    const iv = ciphertext.slice(0, 16);
    const encrypted = ciphertext.slice(16);

    // Decrypt
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      this.localMasterKey,
      iv
    );
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('base64');
  }

  /**
   * Store encrypted key in database
   * @param keyId Key identifier
   * @param encryptedKey Encrypted key data
   * @param algorithm Encryption algorithm
   * @param purpose Key purpose
   */
  private async storeEncryptedKey(
    keyId: string,
    encryptedKey: string,
    algorithm: string,
    purpose: string
  ): Promise<void> {
    await prisma.encryptionKey.create({
      data: {
        id: keyId,
        encryptedKey,
        algorithm,
        purpose,
        status: 'active',
        createdAt: new Date(),
      },
    });

    logger.info('Encryption key stored', { keyId, algorithm, purpose });
  }

  /**
   * Retrieve encrypted key from database
   * @param keyId Key identifier
   * @returns Key record or null
   */
  private async getEncryptedKey(keyId: string): Promise<any> {
    return await prisma.encryptionKey.findUnique({
      where: { id: keyId },
    });
  }

  /**
   * Rotate a data key (mark old as rotated, generate new)
   * @param oldKeyId Old key identifier
   * @returns New key data
   */
  async rotateDataKey(oldKeyId: string): Promise<DataKeyResult> {
    try {
      // Mark old key as rotated
      await prisma.encryptionKey.update({
        where: { id: oldKeyId },
        data: {
          status: 'rotated',
          updatedAt: new Date(),
        },
      });

      // Generate new key
      const newKey = await this.generateDataKey();

      logger.info('Data key rotated', {
        oldKeyId,
        newKeyId: newKey.keyId,
      });

      return newKey;
    } catch (error) {
      logger.error('Failed to rotate data key', { oldKeyId, error });
      throw error;
    }
  }

  /**
   * Revoke a data key (mark as revoked)
   * @param keyId Key identifier
   */
  async revokeDataKey(keyId: string): Promise<void> {
    try {
      await prisma.encryptionKey.update({
        where: { id: keyId },
        data: {
          status: 'revoked',
          updatedAt: new Date(),
        },
      });

      logger.info('Data key revoked', { keyId });
    } catch (error) {
      logger.error('Failed to revoke data key', { keyId, error });
      throw error;
    }
  }

  /**
   * Get key metadata
   * @param keyId Key identifier
   * @returns Key metadata
   */
  async getKeyMetadata(keyId: string): Promise<KeyMetadata | null> {
    try {
      const keyRecord = await this.getEncryptedKey(keyId);

      if (!keyRecord) {
        return null;
      }

      return {
        keyId: keyRecord.id,
        algorithm: keyRecord.algorithm,
        createdAt: keyRecord.createdAt,
        expiresAt: keyRecord.expiresAt,
        purpose: keyRecord.purpose,
        status: keyRecord.status,
      };
    } catch (error) {
      logger.error('Failed to get key metadata', { keyId, error });
      throw error;
    }
  }

  /**
   * List all active keys
   * @param purpose Optional filter by purpose
   * @returns Array of key metadata
   */
  async listActiveKeys(purpose?: string): Promise<KeyMetadata[]> {
    try {
      const keys = await prisma.encryptionKey.findMany({
        where: {
          status: 'active',
          ...(purpose && { purpose }),
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return keys.map((key) => ({
        keyId: key.id,
        algorithm: key.algorithm,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt || undefined,
        purpose: key.purpose,
        status: key.status as 'active' | 'rotated' | 'revoked',
      }));
    } catch (error) {
      logger.error('Failed to list active keys', { error });
      throw error;
    }
  }

  /**
   * Check if AWS KMS is being used
   * @returns True if using AWS KMS, false if using local keys
   */
  isUsingKMS(): boolean {
    return !this.useLocalKeys;
  }
}
