import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';
import sharp from 'sharp';

const execAsync = promisify(exec);

export interface ExtractedMetadata {
  // Common metadata
  filename: string;
  filetype: string;
  filesize: number;
  
  // PDF metadata
  title?: string;
  author?: string;
  pages?: number;
  
  // Video metadata
  duration?: number;
  resolution?: {
    width: number;
    height: number;
  };
  codec?: string;
  bitrate?: number;
  fps?: number;
  
  // Audio metadata
  artist?: string;
  album?: string;
  genre?: string;
  
  // Thumbnail
  thumbnailPath?: string;
}

export class MetadataExtractionService {
  private uploadDir: string;
  private thumbnailDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.thumbnailDir = path.join(this.uploadDir, 'thumbnails');
    
    // Create thumbnail directory if it doesn't exist
    if (!fs.existsSync(this.thumbnailDir)) {
      fs.mkdirSync(this.thumbnailDir, { recursive: true });
    }
  }

  /**
   * Extract metadata from uploaded file
   */
  public async extractMetadata(
    uploadId: string,
    filePath: string,
    filetype: string
  ): Promise<ExtractedMetadata> {
    try {
      const stats = fs.statSync(filePath);
      const filename = path.basename(filePath);

      const metadata: ExtractedMetadata = {
        filename,
        filetype,
        filesize: stats.size,
      };

      // Extract metadata based on file type
      if (filetype.startsWith('application/pdf')) {
        const pdfMetadata = await this.extractPDFMetadata(filePath);
        Object.assign(metadata, pdfMetadata);
      } else if (filetype.startsWith('video/')) {
        const videoMetadata = await this.extractVideoMetadata(filePath);
        Object.assign(metadata, videoMetadata);
        
        // Generate video thumbnail
        const thumbnailPath = await this.generateVideoThumbnail(uploadId, filePath);
        metadata.thumbnailPath = thumbnailPath;
      } else if (filetype.startsWith('audio/')) {
        const audioMetadata = await this.extractAudioMetadata(filePath);
        Object.assign(metadata, audioMetadata);
      } else if (filetype.startsWith('image/')) {
        const imageMetadata = await this.extractImageMetadata(filePath);
        Object.assign(metadata, imageMetadata);
        
        // Generate image thumbnail
        const thumbnailPath = await this.generateImageThumbnail(uploadId, filePath);
        metadata.thumbnailPath = thumbnailPath;
      }

      logger.info('Metadata extracted successfully', {
        uploadId,
        filetype,
        metadata,
      });

      return metadata;
    } catch (error) {
      logger.error('Error extracting metadata', {
        uploadId,
        filetype,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Extract PDF metadata using pdfinfo (from poppler-utils)
   */
  private async extractPDFMetadata(filePath: string): Promise<Partial<ExtractedMetadata>> {
    try {
      // Try using pdfinfo command (requires poppler-utils)
      const { stdout } = await execAsync(`pdfinfo "${filePath}"`);
      
      const metadata: Partial<ExtractedMetadata> = {};
      
      // Parse pdfinfo output
      const lines = stdout.split('\n');
      for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        
        if (key === 'Title' && value) {
          metadata.title = value;
        } else if (key === 'Author' && value) {
          metadata.author = value;
        } else if (key === 'Pages') {
          metadata.pages = parseInt(value, 10);
        }
      }
      
      return metadata;
    } catch (error) {
      logger.warn('pdfinfo not available, using fallback method', { error });
      
      // Fallback: Try to extract basic info from PDF structure
      try {
        const buffer = fs.readFileSync(filePath);
        const pdfText = buffer.toString('latin1');
        
        // Try to find page count
        const pageMatch = pdfText.match(/\/Type\s*\/Page[^s]/g);
        if (pageMatch) {
          return { pages: pageMatch.length };
        }
      } catch (fallbackError) {
        logger.error('Fallback PDF metadata extraction failed', { fallbackError });
      }
      
      return {};
    }
  }

  /**
   * Extract video metadata using ffprobe
   */
  private async extractVideoMetadata(filePath: string): Promise<Partial<ExtractedMetadata>> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
      );
      
      const data = JSON.parse(stdout);
      const metadata: Partial<ExtractedMetadata> = {};
      
      // Extract format metadata
      if (data.format) {
        if (data.format.duration) {
          metadata.duration = Math.round(parseFloat(data.format.duration));
        }
        if (data.format.bit_rate) {
          metadata.bitrate = parseInt(data.format.bit_rate, 10);
        }
      }
      
      // Extract video stream metadata
      const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
      if (videoStream) {
        metadata.codec = videoStream.codec_name;
        metadata.resolution = {
          width: videoStream.width,
          height: videoStream.height,
        };
        
        // Calculate FPS
        if (videoStream.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
          metadata.fps = Math.round(num / den);
        }
      }
      
      return metadata;
    } catch (error) {
      logger.error('Error extracting video metadata', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {};
    }
  }

  /**
   * Extract audio metadata using ffprobe
   */
  private async extractAudioMetadata(filePath: string): Promise<Partial<ExtractedMetadata>> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
      );
      
      const data = JSON.parse(stdout);
      const metadata: Partial<ExtractedMetadata> = {};
      
      // Extract format metadata
      if (data.format) {
        if (data.format.duration) {
          metadata.duration = Math.round(parseFloat(data.format.duration));
        }
        if (data.format.bit_rate) {
          metadata.bitrate = parseInt(data.format.bit_rate, 10);
        }
        
        // Extract tags
        if (data.format.tags) {
          metadata.title = data.format.tags.title || data.format.tags.TITLE;
          metadata.artist = data.format.tags.artist || data.format.tags.ARTIST;
          metadata.album = data.format.tags.album || data.format.tags.ALBUM;
          metadata.genre = data.format.tags.genre || data.format.tags.GENRE;
        }
      }
      
      // Extract audio stream metadata
      const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');
      if (audioStream) {
        if (!metadata.codec) {
          metadata.codec = audioStream.codec_name;
        }
      }
      
      return metadata;
    } catch (error) {
      logger.error('Error extracting audio metadata', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {};
    }
  }

  /**
   * Extract image metadata using sharp
   */
  private async extractImageMetadata(filePath: string): Promise<Partial<ExtractedMetadata>> {
    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();
      
      return {
        resolution: {
          width: metadata.width || 0,
          height: metadata.height || 0,
        },
      };
    } catch (error) {
      logger.error('Error extracting image metadata', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {};
    }
  }

  /**
   * Generate thumbnail for video using ffmpeg
   */
  private async generateVideoThumbnail(uploadId: string, filePath: string): Promise<string> {
    try {
      const thumbnailFilename = `${uploadId}-thumb.jpg`;
      const thumbnailPath = path.join(this.thumbnailDir, thumbnailFilename);
      
      // Extract frame at 1 second
      await execAsync(
        `ffmpeg -i "${filePath}" -ss 00:00:01.000 -vframes 1 -vf scale=320:-1 "${thumbnailPath}"`
      );
      
      logger.info('Video thumbnail generated', {
        uploadId,
        thumbnailPath,
      });
      
      return thumbnailPath;
    } catch (error) {
      logger.error('Error generating video thumbnail', {
        uploadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Generate thumbnail for image using sharp
   */
  private async generateImageThumbnail(uploadId: string, filePath: string): Promise<string> {
    try {
      const thumbnailFilename = `${uploadId}-thumb.jpg`;
      const thumbnailPath = path.join(this.thumbnailDir, thumbnailFilename);
      
      await sharp(filePath)
        .resize(320, 320, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
      
      logger.info('Image thumbnail generated', {
        uploadId,
        thumbnailPath,
      });
      
      return thumbnailPath;
    } catch (error) {
      logger.error('Error generating image thumbnail', {
        uploadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get thumbnail URL for an upload
   */
  public getThumbnailUrl(uploadId: string): string | null {
    const thumbnailFilename = `${uploadId}-thumb.jpg`;
    const thumbnailPath = path.join(this.thumbnailDir, thumbnailFilename);
    
    if (fs.existsSync(thumbnailPath)) {
      return `/api/v1/upload/thumbnails/${uploadId}`;
    }
    
    return null;
  }

  /**
   * Get thumbnail file path
   */
  public getThumbnailPath(uploadId: string): string | null {
    const thumbnailFilename = `${uploadId}-thumb.jpg`;
    const thumbnailPath = path.join(this.thumbnailDir, thumbnailFilename);
    
    if (fs.existsSync(thumbnailPath)) {
      return thumbnailPath;
    }
    
    return null;
  }
}
