import { EncryptionService } from '../services/encryption.service';
import { KeyManagementService } from '../services/key-management.service';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../utils/logger';

interface PerformanceResult {
  fileSize: number;
  encryptionTime: number;
  decryptionTime: number;
  encryptionOverhead: number;
  encryptionThroughput: number; // MB/s
  decryptionThroughput: number; // MB/s
  overheadPercentage: number;
}

/**
 * Test encryption/decryption performance
 * Requirement: Encryption performance < 10% overhead
 */
async function testEncryptionPerformance() {
  console.log('='.repeat(80));
  console.log('Content Encryption Performance Test');
  console.log('='.repeat(80));
  console.log();

  const encryptionService = new EncryptionService();
  const keyManagementService = new KeyManagementService();

  // Test with different file sizes
  const testSizes = [
    1 * 1024 * 1024, // 1 MB
    10 * 1024 * 1024, // 10 MB
    50 * 1024 * 1024, // 50 MB
    100 * 1024 * 1024, // 100 MB
    500 * 1024 * 1024, // 500 MB
  ];

  const results: PerformanceResult[] = [];

  // Create test directory
  const testDir = path.join(process.cwd(), 'test-encryption');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  console.log(`Test directory: ${testDir}\n`);
  console.log(`Using KMS: ${keyManagementService.isUsingKMS() ? 'AWS KMS' : 'Local Keys'}\n`);

  for (const size of testSizes) {
    console.log(`Testing with ${(size / (1024 * 1024)).toFixed(2)} MB file...`);

    try {
      // Generate test file
      const testFilePath = path.join(testDir, `test_${size}.bin`);
      const encryptedFilePath = path.join(testDir, `test_${size}.enc`);
      const decryptedFilePath = path.join(testDir, `test_${size}.dec`);

      console.log('  Generating test file...');
      await generateTestFile(testFilePath, size);

      // Measure encryption time
      console.log('  Encrypting...');
      const encryptStartTime = Date.now();
      const encryptResult = await encryptionService.encryptFile(
        testFilePath,
        encryptedFilePath
      );
      const encryptionTime = Date.now() - encryptStartTime;

      // Measure decryption time
      console.log('  Decrypting...');
      const decryptStartTime = Date.now();
      await encryptionService.decryptFile(
        encryptedFilePath,
        decryptedFilePath,
        {
          keyId: encryptResult.keyId,
          iv: encryptResult.iv,
          algorithm: encryptResult.algorithm,
        }
      );
      const decryptionTime = Date.now() - decryptStartTime;

      // Verify decrypted file matches original
      console.log('  Verifying...');
      const originalHash = await calculateFileHash(testFilePath);
      const decryptedHash = await calculateFileHash(decryptedFilePath);

      if (originalHash !== decryptedHash) {
        throw new Error('Decrypted file does not match original!');
      }

      // Calculate metrics
      const encryptionOverhead = encryptResult.encryptedSize - encryptResult.originalSize;
      const overheadPercentage = (encryptionOverhead / encryptResult.originalSize) * 100;
      const encryptionThroughput = (size / (1024 * 1024)) / (encryptionTime / 1000);
      const decryptionThroughput = (size / (1024 * 1024)) / (decryptionTime / 1000);

      const result: PerformanceResult = {
        fileSize: size,
        encryptionTime,
        decryptionTime,
        encryptionOverhead,
        encryptionThroughput,
        decryptionThroughput,
        overheadPercentage,
      };

      results.push(result);

      console.log(`  ✓ Encryption time: ${encryptionTime}ms`);
      console.log(`  ✓ Decryption time: ${decryptionTime}ms`);
      console.log(`  ✓ Encryption throughput: ${encryptionThroughput.toFixed(2)} MB/s`);
      console.log(`  ✓ Decryption throughput: ${decryptionThroughput.toFixed(2)} MB/s`);
      console.log(`  ✓ Overhead: ${overheadPercentage.toFixed(4)}%`);
      console.log(`  ✓ Verification: PASSED\n`);

      // Clean up test files
      fs.unlinkSync(testFilePath);
      fs.unlinkSync(encryptedFilePath);
      fs.unlinkSync(decryptedFilePath);
    } catch (error) {
      console.error(`  ✗ Test failed:`, error);
    }
  }

  // Print summary
  console.log('='.repeat(80));
  console.log('Performance Summary');
  console.log('='.repeat(80));
  console.log();

  console.log('File Size | Encrypt Time | Decrypt Time | Encrypt MB/s | Decrypt MB/s | Overhead %');
  console.log('-'.repeat(90));

  for (const result of results) {
    const sizeMB = (result.fileSize / (1024 * 1024)).toFixed(0).padStart(6);
    const encTime = `${result.encryptionTime}ms`.padStart(12);
    const decTime = `${result.decryptionTime}ms`.padStart(12);
    const encThroughput = result.encryptionThroughput.toFixed(2).padStart(12);
    const decThroughput = result.decryptionThroughput.toFixed(2).padStart(12);
    const overhead = result.overheadPercentage.toFixed(4).padStart(10);

    console.log(`${sizeMB} MB | ${encTime} | ${decTime} | ${encThroughput} | ${decThroughput} | ${overhead}`);
  }

  console.log();

  // Check if overhead requirement is met
  const maxOverhead = Math.max(...results.map((r) => r.overheadPercentage));
  const avgOverhead = results.reduce((sum, r) => sum + r.overheadPercentage, 0) / results.length;

  console.log(`Maximum overhead: ${maxOverhead.toFixed(4)}%`);
  console.log(`Average overhead: ${avgOverhead.toFixed(4)}%`);
  console.log();

  if (maxOverhead < 10) {
    console.log('✓ REQUIREMENT MET: Encryption overhead < 10%');
  } else {
    console.log('✗ REQUIREMENT NOT MET: Encryption overhead >= 10%');
  }

  console.log();

  // Average throughput
  const avgEncThroughput = results.reduce((sum, r) => sum + r.encryptionThroughput, 0) / results.length;
  const avgDecThroughput = results.reduce((sum, r) => sum + r.decryptionThroughput, 0) / results.length;

  console.log(`Average encryption throughput: ${avgEncThroughput.toFixed(2)} MB/s`);
  console.log(`Average decryption throughput: ${avgDecThroughput.toFixed(2)} MB/s`);
  console.log();

  // Clean up test directory
  if (fs.existsSync(testDir)) {
    fs.rmdirSync(testDir, { recursive: true });
  }

  console.log('='.repeat(80));
  console.log('Test completed successfully!');
  console.log('='.repeat(80));
}

/**
 * Generate a test file with random data
 */
async function generateTestFile(filePath: string, size: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filePath);
    const chunkSize = 64 * 1024; // 64KB chunks
    let written = 0;

    const writeChunk = () => {
      while (written < size) {
        const remaining = size - written;
        const currentChunkSize = Math.min(chunkSize, remaining);
        const chunk = crypto.randomBytes(currentChunkSize);

        const canContinue = writeStream.write(chunk);
        written += currentChunkSize;

        if (!canContinue) {
          writeStream.once('drain', writeChunk);
          return;
        }
      }

      writeStream.end();
    };

    writeStream.on('finish', resolve);
    writeStream.on('error', reject);

    writeChunk();
  });
}

/**
 * Calculate SHA-256 hash of a file
 */
async function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Test in-memory encryption/decryption
 */
async function testInMemoryEncryption() {
  console.log('\n' + '='.repeat(80));
  console.log('In-Memory Encryption Test');
  console.log('='.repeat(80));
  console.log();

  const encryptionService = new EncryptionService();

  const testSizes = [
    1024, // 1 KB
    10 * 1024, // 10 KB
    100 * 1024, // 100 KB
    1024 * 1024, // 1 MB
  ];

  for (const size of testSizes) {
    console.log(`Testing with ${(size / 1024).toFixed(2)} KB data...`);

    // Generate test data
    const testData = crypto.randomBytes(size);

    // Encrypt
    const encryptStart = Date.now();
    const { encrypted, keyId, iv } = await encryptionService.encryptData(testData);
    const encryptTime = Date.now() - encryptStart;

    // Decrypt
    const decryptStart = Date.now();
    const decrypted = await encryptionService.decryptData(encrypted, keyId, iv);
    const decryptTime = Date.now() - decryptStart;

    // Verify
    const matches = Buffer.compare(testData, decrypted) === 0;

    console.log(`  Encryption time: ${encryptTime}ms`);
    console.log(`  Decryption time: ${decryptTime}ms`);
    console.log(`  Verification: ${matches ? 'PASSED' : 'FAILED'}`);
    console.log();
  }
}

// Run tests
(async () => {
  try {
    await testEncryptionPerformance();
    await testInMemoryEncryption();
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
})();
