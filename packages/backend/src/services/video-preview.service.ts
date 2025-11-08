import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

export interface PreviewOptions {
  duration?: number; // Duration in seconds (default: 180 = 3 minutes)
  watermarkText?: string; // Watermark text (default: user ID)
  watermarkPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  generateHLS?: boolean; // Generate HLS streaming files
}

export interface PreviewResult {
  previewPath: string;
  hlsPath?: string;
  hlsManifest?: string;
  duration: number;
  fileSize: number;
  resolution: {
    width: number;
    height: number;
  };
}

export class VideoPreviewService {
  private uploadDir: string;
  private previewDir: string;
  private hlsDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.previewDir = path.join(this.uploadDir, 'previews');
    this.hlsDir = path.join(this.uploadDir, 'hls');

    // Create directories if they don't exist
    [this.previewDir, this.hlsDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Generate video preview with watermark
   */
  public async generatePreview(
    uploadId: string,
    videoPath: string,
    userId: string,
    options: PreviewOptions = {}
  ): Promise<PreviewResult> {
    try {
      const {
        duration = 180, // 3 minutes default
        watermarkText = userId,
        watermarkPosition = 'bottom-right',
        generateHLS = true,
      } = options;

      logger.info('Generating video preview', {
        uploadId,
        videoPath,
        userId,
        duration,
        watermarkPosition,
        generateHLS,
      });

      // Get video metadata
      const videoMetadata = await this.getVideoMetadata(videoPath);
      const actualDuration = Math.min(duration, videoMetadata.duration);

      // Generate preview filename
      const previewFilename = `${uploadId}-preview.mp4`;
      const previewPath = path.join(this.previewDir, previewFilename);

      // Build watermark filter
      const watermarkFilter = this.buildWatermarkFilter(
        watermarkText,
        watermarkPosition,
        videoMetadata.resolution
      );

      // Generate preview clip with watermark
      await this.generatePreviewClip(
        videoPath,
        previewPath,
        actualDuration,
        watermarkFilter
      );

      // Get preview file stats
      const previewStats = fs.statSync(previewPath);

      const result: PreviewResult = {
        previewPath,
        duration: actualDuration,
        fileSize: previewStats.size,
        resolution: videoMetadata.resolution,
      };

      // Generate HLS streaming files if requested
      if (generateHLS) {
        const hlsResult = await this.generateHLS(uploadId, previewPath);
        result.hlsPath = hlsResult.hlsPath;
        result.hlsManifest = hlsResult.manifestPath;
      }

      // Track preview generation in analytics
      await this.trackPreviewGeneration(uploadId, userId, result);

      logger.info('Video preview generated successfully', {
        uploadId,
        previewPath,
        duration: actualDuration,
        fileSize: previewStats.size,
        hlsGenerated: generateHLS,
      });

      return result;
    } catch (error) {
      logger.error('Error generating video preview', {
        uploadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get video metadata using ffprobe
   */
  private async getVideoMetadata(videoPath: string): Promise<{
    duration: number;
    resolution: { width: number; height: number };
    bitrate: number;
  }> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`
      );

      const data = JSON.parse(stdout);

      const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
      const duration = parseFloat(data.format?.duration || '0');
      const bitrate = parseInt(data.format?.bit_rate || '0', 10);

      return {
        duration: Math.round(duration),
        resolution: {
          width: videoStream?.width || 1920,
          height: videoStream?.height || 1080,
        },
        bitrate,
      };
    } catch (error) {
      logger.error('Error getting video metadata', { error });
      throw error;
    }
  }

  /**
   * Build watermark filter for ffmpeg
   */
  private buildWatermarkFilter(
    text: string,
    position: string,
    resolution: { width: number; height: number }
  ): string {
    // Escape special characters in text
    const escapedText = text.replace(/[:']/g, '\\$&');

    // Calculate position coordinates
    let x: string;
    let y: string;

    const padding = 20;

    switch (position) {
      case 'top-left':
        x = `${padding}`;
        y = `${padding}`;
        break;
      case 'top-right':
        x = `w-text_w-${padding}`;
        y = `${padding}`;
        break;
      case 'bottom-left':
        x = `${padding}`;
        y = `h-text_h-${padding}`;
        break;
      case 'bottom-right':
        x = `w-text_w-${padding}`;
        y = `h-text_h-${padding}`;
        break;
      case 'center':
        x = '(w-text_w)/2';
        y = '(h-text_h)/2';
        break;
      default:
        x = `w-text_w-${padding}`;
        y = `h-text_h-${padding}`;
    }

    // Calculate font size based on resolution (1% of height)
    const fontSize = Math.max(16, Math.round(resolution.height * 0.02));

    // Build drawtext filter with semi-transparent background
    return `drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=white:` +
      `x=${x}:y=${y}:box=1:boxcolor=black@0.5:boxborderw=5`;
  }

  /**
   * Generate preview clip with watermark
   */
  private async generatePreviewClip(
    inputPath: string,
    outputPath: string,
    duration: number,
    watermarkFilter: string
  ): Promise<void> {
    try {
      // Use ffmpeg to extract first N seconds and add watermark
      const command = `ffmpeg -i "${inputPath}" -t ${duration} -vf "${watermarkFilter}" ` +
        `-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart "${outputPath}"`;

      await execAsync(command);

      logger.info('Preview clip generated', {
        inputPath,
        outputPath,
        duration,
      });
    } catch (error) {
      logger.error('Error generating preview clip', { error });
      throw error;
    }
  }

  /**
   * Generate HLS streaming files
   */
  private async generateHLS(
    uploadId: string,
    videoPath: string
  ): Promise<{ hlsPath: string; manifestPath: string }> {
    try {
      const hlsFolder = path.join(this.hlsDir, uploadId);

      // Create HLS folder
      if (!fs.existsSync(hlsFolder)) {
        fs.mkdirSync(hlsFolder, { recursive: true });
      }

      const manifestPath = path.join(hlsFolder, 'playlist.m3u8');

      // Generate HLS with multiple quality levels
      const command = `ffmpeg -i "${videoPath}" ` +
        // 720p
        `-vf scale=w=1280:h=720:force_original_aspect_ratio=decrease ` +
        `-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k ` +
        `-hls_time 6 -hls_playlist_type vod -hls_segment_filename "${hlsFolder}/720p_%03d.ts" ` +
        `-master_pl_name playlist.m3u8 "${hlsFolder}/720p.m3u8" ` +
        // 480p
        `-vf scale=w=854:h=480:force_original_aspect_ratio=decrease ` +
        `-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 96k ` +
        `-hls_time 6 -hls_playlist_type vod -hls_segment_filename "${hlsFolder}/480p_%03d.ts" ` +
        `"${hlsFolder}/480p.m3u8" ` +
        // 360p
        `-vf scale=w=640:h=360:force_original_aspect_ratio=decrease ` +
        `-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 64k ` +
        `-hls_time 6 -hls_playlist_type vod -hls_segment_filename "${hlsFolder}/360p_%03d.ts" ` +
        `"${hlsFolder}/360p.m3u8"`;

      await execAsync(command);

      // Create master playlist
      await this.createMasterPlaylist(hlsFolder);

      logger.info('HLS streaming files generated', {
        uploadId,
        hlsFolder,
        manifestPath,
      });

      return {
        hlsPath: hlsFolder,
        manifestPath,
      };
    } catch (error) {
      logger.error('Error generating HLS files', { error });
      throw error;
    }
  }

  /**
   * Create HLS master playlist
   */
  private async createMasterPlaylist(hlsFolder: string): Promise<void> {
    const masterPlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480
480p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p.m3u8
`;

    const masterPath = path.join(hlsFolder, 'playlist.m3u8');
    fs.writeFileSync(masterPath, masterPlaylist);
  }

  /**
   * Track preview generation in analytics
   */
  private async trackPreviewGeneration(
    uploadId: string,
    userId: string,
    result: PreviewResult
  ): Promise<void> {
    try {
      // Update upload metadata with preview info
      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          metadata: {
            preview: {
              path: result.previewPath,
              hlsPath: result.hlsPath,
              hlsManifest: result.hlsManifest,
              duration: result.duration,
              fileSize: result.fileSize,
              resolution: result.resolution,
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
   * Track preview view in analytics
   */
  public async trackPreviewView(
    uploadId: string,
    userId: string,
    metadata?: {
      duration?: number;
      quality?: string;
      device?: string;
      ipAddress?: string;
    }
  ): Promise<void> {
    try {
      // Create preview view record
      await prisma.$executeRaw`
        INSERT INTO preview_views (id, upload_id, user_id, viewed_at, metadata)
        VALUES (gen_random_uuid(), ${uploadId}, ${userId}, NOW(), ${JSON.stringify(metadata || {})})
      `;

      logger.info('Preview view tracked', {
        uploadId,
        userId,
        metadata,
      });
    } catch (error) {
      logger.error('Error tracking preview view', { error });
      // Don't throw - this is not critical
    }
  }

  /**
   * Get preview path for an upload
   */
  public getPreviewPath(uploadId: string): string | null {
    const previewFilename = `${uploadId}-preview.mp4`;
    const previewPath = path.join(this.previewDir, previewFilename);

    if (fs.existsSync(previewPath)) {
      return previewPath;
    }

    return null;
  }

  /**
   * Get HLS manifest path for an upload
   */
  public getHLSManifestPath(uploadId: string): string | null {
    const manifestPath = path.join(this.hlsDir, uploadId, 'playlist.m3u8');

    if (fs.existsSync(manifestPath)) {
      return manifestPath;
    }

    return null;
  }

  /**
   * Get preview URL for an upload
   */
  public getPreviewUrl(uploadId: string): string | null {
    if (this.getPreviewPath(uploadId)) {
      return `/api/v1/preview/video/${uploadId}`;
    }

    return null;
  }

  /**
   * Get HLS manifest URL for an upload
   */
  public getHLSManifestUrl(uploadId: string): string | null {
    if (this.getHLSManifestPath(uploadId)) {
      return `/api/v1/preview/hls/${uploadId}/playlist.m3u8`;
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

      // Delete HLS folder
      const hlsFolder = path.join(this.hlsDir, uploadId);
      if (fs.existsSync(hlsFolder)) {
        fs.rmSync(hlsFolder, { recursive: true, force: true });
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
    totalViews: number;
    uniqueViewers: number;
    avgWatchDuration: number;
    viewsByQuality: Record<string, number>;
  }> {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT 
          COUNT(*) as total_views,
          COUNT(DISTINCT user_id) as unique_viewers,
          AVG((metadata->>'duration')::float) as avg_watch_duration,
          metadata->>'quality' as quality,
          COUNT(*) as quality_count
        FROM preview_views
        WHERE upload_id = ${uploadId}
        GROUP BY metadata->>'quality'
      `;

      const totalViews = result.reduce((sum, row) => sum + Number(row.quality_count), 0);
      const uniqueViewers = result[0]?.unique_viewers || 0;
      const avgWatchDuration = result[0]?.avg_watch_duration || 0;

      const viewsByQuality: Record<string, number> = {};
      result.forEach((row) => {
        if (row.quality) {
          viewsByQuality[row.quality] = Number(row.quality_count);
        }
      });

      return {
        totalViews,
        uniqueViewers: Number(uniqueViewers),
        avgWatchDuration: Number(avgWatchDuration),
        viewsByQuality,
      };
    } catch (error) {
      logger.error('Error getting preview analytics', { uploadId, error });
      return {
        totalViews: 0,
        uniqueViewers: 0,
        avgWatchDuration: 0,
        viewsByQuality: {},
      };
    }
  }
}
