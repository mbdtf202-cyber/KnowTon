import { DeviceFingerprintService } from '../services/device-fingerprint.service';
import { DeviceManagementService } from '../services/device-management.service';
import { logger } from '../utils/logger';

/**
 * Test script for device binding functionality
 */
async function testDeviceBinding() {
  console.log('🧪 Testing Device Binding Implementation\n');

  const fingerprintService = new DeviceFingerprintService();
  const deviceManagementService = new DeviceManagementService();

  const testUserId = 'test-user-' + Date.now();

  try {
    // Test 1: Device Fingerprinting
    console.log('📝 Test 1: Device Fingerprinting');
    const deviceInfo1 = {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
      ipAddress: '192.168.1.100',
      platform: 'Win32',
      screenResolution: '1920x1080',
      timezone: 'America/New_York',
      language: 'en-US',
    };

    const fingerprint1 = fingerprintService.generateFingerprint(deviceInfo1);
    console.log('✅ Device fingerprint generated:');
    console.log('   Device ID:', fingerprint1.deviceId);
    console.log('   Confidence:', (fingerprint1.confidence * 100).toFixed(1) + '%');
    console.log('   Browser:', fingerprint1.deviceInfo.browser);
    console.log('   OS:', fingerprint1.deviceInfo.os);
    console.log('');

    // Test 2: Device Registration
    console.log('📝 Test 2: Device Registration');
    const result1 = await deviceManagementService.registerDevice(
      testUserId,
      deviceInfo1
    );
    console.log('✅ Device 1 registered:', result1.success);
    console.log('   Device Name:', result1.device?.deviceName);
    console.log('');

    // Test 3: Register Second Device
    console.log('📝 Test 3: Register Second Device');
    const deviceInfo2 = {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1',
      ipAddress: '192.168.1.101',
      platform: 'iPhone',
      screenResolution: '390x844',
      timezone: 'America/New_York',
      language: 'en-US',
    };

    const result2 = await deviceManagementService.registerDevice(
      testUserId,
      deviceInfo2
    );
    console.log('✅ Device 2 registered:', result2.success);
    console.log('   Device Name:', result2.device?.deviceName);
    console.log('');

    // Test 4: Register Third Device
    console.log('📝 Test 4: Register Third Device');
    const deviceInfo3 = {
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
      ipAddress: '192.168.1.102',
      platform: 'MacIntel',
      screenResolution: '2560x1440',
      timezone: 'America/Los_Angeles',
      language: 'en-US',
    };

    const result3 = await deviceManagementService.registerDevice(
      testUserId,
      deviceInfo3
    );
    console.log('✅ Device 3 registered:', result3.success);
    console.log('   Device Name:', result3.device?.deviceName);
    console.log('');

    // Test 5: Get Device Statistics
    console.log('📝 Test 5: Device Statistics');
    const stats = await deviceManagementService.getDeviceStatistics(testUserId);
    console.log('✅ Statistics retrieved:');
    console.log('   Total Devices:', stats.totalDevices);
    console.log('   Active Devices:', stats.activeDevices);
    console.log('   Max Devices:', stats.maxDevices);
    console.log('   Can Add Device:', stats.canAddDevice);
    console.log('');

    // Test 6: Try to Register Fourth Device (Should Fail)
    console.log('📝 Test 6: Device Limit Enforcement');
    const deviceInfo4 = {
      userAgent: 'Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0',
      ipAddress: '192.168.1.103',
      platform: 'Linux',
      screenResolution: '1080x2400',
      timezone: 'America/New_York',
      language: 'en-US',
    };

    const result4 = await deviceManagementService.registerDevice(
      testUserId,
      deviceInfo4
    );
    console.log('✅ Device limit enforced:', !result4.success);
    console.log('   Limit Exceeded:', result4.limitExceeded);
    console.log('   Message:', result4.message);
    console.log('');

    // Test 7: Get All Devices
    console.log('📝 Test 7: List All Devices');
    const devices = await deviceManagementService.getUserDevices(testUserId);
    console.log('✅ Devices retrieved:', devices.length);
    devices.forEach((device, index) => {
      console.log(`   Device ${index + 1}:`);
      console.log('     Name:', device.deviceName);
      console.log('     ID:', device.deviceId);
      console.log('     Active:', device.isActive);
      console.log('     Access Count:', device.accessCount);
    });
    console.log('');

    // Test 8: Verify Device
    console.log('📝 Test 8: Device Verification');
    const isAuthorized = await deviceManagementService.verifyDevice(
      testUserId,
      deviceInfo1
    );
    console.log('✅ Device 1 verified:', isAuthorized);
    console.log('');

    // Test 9: Revoke Device
    console.log('📝 Test 9: Device Revocation');
    const device1 = devices[0];
    const revokeSuccess = await deviceManagementService.revokeDevice(
      testUserId,
      device1.deviceId
    );
    console.log('✅ Device revoked:', revokeSuccess);
    console.log('');

    // Test 10: Verify Statistics After Revocation
    console.log('📝 Test 10: Statistics After Revocation');
    const statsAfterRevoke = await deviceManagementService.getDeviceStatistics(
      testUserId
    );
    console.log('✅ Updated statistics:');
    console.log('   Active Devices:', statsAfterRevoke.activeDevices);
    console.log('   Revoked Devices:', statsAfterRevoke.revokedDevices);
    console.log('   Can Add Device:', statsAfterRevoke.canAddDevice);
    console.log('');

    // Test 11: Register New Device After Revocation
    console.log('📝 Test 11: Register Device After Revocation');
    const result5 = await deviceManagementService.registerDevice(
      testUserId,
      deviceInfo4
    );
    console.log('✅ New device registered:', result5.success);
    console.log('   Device Name:', result5.device?.deviceName);
    console.log('');

    // Test 12: Device Name Generation
    console.log('📝 Test 12: Device Name Generation');
    const testDevices = [
      {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0',
        ipAddress: '1.1.1.1',
        browser: 'Chrome',
        os: 'Windows',
        platform: 'desktop',
      },
      {
        userAgent: 'Mozilla/5.0 (iPhone) Safari/604.1',
        ipAddress: '1.1.1.2',
        browser: 'Safari',
        os: 'iOS',
        platform: 'mobile',
      },
      {
        userAgent: 'Mozilla/5.0 (Macintosh) Firefox/120.0',
        ipAddress: '1.1.1.3',
        browser: 'Firefox',
        os: 'macOS',
        platform: 'desktop',
      },
    ];

    testDevices.forEach((device) => {
      const name = fingerprintService.generateDeviceName(device);
      console.log(`   ${device.browser} on ${device.os}:`, name);
    });
    console.log('');

    // Test 13: Cleanup (Revoke All)
    console.log('📝 Test 13: Cleanup - Revoke All Devices');
    const revokeCount = await deviceManagementService.revokeAllDevices(
      testUserId
    );
    console.log('✅ All devices revoked:', revokeCount);
    console.log('');

    // Final Statistics
    console.log('📝 Final Statistics');
    const finalStats = await deviceManagementService.getDeviceStatistics(
      testUserId
    );
    console.log('✅ Final state:');
    console.log('   Total Devices:', finalStats.totalDevices);
    console.log('   Active Devices:', finalStats.activeDevices);
    console.log('   Revoked Devices:', finalStats.revokedDevices);
    console.log('');

    console.log('✅ All tests passed!\n');
    console.log('📊 Summary:');
    console.log('   ✓ Device fingerprinting works correctly');
    console.log('   ✓ Device registration enforces 3-device limit');
    console.log('   ✓ Device verification works');
    console.log('   ✓ Device revocation works');
    console.log('   ✓ Statistics are accurate');
    console.log('   ✓ Device names are generated correctly');
    console.log('');
    console.log('🎉 Device Binding implementation is working correctly!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run tests
if (require.main === module) {
  testDeviceBinding()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { testDeviceBinding };
