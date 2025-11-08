# Bulk Purchase API Documentation

## Overview

The Bulk Purchase API enables enterprise customers to purchase multiple content licenses with automatic bulk discounts, seat management, and invoice generation. This system is designed for B2B customers who need to manage licenses for multiple users within their organization.

## Features

- ✅ **Automatic Bulk Discounts**: 20% off for >10 items, 30% off for >50 items
- ✅ **Enterprise Checkout Flow**: Streamlined payment process for bulk purchases
- ✅ **Invoice Generation**: Automatic PDF invoice generation with line items
- ✅ **Seat Management**: Assign and revoke licenses to specific users
- ✅ **Usage Tracking**: Monitor how licenses are being used
- ✅ **Multi-Currency Support**: USD, EUR, CNY, JPY

## Discount Tiers

| Quantity | Discount | Example |
|----------|----------|---------|
| 1-10 items | 0% | $1,000 → $1,000 |
| 11-50 items | 20% | $2,000 → $1,600 |
| 51+ items | 30% | $6,000 → $4,200 |

## API Endpoints

### 1. Calculate Bulk Discount

Calculate the discount for a given set of items before creating a purchase.

**Endpoint**: `POST /api/v1/bulk-purchase/calculate-discount`

**Request Body**:
```json
{
  "items": [
    {
      "contentId": "content-123",
      "quantity": 15,
      "price": 100
    },
    {
      "contentId": "content-456",
      "quantity": 10,
      "price": 150
    }
  ]
}
```

**Response**:
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

### 2. Create Bulk Purchase

Create a new bulk purchase order with automatic discount calculation.

**Endpoint**: `POST /api/v1/bulk-purchase/create`

**Request Body**:
```json
{
  "enterpriseId": "ent-123",
  "items": [
    {
      "contentId": "content-123",
      "quantity": 15,
      "price": 100,
      "seats": 15
    },
    {
      "contentId": "content-456",
      "quantity": 10,
      "price": 150,
      "seats": 10
    }
  ],
  "currency": "USD",
  "paymentMethod": "stripe",
  "metadata": {
    "department": "Engineering",
    "purchaseOrder": "PO-2024-001"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "bp-uuid",
    "purchaseOrderId": "PO-1234567890-ABCD1234",
    "totalItems": 25,
    "totalAmount": 3000,
    "discountPercent": 20,
    "discountAmount": 600,
    "finalAmount": 2400,
    "currency": "USD",
    "paymentStatus": "pending",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

### 3. Process Enterprise Checkout

Initiate payment for a bulk purchase using Stripe.

**Endpoint**: `POST /api/v1/bulk-purchase/:purchaseId/checkout`

**Response**:
```json
{
  "success": true,
  "data": {
    "purchaseId": "bp-uuid",
    "purchaseOrderId": "PO-1234567890-ABCD1234",
    "clientSecret": "pi_xxx_secret_xxx",
    "paymentIntentId": "pi_xxx",
    "amount": 2400,
    "currency": "USD"
  }
}
```

### 4. Complete Bulk Purchase

Complete the purchase after successful payment and create licenses.

**Endpoint**: `POST /api/v1/bulk-purchase/:purchaseId/complete`

**Response**:
```json
{
  "success": true,
  "data": {
    "purchase": {
      "id": "bp-uuid",
      "paymentStatus": "completed",
      "completedAt": "2024-01-15T10:05:00Z"
    },
    "licenses": [
      {
        "id": "lic-uuid-1",
        "licenseKey": "LIC-1234567890-ABCD12345678",
        "contentId": "content-123",
        "totalSeats": 15,
        "usedSeats": 0
      },
      {
        "id": "lic-uuid-2",
        "licenseKey": "LIC-1234567890-EFGH12345678",
        "contentId": "content-456",
        "totalSeats": 10,
        "usedSeats": 0
      }
    ],
    "invoice": {
      "id": "inv-uuid",
      "invoiceNumber": "INV-1234567890-ABCD1234",
      "totalAmount": 2640,
      "status": "paid"
    }
  }
}
```

### 5. Create Enterprise License

Create a standalone enterprise license (without bulk purchase).

**Endpoint**: `POST /api/v1/bulk-purchase/licenses/create`

**Request Body**:
```json
{
  "enterpriseId": "ent-123",
  "contentId": "content-789",
  "totalSeats": 50,
  "pricePerSeat": 75,
  "currency": "USD",
  "expiresAt": "2025-01-15T00:00:00Z",
  "metadata": {
    "department": "Sales"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "lic-uuid",
    "licenseKey": "LIC-1234567890-IJKL12345678",
    "enterpriseId": "ent-123",
    "contentId": "content-789",
    "totalSeats": 50,
    "usedSeats": 0,
    "pricePerSeat": 75,
    "totalAmount": 3750,
    "currency": "USD",
    "status": "active",
    "expiresAt": "2025-01-15T00:00:00Z"
  }
}
```

### 6. Get License Details

Retrieve license information including assigned seats and usage.

**Endpoint**: `GET /api/v1/bulk-purchase/licenses/:licenseId`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "lic-uuid",
    "licenseKey": "LIC-1234567890-ABCD12345678",
    "totalSeats": 50,
    "usedSeats": 3,
    "status": "active",
    "seats": [
      {
        "id": "seat-uuid-1",
        "userEmail": "user1@company.com",
        "userId": "user-1",
        "status": "active",
        "assignedAt": "2024-01-15T10:10:00Z",
        "lastUsedAt": "2024-01-15T14:30:00Z"
      }
    ],
    "usageRecords": [
      {
        "id": "usage-uuid-1",
        "userEmail": "user1@company.com",
        "action": "access",
        "timestamp": "2024-01-15T14:30:00Z"
      }
    ]
  }
}
```

### 7. List Enterprise Licenses

Get all licenses for an enterprise account.

**Endpoint**: `GET /api/v1/bulk-purchase/enterprises/:enterpriseId/licenses?limit=20&offset=0`

**Response**:
```json
{
  "success": true,
  "data": {
    "licenses": [
      {
        "id": "lic-uuid-1",
        "licenseKey": "LIC-1234567890-ABCD12345678",
        "contentId": "content-123",
        "totalSeats": 50,
        "usedSeats": 3,
        "status": "active"
      }
    ],
    "total": 5,
    "limit": 20,
    "offset": 0
  }
}
```

### 8. Assign Seat to User

Assign a license seat to a specific user.

**Endpoint**: `POST /api/v1/bulk-purchase/licenses/:licenseId/seats/assign`

**Request Body**:
```json
{
  "userEmail": "newuser@company.com",
  "userId": "user-123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "seat-uuid",
    "licenseId": "lic-uuid",
    "userEmail": "newuser@company.com",
    "userId": "user-123",
    "status": "active",
    "assignedAt": "2024-01-15T15:00:00Z"
  }
}
```

### 9. Revoke Seat

Revoke a license seat from a user.

**Endpoint**: `POST /api/v1/bulk-purchase/seats/:seatId/revoke`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "seat-uuid",
    "status": "revoked",
    "revokedAt": "2024-01-15T16:00:00Z"
  }
}
```

### 10. Track License Usage

Record usage of a license by a user.

**Endpoint**: `POST /api/v1/bulk-purchase/licenses/:licenseId/usage`

**Request Body**:
```json
{
  "userEmail": "user@company.com",
  "action": "access",
  "metadata": {
    "contentType": "video",
    "duration": 120,
    "device": "desktop"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "usage-uuid",
    "licenseId": "lic-uuid",
    "userEmail": "user@company.com",
    "action": "access",
    "timestamp": "2024-01-15T14:30:00Z"
  }
}
```

### 11. Get License Usage Statistics

Get usage statistics for a license.

**Endpoint**: `GET /api/v1/bulk-purchase/licenses/:licenseId/stats?startDate=2024-01-01&endDate=2024-01-31`

**Response**:
```json
{
  "success": true,
  "data": {
    "totalUsage": 150,
    "usageByAction": [
      {
        "action": "access",
        "_count": 100
      },
      {
        "action": "download",
        "_count": 50
      }
    ],
    "topUsers": [
      {
        "userEmail": "user1@company.com",
        "_count": 45
      },
      {
        "userEmail": "user2@company.com",
        "_count": 30
      }
    ]
  }
}
```

### 12. Generate Invoice

Generate an invoice for a bulk purchase.

**Endpoint**: `POST /api/v1/bulk-purchase/:purchaseId/invoice`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "inv-uuid",
    "invoiceNumber": "INV-1234567890-ABCD1234",
    "enterpriseId": "ent-123",
    "purchaseId": "bp-uuid",
    "amount": 2400,
    "tax": 240,
    "totalAmount": 2640,
    "currency": "USD",
    "status": "paid",
    "dueDate": "2024-02-14T00:00:00Z",
    "paidAt": "2024-01-15T10:05:00Z",
    "lineItems": [
      {
        "description": "Content License - content-123",
        "quantity": 15,
        "unitPrice": 100,
        "amount": 1500
      },
      {
        "description": "Content License - content-456",
        "quantity": 10,
        "unitPrice": 150,
        "amount": 1500
      },
      {
        "description": "Bulk Discount (20%)",
        "quantity": 1,
        "unitPrice": -600,
        "amount": -600
      }
    ],
    "pdfUrl": "invoices/INV-1234567890-ABCD1234.pdf"
  }
}
```

## Usage Flow

### Complete Enterprise Purchase Flow

```javascript
// 1. Calculate discount before purchase
const discountCalc = await fetch('/api/v1/bulk-purchase/calculate-discount', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: [
      { contentId: 'content-1', quantity: 15, price: 100 },
      { contentId: 'content-2', quantity: 10, price: 150 }
    ]
  })
});

// 2. Create bulk purchase
const purchase = await fetch('/api/v1/bulk-purchase/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    enterpriseId: 'ent-123',
    items: [
      { contentId: 'content-1', quantity: 15, price: 100, seats: 15 },
      { contentId: 'content-2', quantity: 10, price: 150, seats: 10 }
    ],
    currency: 'USD'
  })
});

// 3. Process checkout
const checkout = await fetch(`/api/v1/bulk-purchase/${purchase.data.id}/checkout`, {
  method: 'POST'
});

// 4. Complete payment with Stripe (frontend)
const stripe = Stripe('pk_xxx');
await stripe.confirmCardPayment(checkout.data.clientSecret, {
  payment_method: 'pm_xxx'
});

// 5. Complete purchase and create licenses
const completion = await fetch(`/api/v1/bulk-purchase/${purchase.data.id}/complete`, {
  method: 'POST'
});

// 6. Assign seats to users
for (const user of users) {
  await fetch(`/api/v1/bulk-purchase/licenses/${licenseId}/seats/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail: user.email,
      userId: user.id
    })
  });
}
```

## Database Schema

### EnterpriseAccount
- Company information and billing details
- Links to all licenses and purchases

### BulkPurchase
- Purchase order with items and pricing
- Automatic discount calculation
- Payment tracking

### EnterpriseLicense
- License key and seat allocation
- Content access permissions
- Expiration management

### EnterpriseLicenseSeat
- Individual user assignments
- Seat status (active/revoked)
- Last usage tracking

### EnterpriseLicenseUsage
- Detailed usage logs
- Action tracking (access, download, view)
- Analytics data

### EnterpriseInvoice
- Invoice generation with line items
- PDF generation
- Payment status tracking

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad request (missing/invalid parameters)
- `404`: Resource not found
- `500`: Server error

## Testing

Run the test script to verify the implementation:

```bash
cd packages/backend
npm run ts-node src/scripts/test-bulk-purchase.ts
```

The test script will:
1. Create a test enterprise account
2. Test discount calculations
3. Create bulk purchases
4. Create and manage licenses
5. Assign and revoke seats
6. Track usage
7. Generate invoices
8. Clean up test data

## Requirements Satisfied

✅ **REQ-1.5.1**: Bulk Purchase & Licensing
- Bulk discount logic (>10: 20% off, >50: 30% off)
- Enterprise checkout flow
- Invoice generation with line items
- Seat management for licenses

## Next Steps

1. Integrate with frontend enterprise dashboard
2. Add email notifications for license assignments
3. Implement SSO integration (TASK-1.10.3)
4. Add usage reports and analytics (TASK-1.10.4)
5. Implement license renewal automation
