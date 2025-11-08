import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { AudioPreviewService } from '../services/audio-preview.service';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_USER_ID = 'test-user-123';
const TEST_UPLOAD_ID = 'test-audio-upload-' + Date.now();

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

function logSuccess(message: string) {
  log(`✓ ${message}`, 'green');
}

function logError(message: string) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message: string) {
  log(`ℹ ${message}`, 'blue');
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Test 1: Service Initialization
 */
async function testServiceInitialization(): Promise<boolean> {
  logSection('Test 1: Service Initialization');

  try {
    const service = new AudioPreviewService();
    logSuccess('AudioPreviewService initialized successfully');

    // Check if preview directory exists
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const previewDir = path.join(uploadDir, 'previews');

    if (fs.existsSync(previewDir)) {
      logSuccess(`Preview directory exists: ${previewDir}`);
    } else {
      logError(`Preview directory not found: ${previewDir}`);
      return false;
    }

    return true;
  } catch (error) {
    logError(`Service initialization failed: ${error}`);
    return false;
  }
}

/**
 * Test 2: Generate Test Audio File
 */
async function generateTestAudioFile(): Promise<string | null> {
  logSection('Test 2: Generate Test Audio File');

  try {
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const testAudioPath = path.join(uploadDir, TEST_UPLOAD_ID);

    // Generate a test audio file using ffmpeg (1 minute of sine wave)
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    logInfo('Generating test audio file (60 seconds)...');
    await execAsync(
      `ffmpeg -f lavfi -i "sine=frequency=440:duration=60" -c:a libmp3lame -b:a 128k "${testAudioPath}"`
    );

    if (fs.existsSync(testAudioPath)) {
      const stats = fs.statSync(testAudioPath);
      logSuccess(`Test audio file created: ${testAudioPath}`);
      logInfo(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
      return testAudioPath;
    } else {
      logError('Test audio file not created');
      return null;
    }
  } catch (error) {
    logError(`Failed to generate test audio: ${error}`);
    return null;
  }
}

/**
 * Test 3: Generate Audio Preview
 */
async function testGeneratePreview(audioPath: string): Promise<boolean> {
  logSection('Test 3: Generate Audio Preview');

  try {
    const service = new AudioPreviewService();

    logInfo('Generating preview (30 seconds with watermarks)...');
    const startTime = Date.now();

    const result = await service.generatePreview(
      TEST_UPLOAD_ID,
      audioPath,
      TEST_USER_ID,
      {
        duration: 30,
        watermarkInterval: 10,
        watermarkVolume: 0.3,
      }
    );

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    logSuccess(`Preview generated in ${duration} seconds`);
    logInfo(`Preview path: ${result.previewPath}`);
    logInfo(`Duration: ${result.duration} seconds`);
    logInfo(`File size: ${(result.fileSize / 1024).toFixed(2)} KB`);
    logInfo(`Bitrate: ${result.bitrate} bps`);
    logInfo(`Sample rate: ${result.sampleRate} Hz`);
    logInfo(`Channels: ${result.channels}`);

    // Verify preview file exists
    if (fs.existsSync(result.previewPath)) {
      logSuccess('Preview file exists on disk');
    } else {
      logError('Preview file not found on disk');
      return false;
    }

    // Verify preview duration is correct
    if (result.duration === 30) {
      logSuccess('Preview duration is correct (30 seconds)');
    } else {
      logError(`Preview duration is incorrect: ${result.duration} seconds`);
      return false;
    }

    return true;
  } catch (error) {
    logError(`Preview generation failed: ${error}`);
    return false;
  }
}

/**
 * Test 4: Get Preview URL
 */
async function testGetPreviewUrl(): Promise<boolean> {
  logSection('Test 4: Get Preview URL');

  try {
    const service = new AudioPreviewService();

    const previewUrl = service.getPreviewUrl(TEST_UPLOAD_ID);

    if (previewUrl) {
      logSuccess(`Preview URL: ${previewUrl}`);
      return true;
    } else {
      logError('Preview URL not found');
      return false;
    }
  } catch (error) {
    logError(`Failed to get preview URL: ${error}`);
    return false;
  }
}

/**
 * Test 5: Track Preview Play
 */
async function testTrackPreviewPlay(): Promise<boolean> {
  logSection('Test 5: Track Preview Play');

  try {
    const service = new AudioPreviewService();

    logInfo('Tracking preview play...');
    await service.trackPreviewPlay(TEST_UPLOAD_ID, TEST_USER_ID, {
      duration: 25,
      device: 'Test Device',
      ipAddress: '127.0.0.1',
    });

    logSuccess('Preview play tracked successfully');

    // Track a few more plays
    await service.trackPreviewPlay(TEST_UPLOAD_ID, 'user-2', {
      duration: 30,
      device: 'Test Device 2',
    });
    await service.trackPreviewPlay(TEST_UPLOAD_ID, 'user-3', {
      duration: 15,
      device: 'Test Device 3',
    });

    logSuccess('Multiple preview plays tracked');

    return true;
  } catch (error) {
    logError(`Failed to track preview play: ${error}`);
    return false;
  }
}

/**
 * Test 6: Get Preview Analytics
 */
async function testGetPreviewAnalytics(): Promise<boolean> {
  logSection('Test 6: Get Preview Analytics');

  try {
    const service = new AudioPreviewService();

    logInfo('Fetching preview analytics...');
    const analytics = await service.getPreviewAnalytics(TEST_UPLOAD_ID);

    logSuccess('Analytics retrieved successfully');
    logInfo(`Total plays: ${analytics.totalPlays}`);
    logInfo(`Unique listeners: ${analytics.uniqueListeners}`);
    logInfo(`Average listen duration: ${analytics.avgListenDuration.toFixed(2)} seconds`);

    // Verify analytics
    if (analytics.totalPlays >= 3) {
      logSuccess('Total plays count is correct');
    } else {
      logError(`Expected at least 3 plays, got ${analytics.totalPlays}`);
      return false;
    }

    if (analytics.uniqueListeners >= 3) {
      logSuccess('Unique listeners count is correct');
    } else {
      logError(`Expected at least 3 unique listeners, got ${analytics.uniqueListeners}`);
      return false;
    }

    return true;
  } catch (error) {
    logError(`Failed to get analytics: ${error}`);
    return false;
  }
}

/**
 * Test 7: API Endpoint - Generate Preview
 */
async function testAPIGeneratePreview(): Promise<boolean> {
  logSection('Test 7: API Endpoint - Generate Preview');

  try {
    logInfo('Testing POST /api/v1/audio-preview/generate...');

    const response = await axios.post(
      `${API_BASE_URL}/api/v1/audio-preview/generate`,
      {
        uploadId: TEST_UPLOAD_ID,
        userId: TEST_USER_ID,
        duration: 30,
        watermarkInterval: 10,
      }
    );

    if (response.data.success) {
      logSuccess('API endpoint returned success');
      logInfo(`Preview URL: ${response.data.data.previewUrl}`);
      logInfo(`Duration: ${response.data.data.duration} seconds`);
      return true;
    } else {
      logError('API endpoint returned failure');
      return false;
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logError(`API request failed: ${error.response?.data?.error || error.message}`);
    } else {
      logError(`API request failed: ${error}`);
    }
    return false;
  }
}

/**
 * Test 8: API Endpoint - Stream Preview
 */
async function testAPIStreamPreview(): Promise<boolean> {
  logSection('Test 8: API Endpoint - Stream Preview');

  try {
    logInfo('Testing GET /api/v1/audio-preview/:uploadId...');

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/audio-preview/${TEST_UPLOAD_ID}`,
      {
        responseType: 'arraybuffer',
      }
    );

    if (response.status === 200) {
      logSuccess('Preview streaming endpoint works');
      logInfo(`Content-Type: ${response.headers['content-type']}`);
      logInfo(`Content-Length: ${response.headers['content-length']} bytes`);
      return true;
    } else {
      logError(`Unexpected status code: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logError(`API request failed: ${error.response?.status} ${error.message}`);
    } else {
      logError(`API request failed: ${error}`);
    }
    return false;
  }
}

/**
 * Test 9: API Endpoint - Get Analytics
 */
async function testAPIGetAnalytics(): Promise<boolean> {
  logSection('Test 9: API Endpoint - Get Analytics');

  try {
    logInfo('Testing GET /api/v1/audio-preview/analytics/:uploadId...');

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/audio-preview/analytics/${TEST_UPLOAD_ID}`
    );

    if (response.data.success) {
      logSuccess('Analytics endpoint returned success');
      logInfo(`Total plays: ${response.data.data.totalPlays}`);
      logInfo(`Unique listeners: ${response.data.data.uniqueListeners}`);
      return true;
    } else {
      logError('Analytics endpoint returned failure');
      return false;
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logError(`API request failed: ${error.response?.data?.error || error.message}`);
    } else {
      logError(`API request failed: ${error}`);
    }
    return false;
  }
}

/**
 * Test 10: Delete Preview
 */
async function testDeletePreview(): Promise<boolean> {
  logSection('Test 10: Delete Preview');

  try {
    const service = new AudioPreviewService();

    logInfo('Deleting preview...');
    await service.deletePreview(TEST_UPLOAD_ID);

    logSuccess('Preview deleted successfully');

    // Verify preview file is deleted
    const previewPath = service.getPreviewPath(TEST_UPLOAD_ID);
    if (!previewPath) {
      logSuccess('Preview file removed from disk');
    } else {
      logError('Preview file still exists on disk');
      return false;
    }

    return true;
  } catch (error) {
    logError(`Failed to delete preview: ${error}`);
    return false;
  }
}

/**
 * Cleanup
 */
async function cleanup() {
  logSection('Cleanup');

  try {
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const testAudioPath = path.join(uploadDir, TEST_UPLOAD_ID);

    // Delete test audio file
    if (fs.existsSync(testAudioPath)) {
      fs.unlinkSync(testAudioPath);
      logSuccess('Test audio file deleted');
    }

    // Delete any remaining preview files
    const service = new AudioPreviewService();
    try {
      await service.deletePreview(TEST_UPLOAD_ID);
    } catch (error) {
      // Ignore errors
    }

    logSuccess('Cleanup completed');
  } catch (error) {
    logError(`Cleanup failed: ${error}`);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         Audio Preview System - Integration Tests          ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  const results: { name: string; passed: boolean }[] = [];

  // Run tests
  results.push({
    name: 'Service Initialization',
    passed: await testServiceInitialization(),
  });

  const audioPath = await generateTestAudioFile();
  if (!audioPath) {
    logError('Cannot continue tests without test audio file');
    process.exit(1);
  }

  results.push({
    name: 'Generate Audio Preview',
    passed: await testGeneratePreview(audioPath),
  });

  results.push({
    name: 'Get Preview URL',
    passed: await testGetPreviewUrl(),
  });

  results.push({
    name: 'Track Preview Play',
    passed: await testTrackPreviewPlay(),
  });

  results.push({
    name: 'Get Preview Analytics',
    passed: await testGetPreviewAnalytics(),
  });

  // API tests (may fail if server is not running)
  logInfo('\nNote: API tests require the backend server to be running');
  await sleep(1000);

  results.push({
    name: 'API - Generate Preview',
    passed: await testAPIGeneratePreview(),
  });

  results.push({
    name: 'API - Stream Preview',
    passed: await testAPIStreamPreview(),
  });

  results.push({
    name: 'API - Get Analytics',
    passed: await testAPIGetAnalytics(),
  });

  results.push({
    name: 'Delete Preview',
    passed: await testDeletePreview(),
  });

  // Cleanup
  await cleanup();

  // Summary
  logSection('Test Summary');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  results.forEach((result) => {
    if (result.passed) {
      logSuccess(`${result.name}`);
    } else {
      logError(`${result.name}`);
    }
  });

  console.log('\n' + '─'.repeat(60));
  log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`, 'cyan');
  console.log('─'.repeat(60) + '\n');

  if (failed === 0) {
    log('🎉 All tests passed!', 'green');
    process.exit(0);
  } else {
    log(`⚠️  ${failed} test(s) failed`, 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  logError(`Test runner failed: ${error}`);
  process.exit(1);
});
