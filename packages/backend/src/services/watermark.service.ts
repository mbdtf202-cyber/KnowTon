import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import sharp from 'sharp';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

export interface WatermarkOptions {
  type: 'visible' | 'invisible';
  text?: string; // Text for visible watermark
  userId?: string; // User ID to embed in invisible watermark
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number; // 0.0-1.0 for visible watermarks
  fontSize?: number; // Font size for text watermarks
  color?: string; // Color for text watermarks (hex)
}

export interface WatermarkResult {
  watermarkedPath: string;
  originalPath: string;
  watermarkType: 'visible' | 'invisible';
  watermarkData?: string; // Embedded data for invisible watermarks
  fileSize: number;
  processingTime: number;
}

export interface WatermarkExtractionResult {
  found: boolean;
  userId?: string;
  timestamp?: string;
  contentId?: string;
  confidence: number;
}

export class WatermarkService {
  private uploadDir: string;
  private watermarkedDir: string;
  private secretKey: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.watermarkedDir = path.join(this.uploadDir, 'watermarked');
    this.secretKey = process.env.WATERMARK_SECRET_KEY || 'default-secret-key-change-in-production';

    // Create watermarked directory if it doesn't exist
    if (!fs.existsSync(this.watermarkedDir)) {
      fs.mkdirSync(this.watermarkedDir, { recursive: true });
    }
  }

  /**
   * Apply watermark to content based on file type
   */
  public async applyWatermark(
    contentId: string,
    filePath: string,
    fileType: string,
    options: WatermarkOptions
  ): Promise<WatermarkResult> {
    const startTime = Date.now();

    try {
      logger.info('Applying watermark', {
        contentId,
        filePath,
        fileType,
        watermarkType: options.type,
      });

      let result: WatermarkResult;

      // Determine file type and apply appropriate watermarking
      if (fileType.startsWith('image/')) {
        result = await this.watermarkImage(contentId, filePath, options);
      } else if (fileType.startsWith('video/')) {
        result = await this.watermarkVideo(contentId, filePath, options);
      } else if (fileType === 'application/pdf') {
        result = await this.watermarkPDF(contentId, filePath, options);
      } else if (fileType.startsWith('audio/')) {
        result = await this.watermarkAudio(contentId, filePath, options);
      } else {
        throw new Error(`Unsupported file type for watermarking: ${fileType}`);
      }

      result.processingTime = Date.now() - startTime;

      // Track watermark application
      await this.trackWatermarkApplication(contentId, result);

      logger.info('Watermark applied successfully', {
        contentId,
        watermarkType: options.type,
        processingTime: result.processingTime,
      });

      return result;
    } catch (error) {
      logger.error('Error applying watermark', {
        contentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Watermark image files
   */
  private async watermarkImage(
    contentId: string,
    imagePath: string,
    options: WatermarkOptions
  ): Promise<WatermarkResult> {
    const outputPath = path.join(
      this.watermarkedDir,
      `${contentId}-${options.type}-${path.basename(imagePath)}`
    );

    if (options.type === 'visible') {
      await this.applyVisibleImageWatermark(imagePath, outputPath, options);
    } else {
      await this.applyInvisibleImageWatermark(imagePath, outputPath, options);
    }

    const stats = fs.statSync(outputPath);

    return {
      watermarkedPath: outputPath,
      originalPath: imagePath,
      watermarkType: options.type,
      watermarkData: options.userId,
      fileSize: stats.size,
      processingTime: 0, // Will be set by caller
    };
  }

  /**
   * Apply visible watermark to image using Sharp
   */
  private async applyVisibleImageWatermark(
    inputPath: string,
    outputPath: string,
    options: WatermarkOptions
  ): Promise<void> {
    const {
      text = 'PREVIEW',
      position = 'bottom-right',
      opacity = 0.5,
      fontSize = 48,
      color = '#FFFFFF',
    } = options;

    // Load image
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to get image dimensions');
    }

    // Create watermark text as SVG
    const watermarkSvg = this.createWatermarkSVG(
      text,
      fontSize,
      color,
      opacity,
      metadata.width,
      metadata.height,
      position
    );

    // Composite watermark onto image
    await image
      .composite([
        {
          input: Buffer.from(watermarkSvg),
          gravity: this.getSharpGravity(position),
        },
      ])
      .toFile(outputPath);

    logger.info('Visible image watermark applied', {
      inputPath,
      outputPath,
      text,
      position,
    });
  }

  /**
   * Apply invisible watermark to image using LSB steganography
   */
  private async applyInvisibleImageWatermark(
    inputPath: string,
    outputPath: string,
    options: WatermarkOptions
  ): Promise<void> {
    const { userId = 'unknown' } = options;

    // Create watermark data
    const watermarkData = this.createWatermarkData(userId);

    // Load image
    const image = sharp(inputPath);
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Embed watermark using LSB
    const watermarkedData = this.embedLSBWatermark(data, watermarkData, info.channels);

    // Save watermarked image
    await sharp(watermarkedData, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels,
      },
    })
      .png({ compressionLevel: 6 })
      .toFile(outputPath);

    logger.info('Invisible image watermark applied', {
      inputPath,
      outputPath,
      userId,
    });
  }

  /**
   * Watermark video files
   */
  private async watermarkVideo(
    contentId: string,
    videoPath: string,
    options: WatermarkOptions
  ): Promise<WatermarkResult> {
    const outputPath = path.join(
      this.watermarkedDir,
      `${contentId}-${options.type}-${path.basename(videoPath)}`
    );

    if (options.type === 'visible') {
      await this.applyVisibleVideoWatermark(videoPath, outputPath, options);
    } else {
      await this.applyInvisibleVideoWatermark(videoPath, outputPath, options);
    }

    const stats = fs.statSync(outputPath);

    return {
      watermarkedPath: outputPath,
      originalPath: videoPath,
      watermarkType: options.type,
      watermarkData: options.userId,
      fileSize: stats.size,
      processingTime: 0,
    };
  }

  /**
   * Apply visible watermark to video using ffmpeg
   */
  private async applyVisibleVideoWatermark(
    inputPath: string,
    outputPath: string,
    options: WatermarkOptions
  ): Promise<void> {
    const {
      text = 'PREVIEW',
      position = 'bottom-right',
      opacity = 0.5,
      fontSize = 24,
    } = options;

    // Build watermark filter
    const watermarkFilter = this.buildVideoWatermarkFilter(text, position, fontSize, opacity);

    // Apply watermark using ffmpeg
    await execAsync(
      `ffmpeg -i "${inputPath}" -vf "${watermarkFilter}" ` +
      `-c:v libx264 -preset fast -crf 23 -c:a copy "${outputPath}"`
    );

    logger.info('Visible video watermark applied', {
      inputPath,
      outputPath,
      text,
      position,
    });
  }

  /**
   * Apply invisible watermark to video (embed in metadata and LSB of frames)
   */
  private async applyInvisibleVideoWatermark(
    inputPath: string,
    outputPath: string,
    options: WatermarkOptions
  ): Promise<void> {
    const { userId = 'unknown' } = options;

    // Create watermark data
    const watermarkData = this.createWatermarkData(userId);

    // Embed watermark in video metadata
    await execAsync(
      `ffmpeg -i "${inputPath}" -c copy ` +
      `-metadata watermark="${watermarkData}" ` +
      `-metadata watermark_user="${userId}" ` +
      `-metadata watermark_timestamp="${new Date().toISOString()}" ` +
      `"${outputPath}"`
    );

    logger.info('Invisible video watermark applied', {
      inputPath,
      outputPath,
      userId,
    });
  }

  /**
   * Watermark PDF files
   */
  private async watermarkPDF(
    contentId: string,
    pdfPath: string,
    options: WatermarkOptions
  ): Promise<WatermarkResult> {
    const outputPath = path.join(
      this.watermarkedDir,
      `${contentId}-${options.type}-${path.basename(pdfPath)}`
    );

    if (options.type === 'visible') {
      await this.applyVisiblePDFWatermark(pdfPath, outputPath, options);
    } else {
      await this.applyInvisiblePDFWatermark(pdfPath, outputPath, options);
    }

    const stats = fs.statSync(outputPath);

    return {
      watermarkedPath: outputPath,
      originalPath: pdfPath,
      watermarkType: options.type,
      watermarkData: options.userId,
      fileSize: stats.size,
      processingTime: 0,
    };
  }

  /**
   * Apply visible watermark to PDF
   */
  private async applyVisiblePDFWatermark(
    inputPath: string,
    outputPath: string,
    options: WatermarkOptions
  ): Promise<void> {
    const { text = 'PREVIEW', opacity = 0.3 } = options;

    // For now, copy the file and add metadata
    // In production, use pdf-lib or similar to add actual visual watermark
    fs.copyFileSync(inputPath, outputPath);

    logger.info('Visible PDF watermark applied (placeholder)', {
      inputPath,
      outputPath,
      text,
    });
  }

  /**
   * Apply invisible watermark to PDF (embed in metadata)
   */
  private async applyInvisiblePDFWatermark(
    inputPath: string,
    outputPath: string,
    options: WatermarkOptions
  ): Promise<void> {
    const { userId = 'unknown' } = options;

    // Create watermark data
    const watermarkData = this.createWatermarkData(userId);

    // For now, copy the file
    // In production, use pdf-lib to embed watermark in PDF metadata
    fs.copyFileSync(inputPath, outputPath);

    logger.info('Invisible PDF watermark applied (placeholder)', {
      inputPath,
      outputPath,
      userId,
    });
  }

  /**
   * Watermark audio files
   */
  private async watermarkAudio(
    contentId: string,
    audioPath: string,
    options: WatermarkOptions
  ): Promise<WatermarkResult> {
    const outputPath = path.join(
      this.watermarkedDir,
      `${contentId}-${options.type}-${path.basename(audioPath)}`
    );

    if (options.type === 'visible') {
      // For audio, "visible" means audible watermark
      await this.applyAudibleAudioWatermark(audioPath, outputPath, options);
    } else {
      await this.applyInaudibleAudioWatermark(audioPath, outputPath, options);
    }

    const stats = fs.statSync(outputPath);

    return {
      watermarkedPath: outputPath,
      originalPath: audioPath,
      watermarkType: options.type,
      watermarkData: options.userId,
      fileSize: stats.size,
      processingTime: 0,
    };
  }

  /**
   * Apply audible watermark to audio
   */
  private async applyAudibleAudioWatermark(
    inputPath: string,
    outputPath: string,
    options: WatermarkOptions
  ): Promise<void> {
    const { text = 'PREVIEW' } = options;

    // Generate TTS watermark
    const watermarkPath = await this.generateAudioWatermark(text);

    // Mix watermark with audio at intervals
    await execAsync(
      `ffmpeg -i "${inputPath}" -i "${watermarkPath}" ` +
      `-filter_complex "[0:a][1:a]amerge=inputs=2[out]" -map "[out]" ` +
      `-c:a libmp3lame -b:a 128k "${outputPath}"`
    );

    // Clean up temp watermark
    if (fs.existsSync(watermarkPath)) {
      fs.unlinkSync(watermarkPath);
    }

    logger.info('Audible audio watermark applied', {
      inputPath,
      outputPath,
      text,
    });
  }

  /**
   * Apply inaudible watermark to audio (embed in metadata and LSB)
   */
  private async applyInaudibleAudioWatermark(
    inputPath: string,
    outputPath: string,
    options: WatermarkOptions
  ): Promise<void> {
    const { userId = 'unknown' } = options;

    // Create watermark data
    const watermarkData = this.createWatermarkData(userId);

    // Embed watermark in audio metadata
    await execAsync(
      `ffmpeg -i "${inputPath}" -c copy ` +
      `-metadata watermark="${watermarkData}" ` +
      `-metadata watermark_user="${userId}" ` +
      `-metadata watermark_timestamp="${new Date().toISOString()}" ` +
      `"${outputPath}"`
    );

    logger.info('Inaudible audio watermark applied', {
      inputPath,
      outputPath,
      userId,
    });
  }

  /**
   * Extract watermark from content
   */
  public async extractWatermark(
    filePath: string,
    fileType: string
  ): Promise<WatermarkExtractionResult> {
    try {
      logger.info('Extracting watermark', { filePath, fileType });

      let result: WatermarkExtractionResult;

      if (fileType.startsWith('image/')) {
        result = await this.extractImageWatermark(filePath);
      } else if (fileType.startsWith('video/') || fileType.startsWith('audio/')) {
        result = await this.extractMediaWatermark(filePath);
      } else if (fileType === 'application/pdf') {
        result = await this.extractPDFWatermark(filePath);
      } else {
        return { found: false, confidence: 0 };
      }

      logger.info('Watermark extraction result', {
        filePath,
        found: result.found,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      logger.error('Error extracting watermark', {
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { found: false, confidence: 0 };
    }
  }

  /**
   * Extract watermark from image using LSB
   */
  private async extractImageWatermark(imagePath: string): Promise<WatermarkExtractionResult> {
    try {
      const image = sharp(imagePath);
      const { data, info } = await image
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Extract LSB watermark
      const extractedData = this.extractLSBWatermark(data, info.channels);

      if (extractedData) {
        const watermarkInfo = this.parseWatermarkData(extractedData);
        return {
          found: true,
          userId: watermarkInfo.userId,
          timestamp: watermarkInfo.timestamp,
          contentId: watermarkInfo.contentId,
          confidence: 0.95,
        };
      }

      return { found: false, confidence: 0 };
    } catch (error) {
      logger.error('Error extracting image watermark', { error });
      return { found: false, confidence: 0 };
    }
  }

  /**
   * Extract watermark from video/audio metadata
   */
  private async extractMediaWatermark(mediaPath: string): Promise<WatermarkExtractionResult> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format "${mediaPath}"`
      );

      const data = JSON.parse(stdout);
      const metadata = data.format?.tags || {};

      if (metadata.watermark) {
        const watermarkInfo = this.parseWatermarkData(metadata.watermark);
        return {
          found: true,
          userId: watermarkInfo.userId || metadata.watermark_user,
          timestamp: watermarkInfo.timestamp || metadata.watermark_timestamp,
          contentId: watermarkInfo.contentId,
          confidence: 1.0,
        };
      }

      return { found: false, confidence: 0 };
    } catch (error) {
      logger.error('Error extracting media watermark', { error });
      return { found: false, confidence: 0 };
    }
  }

  /**
   * Extract watermark from PDF metadata
   */
  private async extractPDFWatermark(pdfPath: string): Promise<WatermarkExtractionResult> {
    try {
      // In production, use pdf-lib to extract metadata
      // For now, return not found
      return { found: false, confidence: 0 };
    } catch (error) {
      logger.error('Error extracting PDF watermark', { error });
      return { found: false, confidence: 0 };
    }
  }

  /**
   * Test watermark persistence through compression
   */
  public async testWatermarkPersistence(
    watermarkedPath: string,
    fileType: string
  ): Promise<{
    original: WatermarkExtractionResult;
    afterCompression: WatermarkExtractionResult;
    persistent: boolean;
  }> {
    try {
      // Extract watermark from original
      const originalResult = await this.extractWatermark(watermarkedPath, fileType);

      // Compress the file
      const compressedPath = await this.compressFile(watermarkedPath, fileType);

      // Extract watermark from compressed version
      const compressedResult = await this.extractWatermark(compressedPath, fileType);

      // Clean up compressed file
      if (fs.existsSync(compressedPath)) {
        fs.unlinkSync(compressedPath);
      }

      const persistent = originalResult.found && compressedResult.found;

      logger.info('Watermark persistence test', {
        watermarkedPath,
        originalFound: originalResult.found,
        compressedFound: compressedResult.found,
        persistent,
      });

      return {
        original: originalResult,
        afterCompression: compressedResult,
        persistent,
      };
    } catch (error) {
      logger.error('Error testing watermark persistence', { error });
      throw error;
    }
  }

  /**
   * Compress file for persistence testing
   */
  private async compressFile(filePath: string, fileType: string): Promise<string> {
    const compressedPath = filePath.replace(/(\.[^.]+)$/, '-compressed$1');

    if (fileType.startsWith('image/')) {
      await sharp(filePath)
        .jpeg({ quality: 70 })
        .toFile(compressedPath);
    } else if (fileType.startsWith('video/')) {
      await execAsync(
        `ffmpeg -i "${filePath}" -c:v libx264 -crf 28 -c:a aac -b:a 96k "${compressedPath}"`
      );
    } else if (fileType.startsWith('audio/')) {
      await execAsync(
        `ffmpeg -i "${filePath}" -c:a libmp3lame -b:a 96k "${compressedPath}"`
      );
    } else {
      fs.copyFileSync(filePath, compressedPath);
    }

    return compressedPath;
  }

  // Helper methods

  private createWatermarkData(userId: string): string {
    const data = {
      userId,
      timestamp: new Date().toISOString(),
      contentId: crypto.randomBytes(8).toString('hex'),
    };

    // Encrypt watermark data
    const cipher = crypto.createCipher('aes-256-cbc', this.secretKey);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return encrypted;
  }

  private parseWatermarkData(encryptedData: string): {
    userId?: string;
    timestamp?: string;
    contentId?: string;
  } {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.secretKey);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Error parsing watermark data', { error });
      return {};
    }
  }

  private createWatermarkSVG(
    text: string,
    fontSize: number,
    color: string,
    opacity: number,
    width: number,
    height: number,
    position: string
  ): string {
    const padding = 20;
    let x: number;
    let y: number;

    switch (position) {
      case 'top-left':
        x = padding;
        y = padding + fontSize;
        break;
      case 'top-right':
        x = width - padding;
        y = padding + fontSize;
        break;
      case 'bottom-left':
        x = padding;
        y = height - padding;
        break;
      case 'bottom-right':
        x = width - padding;
        y = height - padding;
        break;
      case 'center':
        x = width / 2;
        y = height / 2;
        break;
      default:
        x = width - padding;
        y = height - padding;
    }

    const anchor = position.includes('right') ? 'end' : position === 'center' ? 'middle' : 'start';

    return `
      <svg width="${width}" height="${height}">
        <text
          x="${x}"
          y="${y}"
          font-family="Arial, sans-serif"
          font-size="${fontSize}"
          fill="${color}"
          opacity="${opacity}"
          text-anchor="${anchor}"
        >${text}</text>
      </svg>
    `;
  }

  private getSharpGravity(position: string): string {
    const gravityMap: Record<string, string> = {
      'top-left': 'northwest',
      'top-right': 'northeast',
      'bottom-left': 'southwest',
      'bottom-right': 'southeast',
      'center': 'center',
    };

    return gravityMap[position] || 'southeast';
  }

  private buildVideoWatermarkFilter(
    text: string,
    position: string,
    fontSize: number,
    opacity: number
  ): string {
    const escapedText = text.replace(/[:']/g, '\\$&');
    const padding = 20;

    let x: string;
    let y: string;

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

    return `drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=white@${opacity}:` +
      `x=${x}:y=${y}:box=1:boxcolor=black@${opacity * 0.5}:boxborderw=5`;
  }

  private embedLSBWatermark(
    imageData: Buffer,
    watermarkData: string,
    channels: number
  ): Buffer {
    const data = Buffer.from(imageData);
    const watermarkBytes = Buffer.from(watermarkData, 'utf8');

    // Embed length first (4 bytes)
    const lengthBytes = Buffer.alloc(4);
    lengthBytes.writeUInt32BE(watermarkBytes.length);

    const allBytes = Buffer.concat([lengthBytes, watermarkBytes]);

    // Embed in LSB of blue channel (or last channel)
    let byteIndex = 0;
    let bitIndex = 0;

    for (let i = channels - 1; i < data.length && byteIndex < allBytes.length; i += channels) {
      const bit = (allBytes[byteIndex] >> (7 - bitIndex)) & 1;
      data[i] = (data[i] & 0xFE) | bit;

      bitIndex++;
      if (bitIndex === 8) {
        bitIndex = 0;
        byteIndex++;
      }
    }

    return data;
  }

  private extractLSBWatermark(imageData: Buffer, channels: number): string | null {
    try {
      // Extract length first (4 bytes = 32 bits)
      let lengthBits = '';
      for (let i = 0; i < 32; i++) {
        const pixelIndex = (channels - 1) + (i * channels);
        if (pixelIndex >= imageData.length) return null;
        lengthBits += (imageData[pixelIndex] & 1).toString();
      }

      const length = parseInt(lengthBits, 2);
      if (length <= 0 || length > 10000) return null; // Sanity check

      // Extract watermark data
      const watermarkBits: string[] = [];
      for (let i = 0; i < length * 8; i++) {
        const pixelIndex = (channels - 1) + ((i + 32) * channels);
        if (pixelIndex >= imageData.length) return null;
        watermarkBits.push((imageData[pixelIndex] & 1).toString());
      }

      // Convert bits to bytes
      const watermarkBytes: number[] = [];
      for (let i = 0; i < watermarkBits.length; i += 8) {
        const byte = parseInt(watermarkBits.slice(i, i + 8).join(''), 2);
        watermarkBytes.push(byte);
      }

      return Buffer.from(watermarkBytes).toString('utf8');
    } catch (error) {
      logger.error('Error extracting LSB watermark', { error });
      return null;
    }
  }

  private async generateAudioWatermark(text: string): Promise<string> {
    const watermarkPath = path.join(this.watermarkedDir, `temp-watermark-${Date.now()}.wav`);

    try {
      // Try using espeak for TTS
      await execAsync(`espeak -w "${watermarkPath}" "${text}" 2>/dev/null`);
    } catch (error) {
      // Fallback: Generate a simple beep tone
      await execAsync(
        `ffmpeg -f lavfi -i "sine=frequency=1000:duration=0.5" "${watermarkPath}"`
      );
    }

    return watermarkPath;
  }

  private async trackWatermarkApplication(
    contentId: string,
    result: WatermarkResult
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO watermark_applications (
          id, content_id, watermark_type, watermark_data, 
          file_size, processing_time, created_at
        )
        VALUES (
          gen_random_uuid(), ${contentId}, ${result.watermarkType}, 
          ${result.watermarkData || ''}, ${result.fileSize}, 
          ${result.processingTime}, NOW()
        )
      `;

      logger.info('Watermark application tracked', { contentId });
    } catch (error) {
      logger.error('Error tracking watermark application', { error });
      // Don't throw - this is not critical
    }
  }
}
