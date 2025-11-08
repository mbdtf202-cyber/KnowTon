# WeChat Pay Integration

## Overview

This document describes the WeChat Pay integration for the KnowTon platform. WeChat Pay is one of China's most popular mobile payment methods, supporting QR code payments, in-app payments, and mini-program payments.

## Features

- **Native Payment (QR Code)**: Generate QR codes for desktop/web payments
- **JSAPI Payment**: In-app payments for WeChat browser and mini-programs
- **Payment Query**: Check payment status in real-time
- **Refund Processing**: Full and partial refunds
- **Payment Closure**: Cancel unpaid orders
- **Webhook Notifications**: Asynchronous payment status updates

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │────────▶│   Backend    │────────▶│  WeChat Pay │
│             │         │   Service    │         │     API     │
└─────────────┘         └──────────────┘         └─────────────┘
       │                       │                         │
       │                       │                         │
       │                       ▼                         │
       │                ┌──────────────┐                │
       │                │  PostgreSQL  │                │
       │                │   Database   │                │
       │                └──────────────┘                │
       │                                                 │
       └─────────────────────────────────────────────────┘
                    Webhook Callback
```

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# WeChat Pay Configuration
WECHAT_APP_ID=your_wechat_app_id
WECHAT_MCH_ID=your_wechat_mch_id
WECHAT_API_KEY=your_wechat_api_key
WECHAT_API_V3_KEY=your_wechat_api_v3_key
WECHAT_CERT_SERIAL_NO=your_cert_serial_no
WECHAT_PRIVATE_KEY=your_private_key_pem_content
WECHAT_GATEWAY=https://api.mch.weixin.qq.com
WECHAT_NOTIFY_URL=https://api.knowton.io/api/v1/payments/wechat/notify
```

### Obtaining Credentials

1. **Register as WeChat Pay Merchant**:
   - Visit [WeChat Pay Merchant Platform](https://pay.weixin.qq.com)
   - Complete merchant registration
   - Submit business documents for verification

2. **Get API Credentials**:
   - `WECHAT_APP_ID`: Your WeChat Official Account or Mini Program App ID
   - `WECHAT_MCH_ID`: Merchant ID from WeChat Pay
   - `WECHAT_API_KEY`: API key for signature (v2)
   - `WECHAT_API_V3_KEY`: API v3 key for encryption

3. **Generate Certificates**:
   - Download merchant certificate from WeChat Pay platform
   - Extract private key and certificate serial number
   - Store private key securely (use environment variable or secrets manager)

## API Endpoints

### 1. Create Native Payment (QR Code)

Generate a QR code for payment.

**Endpoint**: `POST /api/v1/payments/wechat/native`

**Request Body**:
```json
{
  "userId": "user-123",
  "contentId": "content-456",
  "amount": 99.99,
  "subject": "Premium Content Purchase",
  "body": "Detailed description",
  "metadata": {
    "custom": "data"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentId": "payment-123",
    "codeUrl": "weixin://wxpay/bizpayurl?pr=abc123",
    "outTradeNo": "WX1234567890",
    "amount": 99.99,
    "currency": "CNY"
  }
}
```

**Usage**:
```typescript
// Frontend: Generate QR code from codeUrl
import QRCode from 'qrcode';

const response = await fetch('/api/v1/payments/wechat/native', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: currentUser.id,
    contentId: content.id,
    amount: content.price,
    subject: content.title,
  }),
});

const { data } = await response.json();

// Generate QR code
const qrCodeDataUrl = await QRCode.toDataURL(data.codeUrl);
// Display QR code to user
```

### 2. Create JSAPI Payment

Create payment for WeChat browser or mini-program.

**Endpoint**: `POST /api/v1/payments/wechat/jsapi`

**Request Body**:
```json
{
  "userId": "user-123",
  "contentId": "content-456",
  "amount": 88.88,
  "subject": "Premium Content Purchase",
  "body": "Detailed description",
  "openid": "user-wechat-openid",
  "metadata": {
    "custom": "data"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentId": "payment-123",
    "prepayId": "prepay_id_123",
    "paymentParams": {
      "appId": "wx1234567890",
      "timeStamp": "1234567890",
      "nonceStr": "abc123",
      "package": "prepay_id=prepay_id_123",
      "signType": "RSA",
      "paySign": "signature"
    },
    "outTradeNo": "WX1234567890",
    "amount": 88.88,
    "currency": "CNY"
  }
}
```

**Usage**:
```javascript
// WeChat Mini Program
const response = await wx.request({
  url: '/api/v1/payments/wechat/jsapi',
  method: 'POST',
  data: {
    userId: app.globalData.userId,
    contentId: contentId,
    amount: price,
    subject: title,
    openid: app.globalData.openid,
  },
});

// Invoke WeChat Pay
wx.requestPayment({
  ...response.data.paymentParams,
  success: (res) => {
    console.log('Payment successful', res);
  },
  fail: (err) => {
    console.error('Payment failed', err);
  },
});
```

### 3. Query Payment Status

Check the current status of a payment.

**Endpoint**: `GET /api/v1/payments/wechat/query/:outTradeNo`

**Response**:
```json
{
  "success": true,
  "data": {
    "outTradeNo": "WX1234567890",
    "transactionId": "4200001234567890",
    "tradeState": "SUCCESS",
    "tradeStateDesc": "Payment successful",
    "amount": {
      "total": 9999,
      "currency": "CNY"
    },
    "payer": {
      "openid": "user-openid"
    },
    "successTime": "2024-01-01T12:00:00+08:00"
  }
}
```

**Trade States**:
- `SUCCESS`: Payment successful
- `NOTPAY`: Not paid yet
- `CLOSED`: Order closed
- `REVOKED`: Order revoked
- `USERPAYING`: User is paying
- `PAYERROR`: Payment error

### 4. Refund Payment

Process a full or partial refund.

**Endpoint**: `POST /api/v1/payments/wechat/refund`

**Request Body**:
```json
{
  "outTradeNo": "WX1234567890",
  "refundAmount": 50.00,
  "refundReason": "User requested refund"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "outTradeNo": "WX1234567890",
    "outRefundNo": "RF1234567890",
    "refundId": "50000001234567890",
    "refundAmount": 50.00,
    "status": "SUCCESS"
  }
}
```

### 5. Close Payment

Cancel an unpaid order.

**Endpoint**: `POST /api/v1/payments/wechat/close`

**Request Body**:
```json
{
  "outTradeNo": "WX1234567890"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "outTradeNo": "WX1234567890",
    "closed": true
  }
}
```

### 6. Get Payment Details

Retrieve payment information from database.

**Endpoint**: `GET /api/v1/payments/wechat/payment/:outTradeNo`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "payment-123",
    "userId": "user-123",
    "contentId": "content-456",
    "amount": "99.99",
    "currency": "CNY",
    "paymentMethod": "wechat",
    "status": "succeeded",
    "metadata": {
      "outTradeNo": "WX1234567890",
      "transactionId": "4200001234567890",
      "tradeState": "SUCCESS"
    },
    "createdAt": "2024-01-01T12:00:00Z",
    "completedAt": "2024-01-01T12:01:00Z"
  }
}
```

## Webhook Notifications

WeChat Pay sends asynchronous notifications when payment status changes.

### Webhook Endpoint

**URL**: `POST /api/v1/payments/wechat/notify`

**Configuration**:
1. Log in to WeChat Pay Merchant Platform
2. Navigate to Product Center → Development Configuration
3. Set notification URL to: `https://api.knowton.io/api/v1/payments/wechat/notify`
4. Ensure URL is publicly accessible (HTTPS required)

### Webhook Processing

The webhook handler:
1. Verifies the signature from WeChat Pay
2. Decrypts the encrypted resource data
3. Updates payment status in database
4. Returns success response to WeChat Pay

**Response Format**:
```json
{
  "code": "SUCCESS",
  "message": "Success"
}
```

### Webhook Security

- All webhook requests are signed by WeChat Pay
- Signature verification ensures authenticity
- Resource data is encrypted with AES-256-GCM
- Failed verifications are logged and rejected

## Payment Flow

### Native Payment (QR Code) Flow

```
1. User clicks "Pay with WeChat"
2. Frontend calls /api/v1/payments/wechat/native
3. Backend creates payment record and calls WeChat Pay API
4. WeChat Pay returns code_url
5. Frontend generates and displays QR code
6. User scans QR code with WeChat app
7. User confirms payment in WeChat
8. WeChat Pay sends webhook notification
9. Backend updates payment status
10. Frontend polls payment status or receives WebSocket update
11. User is redirected to success page
```

### JSAPI Payment Flow

```
1. User opens page in WeChat browser/mini-program
2. Frontend calls /api/v1/payments/wechat/jsapi
3. Backend creates payment record and calls WeChat Pay API
4. WeChat Pay returns prepay_id and payment parameters
5. Frontend invokes wx.requestPayment() with parameters
6. WeChat Pay SDK shows payment UI
7. User confirms payment
8. WeChat Pay sends webhook notification
9. Backend updates payment status
10. Payment result returned to frontend
11. User sees success/failure message
```

## Testing

### Sandbox Environment

WeChat Pay provides a sandbox environment for testing:

1. **Enable Sandbox**:
   - Log in to WeChat Pay Merchant Platform
   - Navigate to Development → Sandbox
   - Get sandbox credentials

2. **Update Configuration**:
   ```bash
   WECHAT_GATEWAY=https://api.mch.weixin.qq.com/sandboxnew
   ```

3. **Test Accounts**:
   - Use test OpenIDs provided by WeChat Pay
   - Use test amounts (e.g., 0.01 CNY)

### Running Tests

```bash
# Unit tests
npm test -- wechat.test.ts

# Integration tests
npm run test:integration -- test-wechat-integration.ts
```

### Manual Testing

```bash
# Start backend server
npm run dev

# Run integration test script
npx tsx src/scripts/test-wechat-integration.ts
```

## Error Handling

### Common Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| `INVALID_REQUEST` | Invalid request parameters | Check request format |
| `PARAM_ERROR` | Parameter error | Validate all required fields |
| `SYSTEMERROR` | System error | Retry after a few seconds |
| `SIGN_ERROR` | Signature verification failed | Check private key and signature |
| `NOAUTH` | No permission | Check merchant configuration |
| `ORDERPAID` | Order already paid | Check payment status |
| `ORDERCLOSED` | Order closed | Create new order |

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

## Security Best Practices

1. **Protect Private Keys**:
   - Never commit private keys to version control
   - Use environment variables or secrets manager
   - Rotate keys periodically

2. **Verify Signatures**:
   - Always verify webhook signatures
   - Reject requests with invalid signatures
   - Log verification failures

3. **Use HTTPS**:
   - All API calls must use HTTPS
   - Webhook URL must be HTTPS
   - Validate SSL certificates

4. **Implement Idempotency**:
   - Use unique outTradeNo for each payment
   - Handle duplicate webhook notifications
   - Check payment status before processing

5. **Rate Limiting**:
   - Implement rate limiting on payment endpoints
   - Prevent abuse and fraud
   - Monitor for suspicious activity

## Monitoring and Logging

### Key Metrics

- Payment success rate
- Average payment time
- Refund rate
- Webhook delivery success rate
- API error rate

### Logging

All payment operations are logged with:
- Timestamp
- User ID
- Payment ID
- Amount
- Status
- Error messages (if any)

### Alerts

Set up alerts for:
- Payment failures > 5%
- Webhook delivery failures
- API errors
- Unusual refund patterns

## Support

### WeChat Pay Resources

- [Official Documentation](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml)
- [Merchant Platform](https://pay.weixin.qq.com)
- [Developer Forum](https://developers.weixin.qq.com)

### Internal Support

For questions or issues:
- Check logs in CloudWatch/ELK
- Review error messages in Sentry
- Contact DevOps team for infrastructure issues
- Escalate to WeChat Pay support if needed

## Changelog

### Version 1.0.0 (2024-01-01)
- Initial WeChat Pay integration
- Native payment support
- JSAPI payment support
- Webhook handling
- Refund processing
- Payment query and closure
