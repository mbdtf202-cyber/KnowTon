import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface DeviceInfo {
  userAgent: string;
  ipAddress: string;
  platform?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
}

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

export interface DeviceStatistics {
  totalDevices: number;
  activeDevices: number;
  revokedDevices: number;
  maxDevices: number;
  canAddDevice: boolean;
}

export const useDeviceManagement = (userId?: string) => {
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [statistics, setStatistics] = useState<DeviceStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get device information from browser
   */
  const getDeviceInfo = useCallback(async (): Promise<DeviceInfo> => {
    // Get IP address from external service (in production, this should be done server-side)
    let ipAddress = 'unknown';
    try {
      const ipResponse = await axios.get('https://api.ipify.org?format=json');
      ipAddress = ipResponse.data.ip;
    } catch (err) {
      console.warn('Failed to get IP address', err);
    }

    return {
      userAgent: navigator.userAgent,
      ipAddress,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    };
  }, []);

  /**
   * Register current device
   */
  const registerDevice = useCallback(
    async (contentId?: string) => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      setLoading(true);
      setError(null);

      try {
        const deviceInfo = await getDeviceInfo();

        const response = await axios.post(
          `${API_BASE_URL}/api/v1/devices/register`,
          {
            userId,
            deviceInfo,
            contentId,
          }
        );

        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to register device');
        }

        return response.data;
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message || err.message || 'Failed to register device';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [userId, getDeviceInfo]
  );

  /**
   * Fetch all devices for the user
   */
  const fetchDevices = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/devices/${userId}`
      );

      if (response.data.success) {
        setDevices(response.data.devices);
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || 'Failed to fetch devices';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Fetch device statistics
   */
  const fetchStatistics = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/devices/${userId}/statistics`
      );

      if (response.data.success) {
        setStatistics(response.data.statistics);
      }
    } catch (err: any) {
      console.error('Failed to fetch device statistics', err);
    }
  }, [userId]);

  /**
   * Revoke a device
   */
  const revokeDevice = useCallback(
    async (deviceId: string) => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      setLoading(true);
      setError(null);

      try {
        const response = await axios.delete(
          `${API_BASE_URL}/api/v1/devices/${userId}/${deviceId}`
        );

        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to revoke device');
        }

        // Refresh devices list
        await fetchDevices();
        await fetchStatistics();

        return response.data;
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message || err.message || 'Failed to revoke device';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [userId, fetchDevices, fetchStatistics]
  );

  /**
   * Revoke all devices
   */
  const revokeAllDevices = useCallback(async () => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/v1/devices/${userId}/all`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to revoke all devices');
      }

      // Refresh devices list
      await fetchDevices();
      await fetchStatistics();

      return response.data;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Failed to revoke all devices';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, fetchDevices, fetchStatistics]);

  /**
   * Verify current device
   */
  const verifyDevice = useCallback(async () => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const deviceInfo = await getDeviceInfo();

      const response = await axios.post(
        `${API_BASE_URL}/api/v1/devices/verify`,
        {
          userId,
          deviceInfo,
        }
      );

      return response.data.authorized;
    } catch (err: any) {
      console.error('Failed to verify device', err);
      return false;
    }
  }, [userId, getDeviceInfo]);

  /**
   * Cleanup inactive devices
   */
  const cleanupInactiveDevices = useCallback(async () => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/devices/${userId}/cleanup`
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || 'Failed to cleanup inactive devices'
        );
      }

      // Refresh devices list
      await fetchDevices();
      await fetchStatistics();

      return response.data;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Failed to cleanup inactive devices';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, fetchDevices, fetchStatistics]);

  // Auto-fetch devices and statistics when userId changes
  useEffect(() => {
    if (userId) {
      fetchDevices();
      fetchStatistics();
    }
  }, [userId, fetchDevices, fetchStatistics]);

  return {
    devices,
    statistics,
    loading,
    error,
    registerDevice,
    fetchDevices,
    fetchStatistics,
    revokeDevice,
    revokeAllDevices,
    verifyDevice,
    cleanupInactiveDevices,
    getDeviceInfo,
  };
};
