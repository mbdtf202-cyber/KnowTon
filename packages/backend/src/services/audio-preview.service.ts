import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

export interface AudioPreviewOptions {
  duration?: number; // Duration in seconds (default: 30)
  watermarkText?: string; // Watermark text (default: user ID)
  watermarkInterval?: number; // Interval between watermarks in seconds (default: 10)
  watermarkVolume?: number; // Watermark volume (0.0-1.0, default: 0.3)
}

export interface AudioPreviewResult {
  previewPath: string;
  duration: number;
  fileSize: number;
  bitrate: number;
  sampleRate: number;
  channels: number;
}

export class AudioPreviewService {
  private uploadDir: string;
  private previewDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.previewDir = path.join(this.uploadDir, 'previews');

    // Create directories if they don't exist
    if (!fs.existsSync(this.previewDir)) {
      fs.mkdirSync(this.previewDir, { recursive: true });
    }
  }

  /**
   * Generate audio preview with watermark
   */
  public async generatePreview(
    uploadId: string,
    audioPath: string,
    userId: string,
    options: AudioPreviewOptions = {}
  ): Promise<AudioPreviewResult> {
    try {
      const {
        duration = 30, // 30 seconds default
        watermarkText = userId,
        watermarkInterval = 10,
        watermarkVolume = 0.3,
      } = options;

      logger.info('Generating audio preview', {
        uploadId,
        audioPath,
        userId,
        duration,
        watermarkInterval,
      });

      // Get audio metadata
      const audioMetadata = await this.getAudioMetadata(audioPath);
      const actualDuration = Math.min(duration, audioMetadata.duration);

      // Generate preview filename
      const previewFilename = `${uploadId}-preview.mp3`;
      const previewPath = path.join(this.previewDir, previewFilename);

      // Generate text-to-speech watermark audio
      const watermarkAudioPath = await this.generateWatermarkAudio(
        uploadId,
        watermarkText,
        watermarkVolume
      );

      // Generate preview clip with audio watermark
      await this.generatePreviewClip(
        audioPath,
        previewPath,
        watermarkAudioPath,
        actualDuration,
        watermarkInterval
      );

      // Clean up temporary watermark file
      if (fs.existsSync(watermarkAudioPath)) {
        fs.unlinkSync(watermarkAudioPath);
      }

      // Get preview file stats
      const previewStats = fs.statSync(previewPath);

      const result: AudioPreviewResult = {
        previewPath,
        duration: actualDuration,
        fileSize: previewStats.size,
        bitrate: audioMetadata.bitrate,
        sampleRate: audioMetadata.sampleRate,
        channels: audioMetadata.channels,
      };

      // Track preview generation in analytics
      await this.trackPreviewGeneration(uploadId, userId, result);

      logger.info('Audio preview generated successfully', {
        uploadId,
        previewPath,
        duration: actualDuration,
        fileSize: previewStats.size,
      });

      return result;
    } catch (error) {
      logger.error('Error generating audio preview', {
        uploadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get audio metadata using ffprobe
   */
  private async getAudioMetadata(audioPath: string): Promise<{
    duration: number;
    bitrate: number;
    sampleRate: number;
    channels: number;
  }> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${audioPath}"`
      );

      const data = JSON.parse(stdout);

      const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');
      const duration = parseFloat(data.format?.duration || '0');
      const bitrate = parseInt(data.format?.bit_rate || '128000', 10);

      return {
        duration: Math.round(duration),
        bitrate,
        sampleRate: parseInt(audioStream?.sample_rate || '44100', 10),
        channels: parseInt(audioStream?.channels || '2', 10),
      };
    } catch (error) {
      logger.error('Error getting audio metadata', { error });
      throw error;
    }
  }

  /**
   * Generate text-to-speech watermark audio
   * Uses espeak or festival for TTS, falls back to beep tone if not available
   */
  private async generateWatermarkAudio(
    uploadId: string,
    text: string,
    volume: number
  ): Promise<string> {
    const watermarkPath = path.join(this.previewDir, `${uploadId}-watermark.wav`);

    try {
      // Try using espeak for TTS
      await execAsync(
        `espeak -w "${watermarkPath}" "Preview. ${text}" 2>/dev/null`
      );
      
      // Adjust volume
      const adjustedPath = path.join(this.previewDir, `${uploadId}-watermark-adjusted.wav`);
      await execAsync(
        `ffmpeg -i "${watermarkPath}" -filter:a "volume=${volume}" "${adjustedPath}"`
      );
      
      // Replace original with adjusted
      fs.unlinkSync(watermarkPath);
      fs.renameSync(adjustedPath, watermarkPath);
      
      logger.info('Generated TTS watermark', { uploadId });
    } catch (error) {
      // Fallback: Generate a simple beep tone
      logger.warn('TTS not available, using beep tone watermark', { uploadId });
      
      await execAsync(
        `ffmpeg -f lavfi -i "sine=frequency=1000:duration=0.5" -filter:a "volume=${volume}" "${watermarkPath}"`
      );
    }

    return watermarkPath;
  }

  /**
   * Generate preview clip with audio watermark
   */
  private async generatePreviewClip(
    inputPath: string,
    outputPath: string,
    watermarkPath: string,
    duration: number,
    watermarkInterval: number
  ): Promise<void> {
    try {
      // Extract first N seconds of audio
      const tempClipPath = path.join(this.previewDir, `temp-${path.basename(outputPath)}`);
      await execAsync(
        `ffmpeg -i "${inputPath}" -t ${duration} -c:a copy "${tempClipPath}"`
      );

      // Get watermark duration
      const watermarkMetadata = await this.getAudioMetadata(watermarkPath);
      const watermarkDuration = watermarkMetadata.duration;

      // Build complex filter to overlay watermark at intervals
      const filterParts: string[] = [];
      const numWatermarks = Math.floor(duration / watermarkInterval);

      // Load the watermark multiple times
      let filterComplex = '';
      for (let i = 0; i < numWatermarks; i++) {
        filterComplex += `[1:a]adelay=${i * watermarkInterval * 1000}|${i * watermarkInterval * 1000}[wm${i}];`;
      }

      // Mix all watermarks with the main audio
      filterComplex += '[0:a]';
      for (let i = 0; i < numWatermarks; i++) {
        filterComplex += `[wm${i}]`;
      }
      filterComplex += `amix=inputs=${numWatermarks + 1}:duration=first:dropout_transition=0[out]`;

      // Apply watermark overlay
      await execAsync(
        `ffmpeg -i "${tempClipPath}" -i "${watermarkPath}" ` +
        `-filter_complex "${filterComplex}" -map "[out]" ` +
        `-c:a libmp3lame -b:a 128k "${outputPath}"`
      );

      // Clean up temp file
      if (fs.existsSync(tempClipPath)) {
        fs.unlinkSync(tempClipPath);
      }

      logger.info('Preview clip with watermark generated', {
        inputPath,
        outputPath,
        duration,
        watermarkInterval,
      });
    } catch (error) {
      logger.error('Error generating preview clip', { error });
      throw error;
    }
  }

  /**
   * Track preview generation in analytics
   */
  private async trackPreviewGeneration(
    uploadId: string,
    userId: string,
    result: AudioPreviewResult
  ): Promise<void> {
    try {
      // Update upload metadata with preview info
      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          metadata: {
            preview: {
              path: result.previewPath,
              duration: result.duration,
              fileSize: result.fileSize,
              bitrate: result.bitrate,
              sampleRate: result.sampleRate,
              channels: result.channels,
              generatedAt: new Date().toISOString(),
            },
          },
        },
      });

      logger.info('Preview generation tracked', {
        uploadId,
        userId,
      });
    } catch (error) {
      logger.error('Error tracking preview generation', { error });
      // Don't throw - this is not critical
    }
  }

  /**
   * Track preview play in analytics
   */
  public async trackPreviewPlay(
    uploadId: string,
    userId: string,
    metadata?: {
      duration?: number;
      device?: string;
      ipAddress?: string;
    }
  ): Promise<void> {
    try {
      // Create preview play record
      await prisma.$executeRaw`
        INSERT INTO preview_plays (id, upload_id, user_id, played_at, metadata)
        VALUES (gen_random_uuid(), ${uploadId}, ${userId}, NOW(), ${JSON.stringify(metadata || {})})
      `;

      logger.info('Preview play tracked', {
        uploadId,
        userId,
        metadata,
      });
    } catch (error) {
      logger.error('Error tracking preview play', { error });
      // Don't throw - this is not critical
    }
  }

  /**
   * Get preview path for an upload
   */
  public getPreviewPath(uploadId: string): string | null {
    const previewFilename = `${uploadId}-preview.mp3`;
    const previewPath = path.join(this.previewDir, previewFilename);

    if (fs.existsSync(previewPath)) {
      return previewPath;
    }

    return null;
  }

  /**
   * Get preview URL for an upload
   */
  public getPreviewUrl(uploadId: string): string | null {
    if (this.getPreviewPath(uploadId)) {
      return `/api/v1/preview/audio/${uploadId}`;
    }

    return null;
  }

  /**
   * Delete preview files for an upload
   */
  public async deletePreview(uploadId: string): Promise<void> {
    try {
      // Delete preview file
      const previewPath = this.getPreviewPath(uploadId);
      if (previewPath && fs.existsSync(previewPath)) {
        fs.unlinkSync(previewPath);
      }

      logger.info('Preview files deleted', { uploadId });
    } catch (error) {
      logger.error('Error deleting preview files', { uploadId, error });
      throw error;
    }
  }

  /**
   * Get preview analytics for an upload
   */
  public async getPreviewAnalytics(uploadId: string): Promise<{
    totalPlays: number;
    uniqueListeners: number;
    avgListenDuration: number;
  }> {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT 
          COUNT(*) as total_plays,
          COUNT(DISTINCT user_id) as unique_listeners,
          AVG((metadata->>'duration')::float) as avg_listen_duration
        FROM preview_plays
        WHERE upload_id = ${uploadId}
      `;

      const row = result[0] || {};

      return {
        totalPlays: Number(row.total_plays || 0),
        uniqueListeners: Number(row.unique_listeners || 0),
        avgListenDuration: Number(row.avg_listen_duration || 0),
      };
    } catch (error) {
      logger.error('Error getting preview analytics', { uploadId, error });
      return {
        totalPlays: 0,
        uniqueListeners: 0,
        avgListenDuration: 0,
      };
    }
  }
}
