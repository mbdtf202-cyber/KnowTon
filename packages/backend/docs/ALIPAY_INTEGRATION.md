# Alipay Payment Integration

## Overview

This document describes the Alipay payment integration for the KnowTon platform. Alipay is integrated to support CNY (Chinese Yuan) payments for Chinese users.

## Features

- ✅ Web payment (PC browser)
- ✅ WAP payment (mobile browser)
- ✅ Payment status tracking
- ✅ Asynchronous notification handling
- ✅ Synchronous return handling
- ✅ Payment query
- ✅ Refund processing
- ✅ Payment cancellation
- ✅ Signature verification
- ✅ Sandbox testing support

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │────────▶│   Backend    │────────▶│   Alipay    │
│             │         │              │         │   Gateway   │
└─────────────┘         └──────────────┘         └─────────────┘
       │                       │                        │
       │                       │                        │
       │                       │◀───────────────────────┘
       │                       │    Async Notify
       │                       │
       │◀──────────────────────┘
       │    Redirect Return
       │
```

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Alipay Configuration
ALIPAY_APP_ID=your_alipay_app_id
ALIPAY_PRIVATE_KEY=your_alipay_private_key
ALIPAY_PUBLIC_KEY=your_alipay_public_key
ALIPAY_GATEWAY=https://openapi.alipaydev.com/gateway.do
ALIPAY_NOTIFY_URL=https://api.knowton.io/api/v1/payments/alipay/notify
ALIPAY_RETURN_URL=https://knowton.io/payment/complete
```

### Sandbox vs Production

**Sandbox (Development):**
```bash
ALIPAY_GATEWAY=https://openapi.alipaydev.com/gateway.do
```

**Production:**
```bash
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
```

## API Endpoints

### 1. Create Web Payment

Create a payment for PC browser.

**Endpoint:** `POST /api/v1/payments/alipay/web`

**Request Body:**
```json
{
  "userId": "user-123",
  "contentId": "content-456",
  "amount": 100,
  "subject": "Content Purchase",
  "body": "Detailed description",
  "metadata": {
    "custom": "data"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "payment-789",
    "paymentUrl": "https://openapi.alipaydev.com/gateway.do?...",
    "outTradeNo": "AP1234567890",
    "amount": 100,
    "currency": "CNY"
  }
}
```

**Usage:**
```typescript
// Redirect user to payment URL
window.location.href = response.data.paymentUrl;
```

### 2. Create WAP Payment

Create a payment for mobile browser.

**Endpoint:** `POST /api/v1/payments/alipay/wap`

**Request Body:**
```json
{
  "userId": "user-123",
  "contentId": "content-456",
  "amount": 50,
  "subject": "Mobile Content Purchase"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "payment-790",
    "paymentUrl": "https://openapi.alipaydev.com/gateway.do?...",
    "outTradeNo": "AP1234567891",
    "amount": 50,
    "currency": "CNY"
  }
}
```

### 3. Query Payment Status

Query the current status of a payment.

**Endpoint:** `GET /api/v1/payments/alipay/query/:outTradeNo`

**Response:**
```json
{
  "success": true,
  "data": {
    "outTradeNo": "AP1234567890",
    "tradeNo": "2024010122001234567890",
    "tradeStatus": "TRADE_SUCCESS",
    "totalAmount": "100.00",
    "buyerLogonId": "test@example.com",
    "buyerUserId": "2088123456789012"
  }
}
```

**Trade Status Values:**
- `WAIT_BUYER_PAY`: Waiting for buyer to pay
- `TRADE_SUCCESS`: Payment successful
- `TRADE_FINISHED`: Transaction finished
- `TRADE_CLOSED`: Transaction closed

### 4. Alipay Notify Callback

Asynchronous notification from Alipay (server-to-server).

**Endpoint:** `POST /api/v1/payments/alipay/notify`

**Note:** This endpoint is called by Alipay, not by your frontend.

**Configuration:**
- Must be publicly accessible
- Must be configured in Alipay dashboard
- Must return "success" string

### 5. Alipay Return Callback

Synchronous redirect after payment (user redirect).

**Endpoint:** `GET /api/v1/payments/alipay/return`

**Note:** User is redirected here from Alipay payment page.

**Redirect:**
```
https://knowton.io/payment/complete?outTradeNo=AP1234567890&status=TRADE_SUCCESS
```

### 6. Refund Payment

Process a refund for a completed payment.

**Endpoint:** `POST /api/v1/payments/alipay/refund`

**Request Body:**
```json
{
  "outTradeNo": "AP1234567890",
  "refundAmount": 50,
  "refundReason": "User requested refund"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "outTradeNo": "AP1234567890",
    "outRequestNo": "RF1234567890",
    "refundAmount": 50,
    "fundChange": "Y",
    "gmtRefundPay": "2024-01-01 12:00:00"
  }
}
```

### 7. Close Payment

Cancel an unpaid order.

**Endpoint:** `POST /api/v1/payments/alipay/close`

**Request Body:**
```json
{
  "outTradeNo": "AP1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "outTradeNo": "AP1234567890",
    "tradeNo": "2024010122001234567890"
  }
}
```

### 8. Get Payment by OutTradeNo

Retrieve payment details from database.

**Endpoint:** `GET /api/v1/payments/alipay/payment/:outTradeNo`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "payment-789",
    "userId": "user-123",
    "contentId": "content-456",
    "amount": "100.00",
    "currency": "CNY",
    "paymentMethod": "alipay",
    "status": "succeeded",
    "metadata": {
      "outTradeNo": "AP1234567890",
      "tradeNo": "2024010122001234567890"
    },
    "createdAt": "2024-01-01T10:00:00Z",
    "completedAt": "2024-01-01T10:05:00Z"
  }
}
```

## Payment Flow

### Web Payment Flow

```
1. User clicks "Pay with Alipay"
   ↓
2. Frontend calls POST /api/v1/payments/alipay/web
   ↓
3. Backend creates payment record and returns payment URL
   ↓
4. Frontend redirects user to Alipay payment page
   ↓
5. User completes payment on Alipay
   ↓
6. Alipay sends async notification to /notify endpoint
   ↓
7. Backend verifies signature and updates payment status
   ↓
8. Alipay redirects user to /return endpoint
   ↓
9. Backend redirects user to frontend with payment result
   ↓
10. Frontend displays payment success/failure
```

### Mobile Payment Flow

Same as web payment flow, but uses WAP payment endpoint.

## Security

### Signature Verification

All Alipay notifications are verified using RSA signature:

```typescript
const isValid = alipay.checkNotifySign(params);
if (!isValid) {
  throw new Error('Invalid signature');
}
```

### Best Practices

1. **Always verify signatures** on notify and return callbacks
2. **Use HTTPS** for all endpoints
3. **Store private keys securely** (use environment variables)
4. **Validate payment amounts** before processing
5. **Implement idempotency** for notify handling
6. **Log all transactions** for audit trail

## Testing

### Run Unit Tests

```bash
npm test -- alipay.test.ts
```

### Run Integration Tests

```bash
tsx src/scripts/test-alipay-integration.ts
```

### Sandbox Testing

1. **Register for Alipay Sandbox:**
   - Visit: https://openhome.alipay.com/platform/appDaily.htm
   - Create sandbox account
   - Get sandbox credentials

2. **Configure Sandbox:**
   ```bash
   ALIPAY_APP_ID=your_sandbox_app_id
   ALIPAY_GATEWAY=https://openapi.alipaydev.com/gateway.do
   ```

3. **Test Payment:**
   - Use sandbox buyer account
   - Use sandbox payment credentials
   - Test all payment scenarios

### Test Scenarios

- ✅ Successful payment
- ✅ Failed payment
- ✅ Canceled payment
- ✅ Refund processing
- ✅ Partial refund
- ✅ Payment timeout
- ✅ Invalid signature
- ✅ Duplicate notification
- ✅ Network errors

## Error Handling

### Common Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| `INVALID_PARAMETER` | Invalid request parameters | Check request format |
| `INSUFFICIENT_BALANCE` | Buyer has insufficient balance | Ask user to add funds |
| `TRADE_NOT_EXIST` | Trade does not exist | Check outTradeNo |
| `TRADE_HAS_SUCCESS` | Trade already succeeded | Check payment status |
| `TRADE_HAS_CLOSE` | Trade already closed | Cannot process |

### Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional information"
  }
}
```

## Monitoring

### Key Metrics

- Payment success rate
- Average payment time
- Refund rate
- Notification delivery rate
- Signature verification failures

### Logging

All Alipay operations are logged with:
- Payment ID
- Out Trade No
- Amount
- Status
- Timestamp
- Error details (if any)

## Database Schema

### Payment Table

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  content_id VARCHAR,
  amount DECIMAL(20, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'CNY',
  payment_method VARCHAR(50) DEFAULT 'alipay',
  status VARCHAR(20) DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### Metadata Structure

```json
{
  "outTradeNo": "AP1234567890",
  "tradeNo": "2024010122001234567890",
  "subject": "Content Purchase",
  "body": "Description",
  "tradeStatus": "TRADE_SUCCESS",
  "buyerLogonId": "test@example.com",
  "buyerUserId": "2088123456789012",
  "notifiedAt": "2024-01-01T10:05:00Z"
}
```

## Troubleshooting

### Payment Not Completing

1. Check Alipay sandbox credentials
2. Verify notify URL is publicly accessible
3. Check signature verification
4. Review Alipay logs in dashboard

### Signature Verification Failing

1. Verify public key is correct
2. Check key format (remove headers/footers)
3. Ensure using correct algorithm (RSA2)
4. Test with Alipay signature tool

### Notifications Not Received

1. Verify notify URL in Alipay dashboard
2. Check firewall/security rules
3. Ensure endpoint returns "success"
4. Review server logs for errors

## Production Checklist

- [ ] Update gateway to production URL
- [ ] Configure production credentials
- [ ] Set up production notify URL
- [ ] Test with real Alipay account
- [ ] Enable monitoring and alerts
- [ ] Set up error tracking
- [ ] Configure rate limiting
- [ ] Review security settings
- [ ] Test refund flow
- [ ] Document runbook procedures

## Support

### Alipay Documentation
- Developer Portal: https://opendocs.alipay.com/
- API Reference: https://opendocs.alipay.com/apis
- Sandbox: https://openhome.alipay.com/platform/appDaily.htm

### Internal Support
- Backend Team: backend@knowton.io
- Payment Issues: payments@knowton.io
- Security: security@knowton.io

## Changelog

### Version 1.0.0 (2024-01-01)
- Initial Alipay integration
- Web and WAP payment support
- Notification handling
- Refund processing
- Sandbox testing

## License

Copyright © 2024 KnowTon Platform. All rights reserved.
