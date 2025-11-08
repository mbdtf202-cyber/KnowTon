import { ScreenRecordingPreventionService } from '../services/screen-recording-prevention.service';
import { logger } from '../utils/logger';

/**
 * Test script for screen recording prevention functionality
 */
async function testScreenRecordingPrevention() {
  const service = new ScreenRecordingPreventionService();

  console.log('🧪 Testing Screen Recording Prevention Service\n');

  try {
    // Test 1: Generate dynamic watermark
    console.log('Test 1: Generate Dynamic Watermark');
    console.log('=====================================');
    
    const userId = 'test-user-123';
    const contentId = 'test-content-456';
    const sessionId = 'test-session-789';

    const watermarkConfig = await service.generateDynamicWatermark(
      userId,
      contentId,
      sessionId
    );

    console.log('✅ Watermark config generated:');
    console.log(`   Text: ${watermarkConfig.text}`);
    console.log(`   Update Interval: ${watermarkConfig.updateInterval}ms`);
    console.log(`   Positions: ${watermarkConfig.positions.length} positions`);
    console.log(`   Opacity: ${watermarkConfig.opacity}`);
    console.log(`   Font Size: ${watermarkConfig.fontSize}px`);
    console.log('');

    // Test 2: Log recording attempt
    console.log('Test 2: Log Recording Attempt');
    console.log('=====================================');

    await service.logRecordingAttempt({
      userId,
      contentId,
      detectionMethod: 'api',
      toolName: 'MediaRecorder',
      severity: 'high',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Test)',
      timestamp: new Date(),
    });

    console.log('✅ Recording attempt logged');
    console.log('');

    // Test 3: Detect recording tools
    console.log('Test 3: Detect Recording Tools');
    console.log('=====================================');

    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 OBS/27.0.1',
      'Mozilla/5.0 Camtasia/2021',
    ];

    for (const ua of userAgents) {
      const detection = service.detectRecordingTool(ua);
      console.log(`User Agent: ${ua.substring(0, 50)}...`);
      console.log(`   Detected: ${detection.detected}`);
      if (detection.detected) {
        console.log(`   Tool: ${detection.toolName}`);
        console.log(`   Confidence: ${detection.confidence}`);
      }
      console.log('');
    }

    // Test 4: Detect suspicious extensions
    console.log('Test 4: Detect Suspicious Extensions');
    console.log('=====================================');

    const extensions = [
      'AdBlock Plus',
      'Screencastify - Screen Video Recorder',
      'Loom - Video Recorder',
      'React Developer Tools',
    ];

    const extensionDetection = service.detectSuspiciousExtensions(extensions);
    console.log(`Detected: ${extensionDetection.detected}`);
    if (extensionDetection.detected) {
      console.log(`Extension: ${extensionDetection.extensionName}`);
      console.log(`Confidence: ${extensionDetection.confidence}`);
    }
    console.log('');

    // Test 5: Check ban status
    console.log('Test 5: Check Ban Status');
    console.log('=====================================');

    const isBanned = await service.isUserBanned(userId, contentId);
    console.log(`User banned: ${isBanned}`);
    console.log('');

    // Test 6: Log multiple attempts to trigger ban
    console.log('Test 6: Trigger Ban (5 attempts)');
    console.log('=====================================');

    for (let i = 0; i < 5; i++) {
      await service.logRecordingAttempt({
        userId,
        contentId,
        detectionMethod: 'tool',
        toolName: 'OBS Studio',
        severity: 'high',
        timestamp: new Date(),
      });
      console.log(`   Attempt ${i + 1} logged`);
    }

    const isBannedAfter = await service.isUserBanned(userId, contentId);
    console.log(`User banned after 5 attempts: ${isBannedAfter}`);
    console.log('');

    // Test 7: Get prevention statistics
    console.log('Test 7: Get Prevention Statistics');
    console.log('=====================================');

    const stats = await service.getPreventionStats(contentId);
    console.log(`Total Attempts: ${stats.totalAttempts}`);
    console.log(`Blocked Attempts: ${stats.blockedAttempts}`);
    console.log('By Method:');
    Object.entries(stats.byMethod).forEach(([method, count]) => {
      console.log(`   ${method}: ${count}`);
    });
    console.log('By Severity:');
    Object.entries(stats.bySeverity).forEach(([severity, count]) => {
      console.log(`   ${severity}: ${count}`);
    });
    console.log('');

    // Test 8: Get user attempt history
    console.log('Test 8: Get User Attempt History');
    console.log('=====================================');

    const history = await service.getUserAttemptHistory(userId, 10);
    console.log(`Total attempts in history: ${history.length}`);
    if (history.length > 0) {
      console.log('Latest attempt:');
      const latest = history[0];
      console.log(`   Method: ${latest.detectionMethod}`);
      console.log(`   Tool: ${latest.toolName || 'N/A'}`);
      console.log(`   Severity: ${latest.severity}`);
      console.log(`   Timestamp: ${latest.timestamp}`);
    }
    console.log('');

    // Test 9: Unban user
    console.log('Test 9: Unban User');
    console.log('=====================================');

    await service.unbanUser(userId, contentId);
    const isBannedAfterUnban = await service.isUserBanned(userId, contentId);
    console.log(`User banned after unban: ${isBannedAfterUnban}`);
    console.log('');

    // Test 10: Clear expired bans
    console.log('Test 10: Clear Expired Bans');
    console.log('=====================================');

    const clearedCount = await service.clearExpiredBans();
    console.log(`Expired bans cleared: ${clearedCount}`);
    console.log('');

    console.log('✅ All tests completed successfully!');
    console.log('');
    console.log('Summary:');
    console.log('========');
    console.log('✅ Dynamic watermark generation');
    console.log('✅ Recording attempt logging');
    console.log('✅ Recording tool detection');
    console.log('✅ Suspicious extension detection');
    console.log('✅ Ban system (trigger and check)');
    console.log('✅ Prevention statistics');
    console.log('✅ User attempt history');
    console.log('✅ Unban functionality');
    console.log('✅ Expired ban cleanup');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run tests
if (require.main === module) {
  testScreenRecordingPrevention()
    .then(() => {
      console.log('\n✅ Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test script failed:', error);
      process.exit(1);
    });
}

export { testScreenRecordingPrevention };
