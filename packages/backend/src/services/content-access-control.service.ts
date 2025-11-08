import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import { DeviceManagementService } from './device-management.service';
import { DeviceInfo } from './device-fingerprint.service';

const prisma = new PrismaClient();

export interface AccessVerificationResult {
  granted: boolean;
  reason?: string;
  deviceLimit?: boolean;
  concurrentLimit?: boolean;
}

export interface AccessToken {
  token: string;
  contentId: string;
  userId: string;
  expiresAt: Date;
  deviceId?: string;
}

/**
 * Content Access Control Service
 * Manages access permissions, device binding, and concurrent access limits
 */
export class ContentAccessControlService {
  private readonly MAX_DEVICES_PER_USER = 3;
  private readonly MAX_CONCURRENT_STREAMS = 1;
  private readonly ACCESS_TOKEN_VALIDITY = 24 * 60 * 60 * 1000; // 24 hours
  private deviceManagementService: DeviceManagementService;

  constructor() {
    this.deviceManagementService = new DeviceManagementService();
  }

  /**
   * Verify if a user has access to content
   * @param userId User ID
   * @param contentId Content ID
   * @param accessToken Optional access token
   * @param deviceInfo Optional device information for device binding check
   * @returns Access verification result
   */
  async verifyContentAccess(
    userId: string,
    contentId: string,
    accessToken?: string,
    deviceInfo?: DeviceInfo
  ): Promise<AccessVerificationResult> {
    try {
      // Check if user has purchased the content
      const purchase = await prisma.purchase.findFirst({
        where: {
          userId,
          contentId,
          status: 'completed',
        },
      });

      if (!purchase) {
        return {
          granted: false,
          reason: 'Content not purchased',
        };
      }

      // Check if access token is provided and valid
      if (accessToken) {
        const tokenValid = await this.verifyAccessToken(
          accessToken,
          userId,
          contentId
        );

        if (!tokenValid) {
          return {
            granted: false,
            reason: 'Invalid or expired access token',
          };
        }
      }

      // Check device binding if device info is provided
      if (deviceInfo) {
        const isDeviceAuthorized = await this.deviceManagementService.verifyDevice(
          userId,
          deviceInfo
        );

        if (!isDeviceAuthorized) {
          // Try to register the device
          const registrationResult = await this.deviceManagementService.registerDevice(
            userId,
            deviceInfo,
            contentId
          );

          if (!registrationResult.success) {
            return {
              granted: false,
              reason: registrationResult.message || 'Device not authorized',
              deviceLimit: registrationResult.limitExceeded,
            };
          }
        }
      }

      // Check device limit (legacy check for backward compatibility)
      const deviceCount = await this.getUserDeviceCount(userId, contentId);
      if (deviceCount >= this.MAX_DEVICES_PER_USER) {
        return {
          granted: false,
          reason: 'Device limit exceeded',
          deviceLimit: true,
        };
      }

      // Check concurrent access limit
      const concurrentAccess = await this.getConcurrentAccessCount(
        userId,
        contentId
      );
      if (concurrentAccess >= this.MAX_CONCURRENT_STREAMS) {
        return {
          granted: false,
          reason: 'Concurrent access limit exceeded',
          concurrentLimit: true,
        };
      }

      return {
        granted: true,
      };
    } catch (error) {
      logger.error('Access verification failed', { userId, contentId, error });
      return {
        granted: false,
        reason: 'Access verification error',
      };
    }
  }

  /**
   * Generate a temporary access token for content download
   * @param userId User ID
   * @param contentId Content ID
   * @param deviceId Optional device identifier
   * @returns Access token
   */
  async generateAccessToken(
    userId: string,
    contentId: string,
    deviceId?: string
  ): Promise<string> {
    try {
      // Generate random token
      const token = crypto.randomBytes(32).toString('hex');

      // Calculate expiration
      const expiresAt = new Date(Date.now() + this.ACCESS_TOKEN_VALIDITY);

      // Store token in database (using Purchase metadata for now)
      const purchase = await prisma.purchase.findFirst({
        where: {
          userId,
          contentId,
          status: 'completed',
        },
      });

      if (!purchase) {
        throw new Error('Purchase not found');
      }

      await prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          accessToken: token,
          accessExpiresAt: expiresAt,
          metadata: {
            ...(purchase.metadata as any),
            deviceId,
            tokenGeneratedAt: new Date().toISOString(),
          },
        },
      });

      logger.info('Access token generated', {
        userId,
        contentId,
        expiresAt,
      });

      return token;
    } catch (error) {
      logger.error('Failed to generate access token', {
        userId,
        contentId,
        error,
      });
      throw error;
    }
  }

  /**
   * Verify an access token
   * @param token Access token
   * @param userId User ID
   * @param contentId Content ID
   * @returns True if valid
   */
  async verifyAccessToken(
    token: string,
    userId: string,
    contentId: string
  ): Promise<boolean> {
    try {
      const purchase = await prisma.purchase.findFirst({
        where: {
          userId,
          contentId,
          accessToken: token,
          status: 'completed',
        },
      });

      if (!purchase) {
        return false;
      }

      // Check if token is expired
      if (purchase.accessExpiresAt && purchase.accessExpiresAt < new Date()) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Token verification failed', { error });
      return false;
    }
  }

  /**
   * Refresh an access token
   * @param oldToken Old access token
   * @param userId User ID
   * @param contentId Content ID
   * @returns New access token
   */
  async refreshAccessToken(
    oldToken: string,
    userId: string,
    contentId: string
  ): Promise<string> {
    try {
      // Verify old token
      const isValid = await this.verifyAccessToken(oldToken, userId, contentId);

      if (!isValid) {
        throw new Error('Invalid token');
      }

      // Generate new token
      return await this.generateAccessToken(userId, contentId);
    } catch (error) {
      logger.error('Failed to refresh access token', { error });
      throw error;
    }
  }

  /**
   * Get number of devices user has accessed content from
   * @param userId User ID
   * @param contentId Content ID
   * @returns Device count
   */
  async getUserDeviceCount(
    userId: string,
    contentId: string
  ): Promise<number> {
    try {
      // Get unique device IDs from access logs (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const devices = await prisma.contentAccessLog.findMany({
        where: {
          userId,
          contentId,
          timestamp: {
            gte: thirtyDaysAgo,
          },
          deviceId: {
            not: null,
          },
        },
        distinct: ['deviceId'],
        select: {
          deviceId: true,
        },
      });

      return devices.length;
    } catch (error) {
      logger.error('Failed to get device count', { error });
      return 0;
    }
  }

  /**
   * Get current concurrent access count
   * @param userId User ID
   * @param contentId Content ID
   * @returns Concurrent access count
   */
  async getConcurrentAccessCount(
    userId: string,
    contentId: string
  ): Promise<number> {
    try {
      // Get active streams (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const activeStreams = await prisma.contentAccessLog.count({
        where: {
          userId,
          contentId,
          accessType: 'stream',
          timestamp: {
            gte: fiveMinutesAgo,
          },
        },
      });

      return activeStreams;
    } catch (error) {
      logger.error('Failed to get concurrent access count', { error });
      return 0;
    }
  }

  /**
   * Check if user can encrypt content (creator or admin)
   * @param userId User ID
   * @param contentId Content ID
   * @returns True if user can encrypt
   */
  async canEncryptContent(
    userId: string,
    contentId: string
  ): Promise<boolean> {
    try {
      // Check if user is the creator of the content
      const content = await prisma.content.findUnique({
        where: { id: contentId },
        include: {
          creator: true,
        },
      });

      if (!content) {
        return false;
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return false;
      }

      // Check if user is admin
      if (user.role === 'admin') {
        return true;
      }

      // Check if user is the creator
      if (user.walletAddress === content.creatorAddress) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to check encryption permission', { error });
      return false;
    }
  }

  /**
   * Check if user can view access logs (creator or admin)
   * @param userId User ID
   * @param contentId Content ID
   * @returns True if user can view logs
   */
  async canViewAccessLogs(
    userId: string,
    contentId: string
  ): Promise<boolean> {
    // Same logic as canEncryptContent
    return this.canEncryptContent(userId, contentId);
  }

  /**
   * Revoke access token
   * @param token Access token
   * @param userId User ID
   * @param contentId Content ID
   */
  async revokeAccessToken(
    token: string,
    userId: string,
    contentId: string
  ): Promise<void> {
    try {
      const purchase = await prisma.purchase.findFirst({
        where: {
          userId,
          contentId,
          accessToken: token,
        },
      });

      if (purchase) {
        await prisma.purchase.update({
          where: { id: purchase.id },
          data: {
            accessToken: null,
            accessExpiresAt: null,
          },
        });

        logger.info('Access token revoked', { userId, contentId });
      }
    } catch (error) {
      logger.error('Failed to revoke access token', { error });
      throw error;
    }
  }

  /**
   * Get user's active access tokens
   * @param userId User ID
   * @returns Array of active tokens
   */
  async getUserActiveTokens(userId: string): Promise<AccessToken[]> {
    try {
      const purchases = await prisma.purchase.findMany({
        where: {
          userId,
          status: 'completed',
          accessToken: {
            not: null,
          },
          accessExpiresAt: {
            gte: new Date(),
          },
        },
      });

      return purchases.map((purchase) => ({
        token: purchase.accessToken!,
        contentId: purchase.contentId!,
        userId: purchase.userId!,
        expiresAt: purchase.accessExpiresAt!,
        deviceId: (purchase.metadata as any)?.deviceId,
      }));
    } catch (error) {
      logger.error('Failed to get active tokens', { error });
      return [];
    }
  }
}
