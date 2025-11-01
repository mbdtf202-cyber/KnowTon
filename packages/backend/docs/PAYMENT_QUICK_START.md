# Payment Integration - Quick Start Guide

## Setup (5 minutes)

### 1. Install Dependencies

Dependencies are already installed. Verify with:
```bash
cd packages/backend
npm list stripe
```

### 2. Configure Environment Variables

Add to `packages/backend/.env`:
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:5173
```

### 3. Run Database Migration

```bash
cd packages/backend
npx prisma migrate dev --name add_payment_tables
```

### 4. Start the Server

```bash
npm run dev
```

## Quick Test (2 minutes)

### Test 1: Create Payment Intent

```bash
curl -X POST http://localhost:3000/api/v1/payments/create-intent \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_123",
    "amount": 99.99,
    "currency": "USD"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "paymentId": "...",
    "clientSecret": "pi_..._secret_...",
    "paymentIntentId": "pi_...",
    "amount": 99.99,
    "currency": "USD"
  }
}
```

### Test 2: Get Supported Currencies

```bash
curl http://localhost:3000/api/v1/payments/currencies/list
```

Expected response:
```json
{
  "success": true,
  "data": [
    { "code": "USD", "name": "US Dollar", "symbol": "$" },
    { "code": "EUR", "name": "Euro", "symbol": "€" },
    { "code": "CNY", "name": "Chinese Yuan", "symbol": "¥" },
    { "code": "JPY", "name": "Japanese Yen", "symbol": "¥" }
  ]
}
```

### Test 3: Create Payment with Installments

```bash
curl -X POST http://localhost:3000/api/v1/payments/create-intent \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_123",
    "amount": 300,
    "currency": "USD",
    "installments": {
      "enabled": true,
      "months": 3
    }
  }'
```

Expected response includes:
```json
{
  "installmentPlan": {
    "months": 3,
    "amountPerMonth": "100.00"
  }
}
```

## Frontend Integration Example

### 1. Install Stripe.js

```bash
cd packages/frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### 2. Create Payment Component

```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_test_...');

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Create payment intent
    const response = await fetch('/api/v1/payments/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user_123',
        amount: 99.99,
        currency: 'USD'
      })
    });
    
    const { clientSecret } = await response.json();

    // Confirm payment
    const { error, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: elements.getElement(CardElement),
        }
      }
    );

    if (error) {
      console.error(error);
    } else if (paymentIntent.status === 'succeeded') {
      console.log('Payment successful!');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe}>Pay</button>
    </form>
  );
}

function App() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
}
```

## Common Use Cases

### Use Case 1: Simple One-Time Payment

```javascript
// Backend
const payment = await paymentService.createPaymentIntent({
  userId: 'user_123',
  contentId: 'content_456',
  amount: 49.99,
  currency: 'USD'
});

// Frontend
const { error } = await stripe.confirmCardPayment(payment.clientSecret);
```

### Use Case 2: Installment Payment

```javascript
// Backend
const payment = await paymentService.createPaymentIntent({
  userId: 'user_123',
  amount: 300,
  currency: 'USD',
  installments: {
    enabled: true,
    months: 3
  }
});

// Display to user: "Pay $100/month for 3 months"
```

### Use Case 3: Multi-Currency Payment

```javascript
// Detect user's location and currency
const userCurrency = getUserCurrency(); // 'EUR', 'CNY', etc.

const payment = await paymentService.createPaymentIntent({
  userId: 'user_123',
  amount: convertAmount(49.99, userCurrency),
  currency: userCurrency
});
```

### Use Case 4: Process Refund

```javascript
// Full refund
await paymentService.refundPayment('payment_123');

// Partial refund
await paymentService.refundPayment('payment_123', 25.00, 'partial_refund');
```

## Webhook Setup

### 1. Use Stripe CLI for Local Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/v1/payments/webhook
```

### 2. Configure Production Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/v1/payments/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
4. Copy webhook signing secret to `.env`

## Troubleshooting

### Issue: "Stripe secret key not configured"

**Solution:** Add `STRIPE_SECRET_KEY` to `.env` file

### Issue: "Webhook signature verification failed"

**Solution:** Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard

### Issue: "Currency not supported"

**Solution:** Use one of: USD, EUR, CNY, JPY

### Issue: "Payment requires action but no URL provided"

**Solution:** This is normal for 3D Secure. Use `stripe.confirmCardPayment()` on frontend

## Next Steps

1. ✅ Test payment flow end-to-end
2. ✅ Configure production webhooks
3. ✅ Implement frontend payment UI
4. ✅ Set up monitoring and alerts
5. ✅ Review security best practices

## Resources

- [Full Documentation](./STRIPE_PAYMENT_INTEGRATION.md)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [3D Secure Guide](https://stripe.com/docs/payments/3d-secure)

## Support

Questions? Contact: backend@knowton.io
