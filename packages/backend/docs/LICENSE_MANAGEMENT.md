# Enterprise License Management System

## Overview

The Enterprise License Management system provides comprehensive tools for managing content licenses, seat allocation, and usage tracking for enterprise customers. It includes both on-chain (smart contract) and off-chain (backend API) components.

## Architecture

### Components

1. **Smart Contract** (`EnterpriseLicensing.sol`)
   - On-chain license issuance and verification
   - Seat assignment and revocation
   - Usage tracking
   - License renewal and seat expansion

2. **Backend Service** (`bulk-purchase.service.ts`)
   - Off-chain license management
   - Seat allocation and tracking
   - Usage statistics and reporting
   - Invoice generation

3. **Frontend Dashboard** (`LicenseManagementDashboard.tsx`)
   - Admin interface for license management
   - Seat assignment UI
   - Usage analytics visualization
   - Real-time license status

## Features

### 1. License Issuance

#### On-Chain
```solidity
function issueLicense(
    uint256 _contentId,
    address _enterprise,
    uint256 _seats,
    uint256 _duration
) external payable returns (bytes32)
```

**Parameters:**
- `_contentId`: ID of the content being licensed
- `_enterprise`: Enterprise wallet address
- `_seats`: Number of user seats
- `_duration`: License duration in seconds

**Returns:** Unique license ID (bytes32)

#### Off-Chain
```typescript
POST /api/v1/bulk-purchase/licenses/create
{
  "enterpriseId": "uuid",
  "contentId": "string",
  "totalSeats": number,
  "pricePerSeat": number,
  "currency": "USD",
  "expiresAt": "ISO date"
}
```

### 2. Seat Management

#### Assign Seat
```typescript
POST /api/v1/bulk-purchase/licenses/:licenseId/seats/assign
{
  "userEmail": "user@example.com",
  "userId": "uuid" // optional
}
```

**Features:**
- Automatic seat availability check
- Duplicate assignment prevention
- Seat reactivation for previously revoked users

#### Revoke Seat
```typescript
POST /api/v1/bulk-purchase/seats/:seatId/revoke
```

**Features:**
- Immediate seat revocation
- Automatic seat count update
- Audit trail maintenance

### 3. Usage Tracking

#### Track Usage
```typescript
POST /api/v1/bulk-purchase/licenses/:licenseId/usage
{
  "userEmail": "user@example.com",
  "action": "access|download|view",
  "metadata": {
    "duration": 3600,
    "quality": "HD"
  }
}
```

#### Get Usage Statistics
```typescript
GET /api/v1/bulk-purchase/licenses/:licenseId/stats?startDate=2024-01-01&endDate=2024-12-31
```

**Response:**
```json
{
  "totalUsage": 1500,
  "usageByAction": [
    { "action": "access", "_count": 800 },
    { "action": "download", "_count": 500 },
    { "action": "view", "_count": 200 }
  ],
  "topUsers": [
    { "userEmail": "user1@example.com", "_count": 150 },
    { "userEmail": "user2@example.com", "_count": 120 }
  ]
}
```

### 4. License Verification

#### On-Chain Verification
```solidity
function verifyLicense(bytes32 _licenseId) external view returns (bool)
```

Checks:
- License exists
- License is active
- License has not expired

#### Off-Chain Verification
```typescript
GET /api/v1/bulk-purchase/licenses/:licenseId
```

Returns complete license details including:
- Seat assignments
- Usage records
- Enterprise information
- Expiration status

### 5. License Renewal

#### On-Chain
```solidity
function renewLicense(bytes32 _licenseId, uint256 _duration) external payable
```

**Features:**
- Automatic expiration extension
- Payment verification
- Event emission for tracking

#### Off-Chain
Handled through bulk purchase flow with automatic license extension.

### 6. Seat Expansion

```solidity
function increaseSeats(bytes32 _licenseId, uint256 _additionalSeats) external payable
```

**Features:**
- Dynamic seat addition
- Pro-rated pricing
- Immediate availability

## Database Schema

### EnterpriseLicense
```prisma
model EnterpriseLicense {
  id              String   @id @default(uuid())
  licenseKey      String   @unique
  enterpriseId    String
  contentId       String
  totalSeats      Int
  usedSeats       Int      @default(0)
  pricePerSeat    Decimal
  totalAmount     Decimal
  discountPercent Int      @default(0)
  currency        String   @default("USD")
  status          String   @default("active")
  expiresAt       DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  enterprise      EnterpriseAccount
  seats           EnterpriseLicenseSeat[]
  usageRecords    EnterpriseLicenseUsage[]
  invoices        EnterpriseInvoice[]
}
```

### EnterpriseLicenseSeat
```prisma
model EnterpriseLicenseSeat {
  id         String   @id @default(uuid())
  licenseId  String
  userEmail  String
  userId     String?
  status     String   @default("active")
  assignedAt DateTime @default(now())
  revokedAt  DateTime?
  lastUsedAt DateTime?
  
  license    EnterpriseLicense
}
```

### EnterpriseLicenseUsage
```prisma
model EnterpriseLicenseUsage {
  id        String   @id @default(uuid())
  licenseId String
  seatId    String?
  userEmail String
  action    String
  duration  Int?
  metadata  Json?
  timestamp DateTime @default(now())
  
  license   EnterpriseLicense
}
```

## API Reference

### License Management

#### Create License
```http
POST /api/v1/bulk-purchase/licenses/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "enterpriseId": "uuid",
  "contentId": "string",
  "totalSeats": 10,
  "pricePerSeat": 99.99,
  "currency": "USD",
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

#### Get License Details
```http
GET /api/v1/bulk-purchase/licenses/:licenseId
Authorization: Bearer <token>
```

#### List Enterprise Licenses
```http
GET /api/v1/bulk-purchase/enterprises/:enterpriseId/licenses?limit=20&offset=0
Authorization: Bearer <token>
```

### Seat Management

#### Assign Seat
```http
POST /api/v1/bulk-purchase/licenses/:licenseId/seats/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "userEmail": "user@example.com",
  "userId": "uuid"
}
```

#### Revoke Seat
```http
POST /api/v1/bulk-purchase/seats/:seatId/revoke
Authorization: Bearer <token>
```

### Usage Tracking

#### Track Usage
```http
POST /api/v1/bulk-purchase/licenses/:licenseId/usage
Authorization: Bearer <token>
Content-Type: application/json

{
  "userEmail": "user@example.com",
  "action": "access",
  "metadata": {
    "duration": 3600,
    "quality": "HD"
  }
}
```

#### Get Usage Statistics
```http
GET /api/v1/bulk-purchase/licenses/:licenseId/stats?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

## Frontend Integration

### Using the Hook

```typescript
import { useEnterpriseLicense } from '../hooks/useEnterpriseLicense';

function MyComponent() {
  const {
    loading,
    error,
    issueLicense,
    assignSeat,
    getLicense,
  } = useEnterpriseLicense();

  const handleIssueLicense = async () => {
    try {
      const licenseId = await issueLicense(
        1, // contentId
        '0x123...', // enterprise address
        10, // seats
        365, // duration in days
        '0.1' // price per seat in ETH
      );
      console.log('License issued:', licenseId);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div>
      <button onClick={handleIssueLicense} disabled={loading}>
        Issue License
      </button>
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

### Using the Dashboard

```typescript
import { LicenseManagementPage } from '../pages/LicenseManagementPage';

// In your router
<Route path="/licenses" element={<LicenseManagementPage />} />
```

## Security Considerations

### Smart Contract
1. **Access Control**: Only enterprise or contract owner can manage seats
2. **Reentrancy Protection**: All state-changing functions use `nonReentrant` modifier
3. **Pausable**: Contract can be paused in emergency situations
4. **Payment Verification**: All payments are verified before processing

### Backend API
1. **Authentication**: JWT token required for all endpoints
2. **Authorization**: Enterprise-specific access control
3. **Input Validation**: All inputs validated and sanitized
4. **Rate Limiting**: API rate limits enforced

## Testing

### Smart Contract Tests
```bash
cd packages/contracts
npx hardhat test test/EnterpriseLicensing.test.ts
```

### Backend Tests
```bash
cd packages/backend
npm test src/__tests__/services/bulk-purchase.test.ts
```

## Deployment

### Smart Contract
```bash
cd packages/contracts
npx hardhat run scripts/deploy-enterprise-licensing.ts --network arbitrum
```

### Environment Variables
```env
# Smart Contract
REACT_APP_ENTERPRISE_LICENSING_CONTRACT=0x...

# Backend
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_...
```

## Monitoring

### Key Metrics
- Total active licenses
- Seat utilization rate
- Usage frequency per license
- License renewal rate
- Revenue per license

### Alerts
- License expiration warnings (30 days, 7 days, 1 day)
- Seat capacity warnings (>90% utilization)
- Unusual usage patterns
- Failed payment attempts

## Best Practices

### For Enterprises
1. Monitor seat utilization regularly
2. Set up expiration reminders
3. Review usage statistics monthly
4. Plan seat expansion in advance
5. Maintain accurate user email lists

### For Administrators
1. Regular license audits
2. Monitor usage patterns for anomalies
3. Proactive renewal outreach
4. Seat optimization recommendations
5. Usage trend analysis

## Troubleshooting

### Common Issues

#### Seat Assignment Fails
- Check if license has available seats
- Verify license is active and not expired
- Ensure user email is not already assigned

#### Usage Tracking Not Working
- Verify user has assigned seat
- Check license expiration status
- Ensure license is active

#### License Verification Fails
- Check license ID is correct
- Verify license has not expired
- Ensure license is active (not suspended)

## Support

For technical support or questions:
- Email: support@knowton.io
- Documentation: https://docs.knowton.io/licenses
- API Reference: https://api.knowton.io/docs
