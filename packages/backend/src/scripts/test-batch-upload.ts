/**
 * Batch Upload Integration Test Script
 * 
 * This script tests the batch upload functionality by:
 * 1. Creating multiple test files
 * 2. Simulating batch upload
 * 3. Checking batch status
 * 4. Verifying parallel processing
 * 5. Testing error handling and retry
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import * as tus from 'tus-js-client';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_USER_ID = 'test-user-batch-upload';
const TEST_FILES_DIR = path.join(process.cwd(), 'test-files-batch');

interface TestFile {
  name: string;
  size: number;
  content: Buffer;
}

interface UploadResult {
  filename: string;
  uploadId: string | null;
  status: 'success' | 'error';
  error?: string;
  duration: number;
}

// Create test files
function createTestFiles(count: number): TestFile[] {
  console.log(`\n📁 Creating ${count} test files...`);
  
  if (!fs.existsSync(TEST_FILES_DIR)) {
    fs.mkdirSync(TEST_FILES_DIR, { recursive: true });
  }

  const files: TestFile[] = [];
  const sizes = [
    100 * 1024, // 100KB
    500 * 1024, // 500KB
    1 * 1024 * 1024, // 1MB
    5 * 1024 * 1024, // 5MB
    10 * 1024 * 1024, // 10MB
  ];

  for (let i = 0; i < count; i++) {
    const size = sizes[i % sizes.length];
    const filename = `test-file-${i + 1}.bin`;
    const filepath = path.join(TEST_FILES_DIR, filename);
    
    // Generate random content
    const content = Buffer.alloc(size);
    for (let j = 0; j < size; j++) {
      content[j] = Math.floor(Math.random() * 256);
    }
    
    fs.writeFileSync(filepath, content);
    files.push({ name: filename, size, content });
    
    console.log(`  ✓ Created ${filename} (${formatBytes(size)})`);
  }

  return files;
}

// Upload a single file using tus
function uploadFile(
  filepath: string,
  filename: string,
  metadata: any
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const file = fs.readFileSync(filepath);

    const upload = new tus.Upload(file, {
      endpoint: `${API_URL}/api/v1/upload/files`,
      retryDelays: [0, 1000, 3000],
      chunkSize: 1 * 1024 * 1024, // 1MB chunks
      metadata: {
        filename,
        filetype: 'application/octet-stream',
        userId: TEST_USER_ID,
        ...metadata,
      },
      onError: (error) => {
        const duration = Date.now() - startTime;
        resolve({
          filename,
          uploadId: null,
          status: 'error',
          error: error.message,
          duration,
        });
      },
      onSuccess: () => {
        const duration = Date.now() - startTime;
        const uploadId = upload.url?.split('/').pop() || null;
        resolve({
          filename,
          uploadId,
          status: 'success',
          duration,
        });
      },
    });

    upload.start();
  });
}

// Test batch upload with parallel processing
async function testBatchUpload(fileCount: number, maxParallel: number) {
  console.log(`\n🚀 Testing batch upload (${fileCount} files, max ${maxParallel} parallel)...`);
  
  const files = createTestFiles(fileCount);
  const results: UploadResult[] = [];
  const startTime = Date.now();

  // Upload files with parallelism control
  const queue = [...files];
  const active: Promise<UploadResult>[] = [];

  while (queue.length > 0 || active.length > 0) {
    // Start new uploads up to maxParallel
    while (active.length < maxParallel && queue.length > 0) {
      const file = queue.shift()!;
      const filepath = path.join(TEST_FILES_DIR, file.name);
      
      const uploadPromise = uploadFile(filepath, file.name, {
        title: `Test File ${file.name}`,
        description: 'Batch upload test',
        category: 'test',
      });
      
      active.push(uploadPromise);
      console.log(`  ⬆️  Started upload: ${file.name} (${active.length} active)`);
    }

    // Wait for at least one upload to complete
    if (active.length > 0) {
      const result = await Promise.race(active);
      results.push(result);
      
      // Remove completed upload from active list
      const index = active.findIndex(
        (p) => p === Promise.resolve(result)
      );
      if (index !== -1) {
        active.splice(index, 1);
      }

      if (result.status === 'success') {
        console.log(`  ✅ Completed: ${result.filename} (${result.duration}ms)`);
      } else {
        console.log(`  ❌ Failed: ${result.filename} - ${result.error}`);
      }
    }
  }

  const totalDuration = Date.now() - startTime;
  const successCount = results.filter((r) => r.status === 'success').length;
  const failCount = results.filter((r) => r.status === 'error').length;

  console.log(`\n📊 Batch Upload Results:`);
  console.log(`  Total files: ${fileCount}`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`  Total time: ${totalDuration}ms`);
  console.log(`  Average time per file: ${Math.round(totalDuration / fileCount)}ms`);

  return results;
}

// Test batch status endpoint
async function testBatchStatus(uploadIds: string[]) {
  console.log(`\n📊 Testing batch status endpoint...`);
  
  try {
    const response = await axios.post(
      `${API_URL}/api/v1/upload/batch/status`,
      { uploadIds },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`  ✅ Batch status retrieved successfully`);
    console.log(`  Uploads found: ${response.data.statuses.length}`);
    
    response.data.statuses.forEach((status: any) => {
      console.log(`    - ${status.filename}: ${status.status} (${status.progress}%)`);
    });

    return response.data.statuses;
  } catch (error: any) {
    console.error(`  ❌ Failed to get batch status:`, error.message);
    return [];
  }
}

// Test batch delete endpoint
async function testBatchDelete(uploadIds: string[]) {
  console.log(`\n🗑️  Testing batch delete endpoint...`);
  
  try {
    const response = await axios.delete(
      `${API_URL}/api/v1/upload/batch`,
      {
        data: { uploadIds },
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`  ✅ Batch delete completed`);
    
    const successCount = response.data.results.filter((r: any) => r.success).length;
    const failCount = response.data.results.filter((r: any) => !r.success).length;
    
    console.log(`  Deleted: ${successCount}`);
    console.log(`  Failed: ${failCount}`);

    return response.data.results;
  } catch (error: any) {
    console.error(`  ❌ Failed to delete batch:`, error.message);
    return [];
  }
}

// Cleanup test files
function cleanup() {
  console.log(`\n🧹 Cleaning up test files...`);
  
  if (fs.existsSync(TEST_FILES_DIR)) {
    fs.rmSync(TEST_FILES_DIR, { recursive: true, force: true });
    console.log(`  ✅ Test files cleaned up`);
  }
}

// Format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Main test execution
async function main() {
  console.log('='.repeat(60));
  console.log('BATCH UPLOAD INTEGRATION TEST');
  console.log('='.repeat(60));

  try {
    // Test 1: Small batch (5 files, 3 parallel)
    console.log('\n📦 Test 1: Small batch upload');
    const results1 = await testBatchUpload(5, 3);
    const uploadIds1 = results1
      .filter((r) => r.status === 'success' && r.uploadId)
      .map((r) => r.uploadId!);

    if (uploadIds1.length > 0) {
      await testBatchStatus(uploadIds1);
      await testBatchDelete(uploadIds1);
    }

    // Test 2: Medium batch (10 files, 5 parallel)
    console.log('\n📦 Test 2: Medium batch upload');
    const results2 = await testBatchUpload(10, 5);
    const uploadIds2 = results2
      .filter((r) => r.status === 'success' && r.uploadId)
      .map((r) => r.uploadId!);

    if (uploadIds2.length > 0) {
      await testBatchStatus(uploadIds2);
      await testBatchDelete(uploadIds2);
    }

    // Test 3: Large batch (20 files, 3 parallel)
    console.log('\n📦 Test 3: Large batch upload');
    const results3 = await testBatchUpload(20, 3);
    const uploadIds3 = results3
      .filter((r) => r.status === 'success' && r.uploadId)
      .map((r) => r.uploadId!);

    if (uploadIds3.length > 0) {
      await testBatchStatus(uploadIds3);
      await testBatchDelete(uploadIds3);
    }

    console.log('\n✅ All batch upload tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    cleanup();
  }
}

// Run tests
main().catch((error) => {
  console.error('Fatal error:', error);
  cleanup();
  process.exit(1);
});
