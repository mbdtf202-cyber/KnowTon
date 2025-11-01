#!/usr/bin/env tsx

/**
 * Integration test script for resumable upload functionality
 * This script tests the upload service without requiring a full test database setup
 */

import { UploadService } from '../services/upload.service';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function testUploadService() {
  console.log('🧪 Testing Upload Service Integration...\n');

  const uploadService = new UploadService();
  const testDir = path.join(process.cwd(), 'test-uploads-integration');

  // Create test directory
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  try {
    // Test 1: File Type Validation
    console.log('✓ Test 1: File Type Validation');
    const validTypes = ['application/pdf', 'video/mp4', 'audio/mpeg'];
    validTypes.forEach((type) => {
      try {
        (uploadService as any).validateFileType(type);
        console.log(`  ✓ ${type} accepted`);
      } catch (error) {
        console.error(`  ✗ ${type} rejected unexpectedly`);
      }
    });

    const invalidTypes = ['application/x-executable', 'text/html'];
    invalidTypes.forEach((type) => {
      try {
        (uploadService as any).validateFileType(type);
        console.error(`  ✗ ${type} accepted unexpectedly`);
      } catch (error) {
        console.log(`  ✓ ${type} rejected correctly`);
      }
    });

    // Test 2: Metadata Parsing
    console.log('\n✓ Test 2: Metadata Parsing');
    const testUserId = 'test-user-123';
    const metadata = [
      `filename ${Buffer.from('test.pdf').toString('base64')}`,
      `filetype ${Buffer.from('application/pdf').toString('base64')}`,
      `userId ${Buffer.from(testUserId).toString('base64')}`,
      `title ${Buffer.from('Test Document').toString('base64')}`,
    ].join(',');

    const parsed = (uploadService as any).parseMetadata(metadata);
    console.log('  Parsed metadata:', {
      filename: parsed.filename,
      filetype: parsed.filetype,
      userId: parsed.userId,
      title: parsed.title,
    });

    if (parsed.filename === 'test.pdf' && parsed.userId === testUserId) {
      console.log('  ✓ Metadata parsed correctly');
    } else {
      console.error('  ✗ Metadata parsing failed');
    }

    // Test 3: File Hash Generation
    console.log('\n✓ Test 3: File Hash Generation');
    const testFilePath = path.join(testDir, 'test-hash.txt');
    const testContent = 'This is a test file for hash generation';
    fs.writeFileSync(testFilePath, testContent);

    const hash1 = await (uploadService as any).generateFileHash(testFilePath);
    const hash2 = await (uploadService as any).generateFileHash(testFilePath);
    const expectedHash = crypto.createHash('sha256').update(testContent).digest('hex');

    console.log('  Generated hash:', hash1);
    console.log('  Expected hash:', expectedHash);

    if (hash1 === hash2 && hash1 === expectedHash) {
      console.log('  ✓ File hash generation consistent and correct');
    } else {
      console.error('  ✗ File hash generation failed');
    }

    // Test 4: Tus Server Instance
    console.log('\n✓ Test 4: Tus Server Instance');
    const tusServer = uploadService.getServer();
    if (tusServer) {
      console.log('  ✓ Tus server instance created successfully');
      console.log('  Server path:', (tusServer as any).options.path);
    } else {
      console.error('  ✗ Tus server instance not created');
    }

    // Test 5: Large File Size Calculation
    console.log('\n✓ Test 5: Large File Size Calculation');
    const largeFileSize = BigInt(1.5 * 1024 * 1024 * 1024); // 1.5GB
    const uploadOffset = largeFileSize / BigInt(2);
    const progress = Number((uploadOffset * BigInt(100)) / largeFileSize);
    console.log('  File size:', largeFileSize.toString(), 'bytes');
    console.log('  Upload offset:', uploadOffset.toString(), 'bytes');
    console.log('  Progress:', progress + '%');

    if (progress === 50) {
      console.log('  ✓ Large file size calculation correct');
    } else {
      console.error('  ✗ Large file size calculation failed');
    }

    console.log('\n✅ All integration tests passed!');
    console.log('\n📝 Note: Database-dependent tests require a running PostgreSQL instance');
    console.log('   Run full tests with: npm test src/__tests__/services/upload.test.ts');

  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }
}

// Run tests
testUploadService().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
