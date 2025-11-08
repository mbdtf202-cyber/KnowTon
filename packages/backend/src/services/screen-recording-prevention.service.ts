import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

export interface RecordingAttempt {
  userId: string;
  contentId: string;
  detectionMethod: 'api' | 'browser' | 'behavior' | 'tool';
  toolName?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: any;
  severity: 'low' | 'medium' | 'high';
}

export interface DynamicWatermarkConfig {
  userId: string;
  contentId: string;
  sessionId: string;
  text: string;
  updateInterval: number; // milliseconds
  positions: Array<{ x: number; y: number }>;
  opacity: number;
  fontSize: number;
  color: string;
}

export interface RecordingPreventionStats {
  totalAttempts: number;
  blockedAttempts: number;
  byMethod: Record<string, number>;
  bySeverity: Record<string, number>;
  topOffenders: Array<{ userId: string; attempts: number }>;
}

/**
 * Screen Recording Prevention Service
 * Implements dynamic watermarks, recording detection, and attempt logging
 */
export class ScreenRecordingPreventionService {
  private readonly KNOWN_RECORDING_TOOLS = [
    'obs',
    'obs-studio',
    'camtasia',
    'bandicam',
    'fraps',
    'screenflow',
    'snagit',
    'quicktime',
    'zoom',
    'loom',
    'screencastify',
    'nimbus',
    'apowersoft',
    'icecream',
    'movavi',
  ];

  private readonly SUSPICIOUS_EXTENSIONS = [
    'screen-recorder',
    'video-capture',
    'screen-capture',
    'screencastify',
    'loom',
    'nimbus',
  ];

  private readonly MAX_ATTEMPTS_BEFORE_BAN = 5;
  private readonly BAN_DURATION_HOURS = 24;

  /**
   * Generate dynamic watermark configuration for a playback session
   */
  async generateDynamicWatermark(
    userId: string,
    contentId: string,
    sessionId: string
  ): Promise<DynamicWatermarkConfig> {
    try {
      // Get user info for watermark text
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, walletAddress: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Create watermark text with user identifier and timestamp
      const watermarkText = this.createWatermarkText(user, sessionId);

      // Generate random positions for watermark rotation
      const positions = this.generateWatermarkPositions();

      const config: DynamicWatermarkConfig = {
        userId,
        contentId,
        sessionId,
        text: watermarkText,
        updateInterval: 5000, // Update every 5 seconds
        positions,
        opacity: 0.3,
        fontSize: 14,
        color: '#FFFFFF',
      };

      // Store watermark session
      await this.storeWatermarkSession(config);

      logger.info('Dynamic watermark generated', {
        userId,
        contentId,
        sessionId,
      });

      return config;
    } catch (error) {
      logger.error('Error generating dynamic watermark', { error });
      throw error;
    }
  }

  /**
   * Create watermark text with user identifier
   */
  private createWatermarkText(
    user: { id: string; email: string | null; walletAddress: string | null },
    sessionId: string
  ): string {
    const identifier = user.email || user.walletAddress || user.id;
    const shortId = identifier.substring(0, 8);
    const timestamp = new Date().toISOString().substring(0, 16);
    const sessionShort = sessionId.substring(0, 6);

    return `${shortId} | ${timestamp} | ${sessionShort}`;
  }

  /**
   * Generate random positions for watermark rotation
   */
  private generateWatermarkPositions(): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];
    const gridSize = 4; // 4x4 grid

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        positions.push({
          x: (i / gridSize) * 100,
          y: (j / gridSize) * 100,
        });
      }
    }

    // Shuffle positions
    return positions.sort(() => Math.random() - 0.5);
  }

  /**
   * Store watermark session in database
   */
  private async storeWatermarkSession(
    config: DynamicWatermarkConfig
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO watermark_sessions (
          id, user_id, content_id, session_id, 
          watermark_text, created_at, expires_at
        )
        VALUES (
          gen_random_uuid(), ${config.userId}, ${config.contentId}, 
          ${config.sessionId}, ${config.text}, NOW(), 
          NOW() + INTERVAL '24 hours'
        )
      `;
    } catch (error) {
      logger.error('Error storing watermark session', { error });
      // Don't throw - this is not critical
    }
  }

  /**
   * Log a recording attempt
   */
  async logRecordingAttempt(attempt: RecordingAttempt): Promise<void> {
    try {
      logger.warn('Recording attempt detected', {
        userId: attempt.userId,
        contentId: attempt.contentId,
        method: attempt.detectionMethod,
        tool: attempt.toolName,
        severity: attempt.severity,
      });

      // Store in database
      await prisma.$executeRaw`
        INSERT INTO recording_attempts (
          id, user_id, content_id, detection_method, 
          tool_name, severity, ip_address, user_agent, 
          device_info, timestamp
        )
        VALUES (
          gen_random_uuid(), ${attempt.userId}, ${attempt.contentId}, 
          ${attempt.detectionMethod}, ${attempt.toolName || null}, 
          ${attempt.severity}, ${attempt.ipAddress || null}, 
          ${attempt.userAgent || null}, ${JSON.stringify(attempt.deviceInfo || {})}, 
          ${attempt.timestamp}
        )
      `;

      // Check if user should be banned
      await this.checkAndApplyBan(attempt.userId, attempt.contentId);

      // Send alert for high severity attempts
      if (attempt.severity === 'high') {
        await this.sendSecurityAlert(attempt);
      }
    } catch (error) {
      logger.error('Error logging recording attempt', { error });
      // Don't throw - we don't want to disrupt playback
    }
  }

  /**
   * Check if user should be banned based on attempt count
   */
  private async checkAndApplyBan(
    userId: string,
    contentId: string
  ): Promise<void> {
    try {
      // Count attempts in last 24 hours
      const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM recording_attempts
        WHERE user_id = ${userId}
          AND content_id = ${contentId}
          AND timestamp > NOW() - INTERVAL '24 hours'
      `;

      const attemptCount = Number(result[0]?.count || 0);

      if (attemptCount >= this.MAX_ATTEMPTS_BEFORE_BAN) {
        await this.banUser(userId, contentId);
      }
    } catch (error) {
      logger.error('Error checking ban status', { error });
    }
  }

  /**
   * Ban user from accessing content
   */
  private async banUser(userId: string, contentId: string): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.BAN_DURATION_HOURS);

      await prisma.$executeRaw`
        INSERT INTO content_access_bans (
          id, user_id, content_id, reason, 
          banned_at, expires_at
        )
        VALUES (
          gen_random_uuid(), ${userId}, ${contentId}, 
          'Multiple screen recording attempts detected', 
          NOW(), ${expiresAt}
        )
        ON CONFLICT (user_id, content_id) 
        DO UPDATE SET 
          banned_at = NOW(),
          expires_at = ${expiresAt}
      `;

      logger.warn('User banned for recording attempts', {
        userId,
        contentId,
        expiresAt,
      });
    } catch (error) {
      logger.error('Error banning user', { error });
    }
  }

  /**
   * Check if user is banned from accessing content
   */
  async isUserBanned(userId: string, contentId: string): Promise<boolean> {
    try {
      const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM content_access_bans
        WHERE user_id = ${userId}
          AND content_id = ${contentId}
          AND expires_at > NOW()
      `;

      return Number(result[0]?.count || 0) > 0;
    } catch (error) {
      logger.error('Error checking ban status', { error });
      return false;
    }
  }

  /**
   * Detect known recording tools from user agent or process list
   */
  detectRecordingTool(userAgent: string, processNames?: string[]): {
    detected: boolean;
    toolName?: string;
    confidence: number;
  } {
    const lowerUserAgent = userAgent.toLowerCase();

    // Check user agent for known tools
    for (const tool of this.KNOWN_RECORDING_TOOLS) {
      if (lowerUserAgent.includes(tool)) {
        return {
          detected: true,
          toolName: tool,
          confidence: 0.9,
        };
      }
    }

    // Check process names if provided
    if (processNames) {
      for (const process of processNames) {
        const lowerProcess = process.toLowerCase();
        for (const tool of this.KNOWN_RECORDING_TOOLS) {
          if (lowerProcess.includes(tool)) {
            return {
              detected: true,
              toolName: tool,
              confidence: 0.95,
            };
          }
        }
      }
    }

    return {
      detected: false,
      confidence: 0,
    };
  }

  /**
   * Detect suspicious browser extensions
   */
  detectSuspiciousExtensions(extensions: string[]): {
    detected: boolean;
    extensionName?: string;
    confidence: number;
  } {
    for (const extension of extensions) {
      const lowerExtension = extension.toLowerCase();
      for (const suspicious of this.SUSPICIOUS_EXTENSIONS) {
        if (lowerExtension.includes(suspicious)) {
          return {
            detected: true,
            extensionName: extension,
            confidence: 0.85,
          };
        }
      }
    }

    return {
      detected: false,
      confidence: 0,
    };
  }

  /**
   * Send security alert for high severity attempts
   */
  private async sendSecurityAlert(attempt: RecordingAttempt): Promise<void> {
    try {
      // Get content creator
      const content = await prisma.content.findUnique({
        where: { id: attempt.contentId },
        select: {
          id: true,
          creatorAddress: true,
        },
      });

      if (!content) {
        return;
      }

      // Get creator user from wallet address
      const creator = await prisma.user.findFirst({
        where: { walletAddress: content.creatorAddress },
        select: { id: true },
      });

      if (!creator) {
        return;
      }

      // In production, send email/notification to creator
      logger.info('Security alert sent', {
        creatorId: creator.id,
        contentId: attempt.contentId,
        userId: attempt.userId,
      });

      // Store alert
      await prisma.$executeRaw`
        INSERT INTO security_alerts (
          id, creator_id, content_id, user_id, 
          alert_type, severity, message, created_at
        )
        VALUES (
          gen_random_uuid(), ${creator.id}, ${attempt.contentId}, 
          ${attempt.userId}, 'recording_attempt', ${attempt.severity}, 
          ${`Recording attempt detected: ${attempt.detectionMethod} - ${attempt.toolName || 'unknown'}`}, 
          NOW()
        )
      `;
    } catch (error) {
      logger.error('Error sending security alert', { error });
    }
  }

  /**
   * Get recording prevention statistics
   */
  async getPreventionStats(
    contentId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<RecordingPreventionStats> {
    try {
      const whereClause = [];
      if (contentId) whereClause.push(`content_id = '${contentId}'`);
      if (startDate) whereClause.push(`timestamp >= '${startDate.toISOString()}'`);
      if (endDate) whereClause.push(`timestamp <= '${endDate.toISOString()}'`);

      const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

      // Get total and blocked attempts
      const totalResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM recording_attempts ${where}`
      );

      const blockedResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM content_access_bans ${where.replace('timestamp', 'banned_at')}`
      );

      // Get attempts by method
      const byMethodResult = await prisma.$queryRawUnsafe<
        Array<{ detection_method: string; count: bigint }>
      >(
        `SELECT detection_method, COUNT(*) as count 
         FROM recording_attempts ${where}
         GROUP BY detection_method`
      );

      // Get attempts by severity
      const bySeverityResult = await prisma.$queryRawUnsafe<
        Array<{ severity: string; count: bigint }>
      >(
        `SELECT severity, COUNT(*) as count 
         FROM recording_attempts ${where}
         GROUP BY severity`
      );

      // Get top offenders
      const topOffendersResult = await prisma.$queryRawUnsafe<
        Array<{ user_id: string; count: bigint }>
      >(
        `SELECT user_id, COUNT(*) as count 
         FROM recording_attempts ${where}
         GROUP BY user_id 
         ORDER BY count DESC 
         LIMIT 10`
      );

      const byMethod: Record<string, number> = {};
      byMethodResult.forEach((row) => {
        byMethod[row.detection_method] = Number(row.count);
      });

      const bySeverity: Record<string, number> = {};
      bySeverityResult.forEach((row) => {
        bySeverity[row.severity] = Number(row.count);
      });

      const topOffenders = topOffendersResult.map((row) => ({
        userId: row.user_id,
        attempts: Number(row.count),
      }));

      return {
        totalAttempts: Number(totalResult[0]?.count || 0),
        blockedAttempts: Number(blockedResult[0]?.count || 0),
        byMethod,
        bySeverity,
        topOffenders,
      };
    } catch (error) {
      logger.error('Error getting prevention stats', { error });
      return {
        totalAttempts: 0,
        blockedAttempts: 0,
        byMethod: {},
        bySeverity: {},
        topOffenders: [],
      };
    }
  }

  /**
   * Get user's recording attempt history
   */
  async getUserAttemptHistory(
    userId: string,
    limit: number = 50
  ): Promise<RecordingAttempt[]> {
    try {
      const results = await prisma.$queryRaw<
        Array<{
          user_id: string;
          content_id: string;
          detection_method: string;
          tool_name: string | null;
          severity: string;
          ip_address: string | null;
          user_agent: string | null;
          device_info: any;
          timestamp: Date;
        }>
      >`
        SELECT user_id, content_id, detection_method, tool_name, 
               severity, ip_address, user_agent, device_info, timestamp
        FROM recording_attempts
        WHERE user_id = ${userId}
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;

      return results.map((row) => ({
        userId: row.user_id,
        contentId: row.content_id,
        detectionMethod: row.detection_method as any,
        toolName: row.tool_name || undefined,
        severity: row.severity as any,
        ipAddress: row.ip_address || undefined,
        userAgent: row.user_agent || undefined,
        deviceInfo: row.device_info,
        timestamp: row.timestamp,
      }));
    } catch (error) {
      logger.error('Error getting user attempt history', { error });
      return [];
    }
  }

  /**
   * Clear expired bans
   */
  async clearExpiredBans(): Promise<number> {
    try {
      const result = await prisma.$executeRaw`
        DELETE FROM content_access_bans
        WHERE expires_at < NOW()
      `;

      logger.info('Expired bans cleared', { count: result });
      return result as number;
    } catch (error) {
      logger.error('Error clearing expired bans', { error });
      return 0;
    }
  }

  /**
   * Manually unban a user
   */
  async unbanUser(userId: string, contentId: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        DELETE FROM content_access_bans
        WHERE user_id = ${userId}
          AND content_id = ${contentId}
      `;

      logger.info('User unbanned', { userId, contentId });
    } catch (error) {
      logger.error('Error unbanning user', { error });
      throw error;
    }
  }
}
