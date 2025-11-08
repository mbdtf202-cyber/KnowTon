import crypto from 'crypto';
import { logger } from '../utils/logger';

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

export interface DeviceFingerprint {
  deviceId: string;
  deviceInfo: DeviceInfo;
  fingerprintHash: string;
  confidence: number; // 0-1, how unique the fingerprint is
}

/**
 * Device Fingerprinting Service
 * Generates unique device identifiers based on browser/device characteristics
 */
export class DeviceFingerprintService {
  /**
   * Generate a device fingerprint from device information
   * @param deviceInfo Device information from client
   * @returns Device fingerprint with unique ID
   */
  generateFingerprint(deviceInfo: DeviceInfo): DeviceFingerprint {
    try {
      // Parse user agent to extract browser and OS info
      const parsedUA = this.parseUserAgent(deviceInfo.userAgent);

      // Combine all available device characteristics
      const fingerprintData = {
        userAgent: deviceInfo.userAgent,
        platform: deviceInfo.platform || parsedUA.platform,
        browser: deviceInfo.browser || parsedUA.browser,
        browserVersion: deviceInfo.browserVersion || parsedUA.browserVersion,
        os: deviceInfo.os || parsedUA.os,
        osVersion: deviceInfo.osVersion || parsedUA.osVersion,
        screenResolution: deviceInfo.screenResolution || 'unknown',
        timezone: deviceInfo.timezone || 'unknown',
        language: deviceInfo.language || 'unknown',
      };

      // Create a hash of the fingerprint data
      const fingerprintString = JSON.stringify(fingerprintData);
      const fingerprintHash = crypto
        .createHash('sha256')
        .update(fingerprintString)
        .digest('hex');

      // Generate a shorter device ID (first 16 chars of hash)
      const deviceId = fingerprintHash.substring(0, 16);

      // Calculate confidence score based on available data
      const confidence = this.calculateConfidence(fingerprintData);

      logger.info('Device fingerprint generated', {
        deviceId,
        confidence,
        hasScreenResolution: !!deviceInfo.screenResolution,
        hasTimezone: !!deviceInfo.timezone,
      });

      return {
        deviceId,
        deviceInfo: {
          ...deviceInfo,
          ...parsedUA,
        },
        fingerprintHash,
        confidence,
      };
    } catch (error) {
      logger.error('Failed to generate device fingerprint', { error });
      throw error;
    }
  }

  /**
   * Parse user agent string to extract browser and OS information
   * @param userAgent User agent string
   * @returns Parsed information
   */
  private parseUserAgent(userAgent: string): {
    browser: string;
    browserVersion: string;
    os: string;
    osVersion: string;
    platform: string;
  } {
    const ua = userAgent.toLowerCase();

    // Detect browser
    let browser = 'unknown';
    let browserVersion = 'unknown';

    if (ua.includes('edg/')) {
      browser = 'Edge';
      browserVersion = this.extractVersion(ua, 'edg/');
    } else if (ua.includes('chrome/')) {
      browser = 'Chrome';
      browserVersion = this.extractVersion(ua, 'chrome/');
    } else if (ua.includes('firefox/')) {
      browser = 'Firefox';
      browserVersion = this.extractVersion(ua, 'firefox/');
    } else if (ua.includes('safari/') && !ua.includes('chrome')) {
      browser = 'Safari';
      browserVersion = this.extractVersion(ua, 'version/');
    }

    // Detect OS
    let os = 'unknown';
    let osVersion = 'unknown';
    let platform = 'unknown';

    if (ua.includes('windows')) {
      os = 'Windows';
      platform = 'desktop';
      if (ua.includes('windows nt 10.0')) osVersion = '10';
      else if (ua.includes('windows nt 6.3')) osVersion = '8.1';
      else if (ua.includes('windows nt 6.2')) osVersion = '8';
      else if (ua.includes('windows nt 6.1')) osVersion = '7';
    } else if (ua.includes('mac os x')) {
      os = 'macOS';
      platform = 'desktop';
      const match = ua.match(/mac os x (\d+[._]\d+[._]?\d*)/);
      if (match) osVersion = match[1].replace(/_/g, '.');
    } else if (ua.includes('android')) {
      os = 'Android';
      platform = 'mobile';
      const match = ua.match(/android (\d+\.?\d*)/);
      if (match) osVersion = match[1];
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      os = ua.includes('ipad') ? 'iPadOS' : 'iOS';
      platform = 'mobile';
      const match = ua.match(/os (\d+[._]\d+[._]?\d*)/);
      if (match) osVersion = match[1].replace(/_/g, '.');
    } else if (ua.includes('linux')) {
      os = 'Linux';
      platform = 'desktop';
    }

    return {
      browser,
      browserVersion,
      os,
      osVersion,
      platform,
    };
  }

  /**
   * Extract version number from user agent string
   * @param ua User agent string (lowercase)
   * @param prefix Version prefix to search for
   * @returns Version string
   */
  private extractVersion(ua: string, prefix: string): string {
    const index = ua.indexOf(prefix);
    if (index === -1) return 'unknown';

    const versionStart = index + prefix.length;
    const versionEnd = ua.indexOf(' ', versionStart);
    const version = ua.substring(
      versionStart,
      versionEnd === -1 ? undefined : versionEnd
    );

    return version.split('.')[0]; // Return major version only
  }

  /**
   * Calculate confidence score for fingerprint uniqueness
   * @param fingerprintData Fingerprint data
   * @returns Confidence score (0-1)
   */
  private calculateConfidence(fingerprintData: any): number {
    let score = 0;
    let maxScore = 0;

    // User agent (always available)
    maxScore += 20;
    if (fingerprintData.userAgent !== 'unknown') score += 20;

    // Browser info
    maxScore += 15;
    if (fingerprintData.browser !== 'unknown') score += 15;

    // OS info
    maxScore += 15;
    if (fingerprintData.os !== 'unknown') score += 15;

    // Screen resolution (highly unique)
    maxScore += 25;
    if (fingerprintData.screenResolution !== 'unknown') score += 25;

    // Timezone (moderately unique)
    maxScore += 15;
    if (fingerprintData.timezone !== 'unknown') score += 15;

    // Language
    maxScore += 10;
    if (fingerprintData.language !== 'unknown') score += 10;

    return score / maxScore;
  }

  /**
   * Verify if a device fingerprint matches stored fingerprint
   * @param currentFingerprint Current device fingerprint
   * @param storedFingerprint Stored device fingerprint hash
   * @returns True if fingerprints match
   */
  verifyFingerprint(
    currentFingerprint: string,
    storedFingerprint: string
  ): boolean {
    return currentFingerprint === storedFingerprint;
  }

  /**
   * Generate a device name from device info for display purposes
   * @param deviceInfo Device information
   * @returns Human-readable device name
   */
  generateDeviceName(deviceInfo: DeviceInfo): string {
    const parts: string[] = [];

    if (deviceInfo.browser && deviceInfo.browser !== 'unknown') {
      parts.push(deviceInfo.browser);
    }

    if (deviceInfo.os && deviceInfo.os !== 'unknown') {
      parts.push(`on ${deviceInfo.os}`);
    }

    if (deviceInfo.platform && deviceInfo.platform !== 'unknown') {
      parts.push(`(${deviceInfo.platform})`);
    }

    return parts.length > 0 ? parts.join(' ') : 'Unknown Device';
  }
}
