import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PDFPreviewOptions {
  previewPercentage?: number; // Percentage of pages to preview (default: 10%)
  watermarkText?: string; // Watermark text (default: user ID)
  watermarkOpacity?: number; // Watermark opacity (default: 0.3)
}

export interface PDFPreviewResult {
  previewPath: string;
  totalPages: number;
  previewPages: number;
  fileSize: number;
}

export class PDFPreviewService {
  private uploadDir: string;
  private previewDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.previewDir = path.join(this.uploadDir, 'pdf-previews');

    // Create preview directory if it doesn't exist
    if (!fs.existsSync(this.previewDir)) {
      fs.mkdirSync(this.previewDir, { recursive: true });
    }
  }

  /**
   * Generate PDF preview with watermark
   */
  public async generatePreview(
    uploadId: string,
    pdfPath: string,
    userId: string,
    options: PDFPreviewOptions = {}
  ): Promise<PDFPreviewResult> {
    try {
      const {
        previewPercentage = 10,
        watermarkText = userId,
        watermarkOpacity = 0.3,
      } = options;

      logger.info('Generating PDF preview', {
        uploadId,
        pdfPath,
        userId,
        previewPercentage,
      });

      // Get PDF metadata
      const pdfMetadata = await this.getPDFMetadata(pdfPath);
      const totalPages = pdfMetadata.pageCount;
      
      // Calculate preview pages (minimum 1 page, maximum 10% of total)
      const previewPages = Math.max(1, Math.ceil(totalPages * (previewPercentage / 100)));

      logger.info('PDF metadata extracted', {
        uploadId,
        totalPages,
        previewPages,
      });

      // Generate preview filename
      const previewFilename = `${uploadId}-preview.pdf`;
      const previewPath = path.join(this.previewDir, previewFilename);

      // Generate preview PDF with watermark
      await this.generatePreviewPDF(
        pdfPath,
        previewPath,
        previewPages,
        watermarkText,
        watermarkOpacity
      );

      // Get preview file stats
      const previewStats = fs.statSync(previewPath);

      const result: PDFPreviewResult = {
        previewPath,
        totalPages,
        previewPages,
        fileSize: previewStats.size,
      };

      // Track preview generation in analytics
      await this.trackPreviewGeneration(uploadId, userId, result);

      logger.info('PDF preview generated successfully', {
        uploadId,
        previewPath,
        totalPages,
        previewPages,
        fileSize: previewStats.size,
      });

      return result;
    } catch (error) {
      logger.error('Error generating PDF preview', {
        uploadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get PDF metadata (page count)
   */
  private async getPDFMetadata(pdfPath: string): Promise<{ pageCount: number }> {
    try {
      // Read PDF file to count pages
      // Using a simple approach: read the PDF and count page objects
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfString = pdfBuffer.toString('latin1');
      
      // Count /Type /Page occurrences (simple page counting)
      const pageMatches = pdfString.match(/\/Type\s*\/Page[^s]/g);
      const pageCount = pageMatches ? pageMatches.length : 1;

      return { pageCount };
    } catch (error) {
      logger.error('Error getting PDF metadata', { error });
      // Default to 1 page if we can't determine
      return { pageCount: 1 };
    }
  }

  /**
   * Generate preview PDF with watermark
   */
  private async generatePreviewPDF(
    inputPath: string,
    outputPath: string,
    previewPages: number,
    watermarkText: string,
    watermarkOpacity: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Read the original PDF
        const inputBuffer = fs.readFileSync(inputPath);
        
        // Create a new PDF document for the preview
        const doc = new PDFDocument({
          autoFirstPage: false,
          bufferPages: true,
        });

        // Create write stream
        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        // For simplicity, we'll create a text-based preview with watermark
        // In production, you'd use pdf-lib or similar to extract actual pages
        doc.addPage({
          size: 'LETTER',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        // Add watermark to the page
        this.addWatermark(doc, watermarkText, watermarkOpacity);

        // Add preview notice
        doc
          .fontSize(16)
          .fillColor('#000000')
          .text('PREVIEW DOCUMENT', { align: 'center' })
          .moveDown();

        doc
          .fontSize(12)
          .text(`This is a preview of the first ${previewPages} pages.`, { align: 'center' })
          .text('Purchase the full document to access all content.', { align: 'center' })
          .moveDown(2);

        // Add content notice
        doc
          .fontSize(10)
          .fillColor('#666666')
          .text('Original Document Information:', { underline: true })
          .moveDown(0.5);

        doc
          .fontSize(9)
          .text(`Preview Pages: ${previewPages}`)
          .text(`Watermark: ${watermarkText}`)
          .text(`Generated: ${new Date().toISOString()}`)
          .moveDown();

        // Add disclaimer
        doc
          .fontSize(8)
          .fillColor('#999999')
          .text(
            'This preview is for evaluation purposes only. ' +
            'Downloading, copying, or distributing this preview is prohibited.',
            { align: 'justify' }
          );

        // Finalize PDF
        doc.end();

        writeStream.on('finish', () => {
          logger.info('Preview PDF generated', {
            inputPath,
            outputPath,
            previewPages,
          });
          resolve();
        });

        writeStream.on('error', (error) => {
          logger.error('Error writing preview PDF', { error });
          reject(error);
        });
      } catch (error) {
        logger.error('Error generating preview PDF', { error });
        reject(error);
      }
    });
  }

  /**
   * Add watermark to PDF page
   */
  private addWatermark(
    doc: PDFKit.PDFDocument,
    text: string,
    opacity: number
  ): void {
    // Save graphics state
    doc.save();

    // Set opacity
    doc.opacity(opacity);

    // Rotate and position watermark diagonally
    doc
      .rotate(45, { origin: [doc.page.width / 2, doc.page.height / 2] })
      .fontSize(60)
      .fillColor('#CCCCCC')
      .text(text, 0, doc.page.height / 2 - 30, {
        align: 'center',
        width: doc.page.width,
      });

    // Restore graphics state
    doc.restore();
  }

  /**
   * Track preview generation in analytics
   */
  private async trackPreviewGeneration(
    uploadId: string,
    userId: string,
    result: PDFPreviewResult
  ): Promise<void> {
    try {
      // Update upload metadata with preview info
      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          metadata: {
            preview: {
              path: result.previewPath,
              totalPages: result.totalPages,
              previewPages: result.previewPages,
              fileSize: result.fileSize,
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
    const previewFilename = `${uploadId}-preview.pdf`;
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
      return `/api/v1/preview/pdf/${uploadId}`;
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

      logger.info('Preview file deleted', { uploadId });
    } catch (error) {
      logger.error('Error deleting preview file', { uploadId, error });
      throw error;
    }
  }

  /**
   * Get preview analytics for an upload
   */
  public async getPreviewAnalytics(uploadId: string): Promise<{
    totalViews: number;
    uniqueViewers: number;
  }> {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT 
          COUNT(*) as total_views,
          COUNT(DISTINCT user_id) as unique_viewers
        FROM preview_views
        WHERE upload_id = ${uploadId}
      `;

      const totalViews = result[0]?.total_views || 0;
      const uniqueViewers = result[0]?.unique_viewers || 0;

      return {
        totalViews: Number(totalViews),
        uniqueViewers: Number(uniqueViewers),
      };
    } catch (error) {
      logger.error('Error getting preview analytics', { uploadId, error });
      return {
        totalViews: 0,
        uniqueViewers: 0,
      };
    }
  }
}
