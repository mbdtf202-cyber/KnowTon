/**
 * Test script for Enterprise Dashboard functionality
 * 
 * This script tests:
 * 1. Dashboard statistics calculation
 * 2. Usage report generation (CSV and PDF)
 * 3. License management
 * 4. Seat utilization tracking
 */

import { PrismaClient } from '@prisma/client';
import { bulkPurchaseService } from '../services/bulk-purchase.service';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function testEnterpriseDashboard() {
  console.log('🧪 Testing Enterprise Dashboard...\n');

  try {
    // Step 1: Create test user first
    console.log('1️⃣ Creating test user...');
    const testUser = await prisma.user.create({
      data: {
        email: 'enterprise-admin@test.com',
        username: 'enterprise-admin',
        role: 'enterprise',
        isActive: true,
      },
    });
    console.log(`✅ User created: ${testUser.id}`);

    // Step 2: Create test enterprise account
    console.log('2️⃣ Creating test enterprise account...');
    const enterprise = await prisma.enterpriseAccount.create({
      data: {
        userId: testUser.id,
        companyName: 'Test Enterprise Corp',
        companyEmail: 'test@enterprise.com',
        companyAddress: '123 Business St, Tech City, TC 12345',
        contactName: 'John Doe',
        contactEmail: 'john.doe@enterprise.com',
        contactPhone: '+1-555-0123',
        billingEmail: 'billing@enterprise.com',
        status: 'active',
      },
    });
    console.log(`✅ Enterprise created: ${enterprise.id}\n`);

    // Step 3: Create test licenses
    console.log('3️⃣ Creating test licenses...');
    const licenses = [];
    for (let i = 0; i < 3; i++) {
      const license = await bulkPurchaseService.createEnterpriseLicense({
        enterpriseId: enterprise.id,
        contentId: `content-${i + 1}`,
        totalSeats: 10 + i * 5,
        pricePerSeat: 50 + i * 10,
        currency: 'USD',
        expiresAt: new Date(Date.now() + (30 + i * 30) * 24 * 60 * 60 * 1000),
      });
      licenses.push(license);
      console.log(`✅ License ${i + 1} created: ${license.licenseKey}`);
    }
    console.log('');

    // Step 4: Assign seats
    console.log('4️⃣ Assigning seats to users...');
    const testUsers = [
      'user1@test.com',
      'user2@test.com',
      'user3@test.com',
      'user4@test.com',
      'user5@test.com',
    ];

    for (let i = 0; i < licenses.length; i++) {
      const license = licenses[i];
      const numSeats = Math.min(testUsers.length, license.totalSeats);

      for (let j = 0; j < numSeats; j++) {
        await bulkPurchaseService.assignSeat(license.id, testUsers[j]);
      }
      console.log(`✅ Assigned ${numSeats} seats to license ${license.licenseKey}`);
    }
    console.log('');

    // Step 5: Track usage
    console.log('5️⃣ Tracking usage events...');
    const actions = ['view', 'download', 'share', 'edit', 'comment'];

    for (const license of licenses) {
      for (let i = 0; i < 20; i++) {
        const userEmail = testUsers[Math.floor(Math.random() * testUsers.length)];
        const action = actions[Math.floor(Math.random() * actions.length)];

        await bulkPurchaseService.trackUsage(license.id, userEmail, action, {
          timestamp: new Date(),
          sessionId: `session-${Math.random().toString(36).substring(7)}`,
        });
      }
    }
    console.log(`✅ Tracked 60 usage events across all licenses\n`);

    // Step 6: Get dashboard stats
    console.log('6️⃣ Fetching dashboard statistics...');
    const stats = await bulkPurchaseService.getDashboardStats(enterprise.id, '30d');
    console.log('Dashboard Stats:');
    console.log(`  - Total Licenses: ${stats.totalLicenses}`);
    console.log(`  - Active Licenses: ${stats.activeLicenses}`);
    console.log(`  - Total Seats: ${stats.totalSeats}`);
    console.log(`  - Used Seats: ${stats.usedSeats}`);
    console.log(`  - Utilization Rate: ${stats.utilizationRate.toFixed(2)}%`);
    console.log(`  - Expiring Licenses: ${stats.expiringLicenses}`);
    console.log(`  - Total Usage: ${stats.totalUsage}`);
    console.log('');

    // Step 7: Get license usage stats
    console.log('7️⃣ Fetching license usage statistics...');
    for (const license of licenses) {
      const usageStats = await bulkPurchaseService.getLicenseUsageStats(license.id);
      console.log(`License ${license.licenseKey}:`);
      console.log(`  - Total Usage: ${usageStats.totalUsage}`);
      console.log(`  - Actions: ${usageStats.usageByAction.length} types`);
      console.log(`  - Top Users: ${usageStats.topUsers.length}`);
    }
    console.log('');

    // Step 8: Generate CSV report
    console.log('8️⃣ Generating CSV report...');
    const csvReport = await bulkPurchaseService.generateUsageReport(
      enterprise.id,
      'csv',
      '30d'
    );
    const csvPath = path.join(__dirname, '../../test-reports/enterprise-report.csv');
    fs.mkdirSync(path.dirname(csvPath), { recursive: true });
    fs.writeFileSync(csvPath, csvReport);
    console.log(`✅ CSV report saved to: ${csvPath}\n`);

    // Step 9: Generate PDF report
    console.log('9️⃣ Generating PDF report...');
    const pdfReport = await bulkPurchaseService.generateUsageReport(
      enterprise.id,
      'pdf',
      '30d'
    );
    const pdfPath = path.join(__dirname, '../../test-reports/enterprise-report.pdf');
    fs.writeFileSync(pdfPath, pdfReport);
    console.log(`✅ PDF report saved to: ${pdfPath}\n`);

    // Step 10: Test seat management
    console.log('🔟 Testing seat management...');
    const license = licenses[0];
    const seats = await prisma.enterpriseLicenseSeat.findMany({
      where: { licenseId: license.id, status: 'active' },
    });

    if (seats.length > 0) {
      const seatToRevoke = seats[0];
      await bulkPurchaseService.revokeSeat(seatToRevoke.id);
      console.log(`✅ Revoked seat for ${seatToRevoke.userEmail}`);

      // Re-assign the seat
      await bulkPurchaseService.assignSeat(license.id, seatToRevoke.userEmail);
      console.log(`✅ Re-assigned seat to ${seatToRevoke.userEmail}`);
    }
    console.log('');

    // Step 11: List all licenses
    console.log('1️⃣1️⃣ Listing all enterprise licenses...');
    const licenseList = await bulkPurchaseService.listLicenses(enterprise.id, {
      limit: 10,
      offset: 0,
    });
    console.log(`✅ Found ${licenseList.total} licenses`);
    licenseList.licenses.forEach((lic, index) => {
      console.log(
        `  ${index + 1}. ${lic.licenseKey} - ${lic.usedSeats}/${lic.totalSeats} seats - ${lic.status}`
      );
    });
    console.log('');

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await prisma.enterpriseLicenseUsage.deleteMany({
      where: {
        licenseId: {
          in: licenses.map((l) => l.id),
        },
      },
    });
    await prisma.enterpriseLicenseSeat.deleteMany({
      where: {
        licenseId: {
          in: licenses.map((l) => l.id),
        },
      },
    });
    await prisma.enterpriseLicense.deleteMany({
      where: { enterpriseId: enterprise.id },
    });
    await prisma.enterpriseAccount.delete({
      where: { id: enterprise.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    console.log('✅ Test data cleaned up\n');

    console.log('✅ All Enterprise Dashboard tests passed!\n');
    console.log('📊 Summary:');
    console.log('  - Dashboard statistics: ✅');
    console.log('  - Usage tracking: ✅');
    console.log('  - CSV report generation: ✅');
    console.log('  - PDF report generation: ✅');
    console.log('  - Seat management: ✅');
    console.log('  - License listing: ✅');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testEnterpriseDashboard()
  .then(() => {
    console.log('\n✅ Enterprise Dashboard test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Enterprise Dashboard test failed:', error);
    process.exit(1);
  });
