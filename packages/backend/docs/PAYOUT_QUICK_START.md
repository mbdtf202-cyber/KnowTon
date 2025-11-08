# Payout Integration - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
cd packages/backend
npm install pdfkit @types/pdfkit
```

### 2. Configure Environment

Add to `.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51xxxxx
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_xxxxx

# Frontend URL for redirects
FRONTEND_URL=http://localhost:5173
```

### 3. Run Database Migration

```bash
npx prisma migrate dev --name add_payout_tables
npx prisma generate
```

### 4. Start the Server

```bash
npm run dev
```

### 5. Test the Integration

```bash
npm run test:payout
# or
tsx src/scripts/test-payout-integration.ts
```

## 📋 Basic Usage

### For Creators: Setup Payouts

```typescript
// 1. Create Connect account
const response = await fetch('/api/v1/payouts/connect/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'creator-123',
    email: 'creator@example.com',
    country: 'US',
    businessType: 'individual',
  }),
});

const { data } = await response.json();

// 2. Redirect creator to onboarding
window.location.href = data.onboardingUrl;

// 3. After onboarding, check status
const statusResponse = await fetch(`/api/v1/payouts/connect/${userId}`);
const { data: account } = await statusResponse.json();

if (account.payoutsEnabled) {
  console.log('✅ Payouts enabled!');
}
```

### For Creators: Request Payout

```typescript
// Request payout
const response = await fetch('/api/v1/payouts/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'creator-123',
    amount: 500,
    currency: 'USD',
    description: 'Monthly earnings',
  }),
});

const { data } = await response.json();
console.log(`Payout created: ${data.payoutId}`);
console.log(`Net amount: $${data.netAmount}`);
console.log(`Estimated arrival: ${data.estimatedArrival}`);
```

### View Payout History

```typescript
const response = await fetch(`/api/v1/payouts/history/${userId}?limit=10`);
const { data } = await response.json();

console.log(`Total payouts: ${data.total}`);
console.log(`Total paid: $${data.totalPaid}`);

data.payouts.forEach(payout => {
  console.log(`${payout.createdAt}: $${payout.netAmount} - ${payout.status}`);
});
```

### Download Receipt

```typescript
// Download PDF receipt
window.open(`/api/v1/payouts/${payoutId}/receipt`, '_blank');
```

## 🧪 Testing with Stripe Test Mode

### Test Account Onboarding

1. Use test API keys from Stripe Dashboard
2. Create Connect account via API
3. Visit onboarding URL
4. Use test data:
   - SSN: `000-00-0000`
   - DOB: Any date 18+ years ago
   - Bank routing: `110000000`
   - Bank account: `000123456789`

### Test Payouts

```bash
# Run test script
tsx src/scripts/test-payout-integration.ts
```

Expected output:
```
✅ PASS - Connect account created
✅ PASS - Account details retrieved
✅ PASS - Expected failure (onboarding not completed)
✅ PASS - Payout history retrieved
✅ PASS - Correctly rejected minimum amount
✅ PASS - Correctly rejected missing fields

Success Rate: 100%
```

## 🔧 Common Issues

### Issue: "Connect account not found"

**Solution:** Creator needs to complete onboarding first.

```typescript
// Check if account exists
const account = await fetch(`/api/v1/payouts/connect/${userId}`);
if (!account.ok) {
  // Redirect to onboarding
  const { data } = await fetch('/api/v1/payouts/connect/create', {
    method: 'POST',
    body: JSON.stringify({ userId, email, country: 'US' }),
  }).then(r => r.json());
  
  window.location.href = data.onboardingUrl;
}
```

### Issue: "Payouts not enabled"

**Solution:** Complete identity verification in Stripe onboarding.

```typescript
const { data } = await fetch(`/api/v1/payouts/connect/${userId}`).then(r => r.json());

if (!data.payoutsEnabled) {
  alert('Please complete identity verification to enable payouts');
}
```

### Issue: "Minimum payout amount is $50"

**Solution:** Wait until balance reaches $50 or adjust minimum threshold.

```typescript
// Check available balance before requesting payout
const balance = await getAvailableBalance(userId);

if (balance < 50) {
  alert(`Minimum payout is $50. Current balance: $${balance}`);
}
```

### Issue: "Insufficient balance"

**Solution:** Ensure creator has enough earnings.

```typescript
// Calculate available balance
const balance = totalEarnings - totalPayouts;

if (balance < requestedAmount) {
  alert(`Insufficient balance. Available: $${balance}`);
}
```

## 📊 Monitoring

### Check Payout Status

```typescript
const { data } = await fetch(`/api/v1/payouts/${payoutId}`).then(r => r.json());

switch (data.status) {
  case 'pending':
    console.log('⏳ Payout initiated');
    break;
  case 'processing':
    console.log('🔄 Transfer in progress');
    break;
  case 'completed':
    console.log('✅ Funds delivered');
    break;
  case 'failed':
    console.log('❌ Payout failed:', data.failureReason);
    break;
}
```

### View Logs

```bash
# Backend logs
tail -f logs/app.log | grep payout

# Or check your logging service (CloudWatch, etc.)
```

## 🎯 Next Steps

1. **Production Setup**
   - Switch to live Stripe API keys
   - Configure production webhook endpoint
   - Set up monitoring and alerts

2. **Frontend Integration**
   - Build payout dashboard UI
   - Add bank account management
   - Display payout history

3. **Advanced Features**
   - Implement instant payouts (1.5% + $0.50 fee)
   - Add multi-currency support
   - Set up automated payouts (weekly/monthly)

## 📚 Additional Resources

- [Full Documentation](./PAYOUT_INTEGRATION.md)
- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [API Reference](./PAYOUT_INTEGRATION.md#api-endpoints)

## 💡 Pro Tips

1. **Minimum Payout**: Set to $50 to reduce transaction fees
2. **Payout Schedule**: Offer weekly or monthly automated payouts
3. **Fee Transparency**: Clearly display fees before payout
4. **Status Updates**: Send email notifications for payout status changes
5. **Receipt Generation**: Automatically generate receipts for tax purposes

## 🆘 Support

Need help? Check:
- [Troubleshooting Guide](./PAYOUT_INTEGRATION.md#error-handling)
- Stripe Dashboard for transfer details
- Application logs for error messages
