import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  DeviceFingerprintService,
  DeviceInfo,
} from './device-fingerprint.service';

const prisma = new PrismaClient();

export interface UserDevice {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  deviceInfo: DeviceInfo;
  fingerprintHash: string;
  isActive: boolean;
  lastUsedAt: Date;
  firstSeenAt: Date;
  accessCount: number;
}

export interface DeviceBindingResult {
  success: boolean;
  device?: UserDevice;
  limitExceeded?: boolean;
  message?: string;
}

/**
 * Device Management Service
 * Manages device binding, tracking, and revocation
 */
export class DeviceManagementService {
  private fingerprintService: DeviceFingerprintService;
  private readonly MAX_DEVICES_PER_USER = 3;

  constructor() {
    this.fingerprintService = new DeviceFingerprintService();
  }

  /**
   * Register or update a device for a user
   * @param userId User ID
   * @param deviceInfo Device information from client
   * @param contentId Optional content ID being accessed
   * @returns Device binding result
   */
  async registerDevice(
    userId: string,
    deviceInfo: DeviceInfo,
    contentId?: string
  ): Promise<DeviceBindingResult> {
    try {
      // Generate device fingerprint
      const fingerprint = this.fingerprintService.generateFingerprint(
        deviceInfo
      );

      // Check if device already exists for this user
      const existingDevice = await prisma.userDevice.findFirst({
        where: {
          userId,
          deviceId: fingerprint.deviceId,
        },
      });

      if (existingDevice) {
        // Update existing device
        const updatedDevice = await prisma.userDevice.update({
          where: { id: existingDevice.id },
          data: {
            lastUsedAt: new Date(),
            accessCount: { increment: 1 },
            deviceInfo: fingerprint.deviceInfo as any,
            isActive: true,
          },
        });

        logger.info('Device updated', {
          userId,
          deviceId: fingerprint.deviceId,
          accessCount: updatedDevice.accessCount,
        });

        return {
          success: true,
          device: this.mapToUserDevice(updatedDevice),
        };
      }

      // Check device limit
      const activeDeviceCount = await this.getActiveDeviceCount(userId);
      if (activeDeviceCount >= this.MAX_DEVICES_PER_USER) {
        logger.warn('Device limit exceeded', {
          userId,
          activeDeviceCount,
          maxDevices: this.MAX_DEVICES_PER_USER,
        });

        return {
          success: false,
          limitExceeded: true,
          message: `Maximum ${this.MAX_DEVICES_PER_USER} devices allowed. Please revoke a device first.`,
        };
      }

      // Create new device
      const deviceName = this.fingerprintService.generateDeviceName(
        fingerprint.deviceInfo
      );

      const newDevice = await prisma.userDevice.create({
        data: {
          userId,
          deviceId: fingerprint.deviceId,
          deviceName,
          deviceInfo: fingerprint.deviceInfo as any,
          fingerprintHash: fingerprint.fingerprintHash,
          isActive: true,
          lastUsedAt: new Date(),
          firstSeenAt: new Date(),
          accessCount: 1,
        },
      });

      logger.info('New device registered', {
        userId,
        deviceId: fingerprint.deviceId,
        deviceName,
      });

      return {
        success: true,
        device: this.mapToUserDevice(newDevice),
      };
    } catch (error) {
      logger.error('Failed to register device', { userId, error });
      return {
        success: false,
        message: 'Failed to register device',
      };
    }
  }

  /**
   * Get all devices for a user
   * @param userId User ID
   * @returns Array of user devices
   */
  async getUserDevices(userId: string): Promise<UserDevice[]> {
    try {
      const devices = await prisma.userDevice.findMany({
        where: { userId },
        orderBy: { lastUsedAt: 'desc' },
      });

      return devices.map((device) => this.mapToUserDevice(device));
    } catch (error) {
      logger.error('Failed to get user devices', { userId, error });
      return [];
    }
  }

  /**
   * Get active device count for a user
   * @param userId User ID
   * @returns Number of active devices
   */
  async getActiveDeviceCount(userId: string): Promise<number> {
    try {
      return await prisma.userDevice.count({
        where: {
          userId,
          isActive: true,
        },
      });
    } catch (error) {
      logger.error('Failed to get active device count', { userId, error });
      return 0;
    }
  }

  /**
   * Revoke a device for a user
   * @param userId User ID
   * @param deviceId Device ID to revoke
   * @returns True if successful
   */
  async revokeDevice(userId: string, deviceId: string): Promise<boolean> {
    try {
      const device = await prisma.userDevice.findFirst({
        where: {
          userId,
          deviceId,
        },
      });

      if (!device) {
        logger.warn('Device not found for revocation', { userId, deviceId });
        return false;
      }

      await prisma.userDevice.update({
        where: { id: device.id },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });

      // Also revoke any active access tokens for this device
      await this.revokeDeviceAccessTokens(userId, deviceId);

      logger.info('Device revoked', { userId, deviceId });

      return true;
    } catch (error) {
      logger.error('Failed to revoke device', { userId, deviceId, error });
      return false;
    }
  }

  /**
   * Revoke all devices for a user
   * @param userId User ID
   * @returns Number of devices revoked
   */
  async revokeAllDevices(userId: string): Promise<number> {
    try {
      const result = await prisma.userDevice.updateMany({
        where: {
          userId,
          isActive: true,
        },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });

      // Revoke all access tokens
      await prisma.purchase.updateMany({
        where: {
          userId,
          accessToken: { not: null },
        },
        data: {
          accessToken: null,
          accessExpiresAt: null,
        },
      });

      logger.info('All devices revoked', { userId, count: result.count });

      return result.count;
    } catch (error) {
      logger.error('Failed to revoke all devices', { userId, error });
      return 0;
    }
  }

  /**
   * Verify if a device is authorized for a user
   * @param userId User ID
   * @param deviceInfo Device information
   * @returns True if device is authorized
   */
  async verifyDevice(
    userId: string,
    deviceInfo: DeviceInfo
  ): Promise<boolean> {
    try {
      const fingerprint = this.fingerprintService.generateFingerprint(
        deviceInfo
      );

      const device = await prisma.userDevice.findFirst({
        where: {
          userId,
          deviceId: fingerprint.deviceId,
          isActive: true,
        },
      });

      return !!device;
    } catch (error) {
      logger.error('Failed to verify device', { userId, error });
      return false;
    }
  }

  /**
   * Get device by ID
   * @param userId User ID
   * @param deviceId Device ID
   * @returns User device or null
   */
  async getDevice(
    userId: string,
    deviceId: string
  ): Promise<UserDevice | null> {
    try {
      const device = await prisma.userDevice.findFirst({
        where: {
          userId,
          deviceId,
        },
      });

      return device ? this.mapToUserDevice(device) : null;
    } catch (error) {
      logger.error('Failed to get device', { userId, deviceId, error });
      return null;
    }
  }

  /**
   * Clean up inactive devices (not used in 90 days)
   * @param userId User ID
   * @returns Number of devices cleaned up
   */
  async cleanupInactiveDevices(userId: string): Promise<number> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await prisma.userDevice.deleteMany({
        where: {
          userId,
          lastUsedAt: {
            lt: ninetyDaysAgo,
          },
          isActive: false,
        },
      });

      logger.info('Inactive devices cleaned up', {
        userId,
        count: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup inactive devices', { userId, error });
      return 0;
    }
  }

  /**
   * Revoke access tokens for a specific device
   * @param userId User ID
   * @param deviceId Device ID
   */
  private async revokeDeviceAccessTokens(
    userId: string,
    deviceId: string
  ): Promise<void> {
    try {
      // Find all purchases with access tokens for this device
      const purchases = await prisma.purchase.findMany({
        where: {
          userId,
          accessToken: { not: null },
        },
      });

      // Filter purchases that have this deviceId in metadata
      const devicePurchases = purchases.filter((purchase) => {
        const metadata = purchase.metadata as any;
        return metadata?.deviceId === deviceId;
      });

      // Revoke tokens
      for (const purchase of devicePurchases) {
        await prisma.purchase.update({
          where: { id: purchase.id },
          data: {
            accessToken: null,
            accessExpiresAt: null,
          },
        });
      }

      logger.info('Device access tokens revoked', {
        userId,
        deviceId,
        count: devicePurchases.length,
      });
    } catch (error) {
      logger.error('Failed to revoke device access tokens', {
        userId,
        deviceId,
        error,
      });
    }
  }

  /**
   * Map database model to UserDevice interface
   * @param device Database device model
   * @returns UserDevice
   */
  private mapToUserDevice(device: any): UserDevice {
    return {
      id: device.id,
      userId: device.userId,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      deviceInfo: device.deviceInfo as DeviceInfo,
      fingerprintHash: device.fingerprintHash,
      isActive: device.isActive,
      lastUsedAt: device.lastUsedAt,
      firstSeenAt: device.firstSeenAt,
      accessCount: device.accessCount,
    };
  }

  /**
   * Get device statistics for a user
   * @param userId User ID
   * @returns Device statistics
   */
  async getDeviceStatistics(userId: string): Promise<{
    totalDevices: number;
    activeDevices: number;
    revokedDevices: number;
    maxDevices: number;
    canAddDevice: boolean;
  }> {
    try {
      const [totalDevices, activeDevices] = await Promise.all([
        prisma.userDevice.count({ where: { userId } }),
        prisma.userDevice.count({ where: { userId, isActive: true } }),
      ]);

      return {
        totalDevices,
        activeDevices,
        revokedDevices: totalDevices - activeDevices,
        maxDevices: this.MAX_DEVICES_PER_USER,
        canAddDevice: activeDevices < this.MAX_DEVICES_PER_USER,
      };
    } catch (error) {
      logger.error('Failed to get device statistics', { userId, error });
      return {
        totalDevices: 0,
        activeDevices: 0,
        revokedDevices: 0,
        maxDevices: this.MAX_DEVICES_PER_USER,
        canAddDevice: true,
      };
    }
  }
}
