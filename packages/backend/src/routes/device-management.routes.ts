import express, { Request, Response } from 'express';
import { DeviceManagementService } from '../services/device-management.service';
import { logger } from '../utils/logger';

const router = express.Router();
const deviceManagementService = new DeviceManagementService();

/**
 * Register or update a device
 * POST /api/devices/register
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { userId, deviceInfo, contentId } = req.body;

    if (!userId || !deviceInfo) {
      return res.status(400).json({
        success: false,
        message: 'userId and deviceInfo are required',
      });
    }

    // Validate device info
    if (!deviceInfo.userAgent || !deviceInfo.ipAddress) {
      return res.status(400).json({
        success: false,
        message: 'userAgent and ipAddress are required in deviceInfo',
      });
    }

    const result = await deviceManagementService.registerDevice(
      userId,
      deviceInfo,
      contentId
    );

    if (!result.success) {
      return res.status(result.limitExceeded ? 403 : 500).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Device registration failed', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to register device',
    });
  }
});

/**
 * Get all devices for a user
 * GET /api/devices/:userId
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const devices = await deviceManagementService.getUserDevices(userId);

    res.json({
      success: true,
      devices,
      count: devices.length,
    });
  } catch (error) {
    logger.error('Failed to get user devices', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to get devices',
    });
  }
});

/**
 * Get device statistics for a user
 * GET /api/devices/:userId/statistics
 */
router.get('/:userId/statistics', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const statistics = await deviceManagementService.getDeviceStatistics(
      userId
    );

    res.json({
      success: true,
      statistics,
    });
  } catch (error) {
    logger.error('Failed to get device statistics', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to get device statistics',
    });
  }
});

/**
 * Get a specific device
 * GET /api/devices/:userId/:deviceId
 */
router.get('/:userId/:deviceId', async (req: Request, res: Response) => {
  try {
    const { userId, deviceId } = req.params;

    const device = await deviceManagementService.getDevice(userId, deviceId);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    res.json({
      success: true,
      device,
    });
  } catch (error) {
    logger.error('Failed to get device', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to get device',
    });
  }
});

/**
 * Revoke a device
 * DELETE /api/devices/:userId/:deviceId
 */
router.delete('/:userId/:deviceId', async (req: Request, res: Response) => {
  try {
    const { userId, deviceId } = req.params;

    const success = await deviceManagementService.revokeDevice(
      userId,
      deviceId
    );

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Device not found or already revoked',
      });
    }

    res.json({
      success: true,
      message: 'Device revoked successfully',
    });
  } catch (error) {
    logger.error('Failed to revoke device', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to revoke device',
    });
  }
});

/**
 * Revoke all devices for a user
 * DELETE /api/devices/:userId/all
 */
router.delete('/:userId/all', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const count = await deviceManagementService.revokeAllDevices(userId);

    res.json({
      success: true,
      message: `${count} device(s) revoked successfully`,
      count,
    });
  } catch (error) {
    logger.error('Failed to revoke all devices', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to revoke all devices',
    });
  }
});

/**
 * Verify a device
 * POST /api/devices/verify
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { userId, deviceInfo } = req.body;

    if (!userId || !deviceInfo) {
      return res.status(400).json({
        success: false,
        message: 'userId and deviceInfo are required',
      });
    }

    const isAuthorized = await deviceManagementService.verifyDevice(
      userId,
      deviceInfo
    );

    res.json({
      success: true,
      authorized: isAuthorized,
    });
  } catch (error) {
    logger.error('Device verification failed', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to verify device',
    });
  }
});

/**
 * Cleanup inactive devices
 * POST /api/devices/:userId/cleanup
 */
router.post('/:userId/cleanup', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const count = await deviceManagementService.cleanupInactiveDevices(userId);

    res.json({
      success: true,
      message: `${count} inactive device(s) cleaned up`,
      count,
    });
  } catch (error) {
    logger.error('Failed to cleanup inactive devices', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup inactive devices',
    });
  }
});

export default router;
