# Stripe Payment Integration

## Overview

This document describes the enhanced Stripe payment integration for the KnowTon platform, supporting multiple currencies, installment payments, 3D Secure authentication, and comprehensive webhook handling.

## Features

### 1. Multi-Currency Support

The payment system supports the following currencies:
- **USD** - US Dollar ($)
- **EUR** - Euro (€)
- **CNY** - Chinese Yuan (¥)
- **JPY** - Japanese Yen (¥)

### 2. Installment Payments

Users can pay in installments using Stripe's installment feature:
- Configurable installment plans (e.g., 3, 6, 12 months)
- Automatic calculation of monthly payment amounts
- Transparent display of installment terms

### 3. 3D Secure Authentication

Enhanced security with 3D Secure (3DS) authentication:
- Automatic 3DS challenge when required
- Support for Strong Customer Authentication (SCA)
- Tracking of 3DS authentication results

### 4. Webhook Event Handling

Comprehensive webhook support for real-time payment updates:
- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment failed
- `payment_intent.canceled` - Payment canceled
- `charge.refunded` - Refund processed

## API Endpoints

### Create Payment Intent

Create a new payment intent for processing a payment.

**Endpoint:** `POST /api/v1/payments/create-intent`

**Request Body:**
```json
{
  "userId": "user_123",
  "contentId": "content_456",
  "amount": 99.99,
  "currency": "USD",
  "installments": {
    "enabled": true,
    "months": 3
  },
  "metadata": {
    "orderId": "order_789"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "payment_123",
    "clientSecret": "pi_xxx_secret_yyy",
    "paymentIntentId": "pi_xxx",
    "amount": 99.99,
    "currency": "USD",
    "installmentPlan": {
      "months": 3,
      "amountPerMonth": "33.33"
    }
  }
}
```

### Confirm Payment

Confirm a payment with a payment method.

**Endpoint:** `POST /api/v1/payments/confirm`

**Request Body:**
```json
{
  "paymentIntentId": "pi_xxx",
  "paymentMethodId": "pm_xxx"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "payment_123",
    "status": "succeeded",
    "requiresAction": false,
    "nextActionUrl": null
  }
}
```

If 3D Secure authentication is required:
```json
{
  "success": true,
  "data": {
    "paymentId": "payment_123",
    "status": "requires_action",
    "requiresAction": true,
    "nextActionUrl": "https://stripe.com/3ds/authenticate"
  }
}
```

### Get Payment Details

Retrieve details of a specific payment.

**Endpoint:** `GET /api/v1/payments/:paymentId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "payment_123",
    "userId": "user_123",
    "contentId": "content_456",
    "amount": 99.99,
    "currency": "USD",
    "paymentMethod": "stripe",
    "status": "succeeded",
    "stripePaymentIntentId": "pi_xxx",
    "threeDSecureStatus": "authenticated",
    "installmentPlan": {
      "months": 3,
      "amountPerMonth": "33.33"
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "completedAt": "2024-01-01T00:05:00Z",
    "refunds": []
  }
}
```

### List User Payments

Get all payments for a specific user.

**Endpoint:** `GET /api/v1/payments/user/:userId?limit=20&offset=0`

**Response:**
```json
{
  "success": true,
  "data": {
    "payments": [...],
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}
```

### Process Refund

Refund a payment (full or partial).

**Endpoint:** `POST /api/v1/payments/:paymentId/refund`

**Request Body:**
```json
{
  "amount": 50.00,
  "reason": "requested_by_customer"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "refund_123",
    "paymentId": "payment_123",
    "amount": 50.00,
    "currency": "USD",
    "status": "succeeded",
    "stripeRefundId": "re_xxx",
    "processedAt": "2024-01-01T00:10:00Z"
  }
}
```

### Get Supported Currencies

Get list of supported currencies.

**Endpoint:** `GET /api/v1/payments/currencies/list`

**Response:**
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

### Webhook Handler

Receive and process Stripe webhook events.

**Endpoint:** `POST /api/v1/payments/webhook`

**Headers:**
- `stripe-signature`: Webhook signature for verification

**Note:** This endpoint must be configured in your Stripe Dashboard under Webhooks.

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Frontend URL (for 3DS redirects)
FRONTEND_URL=http://localhost:5173
```

### Stripe Dashboard Setup

1. **Get API Keys:**
   - Go to Stripe Dashboard → Developers → API keys
   - Copy your Secret key and Publishable key

2. **Configure Webhooks:**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Click "Add endpoint"
   - URL: `https://your-domain.com/api/v1/payments/webhook`
   - Select events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
     - `charge.refunded`
   - Copy the webhook signing secret

3. **Enable Payment Methods:**
   - Go to Stripe Dashboard → Settings → Payment methods
   - Enable desired payment methods (cards, wallets, etc.)

4. **Configure Installments:**
   - Go to Stripe Dashboard → Settings → Installments
   - Enable installments for supported countries

## Database Schema

### Payment Table

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  content_id VARCHAR,
  amount DECIMAL(20, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  payment_method VARCHAR(50),
  stripe_payment_intent_id VARCHAR UNIQUE,
  stripe_customer_id VARCHAR,
  status VARCHAR(20) DEFAULT 'pending',
  metadata JSONB,
  installment_plan JSONB,
  three_d_secure_status VARCHAR,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### Refund Table

```sql
CREATE TABLE refunds (
  id UUID PRIMARY KEY,
  payment_id UUID REFERENCES payments(id),
  amount DECIMAL(20, 2) NOT NULL,
  currency VARCHAR(10),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  stripe_refund_id VARCHAR UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);
```

### WebhookEvent Table

```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY,
  payment_id UUID REFERENCES payments(id),
  event_type VARCHAR(100),
  stripe_event_id VARCHAR UNIQUE,
  data JSONB,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Payment Flow

### Standard Payment Flow

1. **Create Payment Intent:**
   ```javascript
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
   ```

2. **Collect Payment Method (Frontend):**
   ```javascript
   const stripe = Stripe('pk_test_...');
   const { error, paymentMethod } = await stripe.createPaymentMethod({
     type: 'card',
     card: cardElement,
   });
   ```

3. **Confirm Payment:**
   ```javascript
   const response = await fetch('/api/v1/payments/confirm', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       paymentIntentId: 'pi_xxx',
       paymentMethodId: paymentMethod.id
     })
   });
   ```

4. **Handle 3D Secure (if required):**
   ```javascript
   if (result.requiresAction) {
     const { error } = await stripe.confirmCardPayment(clientSecret);
     // Payment will be confirmed via webhook
   }
   ```

### Installment Payment Flow

1. **Create Payment Intent with Installments:**
   ```javascript
   const response = await fetch('/api/v1/payments/create-intent', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       userId: 'user_123',
       amount: 300,
       currency: 'USD',
       installments: {
         enabled: true,
         months: 3
       }
     })
   });
   ```

2. **Display Installment Terms:**
   ```javascript
   const { installmentPlan } = await response.json();
   console.log(`Pay ${installmentPlan.amountPerMonth} per month for ${installmentPlan.months} months`);
   ```

3. **Complete Payment:**
   - Same as standard flow
   - Stripe handles installment scheduling automatically

## Error Handling

### Common Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| `invalid_amount` | Amount is zero or negative | Ensure amount > 0 |
| `unsupported_currency` | Currency not supported | Use USD, EUR, CNY, or JPY |
| `payment_not_found` | Payment ID doesn't exist | Verify payment ID |
| `refund_failed` | Refund cannot be processed | Check payment status |
| `webhook_signature_invalid` | Webhook signature verification failed | Verify webhook secret |

### Error Response Format

```json
{
  "error": "Error message description"
}
```

## Testing

### Test Cards

Use Stripe test cards for development:

| Card Number | Description |
|-------------|-------------|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0025 0000 3155 | Requires 3D Secure authentication |
| 4000 0000 0000 9995 | Payment declined |
| 4000 0000 0000 0341 | Charge succeeds, refund fails |

### Running Tests

```bash
cd packages/backend
npm test -- payment.test.ts
```

## Security Best Practices

1. **Never expose secret keys** - Keep `STRIPE_SECRET_KEY` server-side only
2. **Verify webhook signatures** - Always verify Stripe webhook signatures
3. **Use HTTPS** - All payment endpoints must use HTTPS in production
4. **Implement rate limiting** - Prevent abuse of payment endpoints
5. **Log all transactions** - Maintain audit trail of all payment activities
6. **Handle PCI compliance** - Use Stripe Elements to avoid handling card data

## Monitoring

### Key Metrics to Monitor

- Payment success rate
- Average payment processing time
- 3D Secure authentication rate
- Refund rate
- Webhook processing latency

### Logging

All payment operations are logged with the following information:
- Payment ID
- User ID
- Amount and currency
- Status changes
- Error messages

## Support

For issues or questions:
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- KnowTon Backend Team: backend@knowton.io

## Changelog

### Version 1.0.0 (2024-01-01)
- Initial implementation
- Multi-currency support (USD, EUR, CNY, JPY)
- Installment payments
- 3D Secure authentication
- Webhook event handling
- Refund processing
