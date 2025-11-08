# Alipay Integration - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
cd packages/backend
npm install
```

The `alipay-sdk` package is already included in package.json.

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Alipay Sandbox Configuration
ALIPAY_APP_ID=your_sandbox_app_id
ALIPAY_PRIVATE_KEY=your_sandbox_private_key
ALIPAY_PUBLIC_KEY=your_sandbox_public_key
ALIPAY_GATEWAY=https://openapi.alipaydev.com/gateway.do
ALIPAY_NOTIFY_URL=https://your-domain.com/api/v1/payments/alipay/notify
ALIPAY_RETURN_URL=https://your-domain.com/payment/complete
```

### 3. Get Alipay Sandbox Credentials

1. Visit [Alipay Open Platform](https://openhome.alipay.com/platform/appDaily.htm)
2. Register/Login to get sandbox account
3. Create a sandbox application
4. Get your credentials:
   - App ID
   - Private Key (RSA2)
   - Public Key (Alipay's public key)

### 4. Start the Server

```bash
npm run dev
```

## 📝 Basic Usage

### Create a Payment (Frontend)

```typescript
// Create Alipay payment
const response = await fetch('/api/v1/payments/alipay/web', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: 'user-123',
    contentId: 'content-456',
    amount: 100,
    subject: 'Content Purchase',
    body: 'Detailed description',
  }),
});

const { data } = await response.json();

// Redirect to Alipay payment page
window.location.href = data.paymentUrl;
```

### Handle Payment Completion (Frontend)

```typescript
// On payment completion page
const urlParams = new URLSearchParams(window.location.search);
const outTradeNo = urlParams.get('outTradeNo');
const status = urlParams.get('status');

if (status === 'TRADE_SUCCESS') {
  // Payment successful
  console.log('Payment completed:', outTradeNo);
} else {
  // Payment failed or canceled
  console.log('Payment failed');
}
```

## 🧪 Testing

### Run Unit Tests

```bash
npm test -- alipay.test.ts
```

### Run Integration Test

```bash
tsx src/scripts/test-alipay-integration.ts
```

### Test in Sandbox

1. Create a payment using the API
2. Open the returned `paymentUrl` in browser
3. Use sandbox buyer credentials to complete payment
4. Verify payment status updates

**Sandbox Buyer Account:**
- Account: Available in Alipay sandbox dashboard
- Password: Available in Alipay sandbox dashboard
- Payment Password: 111111

## 📊 Payment Status Flow

```
pending → processing → succeeded
                    ↓
                 canceled
                    ↓
                 refunded
```

## 🔍 Check Payment Status

```bash
curl http://localhost:3000/api/v1/payments/alipay/query/AP1234567890
```

## 💰 Process Refund

```bash
curl -X POST http://localhost:3000/api/v1/payments/alipay/refund \
  -H "Content-Type: application/json" \
  -d '{
    "outTradeNo": "AP1234567890",
    "refundAmount": 50,
    "refundReason": "User requested"
  }'
```

## 🔐 Security Notes

1. **Never commit private keys** to version control
2. **Use environment variables** for all credentials
3. **Verify signatures** on all callbacks
4. **Use HTTPS** in production
5. **Validate amounts** before processing

## 🐛 Common Issues

### Issue: "Invalid signature"
**Solution:** Verify your public key matches Alipay's public key

### Issue: "Payment not found"
**Solution:** Payment may not exist in Alipay yet (normal for new payments)

### Issue: "Notify URL not accessible"
**Solution:** Ensure your notify URL is publicly accessible (use ngrok for local testing)

## 📚 Next Steps

1. Read full documentation: [ALIPAY_INTEGRATION.md](./ALIPAY_INTEGRATION.md)
2. Test all payment scenarios
3. Configure production credentials
4. Set up monitoring and alerts
5. Review security checklist

## 🆘 Need Help?

- Documentation: [ALIPAY_INTEGRATION.md](./ALIPAY_INTEGRATION.md)
- Alipay Docs: https://opendocs.alipay.com/
- Support: payments@knowton.io

## ✅ Checklist

- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Sandbox credentials obtained
- [ ] Server running
- [ ] Test payment created
- [ ] Payment completed in sandbox
- [ ] Notification received
- [ ] Payment status updated
- [ ] Refund tested

---

**Ready to go!** 🎉

Your Alipay integration is now set up and ready for testing.
