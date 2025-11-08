# Bulk Purchase API - Quick Start Guide

## Overview

This guide will help you quickly integrate the Bulk Purchase API for enterprise customers.

## Prerequisites

- Enterprise account created
- Stripe account configured
- Database migrations applied

## Setup

### 1. Run Database Migration

```bash
cd packages/backend
npx prisma migrate dev --name add_bulk_purchase_tables
npx prisma generate
```

### 2. Environment Variables

Ensure these are set in your `.env`:

```env
DATABASE_URL="postgresql://..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
FRONTEND_URL="http://localhost:5173"
```

### 3. Start the Backend

```bash
npm run dev
```

## Quick Test

### Run the Test Script

```bash
npm run ts-node src/scripts/test-bulk-purchase.ts
```

Expected output:
```
🧪 Testing Bulk Purchase API...

1️⃣ Creating test enterprise account...
✅ Enterprise account created: ent-xxx
   Company: Test Enterprise Corp

2️⃣ Testing bulk discount calculation...
✅ Discount calculation:
   Total items: 13
   Discount: 20%
   Expected: 20% (>10 items)

3️⃣ Creating bulk purchase...
✅ Bulk purchase created: bp-xxx
   Purchase Order ID: PO-1234567890-ABCD1234
   Total Items: 13
   Total Amount: $1700
   Discount: 20%
   Discount Amount: $340
   Final Amount: $1360

...
```

## Basic Usage

### 1. Create Enterprise Account

```typescript
const enterprise = await prisma.enterpriseAccount.create({
  data: {
    userId: 'user-123',
    companyName: 'Acme Corp',
    companyEmail: 'contact@acme.com',
    contactName: 'John Doe',
    contactEmail: 'john@acme.com',
    billingEmail: 'billing@acme.com',
    accountType: 'enterprise',
    status: 'active',
  },
});
```

### 2. Calculate Discount

```bash
curl -X POST http://localhost:3000/api/v1/bulk-purchase/calculate-discount \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"contentId": "content-1", "quantity": 15, "price": 100},
      {"contentId": "content-2", "quantity": 10, "price": 150}
    ]
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "totalItems": 25,
    "totalAmount": 3000,
    "discountPercent": 20,
    "discountAmount": 600,
    "finalAmount": 2400
  }
}
```

### 3. Create Bulk Purchase

```bash
curl -X POST http://localhost:3000/api/v1/bulk-purchase/create \
  -H "Content-Type: application/json" \
  -d '{
    "enterpriseId": "ent-123",
    "items": [
      {"contentId": "content-1", "quantity": 15, "price": 100, "seats": 15},
      {"contentId": "content-2", "quantity": 10, "price": 150, "seats": 10}
    ],
    "currency": "USD"
  }'
```

### 4. Create License

```bash
curl -X POST http://localhost:3000/api/v1/bulk-purchase/licenses/create \
  -H "Content-Type: application/json" \
  -d '{
    "enterpriseId": "ent-123",
    "contentId": "content-789",
    "totalSeats": 50,
    "pricePerSeat": 75,
    "currency": "USD"
  }'
```

### 5. Assign Seat

```bash
curl -X POST http://localhost:3000/api/v1/bulk-purchase/licenses/lic-123/seats/assign \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "user@company.com",
    "userId": "user-123"
  }'
```

### 6. Track Usage

```bash
curl -X POST http://localhost:3000/api/v1/bulk-purchase/licenses/lic-123/usage \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "user@company.com",
    "action": "access",
    "metadata": {
      "contentType": "video",
      "duration": 120
    }
  }'
```

## Discount Tiers

| Items | Discount | Example Calculation |
|-------|----------|---------------------|
| 1-10 | 0% | $1,000 → $1,000 (no discount) |
| 11-50 | 20% | $2,000 → $1,600 (save $400) |
| 51+ | 30% | $6,000 → $4,200 (save $1,800) |

## Common Workflows

### Workflow 1: Simple Bulk Purchase

```typescript
// 1. Create purchase
const purchase = await bulkPurchaseService.createBulkPurchase({
  enterpriseId: 'ent-123',
  items: [
    { contentId: 'content-1', quantity: 20, price: 100, seats: 20 }
  ],
  currency: 'USD',
});

// 2. Process checkout
const checkout = await bulkPurchaseService.processEnterpriseCheckout(purchase.id);

// 3. Complete after payment
const result = await bulkPurchaseService.completeBulkPurchase(purchase.id);
// Creates licenses and invoice automatically
```

### Workflow 2: License Management

```typescript
// 1. Create license
const license = await bulkPurchaseService.createEnterpriseLicense({
  enterpriseId: 'ent-123',
  contentId: 'content-1',
  totalSeats: 100,
  pricePerSeat: 50,
});

// 2. Assign seats
const users = ['user1@co.com', 'user2@co.com', 'user3@co.com'];
for (const email of users) {
  await bulkPurchaseService.assignSeat(license.id, email);
}

// 3. Track usage
await bulkPurchaseService.trackUsage(
  license.id,
  'user1@co.com',
  'access'
);

// 4. Get stats
const stats = await bulkPurchaseService.getLicenseUsageStats(license.id);
```

### Workflow 3: Seat Management

```typescript
// Get license with seats
const license = await bulkPurchaseService.getLicense('lic-123');

console.log(`Available: ${license.totalSeats - license.usedSeats} seats`);

// Assign new seat
if (license.usedSeats < license.totalSeats) {
  await bulkPurchaseService.assignSeat(
    license.id,
    'newuser@company.com'
  );
}

// Revoke seat
const seat = license.seats[0];
await bulkPurchaseService.revokeSeat(seat.id);
```

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bulk-purchase/calculate-discount` | Calculate discount |
| POST | `/bulk-purchase/create` | Create bulk purchase |
| POST | `/bulk-purchase/:id/checkout` | Process checkout |
| POST | `/bulk-purchase/:id/complete` | Complete purchase |
| GET | `/bulk-purchase/:id` | Get purchase details |
| POST | `/bulk-purchase/licenses/create` | Create license |
| GET | `/bulk-purchase/licenses/:id` | Get license details |
| GET | `/bulk-purchase/enterprises/:id/licenses` | List licenses |
| POST | `/bulk-purchase/licenses/:id/seats/assign` | Assign seat |
| POST | `/bulk-purchase/seats/:id/revoke` | Revoke seat |
| POST | `/bulk-purchase/licenses/:id/usage` | Track usage |
| GET | `/bulk-purchase/licenses/:id/stats` | Get usage stats |
| POST | `/bulk-purchase/:id/invoice` | Generate invoice |

## Troubleshooting

### Issue: "Enterprise account not found"
**Solution**: Ensure the enterprise account exists and is active:
```typescript
const enterprise = await prisma.enterpriseAccount.findUnique({
  where: { id: 'ent-123' }
});
console.log(enterprise?.status); // Should be 'active'
```

### Issue: "No available seats"
**Solution**: Check seat usage:
```typescript
const license = await bulkPurchaseService.getLicense('lic-123');
console.log(`Used: ${license.usedSeats}/${license.totalSeats}`);
```

### Issue: "Seat already assigned"
**Solution**: Check if user already has a seat:
```typescript
const seat = await prisma.enterpriseLicenseSeat.findUnique({
  where: {
    licenseId_userEmail: {
      licenseId: 'lic-123',
      userEmail: 'user@company.com'
    }
  }
});
```

## Next Steps

1. ✅ Bulk purchase API implemented
2. ⏳ Integrate with frontend dashboard (TASK-1.10.4)
3. ⏳ Add SSO integration (TASK-1.10.3)
4. ⏳ Implement usage reports
5. ⏳ Add email notifications

## Support

For issues or questions:
- Check the full API documentation: `BULK_PURCHASE_API.md`
- Run the test script: `npm run ts-node src/scripts/test-bulk-purchase.ts`
- Review the service code: `src/services/bulk-purchase.service.ts`

## Requirements Satisfied

✅ **TASK-1.10.1**: Bulk purchase API (3 days)
- ✅ Implement bulk discount logic (>10: 20% off, >50: 30% off)
- ✅ Create enterprise checkout flow
- ✅ Generate bulk invoices with line items
- ✅ Add seat management for licenses
- ✅ Requirements: REQ-1.5.1
