# KYC Integration Documentation

## Overview

The KnowTon platform integrates with Jumio for Know Your Customer (KYC) verification. This document describes the implementation, configuration, and usage of the KYC system.

## Features

- **Two-tier KYC Levels**:
  - Level 1 (Basic): Identity verification with government-issued ID
  - Level 2 (Advanced): Enhanced verification with additional checks

- **Automated Workflow**: Seamless integration with Jumio's verification platform
- **Webhook Support**: Real-time status updates via Jumio callbacks
- **Admin Controls**: Manual KYC level management for special cases
- **Statistics Dashboard**: Track KYC verification metrics

## Configuration

### Environment Variables

Add the following variables to your `.env` file:

```bash
# Jumio API Credentials
JUMIO_API_TOKEN=your_jumio_api_token
JUMIO_API_SECRET=your_jumio_api_secret
JUMIO_BASE_URL=https://netverify.com/api/v4
JUMIO_CALLBACK_URL=https://api.knowton.io/api/v1/kyc/callback

# Frontend URLs for redirects
FRONTEND_URL=https://knowton.io
```

### Jumio Account Setup

1. Sign up for a Jumio account at https://www.jumio.com
2. Get your API credentials from the Jumio dashboard
3. Configure webhook URL in Jumio settings
4. Set up workflow IDs:
   - Workflow 100: Basic verification
   - Workflow 200: Advanced verification

## Database Schema

The KYC system adds the following fields to the `users` table:

```prisma
model User {
  // ... existing fields
  kycStatus         String    @default("none") // none, pending, approved, rejected
  kycLevel          Int       @default(0) // 0: none, 1: basic, 2: advanced
  kycProvider       String?   // jumio, onfido, etc.
  kycTransactionId  String?   @unique
  kycVerifiedAt     DateTime?
  kycData           Json?     // Store KYC verification data
}
```

Run the migration:

```bash
cd packages/backend
npx prisma migrate dev --name add_kyc_fields
npx prisma generate
```

## API Endpoints

### 1. Initiate KYC Verification

**POST** `/api/v1/kyc/initiate`

Starts the KYC verification process and returns a redirect URL.

**Request:**
```json
{
  "level": 1,
  "locale": "en"
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "jumio-transaction-id",
  "redirectUrl": "https://jumio.com/verify/...",
  "message": "KYC verification initiated. Please complete the verification process."
}
```

### 2. Get KYC Status

**GET** `/api/v1/kyc/status`

Returns the current user's KYC status.

**Response:**
```json
{
  "success": true,
  "kyc": {
    "status": "approved",
    "level": 1,
    "verifiedAt": "2024-01-15T10:30:00Z",
    "transactionId": "jumio-transaction-id"
  }
}
```

### 3. Check KYC Requirement

**POST** `/api/v1/kyc/check-requirement`

Checks if the user meets a specific KYC level requirement.

**Request:**
```json
{
  "requiredLevel": 1
}
```

**Response:**
```json
{
  "success": true,
  "meetsRequirement": true,
  "requiredLevel": 1
}
```

### 4. Webhook Callback (Jumio)

**POST** `/api/v1/kyc/callback`

Receives verification status updates from Jumio.

**Headers:**
```
X-Jumio-Signature: <hmac-signature>
```

**Request Body:**
```json
{
  "transactionReference": "jumio-transaction-id",
  "verificationStatus": "APPROVED_VERIFIED",
  "idType": "PASSPORT",
  "idCountry": "USA",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "similarity": "MATCH",
  "validity": true
}
```

### 5. Update KYC Level (Admin)

**PUT** `/api/v1/kyc/update-level`

Manually update a user's KYC level (admin only).

**Request:**
```json
{
  "userId": "user-uuid",
  "level": 2,
  "status": "approved"
}
```

### 6. Get KYC Statistics (Admin)

**GET** `/api/v1/kyc/statistics`

Returns KYC verification statistics.

**Response:**
```json
{
  "success": true,
  "statistics": {
    "total": 1000,
    "pending": 50,
    "approved": 800,
    "rejected": 150,
    "byLevel": [
      { "level": 1, "count": 600 },
      { "level": 2, "count": 200 }
    ]
  }
}
```

## Middleware Usage

### Require KYC Verification

Use the `requireKYC` middleware to protect routes that need KYC verification:

```typescript
import { requireKYC, requireAdvancedKYC } from '../middleware/kyc.middleware'

// Require basic KYC (level 1)
router.post('/create-content', requireKYC(1), createContentHandler)

// Require advanced KYC (level 2)
router.post('/issue-bond', requireAdvancedKYC, issueBondHandler)
```

## Integration Flow

### User Flow

1. User initiates KYC verification from the frontend
2. Backend calls Jumio API to create verification session
3. User is redirected to Jumio's verification page
4. User completes identity verification (uploads ID, takes selfie)
5. Jumio processes verification and sends webhook to backend
6. Backend updates user's KYC status in database
7. User is redirected back to the platform

### Sequence Diagram

```
User -> Frontend: Click "Verify Identity"
Frontend -> Backend: POST /api/v1/kyc/initiate
Backend -> Jumio: Create verification session
Jumio -> Backend: Return redirect URL
Backend -> Frontend: Return redirect URL
Frontend -> User: Redirect to Jumio
User -> Jumio: Complete verification
Jumio -> Backend: POST /api/v1/kyc/callback (webhook)
Backend -> Database: Update KYC status
Jumio -> User: Redirect to success page
User -> Frontend: View verification status
```

## KYC Levels

### Level 0 (None)
- No verification required
- Default for all new users
- Limited platform access

### Level 1 (Basic)
- Government-issued ID verification
- Selfie verification
- Required for:
  - Creating content
  - Purchasing content
  - Basic trading

### Level 2 (Advanced)
- All Level 1 checks
- Enhanced document verification
- Address verification
- Required for:
  - Issuing bonds
  - Large transactions (>$10,000)
  - Enterprise features
  - Withdrawals >$5,000

## Error Handling

### Common Errors

1. **User already has pending KYC**
   ```json
   {
     "error": "KYC verification already in progress"
   }
   ```

2. **User already verified**
   ```json
   {
     "error": "User already verified at this level or higher"
   }
   ```

3. **Invalid KYC level**
   ```json
   {
     "error": "Invalid KYC level. Must be 1 (basic) or 2 (advanced)"
   }
   ```

4. **KYC requirement not met**
   ```json
   {
     "error": "KYC verification required",
     "required": {
       "level": 2,
       "message": "This action requires KYC level 2 verification"
     },
     "current": {
       "status": "approved",
       "level": 1
     }
   }
   ```

## Security

### Webhook Signature Verification

All Jumio webhooks are verified using HMAC-SHA256 signatures:

```typescript
const signature = req.headers['x-jumio-signature']
const payload = JSON.stringify(req.body)

if (!kycService.verifyWebhookSignature(payload, signature)) {
  return res.status(401).json({ error: 'Invalid signature' })
}
```

### Data Privacy

- KYC data is stored encrypted in the database
- Personal information is only accessible to authorized admins
- Data retention follows GDPR guidelines
- Users can request data deletion

## Testing

### Unit Tests

Run the KYC service tests:

```bash
cd packages/backend
npm test -- kyc.test.ts
```

### Integration Testing

Use Jumio's sandbox environment for testing:

```bash
JUMIO_BASE_URL=https://netverify.com/api/v4/sandbox
```

### Test Scenarios

1. **Successful Verification**
   - Upload valid ID
   - Complete selfie verification
   - Verify status updates to "approved"

2. **Failed Verification**
   - Upload invalid/expired ID
   - Verify status updates to "rejected"

3. **Webhook Handling**
   - Send test webhook
   - Verify database updates
   - Check notification emails

## Monitoring

### Metrics to Track

- KYC initiation rate
- Verification success rate
- Average verification time
- Rejection reasons
- Level distribution

### Logs

All KYC operations are logged with the following information:

```typescript
logger.info('KYC verification initiated', {
  userId,
  transactionId,
  level,
})

logger.info('KYC status updated', {
  userId,
  kycStatus,
  kycLevel,
  transactionReference,
})
```

## Troubleshooting

### Issue: Webhook not received

1. Check Jumio webhook configuration
2. Verify callback URL is publicly accessible
3. Check firewall/security group settings
4. Review webhook logs in Jumio dashboard

### Issue: Verification stuck in pending

1. Check Jumio transaction status
2. Verify webhook was sent
3. Check application logs for errors
4. Manually update status if needed (admin)

### Issue: Invalid signature error

1. Verify JUMIO_API_SECRET is correct
2. Check webhook payload format
3. Ensure signature header is present
4. Review signature verification logic

## Future Enhancements

- [ ] Support for additional KYC providers (Onfido, Persona)
- [ ] Automated re-verification for expired documents
- [ ] Enhanced fraud detection
- [ ] Multi-language support for verification flow
- [ ] Mobile SDK integration
- [ ] Biometric verification
- [ ] Document expiry tracking and notifications

## Support

For issues or questions:
- Email: support@knowton.io
- Documentation: https://docs.knowton.io/kyc
- Jumio Support: https://support.jumio.com
