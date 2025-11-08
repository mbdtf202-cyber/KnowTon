/**
 * HashiCorp Vault Client Service
 * 
 * Provides secure secret management for:
 * - Private keys and wallet credentials
 * - API keys (Pinata, Chainlink, OpenAI, etc.)
 * - Database credentials with dynamic generation
 * - JWT secrets and encryption keys
 * - Secret rotation and audit logging
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

interface VaultConfig {
  address: string;
  token: string;
  namespace?: string;
  timeout?: number;
}

interface SecretData {
  [key: string]: any;
}

interface DatabaseCredentials {
  username: string;
  password: string;
  url: string;
}

interface SecretMetadata {
  created_time: string;
  deletion_time: string;
  destroyed: boolean;
  version: number;
}

interface SecretResponse {
  data: {
    data: SecretData;
    metadata: SecretMetadata;
  };
}

export class VaultClientService {
  private client: AxiosInstance;
  private config: VaultConfig;
  private secretCache: Map<string, { data: SecretData; expiry: number }>;
  private readonly CACHE_TTL = 300000; // 5 minutes

  constructor(config?: Partial<VaultConfig>) {
    this.config = {
      address: config?.address || process.env.VAULT_ADDR || 'http://vault:8200',
      token: config?.token || process.env.VAULT_TOKEN || 'knowton-dev-token',
      namespace: config?.namespace || 'knowton',
      timeout: config?.timeout || 10000,
    };

    this.client = axios.create({
      baseURL: this.config.address,
      timeout: this.config.timeout,
      headers: {
        'X-Vault-Token': this.config.token,
        'Content-Type': 'application/json',
      },
    });

    this.secretCache = new Map();

    logger.info('Vault client initialized', {
      address: this.config.address,
      namespace: this.config.namespace,
    });
  }

  /**
   * Read a secret from Vault KV v2 engine
   */
  async getSecret(path: string, useCache = true): Promise<SecretData> {
    const fullPath = `${this.config.namespace}/${path}`;
    const cacheKey = fullPath;

    // Check cache first
    if (useCache) {
      const cached = this.secretCache.get(cacheKey);
      if (cached && Date.now() < cached.expiry) {
        logger.debug('Secret retrieved from cache', { path: fullPath });
        return cached.data;
      }
    }

    try {
      const response = await this.client.get<SecretResponse>(
        `/v1/${this.config.namespace}/data/${path}`
      );

      const secretData = response.data.data.data;

      // Cache the secret
      if (useCache) {
        this.secretCache.set(cacheKey, {
          data: secretData,
          expiry: Date.now() + this.CACHE_TTL,
        });
      }

      logger.info('Secret retrieved from Vault', {
        path: fullPath,
        version: response.data.data.metadata.version,
      });

      return secretData;
    } catch (error: any) {
      logger.error('Failed to retrieve secret from Vault', {
        path: fullPath,
        error: error.message,
      });
      throw new Error(`Vault secret retrieval failed: ${error.message}`);
    }
  }

  /**
   * Write a secret to Vault KV v2 engine
   */
  async setSecret(path: string, data: SecretData): Promise<void> {
    const fullPath = `${this.config.namespace}/${path}`;

    try {
      await this.client.post(`/v1/${this.config.namespace}/data/${path}`, {
        data,
      });

      // Invalidate cache
      this.secretCache.delete(fullPath);

      logger.info('Secret written to Vault', { path: fullPath });
    } catch (error: any) {
      logger.error('Failed to write secret to Vault', {
        path: fullPath,
        error: error.message,
      });
      throw new Error(`Vault secret write failed: ${error.message}`);
    }
  }

  /**
   * Delete a secret from Vault
   */
  async deleteSecret(path: string): Promise<void> {
    const fullPath = `${this.config.namespace}/${path}`;

    try {
      await this.client.delete(`/v1/${this.config.namespace}/metadata/${path}`);

      // Invalidate cache
      this.secretCache.delete(fullPath);

      logger.info('Secret deleted from Vault', { path: fullPath });
    } catch (error: any) {
      logger.error('Failed to delete secret from Vault', {
        path: fullPath,
        error: error.message,
      });
      throw new Error(`Vault secret deletion failed: ${error.message}`);
    }
  }

  /**
   * Get database credentials (with dynamic generation support)
   */
  async getDatabaseCredentials(dbName = 'postgres'): Promise<DatabaseCredentials> {
    try {
      // Try to get dynamic credentials first
      const dynamicCreds = await this.getDynamicDatabaseCredentials(dbName);
      if (dynamicCreds) {
        return dynamicCreds;
      }

      // Fall back to static credentials
      const secret = await this.getSecret(`backend/database`);
      return {
        username: secret.username || 'knowton',
        password: secret.password || '',
        url: secret.url || '',
      };
    } catch (error: any) {
      logger.error('Failed to get database credentials', {
        dbName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get dynamic database credentials (auto-rotating)
   */
  private async getDynamicDatabaseCredentials(
    dbName: string
  ): Promise<DatabaseCredentials | null> {
    try {
      const response = await this.client.get(`/v1/database/creds/${dbName}`);
      const { username, password } = response.data.data;

      logger.info('Dynamic database credentials generated', {
        dbName,
        username,
        lease_duration: response.data.lease_duration,
      });

      return {
        username,
        password,
        url: process.env.DATABASE_URL || '',
      };
    } catch (error: any) {
      // Dynamic credentials not configured, return null
      logger.debug('Dynamic database credentials not available', {
        dbName,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Get blockchain private key
   */
  async getBlockchainPrivateKey(network = 'arbitrum'): Promise<string> {
    const secret = await this.getSecret(`blockchain/${network}`);
    if (!secret.private_key) {
      throw new Error(`Private key not found for network: ${network}`);
    }
    return secret.private_key;
  }

  /**
   * Get API key for external service
   */
  async getAPIKey(service: string, keyName = 'api_key'): Promise<string> {
    const secret = await this.getSecret(`api/${service}`);
    if (!secret[keyName]) {
      throw new Error(`API key '${keyName}' not found for service: ${service}`);
    }
    return secret[keyName];
  }

  /**
   * Get JWT secret
   */
  async getJWTSecret(): Promise<string> {
    const secret = await this.getSecret('backend/jwt');
    if (!secret.secret) {
      throw new Error('JWT secret not found');
    }
    return secret.secret;
  }

  /**
   * Rotate a secret (create new version)
   */
  async rotateSecret(path: string, newData: SecretData): Promise<void> {
    logger.info('Rotating secret', { path });

    // Write new version
    await this.setSecret(path, newData);

    // Invalidate cache
    this.secretCache.delete(`${this.config.namespace}/${path}`);

    logger.info('Secret rotated successfully', { path });
  }

  /**
   * List all secrets at a path
   */
  async listSecrets(path: string): Promise<string[]> {
    try {
      const response = await this.client.request({
        method: 'LIST',
        url: `/v1/${this.config.namespace}/metadata/${path}`,
      });

      return response.data.data.keys || [];
    } catch (error: any) {
      logger.error('Failed to list secrets', {
        path,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Check Vault health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/v1/sys/health');
      return response.status === 200;
    } catch (error: any) {
      logger.error('Vault health check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get Vault status
   */
  async getStatus(): Promise<any> {
    try {
      const response = await this.client.get('/v1/sys/health');
      return {
        initialized: response.data.initialized,
        sealed: response.data.sealed,
        standby: response.data.standby,
        version: response.data.version,
      };
    } catch (error: any) {
      logger.error('Failed to get Vault status', { error: error.message });
      throw error;
    }
  }

  /**
   * Clear secret cache
   */
  clearCache(): void {
    this.secretCache.clear();
    logger.info('Vault secret cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.secretCache.size,
      keys: Array.from(this.secretCache.keys()),
    };
  }
}

// Singleton instance
let vaultClientInstance: VaultClientService | null = null;

export function getVaultClient(): VaultClientService {
  if (!vaultClientInstance) {
    vaultClientInstance = new VaultClientService();
  }
  return vaultClientInstance;
}

export function initializeVaultClient(config?: Partial<VaultConfig>): VaultClientService {
  vaultClientInstance = new VaultClientService(config);
  return vaultClientInstance;
}
