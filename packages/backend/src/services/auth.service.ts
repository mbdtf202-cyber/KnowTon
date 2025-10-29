import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { CeramicClient } from '@ceramicnetwork/http-client';
import { DID } from 'dids';
import { Ed25519Provider } from 'key-did-provider-ed25519';
import { getResolver } from 'key-did-resolver';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
const CERAMIC_API_URL = process.env.CERAMIC_API_URL || 'https://ceramic-clay.3boxlabs.com';

interface SIWEMessage {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface UserSession {
  address: string;
  did?: string;
  nonce: string;
  createdAt: Date;
  expiresAt: Date;
}

export class AuthService {
  private redis: Redis;
  private ceramic: CeramicClient;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 0,
    });

    this.ceramic = new CeramicClient(CERAMIC_API_URL);
  }

  /**
   * Generate a nonce for SIWE authentication
   */
  async generateNonce(address: string): Promise<string> {
    const nonce = uuidv4();
    const key = `auth:nonce:${address.toLowerCase()}`;
    
    // Store nonce with 10 minute expiry
    await this.redis.setex(key, 600, nonce);
    
    logger.info(`Generated nonce for address: ${address}`);
    return nonce;
  }

  /**
   * Verify nonce exists and is valid
   */
  async verifyNonce(address: string, nonce: string): Promise<boolean> {
    const key = `auth:nonce:${address.toLowerCase()}`;
    const storedNonce = await this.redis.get(key);
    
    if (!storedNonce || storedNonce !== nonce) {
      logger.warn(`Invalid nonce for address: ${address}`);
      return false;
    }
    
    // Delete nonce after verification (one-time use)
    await this.redis.del(key);
    return true;
  }

  /**
   * Parse and validate SIWE message
   */
  parseSIWEMessage(message: string): SIWEMessage {
    const lines = message.split('\n');
    const parsed: any = {};

    // Parse domain and address from first lines
    parsed.domain = lines[0].trim();
    parsed.address = lines[1].split(' ')[0].trim();
    
    // Parse statement
    const statementIndex = lines.findIndex(line => line.trim() && !line.includes(':'));
    if (statementIndex > 1) {
      parsed.statement = lines[statementIndex].trim();
    }

    // Parse key-value pairs
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        
        switch (key.trim()) {
          case 'URI':
            parsed.uri = value;
            break;
          case 'Version':
            parsed.version = value;
            break;
          case 'Chain ID':
            parsed.chainId = parseInt(value);
            break;
          case 'Nonce':
            parsed.nonce = value;
            break;
          case 'Issued At':
            parsed.issuedAt = value;
            break;
          case 'Expiration Time':
            parsed.expirationTime = value;
            break;
          case 'Not Before':
            parsed.notBefore = value;
            break;
          case 'Request ID':
            parsed.requestId = value;
            break;
        }
      }
    }

    return parsed as SIWEMessage;
  }

  /**
   * Verify SIWE signature
   */
  async verifySIWESignature(
    message: string,
    signature: string
  ): Promise<{ valid: boolean; address?: string; error?: string }> {
    try {
      // Parse SIWE message
      const siweMessage = this.parseSIWEMessage(message);
      
      // Verify nonce
      const nonceValid = await this.verifyNonce(siweMessage.address, siweMessage.nonce);
      if (!nonceValid) {
        return { valid: false, error: 'Invalid or expired nonce' };
      }

      // Verify expiration
      if (siweMessage.expirationTime) {
        const expirationDate = new Date(siweMessage.expirationTime);
        if (expirationDate < new Date()) {
          return { valid: false, error: 'Message has expired' };
        }
      }

      // Verify not before
      if (siweMessage.notBefore) {
        const notBeforeDate = new Date(siweMessage.notBefore);
        if (notBeforeDate > new Date()) {
          return { valid: false, error: 'Message not yet valid' };
        }
      }

      // Recover address from signature
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      // Verify address matches
      if (recoveredAddress.toLowerCase() !== siweMessage.address.toLowerCase()) {
        return { valid: false, error: 'Address mismatch' };
      }

      logger.info(`SIWE signature verified for address: ${recoveredAddress}`);
      return { valid: true, address: recoveredAddress };
    } catch (error) {
      logger.error('SIWE signature verification failed:', error);
      return { valid: false, error: 'Signature verification failed' };
    }
  }

  /**
   * Generate JWT access and refresh tokens
   */
  generateTokens(address: string, did?: string): AuthTokens {
    const payload = {
      address: address.toLowerCase(),
      did,
      type: 'access',
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'knowton-platform',
      subject: address.toLowerCase(),
    });

    const refreshPayload = {
      address: address.toLowerCase(),
      type: 'refresh',
      jti: uuidv4(), // Unique token ID for revocation
    };

    const refreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      issuer: 'knowton-platform',
      subject: address.toLowerCase(),
    });

    // Store refresh token in Redis
    const refreshKey = `auth:refresh:${address.toLowerCase()}:${refreshPayload.jti}`;
    this.redis.setex(refreshKey, 7 * 24 * 60 * 60, refreshToken); // 7 days

    logger.info(`Generated tokens for address: ${address}`);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  /**
   * Verify JWT access token
   */
  verifyAccessToken(token: string): { valid: boolean; payload?: any; error?: string } {
    try {
      const payload = jwt.verify(token, JWT_SECRET, {
        issuer: 'knowton-platform',
      });

      if (typeof payload === 'object' && payload.type === 'access') {
        return { valid: true, payload };
      }

      return { valid: false, error: 'Invalid token type' };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, error: 'Token expired' };
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, error: 'Invalid token' };
      }
      return { valid: false, error: 'Token verification failed' };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ success: boolean; tokens?: AuthTokens; error?: string }> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET, {
        issuer: 'knowton-platform',
      }) as any;

      if (payload.type !== 'refresh') {
        return { success: false, error: 'Invalid token type' };
      }

      // Check if refresh token exists in Redis (not revoked)
      const refreshKey = `auth:refresh:${payload.address}:${payload.jti}`;
      const storedToken = await this.redis.get(refreshKey);

      if (!storedToken) {
        return { success: false, error: 'Refresh token revoked or expired' };
      }

      // Get user's DID if exists
      const did = await this.getUserDID(payload.address);

      // Generate new tokens
      const tokens = this.generateTokens(payload.address, did);

      // Revoke old refresh token
      await this.redis.del(refreshKey);

      logger.info(`Refreshed tokens for address: ${payload.address}`);

      return { success: true, tokens };
    } catch (error) {
      logger.error('Token refresh failed:', error);
      if (error instanceof jwt.TokenExpiredError) {
        return { success: false, error: 'Refresh token expired' };
      }
      return { success: false, error: 'Token refresh failed' };
    }
  }

  /**
   * Revoke refresh token (logout)
   */
  async revokeRefreshToken(refreshToken: string): Promise<boolean> {
    try {
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
      const refreshKey = `auth:refresh:${payload.address}:${payload.jti}`;
      
      await this.redis.del(refreshKey);
      logger.info(`Revoked refresh token for address: ${payload.address}`);
      
      return true;
    } catch (error) {
      logger.error('Token revocation failed:', error);
      return false;
    }
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   */
  async revokeAllRefreshTokens(address: string): Promise<boolean> {
    try {
      const pattern = `auth:refresh:${address.toLowerCase()}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      
      logger.info(`Revoked all refresh tokens for address: ${address}`);
      return true;
    } catch (error) {
      logger.error('Bulk token revocation failed:', error);
      return false;
    }
  }

  /**
   * Create or resolve DID using Ceramic Network
   */
  async createOrResolveDID(address: string): Promise<string> {
    try {
      // Check if DID already exists in cache
      const cachedDID = await this.getUserDID(address);
      if (cachedDID) {
        return cachedDID;
      }

      // For production, you would use proper DID creation with user's wallet
      // This is a simplified version using a deterministic DID
      const seed = ethers.keccak256(ethers.toUtf8Bytes(address.toLowerCase()));
      const seedBytes = ethers.getBytes(seed).slice(0, 32);
      
      const provider = new Ed25519Provider(seedBytes);
      const did = new DID({ provider, resolver: getResolver() });
      
      await did.authenticate();
      
      const didString = did.id;
      
      // Cache DID
      await this.setUserDID(address, didString);
      
      logger.info(`Created DID for address ${address}: ${didString}`);
      return didString;
    } catch (error) {
      logger.error('DID creation failed:', error);
      throw new Error('Failed to create DID');
    }
  }

  /**
   * Resolve DID to get profile information
   */
  async resolveDID(did: string): Promise<any> {
    try {
      // In production, query Ceramic for DID document
      // This is a placeholder implementation
      const didKey = `auth:did:${did}`;
      const profile = await this.redis.get(didKey);
      
      if (profile) {
        return JSON.parse(profile);
      }
      
      return null;
    } catch (error) {
      logger.error('DID resolution failed:', error);
      return null;
    }
  }

  /**
   * Store user's DID in cache
   */
  private async setUserDID(address: string, did: string): Promise<void> {
    const key = `auth:address:did:${address.toLowerCase()}`;
    await this.redis.set(key, did);
  }

  /**
   * Get user's DID from cache
   */
  private async getUserDID(address: string): Promise<string | null> {
    const key = `auth:address:did:${address.toLowerCase()}`;
    return await this.redis.get(key);
  }

  /**
   * Create user session
   */
  async createSession(address: string, did?: string): Promise<UserSession> {
    const session: UserSession = {
      address: address.toLowerCase(),
      did,
      nonce: uuidv4(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    const sessionKey = `auth:session:${address.toLowerCase()}`;
    await this.redis.setex(sessionKey, 24 * 60 * 60, JSON.stringify(session));

    return session;
  }

  /**
   * Get user session
   */
  async getSession(address: string): Promise<UserSession | null> {
    const sessionKey = `auth:session:${address.toLowerCase()}`;
    const sessionData = await this.redis.get(sessionKey);

    if (!sessionData) {
      return null;
    }

    return JSON.parse(sessionData);
  }

  /**
   * Delete user session
   */
  async deleteSession(address: string): Promise<void> {
    const sessionKey = `auth:session:${address.toLowerCase()}`;
    await this.redis.del(sessionKey);
  }

  /**
   * Complete authentication flow
   */
  async authenticate(message: string, signature: string): Promise<{
    success: boolean;
    tokens?: AuthTokens;
    did?: string;
    error?: string;
  }> {
    try {
      // Verify SIWE signature
      const verification = await this.verifySIWESignature(message, signature);
      
      if (!verification.valid || !verification.address) {
        return { success: false, error: verification.error };
      }

      // Create or resolve DID
      const did = await this.createOrResolveDID(verification.address);

      // Generate tokens
      const tokens = this.generateTokens(verification.address, did);

      // Create session
      await this.createSession(verification.address, did);

      return {
        success: true,
        tokens,
        did,
      };
    } catch (error) {
      logger.error('Authentication failed:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }
}

export const authService = new AuthService();
