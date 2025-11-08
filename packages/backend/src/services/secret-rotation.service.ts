/**
 * Secret Rotation Service
 * 
 * Handles automatic rotation of secrets stored in Vault:
 * - JWT secrets
 * - API keys
 * - Database passwords
 * - Encryption keys
 */

import { getVaultClient } from './vault-client.service';
import { logger } from '../utils/logger';
import crypto from 'crypto';

interface RotationConfig {
  path: string;
  rotationIntervalDays: number;
  lastRotated?: Date;
  autoRotate: boolean;
}

interface RotationResult {
  path: string;
  success: boolean;
  oldVersion?: number;
  newVersion?: number;
  error?: string;
}

export class SecretRotationService {
  private vaultClient = getVaultClient();
  private rotationConfigs: Map<string, RotationConfig> = new Map();
  private rotationInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeRotationConfigs();
  }

  /**
   * Initialize rotation configurations for different secret types
   */
  private initializeRotationConfigs(): void {
    // JWT secret - rotate every 90 days
    this.rotationConfigs.set('backend/jwt', {
      path: 'backend/jwt',
      rotationIntervalDays: 90,
      autoRotate: true,
    });

    // Database password - rotate every 30 days
    this.rotationConfigs.set('backend/database', {
      path: 'backend/database',
      rotationIntervalDays: 30,
      autoRotate: false, // Manual rotation for database
    });

    // API keys - rotate every 180 days
    this.rotationConfigs.set('api/pinata', {
      path: 'api/pinata',
      rotationIntervalDays: 180,
      autoRotate: false, // Requires external service update
    });

    this.rotationConfigs.set('api/openai', {
      path: 'api/openai',
      rotationIntervalDays: 180,
      autoRotate: false,
    });

    // Blockchain private keys - manual rotation only
    this.rotationConfigs.set('blockchain/arbitrum', {
      path: 'blockchain/arbitrum',
      rotationIntervalDays: 365,
      autoRotate: false, // Critical - manual only
    });

    logger.info('Secret rotation configurations initialized', {
      count: this.rotationConfigs.size,
    });
  }

  /**
   * Start automatic rotation scheduler
   */
  startRotationScheduler(checkIntervalHours = 24): void {
    if (this.rotationInterval) {
      logger.warn('Rotation scheduler already running');
      return;
    }

    const intervalMs = checkIntervalHours * 60 * 60 * 1000;

    this.rotationInterval = setInterval(async () => {
      logger.info('Running scheduled secret rotation check');
      await this.checkAndRotateSecrets();
    }, intervalMs);

    logger.info('Secret rotation scheduler started', {
      checkIntervalHours,
    });

    // Run initial check
    this.checkAndRotateSecrets().catch((error) => {
      logger.error('Initial rotation check failed', { error: error.message });
    });
  }

  /**
   * Stop automatic rotation scheduler
   */
  stopRotationScheduler(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
      logger.info('Secret rotation scheduler stopped');
    }
  }

  /**
   * Check all secrets and rotate if needed
   */
  async checkAndRotateSecrets(): Promise<RotationResult[]> {
    const results: RotationResult[] = [];

    for (const [key, config] of this.rotationConfigs.entries()) {
      if (!config.autoRotate) {
        continue;
      }

      try {
        const needsRotation = await this.needsRotation(config);

        if (needsRotation) {
          logger.info('Secret needs rotation', { path: config.path });
          const result = await this.rotateSecret(config.path);
          results.push(result);
        }
      } catch (error: any) {
        logger.error('Failed to check/rotate secret', {
          path: config.path,
          error: error.message,
        });
        results.push({
          path: config.path,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Check if a secret needs rotation
   */
  private async needsRotation(config: RotationConfig): Promise<boolean> {
    if (!config.lastRotated) {
      // No rotation history, check Vault metadata
      try {
        const secret = await this.vaultClient.getSecret(config.path);
        // If we can't determine age, assume it needs rotation
        return true;
      } catch {
        return false;
      }
    }

    const daysSinceRotation =
      (Date.now() - config.lastRotated.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceRotation >= config.rotationIntervalDays;
  }

  /**
   * Rotate a specific secret
   */
  async rotateSecret(path: string): Promise<RotationResult> {
    try {
      logger.info('Starting secret rotation', { path });

      // Get current secret
      const currentSecret = await this.vaultClient.getSecret(path, false);

      // Generate new secret based on type
      const newSecret = await this.generateNewSecret(path, currentSecret);

      // Write new secret to Vault
      await this.vaultClient.rotateSecret(path, newSecret);

      // Update rotation config
      const config = this.rotationConfigs.get(path);
      if (config) {
        config.lastRotated = new Date();
      }

      logger.info('Secret rotated successfully', { path });

      return {
        path,
        success: true,
      };
    } catch (error: any) {
      logger.error('Secret rotation failed', {
        path,
        error: error.message,
      });

      return {
        path,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate new secret value based on secret type
   */
  private async generateNewSecret(
    path: string,
    currentSecret: any
  ): Promise<any> {
    if (path.includes('jwt')) {
      return {
        ...currentSecret,
        secret: this.generateSecureToken(64),
        rotated_at: new Date().toISOString(),
      };
    }

    if (path.includes('database')) {
      return {
        ...currentSecret,
        password: this.generateSecurePassword(32),
        rotated_at: new Date().toISOString(),
      };
    }

    if (path.includes('encryption')) {
      return {
        ...currentSecret,
        key: this.generateEncryptionKey(32),
        rotated_at: new Date().toISOString(),
      };
    }

    // For other secrets, just update the timestamp
    return {
      ...currentSecret,
      rotated_at: new Date().toISOString(),
    };
  }

  /**
   * Generate a secure random token
   */
  private generateSecureToken(length: number): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Generate a secure password
   */
  private generateSecurePassword(length: number): string {
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }

    return password;
  }

  /**
   * Generate an encryption key
   */
  private generateEncryptionKey(length: number): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Manually trigger rotation for a specific secret
   */
  async manualRotation(path: string): Promise<RotationResult> {
    logger.info('Manual secret rotation triggered', { path });
    return await this.rotateSecret(path);
  }

  /**
   * Get rotation status for all secrets
   */
  async getRotationStatus(): Promise<any[]> {
    const status = [];

    for (const [key, config] of this.rotationConfigs.entries()) {
      const daysSinceRotation = config.lastRotated
        ? (Date.now() - config.lastRotated.getTime()) / (1000 * 60 * 60 * 24)
        : null;

      status.push({
        path: config.path,
        autoRotate: config.autoRotate,
        rotationIntervalDays: config.rotationIntervalDays,
        lastRotated: config.lastRotated,
        daysSinceRotation,
        needsRotation: daysSinceRotation
          ? daysSinceRotation >= config.rotationIntervalDays
          : null,
      });
    }

    return status;
  }

  /**
   * Add a new rotation configuration
   */
  addRotationConfig(config: RotationConfig): void {
    this.rotationConfigs.set(config.path, config);
    logger.info('Rotation configuration added', { path: config.path });
  }

  /**
   * Remove a rotation configuration
   */
  removeRotationConfig(path: string): void {
    this.rotationConfigs.delete(path);
    logger.info('Rotation configuration removed', { path });
  }
}

// Singleton instance
let rotationServiceInstance: SecretRotationService | null = null;

export function getSecretRotationService(): SecretRotationService {
  if (!rotationServiceInstance) {
    rotationServiceInstance = new SecretRotationService();
  }
  return rotationServiceInstance;
}
