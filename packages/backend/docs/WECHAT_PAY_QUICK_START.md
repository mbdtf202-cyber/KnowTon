# WeChat Pay Quick Start Guide

## Prerequisites

- WeChat Pay merchant account
- API credentials (App ID, Merchant ID, API keys)
- Merchant certificate and private key
- Backend server running

## Step 1: Configure Environment

Add WeChat Pay credentials to `.env`:

```bash
WECHAT_APP_ID=wx1234567890abcdef
WECHAT_MCH_ID=1234567890
WECHAT_API_KEY=your_api_key_32_characters_long
WECHAT_API_V3_KEY=your_api_v3_key_32_characters
WECHAT_CERT_SERIAL_NO=1234567890ABCDEF
WECHAT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----"
WECHAT_GATEWAY=https://api.mch.weixin.qq.com
WECHAT_NOTIFY_URL=https://api.knowton.io/api/v1/payments/wechat/notify
```

## Step 2: Test Native Payment (QR Code)

### Create Payment

```bash
curl -X POST http://localhost:3000/api/v1/payments/wechat/native \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "contentId": "content-456",
    "amount": 0.01,
    "subject": "Test Payment",
    "body": "Testing WeChat Pay"
  }'
```

### Response

```json
{
  "success": true,
  "data": {
    "paymentId": "payment-abc123",
    "codeUrl": "weixin://wxpay/bizpayurl?pr=abc123xyz",
    "outTradeNo": "WX1704096000000",
    "amount": 0.01,
    "currency": "CNY"
  }
}
```

### Generate QR Code

```typescript
import QRCode from 'qrcode';

// Generate QR code from codeUrl
const qrCodeDataUrl = await QRCode.toDataURL(data.codeUrl);

// Display in HTML
<img src={qrCodeDataUrl} alt="Scan to pay" />
```

## Step 3: Test JSAPI Payment

### Create Payment

```bash
curl -X POST http://localhost:3000/api/v1/payments/wechat/jsapi \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "contentId": "content-456",
    "amount": 0.01,
    "subject": "Test Payment",
    "openid": "oUpF8uMuAJO_M2pxb1Q9zNjWeS6o"
  }'
```

### Response

```json
{
  "success": true,
  "data": {
    "paymentId": "payment-abc123",
    "prepayId": "prepay_id_123",
    "paymentParams": {
      "appId": "wx1234567890",
      "timeStamp": "1704096000",
      "nonceStr": "abc123",
      "package": "prepay_id=prepay_id_123",
      "signType": "RSA",
      "paySign": "signature_here"
    },
    "outTradeNo": "WX1704096000000",
    "amount": 0.01,
    "currency": "CNY"
  }
}
```

### Invoke Payment (WeChat Mini Program)

```javascript
wx.requestPayment({
  ...paymentParams,
  success: (res) => {
    console.log('Payment successful', res);
    // Navigate to success page
  },
  fail: (err) => {
    console.error('Payment failed', err);
    // Show error message
  }
});
```

## Step 4: Query Payment Status

```bash
curl http://localhost:3000/api/v1/payments/wechat/query/WX1704096000000
```

### Response

```json
{
  "success": true,
  "data": {
    "outTradeNo": "WX1704096000000",
    "transactionId": "4200001234567890",
    "tradeState": "SUCCESS",
    "tradeStateDesc": "Payment successful",
    "amount": {
      "total": 1,
      "currency": "CNY"
    },
    "successTime": "2024-01-01T12:00:00+08:00"
  }
}
```

## Step 5: Handle Webhook Notifications

### Configure Webhook URL

1. Log in to [WeChat Pay Merchant Platform](https://pay.weixin.qq.com)
2. Go to Product Center → Development Configuration
3. Set notification URL: `https://api.knowton.io/api/v1/payments/wechat/notify`
4. Save configuration

### Webhook Handler

The webhook endpoint automatically:
- Verifies signature
- Decrypts resource data
- Updates payment status
- Returns success response

No additional code needed!

## Step 6: Process Refund

```bash
curl -X POST http://localhost:3000/api/v1/payments/wechat/refund \
  -H "Content-Type: application/json" \
  -d '{
    "outTradeNo": "WX1704096000000",
    "refundAmount": 0.01,
    "refundReason": "User requested refund"
  }'
```

### Response

```json
{
  "success": true,
  "data": {
    "outTradeNo": "WX1704096000000",
    "outRefundNo": "RF1704096000000",
    "refundId": "50000001234567890",
    "refundAmount": 0.01,
    "status": "SUCCESS"
  }
}
```

## Step 7: Close Unpaid Order

```bash
curl -X POST http://localhost:3000/api/v1/payments/wechat/close \
  -H "Content-Type: application/json" \
  -d '{
    "outTradeNo": "WX1704096000000"
  }'
```

### Response

```json
{
  "success": true,
  "data": {
    "outTradeNo": "WX1704096000000",
    "closed": true
  }
}
```

## Frontend Integration Examples

### React Component (Native Payment)

```typescript
import React, { useState } from 'react';
import QRCode from 'qrcode';

function WeChatPayment({ amount, contentId }) {
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);

  const createPayment = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/payments/wechat/native', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          contentId,
          amount,
          subject: 'Content Purchase',
        }),
      });

      const { data } = await response.json();
      
      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(data.codeUrl);
      setQrCode(qrCodeDataUrl);

      // Poll payment status
      pollPaymentStatus(data.outTradeNo);
    } catch (error) {
      console.error('Payment creation failed', error);
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (outTradeNo) => {
    const interval = setInterval(async () => {
      const response = await fetch(
        `/api/v1/payments/wechat/query/${outTradeNo}`
      );
      const { data } = await response.json();

      if (data.tradeState === 'SUCCESS') {
        clearInterval(interval);
        // Payment successful
        window.location.href = '/payment/success';
      } else if (data.tradeState === 'CLOSED') {
        clearInterval(interval);
        // Payment failed
        alert('Payment failed or expired');
      }
    }, 3000); // Poll every 3 seconds

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(interval), 300000);
  };

  return (
    <div>
      <button onClick={createPayment} disabled={loading}>
        {loading ? 'Creating...' : 'Pay with WeChat'}
      </button>
      {qrCode && (
        <div>
          <h3>Scan QR Code to Pay</h3>
          <img src={qrCode} alt="WeChat Pay QR Code" />
          <p>Amount: ¥{amount}</p>
        </div>
      )}
    </div>
  );
}
```

### WeChat Mini Program

```javascript
// pages/payment/payment.js
Page({
  data: {
    amount: 0,
    contentId: '',
  },

  onLoad(options) {
    this.setData({
      amount: options.amount,
      contentId: options.contentId,
    });
  },

  async payWithWeChat() {
    wx.showLoading({ title: 'Creating payment...' });

    try {
      // Get user's openid
      const openid = wx.getStorageSync('openid');

      // Create payment
      const res = await wx.request({
        url: 'https://api.knowton.io/api/v1/payments/wechat/jsapi',
        method: 'POST',
        data: {
          userId: wx.getStorageSync('userId'),
          contentId: this.data.contentId,
          amount: this.data.amount,
          subject: 'Content Purchase',
          openid: openid,
        },
      });

      wx.hideLoading();

      // Invoke WeChat Pay
      wx.requestPayment({
        ...res.data.data.paymentParams,
        success: (payRes) => {
          wx.showToast({
            title: 'Payment successful',
            icon: 'success',
          });
          // Navigate to success page
          wx.redirectTo({
            url: '/pages/success/success',
          });
        },
        fail: (err) => {
          wx.showToast({
            title: 'Payment failed',
            icon: 'error',
          });
          console.error('Payment failed', err);
        },
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: 'Error creating payment',
        icon: 'error',
      });
      console.error('Error', error);
    }
  },
});
```

## Testing Checklist

- [ ] Environment variables configured
- [ ] Native payment creates QR code
- [ ] QR code can be scanned
- [ ] Payment status updates correctly
- [ ] Webhook notifications received
- [ ] JSAPI payment works in WeChat browser
- [ ] Refund processes successfully
- [ ] Payment closure works
- [ ] Error handling works correctly
- [ ] Logs are being recorded

## Troubleshooting

### Issue: "Invalid signature"

**Solution**: Check that your private key is correct and properly formatted. Ensure no extra spaces or line breaks.

### Issue: "NOAUTH - No permission"

**Solution**: Verify that your merchant account has the required permissions. Check product activation in merchant platform.

### Issue: "SYSTEMERROR"

**Solution**: This is usually a temporary issue. Retry the request after a few seconds.

### Issue: Webhook not receiving notifications

**Solution**: 
1. Ensure webhook URL is publicly accessible
2. Check that URL uses HTTPS
3. Verify URL is correctly configured in merchant platform
4. Check server logs for incoming requests

### Issue: QR code not working

**Solution**:
1. Verify the code_url is correctly generated
2. Check that QR code is properly rendered
3. Ensure user is scanning with WeChat app (not other QR scanners)

## Next Steps

1. **Production Setup**:
   - Switch to production gateway
   - Use production credentials
   - Configure production webhook URL

2. **Monitoring**:
   - Set up payment success rate monitoring
   - Configure alerts for failures
   - Track refund rates

3. **Optimization**:
   - Implement payment caching
   - Add retry logic for failed requests
   - Optimize webhook processing

4. **Security**:
   - Rotate API keys regularly
   - Implement rate limiting
   - Add fraud detection

## Resources

- [Full Documentation](./WECHAT_PAY_INTEGRATION.md)
- [WeChat Pay Official Docs](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml)
- [API Reference](https://pay.weixin.qq.com/wiki/doc/apiv3/apis/index.shtml)
