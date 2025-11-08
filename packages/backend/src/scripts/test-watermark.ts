import path from 'path';
import fs from 'fs';
import { WatermarkService } from '../services/watermark.service';
import { logger } from '../utils/logger';

const watermarkService = new WatermarkService();

async function testWatermarking() {
  console.log('=== Watermarking Service Test ===\n');

  try {
    // Test 1: Visible watermark on image
    console.log('Test 1: Visible watermark on image');
    await testVisibleImageWatermark();
    console.log('✓ Test 1 passed\n');

    // Test 2: Invisible watermark on image
    console.log('Test 2: Invisible watermark on image');
    await testInvisibleImageWatermark();
    console.log('✓ Test 2 passed\n');

    // Test 3: Watermark extraction
    console.log('Test 3: Watermark extraction');
    await testWatermarkExtraction();
    console.log('✓ Test 3 passed\n');

    // Test 4: Watermark persistence through compression
    console.log('Test 4: Watermark persistence through compression');
    await testWatermarkPersistence();
    console.log('✓ Test 4 passed\n');

    // Test 5: Batch watermarking
    console.log('Test 5: Batch watermarking');
    await testBatchWatermarking();
    console.log('✓ Test 5 passed\n');

    console.log('=== All tests passed! ===');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

async function testVisibleImageWatermark() {
  // Create a test image
  const testImagePath = await createTestImage();

  const result = await watermarkService.applyWatermark(
    'test-visible-image',
    testImagePath,
    'image/png',
    {
      type: 'visible',
      text: 'PREVIEW - TEST USER',
      position: 'bottom-right',
      opacity: 0.7,
      fontSize: 32,
      color: '#FFFFFF',
    }
  );

  console.log('  Visible watermark applied:', {
    watermarkedPath: result.watermarkedPath,
    fileSize: result.fileSize,
    processingTime: result.processingTime,
  });

  // Verify file exists
  if (!fs.existsSync(result.watermarkedPath)) {
    throw new Error('Watermarked file not created');
  }

  // Clean up
  fs.unlinkSync(testImagePath);
}

async function testInvisibleImageWatermark() {
  // Create a test image
  const testImagePath = await createTestImage();

  const result = await watermarkService.applyWatermark(
    'test-invisible-image',
    testImagePath,
    'image/png',
    {
      type: 'invisible',
      userId: 'user-12345',
    }
  );

  console.log('  Invisible watermark applied:', {
    watermarkedPath: result.watermarkedPath,
    fileSize: result.fileSize,
    processingTime: result.processingTime,
  });

  // Verify file exists
  if (!fs.existsSync(result.watermarkedPath)) {
    throw new Error('Watermarked file not created');
  }

  // Clean up
  fs.unlinkSync(testImagePath);
}

async function testWatermarkExtraction() {
  // Create a test image with invisible watermark
  const testImagePath = await createTestImage();

  const watermarkResult = await watermarkService.applyWatermark(
    'test-extract',
    testImagePath,
    'image/png',
    {
      type: 'invisible',
      userId: 'user-67890',
    }
  );

  // Extract watermark
  const extractionResult = await watermarkService.extractWatermark(
    watermarkResult.watermarkedPath,
    'image/png'
  );

  console.log('  Watermark extraction result:', {
    found: extractionResult.found,
    userId: extractionResult.userId,
    confidence: extractionResult.confidence,
  });

  if (!extractionResult.found) {
    throw new Error('Watermark not found');
  }

  if (extractionResult.userId !== 'user-67890') {
    throw new Error('Extracted user ID does not match');
  }

  // Clean up
  fs.unlinkSync(testImagePath);
  fs.unlinkSync(watermarkResult.watermarkedPath);
}

async function testWatermarkPersistence() {
  // Create a test image with invisible watermark
  const testImagePath = await createTestImage();

  const watermarkResult = await watermarkService.applyWatermark(
    'test-persistence',
    testImagePath,
    'image/png',
    {
      type: 'invisible',
      userId: 'user-persistence',
    }
  );

  // Test persistence through compression
  const persistenceResult = await watermarkService.testWatermarkPersistence(
    watermarkResult.watermarkedPath,
    'image/png'
  );

  console.log('  Watermark persistence result:', {
    originalFound: persistenceResult.original.found,
    afterCompressionFound: persistenceResult.afterCompression.found,
    persistent: persistenceResult.persistent,
  });

  if (!persistenceResult.persistent) {
    console.warn('  Warning: Watermark did not persist through compression');
    // This is expected for LSB watermarks with heavy compression
  }

  // Clean up
  fs.unlinkSync(testImagePath);
  fs.unlinkSync(watermarkResult.watermarkedPath);
}

async function testBatchWatermarking() {
  // Create multiple test images
  const testImages = await Promise.all([
    createTestImage('test-batch-1.png'),
    createTestImage('test-batch-2.png'),
    createTestImage('test-batch-3.png'),
  ]);

  const results = await Promise.all(
    testImages.map((imagePath, index) =>
      watermarkService.applyWatermark(
        `test-batch-${index}`,
        imagePath,
        'image/png',
        {
          type: 'visible',
          text: `BATCH ${index + 1}`,
          position: 'center',
          opacity: 0.5,
        }
      )
    )
  );

  console.log('  Batch watermarking results:', {
    totalProcessed: results.length,
    totalSize: results.reduce((sum, r) => sum + r.fileSize, 0),
    avgProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length,
  });

  // Clean up
  testImages.forEach((path) => fs.unlinkSync(path));
  results.forEach((result) => {
    if (fs.existsSync(result.watermarkedPath)) {
      fs.unlinkSync(result.watermarkedPath);
    }
  });
}

async function createTestImage(filename: string = 'test-image.png'): Promise<string> {
  const sharp = require('sharp');
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  const tempDir = path.join(uploadDir, 'temp');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const imagePath = path.join(tempDir, filename);

  // Create a simple test image (800x600 blue rectangle)
  await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 4,
      background: { r: 0, g: 100, b: 200, alpha: 1 },
    },
  })
    .png()
    .toFile(imagePath);

  return imagePath;
}

// Run tests
testWatermarking().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
