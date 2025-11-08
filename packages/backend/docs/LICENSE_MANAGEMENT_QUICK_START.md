# Enterprise License Management - Quick Start Guide

## Overview

This guide will help you quickly set up and use the Enterprise License Management system for managing content licenses, seat allocation, and usage tracking.

## Prerequisites

- Node.js 18+
- PostgreSQL database
- MetaMask or compatible Web3 wallet
- Enterprise account created

## Quick Setup

### 1. Deploy Smart Contract

```bash
cd packages/contracts

# Compile contract
npx hardhat compile

# Deploy to testnet (Arbitrum Sepolia)
npx hardhat run scripts/deploy-enterprise-licensing.ts --network arbitrum-sepolia

# Note the deployed contract address
```

### 2. Configure Environment

```bash
# Backend (.env)
DATABASE_URL=postgresql://user:password@localhost:5432/knowton
STRIPE_SECRET_KEY=sk_test_...

# Frontend (.env)
REACT_APP_ENTERPRISE_LICENSING_CONTRACT=0x... # From deployment
REACT_APP_API_URL=http://localhost:3000
```

### 3. Run Database Migrations

```bash
cd packages/backend
npx prisma migrate dev
```

## Usage Examples

### Example 1: Issue a License (Backend API)

```bash
curl -X POST http://localhost:3000/api/v1/bulk-purchase/licenses/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enterpriseId": "enterprise-uuid",
    "contentId": "content-123",
    "totalSeats": 10,
    "pricePerSeat": 99.99,
    "currency": "USD",
    "expiresAt": "2025-12-31T23:59:59Z"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "license-uuid",
    "licenseKey": "LIC-1234567890-ABCD",
    "totalSeats": 10,
    "usedSeats": 0,
    "status": "active"
  }
}
```

### Example 2: Assign Seat to User

```bash
curl -X POST http://localhost:3000/api/v1/bulk-purchase/licenses/LICENSE_ID/seats/assign \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "user@company.com",
    "userId": "user-uuid"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "seat-uuid",
    "userEmail": "user@company.com",
    "status": "active",
    "assignedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Example 3: Track Usage

```bash
curl -X POST http://localhost:3000/api/v1/bulk-purchase/licenses/LICENSE_ID/usage \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "user@company.com",
    "action": "access",
    "metadata": {
      "duration": 3600,
      "quality": "HD"
    }
  }'
```

### Example 4: Get Usage Statistics

```bash
curl -X GET "http://localhost:3000/api/v1/bulk-purchase/licenses/LICENSE_ID/stats?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsage": 1500,
    "usageByAction": [
      { "action": "access", "_count": 800 },
      { "action": "download", "_count": 500 },
      { "action": "view", "_count": 200 }
    ],
    "topUsers": [
      { "userEmail": "user1@company.com", "_count": 150 },
      { "userEmail": "user2@company.com", "_count": 120 }
    ]
  }
}
```

### Example 5: Revoke Seat

```bash
curl -X POST http://localhost:3000/api/v1/bulk-purchase/seats/SEAT_ID/revoke \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Frontend Integration

### Step 1: Add Route

```typescript
// App.tsx
import { LicenseManagementPage } from './pages/LicenseManagementPage';

<Route path="/licenses" element={<LicenseManagementPage />} />
```

### Step 2: Use in Component

```typescript
import { useEnterpriseLicense } from '../hooks/useEnterpriseLicense';

function LicenseComponent() {
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
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // enterprise address
        10, // seats
        365, // duration in days
        '0.1' // price per seat in ETH
      );
      
      console.log('License issued:', licenseId);
      alert('License issued successfully!');
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to issue license');
    }
  };

  return (
    <div>
      <button 
        onClick={handleIssueLicense} 
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        {loading ? 'Processing...' : 'Issue License'}
      </button>
      {error && <p className="text-red-600">Error: {error}</p>}
    </div>
  );
}
```

## Smart Contract Integration

### Issue License On-Chain

```typescript
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = '0x...';
const ABI = [...]; // EnterpriseLicensing ABI

async function issueLicenseOnChain() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  const contentId = 1;
  const enterpriseAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const seats = 10;
  const duration = 365 * 24 * 60 * 60; // 1 year in seconds
  const pricePerSeat = ethers.parseEther('0.1');
  const totalCost = pricePerSeat * BigInt(seats);

  const tx = await contract.issueLicense(
    contentId,
    enterpriseAddress,
    seats,
    duration,
    { value: totalCost }
  );

  const receipt = await tx.wait();
  console.log('Transaction hash:', receipt.hash);

  // Extract license ID from event
  const event = receipt.logs.find(log => {
    try {
      return contract.interface.parseLog(log)?.name === 'LicenseIssued';
    } catch {
      return false;
    }
  });

  if (event) {
    const parsedEvent = contract.interface.parseLog(event);
    const licenseId = parsedEvent.args[0];
    console.log('License ID:', licenseId);
    return licenseId;
  }
}
```

### Verify License

```typescript
async function verifyLicense(licenseId: string) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  const isValid = await contract.verifyLicense(licenseId);
  console.log('License valid:', isValid);
  return isValid;
}
```

## Testing

### Test Smart Contract

```bash
cd packages/contracts
npx hardhat test test/EnterpriseLicensing.test.ts
```

**Expected Output:**
```
EnterpriseLicensing
  License Issuance
    ✓ Should issue a new license successfully
    ✓ Should fail to issue license with zero seats
    ✓ Should fail to issue license with insufficient payment
  Seat Management
    ✓ Should assign seat to user
    ✓ Should revoke seat from user
  Usage Tracking
    ✓ Should track usage for assigned seat
```

### Test Backend API

```bash
cd packages/backend
npm test src/__tests__/services/bulk-purchase.test.ts
```

## Common Workflows

### Workflow 1: Enterprise Purchases License

1. Enterprise creates account
2. Enterprise browses content
3. Enterprise initiates bulk purchase
4. System creates license with seats
5. Admin assigns seats to employees
6. Employees access content

### Workflow 2: Seat Management

1. Admin views license dashboard
2. Admin sees available seats
3. Admin assigns seat to new employee
4. Employee receives access notification
5. Employee accesses content
6. System tracks usage

### Workflow 3: License Renewal

1. System sends expiration warning (30 days)
2. Admin reviews license usage
3. Admin initiates renewal
4. Payment processed
5. License expiration extended
6. Confirmation sent

## Monitoring Dashboard

Access the license management dashboard at:
```
http://localhost:3000/licenses
```

**Features:**
- View all licenses
- Seat utilization metrics
- Usage statistics
- Assign/revoke seats
- Real-time updates

## Troubleshooting

### Issue: "No available seats"
**Solution:** Increase seats or revoke unused seats

```bash
# Increase seats
curl -X POST http://localhost:3000/api/v1/bulk-purchase/licenses/LICENSE_ID/increase-seats \
  -H "Authorization: Bearer TOKEN" \
  -d '{"additionalSeats": 5}'
```

### Issue: "License has expired"
**Solution:** Renew the license

```bash
# Renew license
curl -X POST http://localhost:3000/api/v1/bulk-purchase/licenses/LICENSE_ID/renew \
  -H "Authorization: Bearer TOKEN" \
  -d '{"duration": 365}'
```

### Issue: "User already has seat"
**Solution:** Check existing assignments or revoke old seat first

```bash
# Get license details
curl -X GET http://localhost:3000/api/v1/bulk-purchase/licenses/LICENSE_ID \
  -H "Authorization: Bearer TOKEN"
```

## Best Practices

1. **Monitor Seat Utilization**: Keep track of seat usage to optimize costs
2. **Set Expiration Reminders**: Configure alerts for upcoming expirations
3. **Regular Usage Reviews**: Analyze usage patterns monthly
4. **Proactive Seat Management**: Revoke unused seats promptly
5. **Maintain User Lists**: Keep employee email lists up to date

## Next Steps

1. Review [Full Documentation](./LICENSE_MANAGEMENT.md)
2. Explore [API Reference](./LICENSE_MANAGEMENT.md#api-reference)
3. Check [Security Considerations](./LICENSE_MANAGEMENT.md#security-considerations)
4. Set up [Monitoring](./LICENSE_MANAGEMENT.md#monitoring)

## Support

- Documentation: https://docs.knowton.io
- API Reference: https://api.knowton.io/docs
- Support Email: support@knowton.io
- GitHub Issues: https://github.com/knowton/platform/issues
