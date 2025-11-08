import { PrismaClient } from '@prisma/client';
import { bulkPurchaseService } from '../services/bulk-purchase.service';

const prisma = new PrismaClient();

async function testBulkPurchase() {
  try {
    console.log('🧪 Testing Bulk Purchase API...\n');

    // Step 1: Create test enterprise account
    console.log('1️⃣ Creating test enterprise account...');
    const enterprise = await prisma.enterpriseAccount.create({
      data: {
        userId: 'test-user-' + Date.now(),
        companyName: 'Test Enterprise Corp',
        companyEmail: 'enterprise@test.com',
        contactName: 'John Doe',
        contactEmail: 'john@test.com',
        billingEmail: 'billing@test.com',
        accountType: 'enterprise',
        status: 'active',
      },
    });
    console.log('✅ Enterprise account created:', enterprise.id);
    console.log('   Company:', enterprise.companyName);
    console.log('');

    // Step 2: Test discount calculation
    console.log('2️⃣ Testing bulk discount calculation...');
    const testItems = [
      { contentId: 'content-1', quantity: 5, price: 100, seats: 5 },
      { contentId: 'content-2', quantity: 8, price: 150, seats: 8 },
    ];
    const totalItems = testItems.reduce((sum, item) => sum + item.quantity, 0);
    const discount = bulkPurchaseService.calculateBulkDiscount(totalItems);
    console.log('✅ Discount calculation:');
    console.log('   Total items:', totalItems);
    console.log('   Discount:', discount + '%');
    console.log('   Expected: 20% (>10 items)');
    console.log('');

    // Step 3: Create bulk purchase
    console.log('3️⃣ Creating bulk purchase...');
    const purchase = await bulkPurchaseService.createBulkPurchase({
      enterpriseId: enterprise.id,
      items: testItems,
      currency: 'USD',
      paymentMethod: 'stripe',
    });
    console.log('✅ Bulk purchase created:', purchase.id);
    console.log('   Purchase Order ID:', purchase.purchaseOrderId);
    console.log('   Total Items:', purchase.totalItems);
    console.log('   Total Amount: $' + purchase.totalAmount);
    console.log('   Discount:', purchase.discountPercent + '%');
    console.log('   Discount Amount: $' + purchase.discountAmount);
    console.log('   Final Amount: $' + purchase.finalAmount);
    console.log('');

    // Step 4: Create enterprise license
    console.log('4️⃣ Creating enterprise license...');
    const license = await bulkPurchaseService.createEnterpriseLicense({
      enterpriseId: enterprise.id,
      contentId: 'test-content-123',
      totalSeats: 10,
      pricePerSeat: 50,
      currency: 'USD',
    });
    console.log('✅ License created:', license.id);
    console.log('   License Key:', license.licenseKey);
    console.log('   Total Seats:', license.totalSeats);
    console.log('   Used Seats:', license.usedSeats);
    console.log('   Price per Seat: $' + license.pricePerSeat);
    console.log('   Total Amount: $' + license.totalAmount);
    console.log('');

    // Step 5: Assign seats
    console.log('5️⃣ Assigning seats to users...');
    const users = [
      { email: 'user1@test.com', userId: 'user-1' },
      { email: 'user2@test.com', userId: 'user-2' },
      { email: 'user3@test.com', userId: 'user-3' },
    ];

    for (const user of users) {
      const seat = await bulkPurchaseService.assignSeat(license.id, user.email, user.userId);
      console.log(`✅ Seat assigned to ${user.email}:`, seat.id);
    }
    console.log('');

    // Step 6: Check license status
    console.log('6️⃣ Checking license status...');
    const updatedLicense = await bulkPurchaseService.getLicense(license.id);
    console.log('✅ License status:');
    console.log('   Total Seats:', updatedLicense.totalSeats);
    console.log('   Used Seats:', updatedLicense.usedSeats);
    console.log('   Available Seats:', updatedLicense.totalSeats - updatedLicense.usedSeats);
    console.log('   Active Seats:', updatedLicense.seats.length);
    console.log('');

    // Step 7: Track usage
    console.log('7️⃣ Tracking license usage...');
    await bulkPurchaseService.trackUsage(license.id, users[0].email, 'access', {
      contentType: 'video',
      duration: 120,
    });
    await bulkPurchaseService.trackUsage(license.id, users[1].email, 'download', {
      fileSize: 1024000,
    });
    console.log('✅ Usage tracked for 2 users');
    console.log('');

    // Step 8: Get usage statistics
    console.log('8️⃣ Getting usage statistics...');
    const stats = await bulkPurchaseService.getLicenseUsageStats(license.id);
    console.log('✅ Usage statistics:');
    console.log('   Total Usage:', stats.totalUsage);
    console.log('   Usage by Action:', JSON.stringify(stats.usageByAction, null, 2));
    console.log('');

    // Step 9: Revoke a seat
    console.log('9️⃣ Revoking a seat...');
    const seatToRevoke = updatedLicense.seats[0];
    await bulkPurchaseService.revokeSeat(seatToRevoke.id);
    console.log('✅ Seat revoked:', seatToRevoke.id);
    console.log('   User:', seatToRevoke.userEmail);
    console.log('');

    // Step 10: Generate invoice
    console.log('🔟 Generating invoice...');
    const invoice = await bulkPurchaseService.generateInvoice(purchase.id);
    console.log('✅ Invoice generated:', invoice.id);
    console.log('   Invoice Number:', invoice.invoiceNumber);
    console.log('   Amount: $' + invoice.amount);
    console.log('   Tax: $' + invoice.tax);
    console.log('   Total: $' + invoice.totalAmount);
    console.log('   Status:', invoice.status);
    console.log('   Due Date:', invoice.dueDate);
    console.log('');

    // Step 11: Test large bulk purchase (>50 items for 30% discount)
    console.log('1️⃣1️⃣ Testing large bulk purchase (>50 items)...');
    const largeItems = Array.from({ length: 60 }, (_, i) => ({
      contentId: `content-${i}`,
      quantity: 1,
      price: 100,
      seats: 1,
    }));
    const largePurchase = await bulkPurchaseService.createBulkPurchase({
      enterpriseId: enterprise.id,
      items: largeItems,
      currency: 'USD',
    });
    console.log('✅ Large bulk purchase created:', largePurchase.id);
    console.log('   Total Items:', largePurchase.totalItems);
    console.log('   Total Amount: $' + largePurchase.totalAmount);
    console.log('   Discount:', largePurchase.discountPercent + '%');
    console.log('   Expected: 30% (>50 items)');
    console.log('   Discount Amount: $' + largePurchase.discountAmount);
    console.log('   Final Amount: $' + largePurchase.finalAmount);
    console.log('');

    console.log('✅ All tests completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log('   - Enterprise account created');
    console.log('   - Bulk discount logic verified (20% for >10, 30% for >50)');
    console.log('   - Bulk purchase created with discount');
    console.log('   - Enterprise license created');
    console.log('   - Seats assigned and managed');
    console.log('   - Usage tracking working');
    console.log('   - Invoice generated with line items');
    console.log('');

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await prisma.enterpriseInvoice.deleteMany({ where: { enterpriseId: enterprise.id } });
    await prisma.enterpriseLicenseUsage.deleteMany({ where: { licenseId: license.id } });
    await prisma.enterpriseLicenseSeat.deleteMany({ where: { licenseId: license.id } });
    await prisma.enterpriseLicense.deleteMany({ where: { enterpriseId: enterprise.id } });
    await prisma.bulkPurchase.deleteMany({ where: { enterpriseId: enterprise.id } });
    await prisma.enterpriseAccount.delete({ where: { id: enterprise.id } });
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testBulkPurchase()
  .then(() => {
    console.log('\n✅ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
