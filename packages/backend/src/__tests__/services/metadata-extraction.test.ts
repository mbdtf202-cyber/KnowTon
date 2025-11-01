import { MetadataExtractionService } from '../../services/metadata-extraction.service';
import fs from 'fs';
import path from 'path';

describe('MetadataExtractionService', () => {
  let service: MetadataExtractionService;
  const testUploadDir = path.join(process.cwd(), 'uploads', 'test');
  const testThumbnailDir = path.join(testUploadDir, 'thumbnails');

  beforeAll(() => {
    // Set test upload directory
    process.env.UPLOAD_DIR = testUploadDir;
    
    // Create test directories
    if (!fs.existsSync(testUploadDir)) {
      fs.mkdirSync(testUploadDir, { recursive: true });
    }
    if (!fs.existsSync(testThumbnailDir)) {
      fs.mkdirSync(testThumbnailDir, { recursive: true });
    }

    service = new MetadataExtractionService();
  });

  afterAll(() => {
    // Clean up test directories
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true });
    }
  });

  describe('extractMetadata', () => {
    it('should extract basic file metadata', async () => {
      // Create a test file
      const testFilePath = path.join(testUploadDir, 'test.txt');
      fs.writeFileSync(testFilePath, 'Test content');

      const metadata = await service.extractMetadata(
        'test-upload-id',
        testFilePath,
        'text/plain'
      );

      expect(metadata).toBeDefined();
      expect(metadata.filename).toBe('test.txt');
      expect(metadata.filetype).toBe('text/plain');
      expect(metadata.filesize).toBeGreaterThan(0);

      // Clean up
      fs.unlinkSync(testFilePath);
    });

    it('should handle PDF files gracefully when pdfinfo is not available', async () => {
      // Create a mock PDF file (not a real PDF, just for testing)
      const testFilePath = path.join(testUploadDir, 'test.pdf');
      fs.writeFileSync(testFilePath, 'Mock PDF content');

      const metadata = await service.extractMetadata(
        'test-pdf-id',
        testFilePath,
        'application/pdf'
      );

      expect(metadata).toBeDefined();
      expect(metadata.filename).toBe('test.pdf');
      expect(metadata.filetype).toBe('application/pdf');

      // Clean up
      fs.unlinkSync(testFilePath);
    });

    it('should handle video files gracefully when ffprobe is not available', async () => {
      // Create a mock video file
      const testFilePath = path.join(testUploadDir, 'test.mp4');
      fs.writeFileSync(testFilePath, 'Mock video content');

      const metadata = await service.extractMetadata(
        'test-video-id',
        testFilePath,
        'video/mp4'
      );

      expect(metadata).toBeDefined();
      expect(metadata.filename).toBe('test.mp4');
      expect(metadata.filetype).toBe('video/mp4');

      // Clean up
      fs.unlinkSync(testFilePath);
    });

    it('should handle audio files gracefully when ffprobe is not available', async () => {
      // Create a mock audio file
      const testFilePath = path.join(testUploadDir, 'test.mp3');
      fs.writeFileSync(testFilePath, 'Mock audio content');

      const metadata = await service.extractMetadata(
        'test-audio-id',
        testFilePath,
        'audio/mpeg'
      );

      expect(metadata).toBeDefined();
      expect(metadata.filename).toBe('test.mp3');
      expect(metadata.filetype).toBe('audio/mpeg');

      // Clean up
      fs.unlinkSync(testFilePath);
    });
  });

  describe('getThumbnailPath', () => {
    it('should return null when thumbnail does not exist', () => {
      const thumbnailPath = service.getThumbnailPath('non-existent-id');
      expect(thumbnailPath).toBeNull();
    });

    it('should return path when thumbnail exists', () => {
      // Create a mock thumbnail
      const uploadId = 'test-thumb-id';
      const thumbnailFilename = `${uploadId}-thumb.jpg`;
      const thumbnailPath = path.join(testThumbnailDir, thumbnailFilename);
      fs.writeFileSync(thumbnailPath, 'Mock thumbnail');

      const result = service.getThumbnailPath(uploadId);
      expect(result).toBe(thumbnailPath);

      // Clean up
      fs.unlinkSync(thumbnailPath);
    });
  });

  describe('getThumbnailUrl', () => {
    it('should return null when thumbnail does not exist', () => {
      const thumbnailUrl = service.getThumbnailUrl('non-existent-id');
      expect(thumbnailUrl).toBeNull();
    });

    it('should return URL when thumbnail exists', () => {
      // Create a mock thumbnail
      const uploadId = 'test-url-id';
      const thumbnailFilename = `${uploadId}-thumb.jpg`;
      const thumbnailPath = path.join(testThumbnailDir, thumbnailFilename);
      fs.writeFileSync(thumbnailPath, 'Mock thumbnail');

      const result = service.getThumbnailUrl(uploadId);
      expect(result).toBe(`/api/v1/upload/thumbnails/${uploadId}`);

      // Clean up
      fs.unlinkSync(thumbnailPath);
    });
  });
});
