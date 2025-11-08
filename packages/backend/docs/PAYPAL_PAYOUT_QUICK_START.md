# PayPal Payout Quick Start Guide

## Overview

This guide will help you quickly integrate and test PayPal payouts in the KnowTon platform.

## Prerequisites

- PayPal Business account
- PayPal Developer account
- Node.js and npm installed
- PostgreSQL database running

## Setup Steps

### 1. Create PayPal App

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Click "Create App"
3. Enter app name: "KnowTon Payouts"
4. Select "Merchant" as app type
5. Click "Create App"
6. Enable "Payouts" capability
7. Copy your Client ID and Secret

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# PayPal Configuration
PAYPAL_CLIENT_ID=your_client_id_here
PAYPAL_CLIENT_SECRET=your_client_secret_here
PAYPAL_API_BASE_URL=https://api-m.sandbox.paypal.com
```

**Note:** Use sandbox URL for testing, production URL for live:
- Sandbox: `https://api-m.sandbox.paypal.com`
- Production: `https://api-m.paypal.com`

### 3. Run Database Migration

```bash
cd packages/backend
npx prisma migrate dev --name add_paypal_payout
npx prisma generate
```

### 4. Start the Backend Server

```bash
npm run dev
```

## Testing PayPal Payouts

### Step 1: Link PayPal Account

```bash
curl -X POST http://localhost:3000/api/v1/payouts/paypal/link \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "paypalEmail": "creator-sandbox@example.com"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accountId": "paypal_acc_xxxxxxxxxxxxx",
    "paypalEmail": "creator-sandbox@example.com",
    "status": "verified"
  }
}
```

### Step 2: Create a Payout

```bash
curl -X POST http://localhost:3000/api/v1/payouts/paypal/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "amount": 100,
    "currency": "USD",
    "description": "Test payout"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payoutId": "payout_xxxxxxxxxxxxx",
    "paypalPayoutId": "PAYOUTITEM_xxxxxxxxxxxxx",
    "amount": 100,
    "currency": "USD",
    "fee": 1.00,
    "netAmount": 99.00,
    "status": "processing",
    "estimatedArrival": "Instant (within minutes)"
  }
}
```

### Step 3: Check Payout Status

```bash
curl http://localhost:3000/api/v1/payouts/paypal/status/payout_xxxxxxxxxxxxx
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payoutId": "payout_xxxxxxxxxxxxx",
    "paypalPayoutId": "PAYOUTITEM_xxxxxxxxxxxxx",
    "status": "completed",
    "batchStatus": "SUCCESS",
    "transactionStatus": "SUCCESS",
    "completedAt": "2024-02-01T10:05:00Z"
  }
}
```

### Step 4: Test Retry Logic (Optional)

If a payout fails, you can retry it:

```bash
curl -X POST http://localhost:3000/api/v1/payouts/paypal/retry/payout_xxxxxxxxxxxxx
```

## Integration with Frontend

### Link PayPal Account

```typescript
import { useState } from 'react';

function PayPalAccountLink() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const linkAccount = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/payouts/paypal/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          paypalEmail: email,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        alert('PayPal account linked successfully!');
      }
    } catch (error) {
      console.error('Error linking PayPal:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="PayPal email"
      />
      <button onClick={linkAccount} disabled={loading}>
        {loading ? 'Linking...' : 'Link PayPal Account'}
      </button>
    </div>
  );
}
```

### Request Payout

```typescript
function RequestPayout() {
  const [amount, setAmount] = useState(50);
  const [loading, setLoading] = useState(false);

  const requestPayout = async () => {
    if (amount < 50) {
      alert('Minimum payout is $50');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/payouts/paypal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          amount,
          currency: 'USD',
          description: 'Creator earnings payout',
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`Payout initiated! You'll receive $${data.data.netAmount} instantly.`);
      }
    } catch (error) {
      console.error('Error requesting payout:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        min="50"
      />
      <button onClick={requestPayout} disabled={loading}>
        {loading ? 'Processing...' : 'Request Payout'}
      </button>
      <p>Fee: 1% | You'll receive: ${(amount * 0.99).toFixed(2)}</p>
    </div>
  );
}
```

## Common Issues and Solutions

### Issue 1: "PayPal credentials not configured"

**Solution:** Ensure `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are set in your `.env` file.

### Issue 2: "PayPal account not linked"

**Solution:** Link PayPal account first using the `/paypal/link` endpoint.

### Issue 3: "Minimum payout amount is $50"

**Solution:** Ensure the payout amount is at least $50.

### Issue 4: "Insufficient balance"

**Solution:** Ensure the user has enough balance to cover the payout amount.

### Issue 5: Payout stuck in "processing"

**Solution:** 
1. Check payout status using `/paypal/status/:payoutId`
2. Wait a few minutes (PayPal usually processes within 5 minutes)
3. Check PayPal sandbox account for the funds

## Testing with PayPal Sandbox

### Create Test Accounts

1. Go to [PayPal Sandbox Accounts](https://developer.paypal.com/dashboard/accounts)
2. Create a Business account (for platform)
3. Create Personal accounts (for creators)
4. Use these test accounts for testing payouts

### Test Scenarios

#### Successful Payout
```bash
# Use a valid sandbox personal account email
curl -X POST http://localhost:3000/api/v1/payouts/paypal/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "amount": 100,
    "currency": "USD"
  }'
```

#### Failed Payout (Invalid Email)
```bash
# Use an invalid email
curl -X POST http://localhost:3000/api/v1/payouts/paypal/link \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "paypalEmail": "invalid-email"
  }'
```

#### Retry Failed Payout
```bash
# First, create a failed payout, then retry
curl -X POST http://localhost:3000/api/v1/payouts/paypal/retry/payout_failed_xxx
```

## Webhook Setup (Optional)

### Configure Webhook in PayPal

1. Go to PayPal Developer Dashboard
2. Select your app
3. Click "Add Webhook"
4. Enter URL: `https://api.knowton.io/api/v1/payouts/webhook/paypal`
5. Select events:
   - `PAYMENT.PAYOUTS-ITEM.SUCCEEDED`
   - `PAYMENT.PAYOUTS-ITEM.FAILED`
   - `PAYMENT.PAYOUTS-ITEM.BLOCKED`
   - `PAYMENT.PAYOUTS-ITEM.REFUNDED`
6. Save webhook

### Test Webhook Locally

Use ngrok to expose your local server:

```bash
ngrok http 3000
```

Update webhook URL in PayPal Dashboard to ngrok URL:
```
https://your-ngrok-url.ngrok.io/api/v1/payouts/webhook/paypal
```

## Monitoring

### Check Logs

```bash
# View backend logs
tail -f packages/backend/logs/app.log | grep PayPal
```

### Database Queries

```sql
-- Check PayPal accounts
SELECT * FROM paypal_accounts;

-- Check PayPal payouts
SELECT * FROM payouts WHERE payout_method = 'paypal';

-- Check failed payouts
SELECT * FROM payouts 
WHERE payout_method = 'paypal' AND status = 'failed';

-- Check retry statistics
SELECT 
  status,
  AVG(retry_count) as avg_retries,
  COUNT(*) as count
FROM payouts 
WHERE payout_method = 'paypal'
GROUP BY status;
```

## Production Checklist

Before going live:

- [ ] Switch to production PayPal credentials
- [ ] Update `PAYPAL_API_BASE_URL` to production URL
- [ ] Configure production webhook URL
- [ ] Test with real PayPal accounts
- [ ] Set up monitoring and alerts
- [ ] Review PayPal fee structure
- [ ] Ensure proper error handling
- [ ] Test retry logic thoroughly
- [ ] Document support procedures

## Next Steps

1. **Enhance Security**
   - Implement webhook signature verification
   - Add rate limiting
   - Implement fraud detection

2. **Improve UX**
   - Add email notifications for payout status
   - Show payout history in dashboard
   - Add payout scheduling

3. **Add Features**
   - Bulk payouts
   - Recurring payouts
   - Payout analytics

## Support

For issues:
- Check logs: `packages/backend/logs/`
- Review PayPal Dashboard
- Check database records
- Test with sandbox accounts first

## Resources

- [Full Documentation](./PAYPAL_PAYOUT_INTEGRATION.md)
- [PayPal API Reference](https://developer.paypal.com/docs/api/payments.payouts-batch/v1/)
- [PayPal Sandbox](https://developer.paypal.com/dashboard/)
