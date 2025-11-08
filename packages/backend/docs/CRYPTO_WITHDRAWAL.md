# Crypto Withdrawal Integration

## Overview

The crypto withdrawal system enables creators to withdraw their earnings directly to their cryptocurrency wallets. The system supports ETH, USDC, and USDT withdrawals with dynamic gas fee estimation and KYC enforcement for large withdrawals.

## Features

### ✅ Implemented Features

1. **Direct Wallet Withdrawal**
   - Withdraw earnings to any Ethereum address
   - Support for ETH, USDC, and USDT
   - Instant processing with blockchain confirmation tracking

2. **Dynamic Gas Fee Estimation**
   - Real-time gas price fetching from network
   - Accurate gas limit estimation for each token type
   - Gas cost displayed in both ETH and USD

3. **Transaction Confirmation Tracking**
   - Monitor transaction status on-chain
   - Track confirmation count (requires 12 confirmations)
   - Automatic status updates as confirmations increase
   - Estimated completion time calculation

4. **Withdrawal Limits**
   - Minimum withdrawal: $50
   - KYC required for withdrawals > $1000
   - Balance validation before withdrawal
   - Withdrawal fee: 1% of amount

5. **KYC Integration**
   - Automatic KYC status check for large withdrawals
   - Enforces KYC level 1 or higher for >$1000
   - Clear error messages for KYC requirements

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                  Crypto Withdrawal Flow                 │
└─────────────────────────────────────────────────────────┘

1. User Request
   ↓
2. Validate Amount & Address
   ↓
3. Check KYC (if > $1000)
   ↓
4. Get Exchange Rate (Chainlink)
   ↓
5. Estimate Gas Fees
   ↓
6. Calculate Net Amount
   ↓
7. Create Withdrawal Record
   ↓
8. Send Transaction (Hot Wallet)
   ↓
9. Monitor Confirmations
   ↓
10. Update Status (Confirmed/Failed)
```

### Database Schema

```sql
CREATE TABLE crypto_withdrawals (
  id                UUID PRIMARY KEY,
  user_id           UUID NOT NULL,
  wallet_address    VARCHAR(42) NOT NULL,
  amount            DECIMAL(20, 8) NOT NULL,
  amount_usd        DECIMAL(20, 2) NOT NULL,
  token             VARCHAR(10) NOT NULL,
  token_amount      VARCHAR(100) NOT NULL,
  exchange_rate     DECIMAL(20, 8) NOT NULL,
  gas_estimate      VARCHAR(100),
  gas_fee           DECIMAL(20, 8),
  tx_hash           VARCHAR(66) UNIQUE,
  status            VARCHAR(20) DEFAULT 'pending',
  confirmations     INT DEFAULT 0,
  block_number      INT,
  failure_reason    TEXT,
  kyc_verified      BOOLEAN DEFAULT false,
  kyc_level         INT DEFAULT 0,
  metadata          JSONB,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW(),
  completed_at      TIMESTAMP
);
```

## API Endpoints

### 1. Get Withdrawal Quote

Get a quote for crypto withdrawal including gas fees and net amount.

**Endpoint:** `GET /api/v1/payouts/crypto/quote`

**Query Parameters:**
- `amountUSD` (required): Amount in USD to withdraw
- `token` (required): Token type (ETH, USDC, USDT)
- `walletAddress` (required): Destination wallet address

**Response:**
```json
{
  "success": true,
  "data": {
    "amountUSD": 100,
    "tokenAmount": "100.00",
    "token": "USDC",
    "exchangeRate": "1.00",
    "gasFee": "0.002",
    "gasFeeUSD": "5.00",
    "withdrawalFee": "1.00",
    "withdrawalFeeUSD": "1.00",
    "netAmount": "99.00",
    "netAmountUSD": "94.00",
    "estimatedTime": "Instant (confirmed in ~3 minutes)"
  }
}
```

### 2. Create Withdrawal

Create a new crypto withdrawal request.

**Endpoint:** `POST /api/v1/payouts/crypto/create`

**Request Body:**
```json
{
  "userId": "user-123",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amountUSD": 100,
  "token": "USDC",
  "metadata": {
    "note": "Monthly earnings withdrawal"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "withdrawalId": "withdrawal-123",
    "status": "pending",
    "quote": { ... },
    "estimatedCompletion": "2025-11-02T12:03:00Z"
  }
}
```

### 3. Get Withdrawal Status

Check the status of a withdrawal including confirmation count.

**Endpoint:** `GET /api/v1/payouts/crypto/:withdrawalId/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "withdrawalId": "withdrawal-123",
    "status": "processing",
    "txHash": "0x1234...",
    "confirmations": 5,
    "requiredConfirmations": 12,
    "blockNumber": 18500000,
    "estimatedCompletion": "2025-11-02T12:05:00Z"
  }
}
```

### 4. Get Withdrawal History

Get withdrawal history for a user.

**Endpoint:** `GET /api/v1/payouts/crypto/history/:userId`

**Query Parameters:**
- `limit` (optional): Number of records (default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `status` (optional): Filter by status

**Response:**
```json
{
  "success": true,
  "data": {
    "withdrawals": [
      {
        "id": "withdrawal-123",
        "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        "amount": "99.00",
        "amountUSD": "94.00",
        "token": "USDC",
        "status": "confirmed",
        "txHash": "0x1234...",
        "confirmations": 12,
        "createdAt": "2025-11-02T12:00:00Z",
        "completedAt": "2025-11-02T12:03:00Z"
      }
    ],
    "total": 1,
    "totalWithdrawn": 94.00
  }
}
```

### 5. Cancel Withdrawal

Cancel a pending withdrawal.

**Endpoint:** `POST /api/v1/payouts/crypto/:withdrawalId/cancel`

**Request Body:**
```json
{
  "userId": "user-123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Withdrawal cancelled successfully"
  }
}
```

### 6. Get Withdrawal Limits

Get withdrawal limits and requirements for a user.

**Endpoint:** `GET /api/v1/payouts/crypto/limits/:userId`

**Response:**
```json
{
  "success": true,
  "data": {
    "minWithdrawal": 50,
    "maxWithdrawal": 1000,
    "kycRequired": 1000,
    "kycStatus": "none",
    "kycLevel": 0,
    "availableBalance": 500,
    "withdrawalFeePercent": 1
  }
}
```

## Configuration

### Environment Variables

```bash
# Ethereum RPC URL
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-api-key

# Withdrawal wallet private key (hot wallet)
WITHDRAWAL_WALLET_PRIVATE_KEY=0x...

# Token contract addresses (optional, defaults to mainnet)
USDC_CONTRACT_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USDT_CONTRACT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7

# Chainlink price feed addresses (optional, defaults to mainnet)
CHAINLINK_ETH_USD_FEED=0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
CHAINLINK_USDC_USD_FEED=0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6
CHAINLINK_USDT_USD_FEED=0x3E7d1eAB13ad0104d2750B8863b489D65364e32D
```

## Withdrawal Limits & Fees

| Parameter | Value | Notes |
|-----------|-------|-------|
| Minimum Withdrawal | $50 | Enforced for all withdrawals |
| KYC Threshold | $1,000 | KYC level 1+ required above this |
| Withdrawal Fee | 1% | Deducted from withdrawal amount |
| Gas Fee | Dynamic | Based on network conditions |
| Confirmations Required | 12 blocks | ~3 minutes on Ethereum |

## Security Features

### 1. KYC Enforcement
- Automatic KYC check for withdrawals > $1000
- Requires KYC level 1 or higher
- Clear error messages for non-compliant users

### 2. Address Validation
- Validates Ethereum address format
- Prevents withdrawals to invalid addresses
- Checksums addresses for accuracy

### 3. Balance Validation
- Checks available balance before withdrawal
- Prevents overdrafts
- Accounts for pending withdrawals

### 4. Transaction Monitoring
- Tracks transaction status on-chain
- Monitors confirmation count
- Detects failed transactions
- Automatic status updates

### 5. Hot Wallet Security
- Private key stored in environment variable
- Separate wallet for withdrawals
- Regular balance monitoring recommended
- Consider using multi-sig for production

## Testing

### Run Tests

```bash
# Run crypto withdrawal tests
npm run test:crypto-withdrawal

# Or using ts-node
npx ts-node src/scripts/test-crypto-withdrawal.ts
```

### Test Coverage

The test script covers:
1. ✅ Withdrawal quote generation
2. ✅ Withdrawal limits check
3. ✅ Minimum withdrawal validation
4. ✅ KYC requirement enforcement
5. ✅ Invalid address validation
6. ✅ Multi-token support (ETH, USDC, USDT)
7. ✅ Withdrawal history retrieval

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Minimum withdrawal amount is $50" | Amount below minimum | Increase withdrawal amount |
| "KYC verification required" | Large withdrawal without KYC | Complete KYC verification |
| "Invalid wallet address" | Malformed address | Check address format |
| "Insufficient balance" | Not enough funds | Wait for more earnings |
| "Withdrawal wallet not configured" | Missing private key | Set WITHDRAWAL_WALLET_PRIVATE_KEY |
| "Transaction failed on blockchain" | On-chain error | Check gas, balance, contract |

## Monitoring

### Key Metrics to Monitor

1. **Withdrawal Success Rate**
   - Target: >99%
   - Alert if <95%

2. **Average Confirmation Time**
   - Target: ~3 minutes
   - Alert if >10 minutes

3. **Gas Fee Costs**
   - Monitor average gas fees
   - Alert on unusual spikes

4. **Hot Wallet Balance**
   - Monitor ETH balance for gas
   - Monitor token balances
   - Alert when low

5. **Failed Withdrawals**
   - Track failure reasons
   - Alert on repeated failures

## Best Practices

### For Developers

1. **Always validate addresses** before creating withdrawals
2. **Check KYC status** for large withdrawals
3. **Monitor hot wallet balance** regularly
4. **Use testnet** for development and testing
5. **Implement rate limiting** to prevent abuse
6. **Log all transactions** for audit trail

### For Users

1. **Double-check wallet address** before withdrawal
2. **Complete KYC** for withdrawals >$1000
3. **Consider gas fees** when choosing token
4. **Wait for confirmations** before considering complete
5. **Keep transaction hash** for reference

## Future Enhancements

### Planned Features

1. **Multi-chain Support**
   - Polygon, Arbitrum, Optimism
   - Lower gas fees
   - Faster confirmations

2. **Batch Withdrawals**
   - Process multiple withdrawals together
   - Reduce gas costs
   - Improve efficiency

3. **Withdrawal Scheduling**
   - Schedule withdrawals for specific times
   - Optimize for low gas periods
   - Automatic execution

4. **Advanced Gas Optimization**
   - EIP-1559 support
   - Gas price prediction
   - Optimal timing suggestions

5. **Multi-sig Support**
   - Enhanced security for hot wallet
   - Require multiple approvals
   - Audit trail

## Support

For issues or questions:
- Email: support@knowton.io
- Documentation: https://docs.knowton.io/crypto-withdrawal
- GitHub: https://github.com/knowton/platform

## License

Copyright © 2025 KnowTon Platform. All rights reserved.
