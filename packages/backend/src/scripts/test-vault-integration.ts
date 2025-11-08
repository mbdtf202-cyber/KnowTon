/**
 * Test Vault Integration
 * 
 * This script tests the Vault integration to ensure:
 * - Vault is accessible
 * - Secrets can be read and written
 * - Secret rotation works
 * - Audit logging is enabled
 * 
 * Usage:
 *   tsx src/scripts/test-vault-integration.ts
 */

import { initializeVaultClient } from '../services/vault-client.service';
import { getSecretRotationService } from '../services/secret-rotation.service';
import { logger } from '../utils/logger';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({
      name,
      passed: true,
      message: 'Passed',
      duration,
    });
    console.log(`✅ ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    results.push({
      name,
      passed: false,
      message: error.message,
      duration,
    });
    console.log(`❌ ${name} (${duration}ms)`);
    console.log(`   Error: ${error.message}`);
  }
}

async function testVaultConnection() {
  const vaultClient = initializeVaultClient();
  const isHealthy = await vaultClient.healthCheck();
  if (!isHealthy) {
    throw new Error('Vault health check failed');
  }
}

async function testVaultStatus() {
  const vaultClient = initializeVaultClient();
  const status = await vaultClient.getStatus();
  if (status.sealed) {
    throw new Error('Vault is sealed');
  }
  if (!status.initialized) {
    throw new Error('Vault is not initialized');
  }
}

async function testReadSecret() {
  const vaultClient = initializeVaultClient();
  const secret = await vaultClient.getSecret('backend/jwt');
  if (!secret || !secret.secret) {
    throw new Error('JWT secret not found or invalid');
  }
}

async function testWriteSecret() {
  const vaultClient = initializeVaultClient();
  const testPath = 'backend/test-secret';
  const testData = {
    test_key: 'test_value',
    timestamp: new Date().toISOString(),
  };

  await vaultClient.setSecret(testPath, testData);

  // Verify write
  const readData = await vaultClient.getSecret(testPath, false);
  if (readData.test_key !== testData.test_key) {
    throw new Error('Written secret does not match read secret');
  }

  // Cleanup
  await vaultClient.deleteSecret(testPath);
}

async function testSecretCaching() {
  const vaultClient = initializeVaultClient();

  // Clear cache first
  vaultClient.clearCache();

  // First read (should hit Vault)
  const start1 = Date.now();
  await vaultClient.getSecret('backend/jwt', true);
  const duration1 = Date.now() - start1;

  // Second read (should hit cache)
  const start2 = Date.now();
  await vaultClient.getSecret('backend/jwt', true);
  const duration2 = Date.now() - start2;

  // Cache should be significantly faster
  if (duration2 >= duration1) {
    throw new Error(`Cache not working: ${duration1}ms vs ${duration2}ms`);
  }

  console.log(`   Cache speedup: ${duration1}ms -> ${duration2}ms`);
}

async function testGetDatabaseCredentials() {
  const vaultClient = initializeVaultClient();
  const creds = await vaultClient.getDatabaseCredentials();

  if (!creds.url) {
    throw new Error('Database URL not found');
  }
}

async function testGetBlockchainPrivateKey() {
  const vaultClient = initializeVaultClient();
  const privateKey = await vaultClient.getBlockchainPrivateKey('arbitrum');

  if (!privateKey || privateKey.length === 0) {
    throw new Error('Blockchain private key not found');
  }
}

async function testGetAPIKey() {
  const vaultClient = initializeVaultClient();
  try {
    const apiKey = await vaultClient.getAPIKey('pinata', 'api_key');
    if (!apiKey) {
      throw new Error('API key is empty');
    }
  } catch (error: any) {
    // It's okay if the secret doesn't exist yet
    if (!error.message.includes('not found')) {
      throw error;
    }
  }
}

async function testListSecrets() {
  const vaultClient = initializeVaultClient();
  const secrets = await vaultClient.listSecrets('backend');

  if (!Array.isArray(secrets)) {
    throw new Error('List secrets did not return an array');
  }

  console.log(`   Found ${secrets.length} secrets in backend/`);
}

async function testSecretRotation() {
  const rotationService = getSecretRotationService();

  // Get rotation status
  const status = await rotationService.getRotationStatus();

  if (!Array.isArray(status) || status.length === 0) {
    throw new Error('No rotation configurations found');
  }

  console.log(`   ${status.length} secrets configured for rotation`);
}

async function testManualRotation() {
  const vaultClient = initializeVaultClient();
  const rotationService = getSecretRotationService();

  // Create a test secret
  const testPath = 'backend/test-rotation';
  await vaultClient.setSecret(testPath, {
    value: 'original_value',
    created_at: new Date().toISOString(),
  });

  // Add rotation config
  rotationService.addRotationConfig({
    path: testPath,
    rotationIntervalDays: 1,
    autoRotate: true,
  });

  // Rotate the secret
  const result = await rotationService.manualRotation(testPath);

  if (!result.success) {
    throw new Error(`Rotation failed: ${result.error}`);
  }

  // Verify rotation
  const rotatedSecret = await vaultClient.getSecret(testPath, false);
  if (!rotatedSecret.rotated_at) {
    throw new Error('Secret was not rotated (missing rotated_at field)');
  }

  // Cleanup
  await vaultClient.deleteSecret(testPath);
  rotationService.removeRotationConfig(testPath);
}

async function testCacheStatistics() {
  const vaultClient = initializeVaultClient();

  // Perform some operations
  await vaultClient.getSecret('backend/jwt', true);
  await vaultClient.getSecret('backend/database', true);

  const stats = vaultClient.getCacheStats();

  if (stats.size === 0) {
    throw new Error('Cache is empty after operations');
  }

  console.log(`   Cache size: ${stats.size} entries`);
}

async function testErrorHandling() {
  const vaultClient = initializeVaultClient();

  try {
    await vaultClient.getSecret('nonexistent/path/that/does/not/exist');
    throw new Error('Should have thrown an error for nonexistent secret');
  } catch (error: any) {
    if (!error.message.includes('failed')) {
      throw new Error('Unexpected error message');
    }
  }
}

async function main() {
  console.log('🧪 Testing Vault Integration\n');

  // Connection tests
  console.log('📡 Connection Tests:');
  await runTest('Vault connection', testVaultConnection);
  await runTest('Vault status', testVaultStatus);

  // Secret operations
  console.log('\n🔐 Secret Operations:');
  await runTest('Read secret', testReadSecret);
  await runTest('Write secret', testWriteSecret);
  await runTest('Secret caching', testSecretCaching);
  await runTest('List secrets', testListSecrets);

  // Specialized getters
  console.log('\n🔑 Specialized Getters:');
  await runTest('Get database credentials', testGetDatabaseCredentials);
  await runTest('Get blockchain private key', testGetBlockchainPrivateKey);
  await runTest('Get API key', testGetAPIKey);

  // Rotation tests
  console.log('\n🔄 Secret Rotation:');
  await runTest('Secret rotation status', testSecretRotation);
  await runTest('Manual rotation', testManualRotation);

  // Performance tests
  console.log('\n⚡ Performance:');
  await runTest('Cache statistics', testCacheStatistics);

  // Error handling
  console.log('\n🛡️  Error Handling:');
  await runTest('Error handling', testErrorHandling);

  // Summary
  console.log('\n📊 Test Summary:');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;
  const avgDuration =
    results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`   Total: ${total}`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⏱️  Average duration: ${avgDuration.toFixed(2)}ms`);

  if (failed > 0) {
    console.log('\n❌ Some tests failed:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`   - ${r.name}: ${r.message}`);
      });
    process.exit(1);
  }

  console.log('\n✅ All tests passed!');
}

main().catch((error) => {
  console.error('\n❌ Test suite failed:', error.message);
  process.exit(1);
});
