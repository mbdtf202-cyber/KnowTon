/**
 * HashiCorp Vault Integration for KnowTon Platform
 * Provides secure secret management and key rotation
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';

interface VaultConfig {
  address: string;
  token: string;
  namespace?: string;
  timeout?: number;
}

interface SecretData {
  [key: string]: string | number | boolean;
}

interface VaultResponse<T = any> {
  data: {
    data: T;
    metadata?: {
      created_time: string;
      deletion_time: string;
      destroyed: boolean;
      version: number;
    };
  };
}

export class VaultClient {
  private client: AxiosInstance;
  private config: VaultConfig;
  private tokenRenewalTimer?: NodeJS.Timeout;

  constructor(config: VaultConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.address,
      timeout: config.timeout || 10000,
      headers: {
        'X-Vault-Token': config.token,
        'Content-Type': 'application/json',
      },
    });

    if (config.namespace) {
      this.client.defaults.headers['X-Vault-Namespace'] = config.namespace;
    }

    // Setup request/response interceptors
    this.setupInterceptors();
    
    // Start token renewal if not using root token
    if (!config.token.includes('root')) {
      this.startTokenRenewal();
    }
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Vault request', {
          method: config.method,
          url: config.url,
          path: config.url?.replace(this.config.address, ''),
        });
        return config;
      },
      (error) => {
        logger.error('Vault request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Vault response', {
          status: response.status,
          path: response.config.url?.replace(this.config.address, ''),
        });
        return response;
      },
      (error) => {
        logger.error('Vault response error', {
          status: error.response?.status,
          message: error.response?.data?.errors || error.message,
          path: error.config?.url?.replace(this.config.address, ''),
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check Vault health and connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/v1/sys/health');
      return response.status === 200;
    } catch (error) {
      logger.error('Vault health check failed', { error });
      return false;
    }
  }

  /**
   * Read secret from KV v2 secrets engine
   */
  async readSecret<T = SecretData>(path: string): Promise<T | null> {
    try {
      const response = await this.client.get<VaultResponse<T>>(
        `/v1/knowton/data/${path}`
      );
      return response.data.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        logger.warn('Secret not found', { path });
        return null;
      }
      logger.error('Failed to read secret', { path, error: error.message });
      throw error;
    }
  }

  /**
   * Write secret to KV v2 secrets engine
   */
  async writeSecret(path: string, data: SecretData): Promise<void> {
    try {
      await this.client.post(`/v1/knowton/data/${path}`, { data });
      logger.info('Secret written successfully', { path });
    } catch (error: any) {
      logger.error('Failed to write secret', { path, error: error.message });
      throw error;
    }
  }

  /**
   * Delete secret from KV v2 secrets engine
   */
  async deleteSecret(path: string): Promise<void> {
    try {
      await this.client.delete(`/v1/knowton/metadata/${path}`);
      logger.info('Secret deleted successfully', { path });
    } catch (error: any) {
      logger.error('Failed to delete secret', { path, error: error.message });
      throw error;
    }
  }

  /**
   * List secrets at a given path
   */
  async listSecrets(path: string): Promise<string[]> {
    try {
      const response = await this.client.request({
        method: 'LIST',
        url: `/v1/knowton/metadata/${path}`,
      });
      return response.data.data.keys || [];
    } catch (error: any) {
      if (error.response?.status === 404) {
        return [];
      }
      logger.error('Failed to list secrets', { path, error: error.message });
      throw error;
    }
  }

  /**
   * Generate dynamic database credentials
   */
  async generateDatabaseCredentials(role: string): Promise<{
    username: string;
    password: string;
    lease_id: string;
    lease_duration: number;
  }> {
    try {
      const response = await this.client.get(`/v1/database/creds/${role}`);
      return response.data.data;
    } catch (error: any) {
      logger.error('Failed to generate database credentials', { 
        role, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Renew lease for dynamic credentials
   */
  async renewLease(leaseId: string, increment?: number): Promise<void> {
    try {
      await this.client.post('/v1/sys/leases/renew', {
        lease_id: leaseId,
        increment: increment || 3600, // 1 hour default
      });
      logger.info('Lease renewed successfully', { leaseId });
    } catch (error: any) {
      logger.error('Failed to renew lease', { leaseId, error: error.message });
      throw error;
    }
  }

  /**
   * Revoke lease for dynamic credentials
   */
  async revokeLease(leaseId: string): Promise<void> {
    try {
      await this.client.post('/v1/sys/leases/revoke', {
        lease_id: leaseId,
      });
      logger.info('Lease revoked successfully', { leaseId });
    } catch (error: any) {
      logger.error('Failed to revoke lease', { leaseId, error: error.message });
      throw error;
    }
  }

  /**
   * Encrypt data using Vault's transit engine
   */
  async encrypt(keyName: string, plaintext: string): Promise<string> {
    try {
      const response = await this.client.post(`/v1/transit/encrypt/${keyName}`, {
        plaintext: Buffer.from(plaintext).toString('base64'),
      });
      return response.data.data.ciphertext;
    } catch (error: any) {
      logger.error('Failed to encrypt data', { keyName, error: error.message });
      throw error;
    }
  }

  /**
   * Decrypt data using Vault's transit engine
   */
  async decrypt(keyName: string, ciphertext: string): Promise<string> {
    try {
      const response = await this.client.post(`/v1/transit/decrypt/${keyName}`, {
        ciphertext,
      });
      return Buffer.from(response.data.data.plaintext, 'base64').toString();
    } catch (error: any) {
      logger.error('Failed to decrypt data', { keyName, error: error.message });
      throw error;
    }
  }

  /**
   * Generate random bytes
   */
  async generateRandom(bytes: number = 32): Promise<string> {
    try {
      const response = await this.client.post('/v1/sys/tools/random', {
        bytes,
        format: 'hex',
      });
      return response.data.data.random_bytes;
    } catch (error: any) {
      logger.error('Failed to generate random bytes', { error: error.message });
      throw error;
    }
  }

  /**
   * Start automatic token renewal
   */
  private startTokenRenewal(): void {
    // Renew token every 30 minutes
    this.tokenRenewalTimer = setInterval(async () => {
      try {
        await this.client.post('/v1/auth/token/renew-self');
        logger.info('Token renewed successfully');
      } catch (error: any) {
        logger.error('Failed to renew token', { error: error.message });
      }
    }, 30 * 60 * 1000);
  }

  /**
   * Stop token renewal and cleanup
   */
  destroy(): void {
    if (this.tokenRenewalTimer) {
      clearInterval(this.tokenRenewalTimer);
    }
  }
}

// Singleton instance
let vaultClient: VaultClient | null = null;

/**
 * Initialize Vault client with configuration
 */
export function initializeVault(config: VaultConfig): VaultClient {
  if (vaultClient) {
    vaultClient.destroy();
  }
  
  vaultClient = new VaultClient(config);
  return vaultClient;
}

/**
 * Get the initialized Vault client
 */
export function getVaultClient(): VaultClient {
  if (!vaultClient) {
    throw new Error('Vault client not initialized. Call initializeVault() first.');
  }
  return vaultClient;
}

/**
 * Utility functions for common secret operations
 */
export class SecretManager {
  private vault: VaultClient;

  constructor(vault: VaultClient) {
    this.vault = vault;
  }

  /**
   * Get database configuration
   */
  async getDatabaseConfig(): Promise<{
    url: string;
    password: string;
  }> {
    const config = await this.vault.readSecret<{
      url: string;
      password: string;
    }>('backend/database');
    
    if (!config) {
      throw new Error('Database configuration not found in Vault');
    }
    
    return config;
  }

  /**
   * Get JWT secret
   */
  async getJWTSecret(): Promise<string> {
    const config = await this.vault.readSecret<{ secret: string }>('backend/jwt');
    
    if (!config?.secret) {
      throw new Error('JWT secret not found in Vault');
    }
    
    return config.secret;
  }

  /**
   * Get blockchain configuration
   */
  async getBlockchainConfig(): Promise<{
    rpc_url: string;
    private_key: string;
  }> {
    const config = await this.vault.readSecret<{
      rpc_url: string;
      private_key: string;
    }>('blockchain/arbitrum');
    
    if (!config) {
      throw new Error('Blockchain configuration not found in Vault');
    }
    
    return config;
  }

  /**
   * Get IPFS configuration
   */
  async getIPFSConfig(): Promise<{
    api_key: string;
    secret_key: string;
  }> {
    const config = await this.vault.readSecret<{
      api_key: string;
      secret_key: string;
    }>('oracle/pinata');
    
    if (!config) {
      throw new Error('IPFS configuration not found in Vault');
    }
    
    return config;
  }

  /**
   * Rotate JWT secret
   */
  async rotateJWTSecret(): Promise<string> {
    const newSecret = await this.vault.generateRandom(64);
    await this.vault.writeSecret('backend/jwt', { secret: newSecret });
    
    logger.info('JWT secret rotated successfully');
    return newSecret;
  }

  /**
   * Update blockchain private key
   */
  async updatePrivateKey(newPrivateKey: string): Promise<void> {
    const currentConfig = await this.getBlockchainConfig();
    await this.vault.writeSecret('blockchain/arbitrum', {
      ...currentConfig,
      private_key: newPrivateKey,
    });
    
    logger.info('Blockchain private key updated successfully');
  }
}

/**
 * Create secret manager instance
 */
export function createSecretManager(): SecretManager {
  return new SecretManager(getVaultClient());
}

export default VaultClient;