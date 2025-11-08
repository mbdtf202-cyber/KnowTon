# Crypto Withdrawal - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Environment Configuration

Add these variables to your `.env` file:

```bash
# Required
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-api-key
WITHDRAWAL_WALLET_PRIVATE_KEY=0x...

# Optional (defaults to mainnet addresses)
USDC_CONTRACT_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USDT_CONTRACT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
```

### 2. Database Migration

Run the Prisma migration to add crypto withdrawal tables:

```bash
cd packages/backend
npx prisma migrate dev --name add_crypto_withdrawals
```

### 3. Test the Integration

```bash
npm run test:crypto-withdrawal
```

## 📝 Basic Usage

### Get Withdrawal Quote

```typescript
import { cryptoWithdrawalService } from './services/crypto-withdrawal.service';

const quote = await cryptoWithdrawalService.getWithdrawalQuote({
  amountUSD: 100,
  token: 'USDC',
  walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
});

console.log(`Net Amount: ${quote.netAmountUSD} USD`);
console.log(`Gas Fee: ${quote.gasFeeUSD} USD`);
```

### Create Withdrawal

```typescript
const withdrawal = await cryptoWithdrawalService.createWithdrawal({
  userId: 'user-123',
  walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  amountUSD: 100,
  token: 'USDC',
});

console.log(`Withdrawal ID: ${withdrawal.withdrawalId}`);
console.log(`Status: ${withdrawal.status}`);
```

### Check Status

```typescript
const status = await cryptoWithdrawalService.getWithdrawalStatus(
  'withdrawal-123'
);

console.log(`Confirmations: ${status.confirmations}/${status.requiredConfirmations}`);
console.log(`TX Hash: ${status.txHash}`);
```

## 🔑 Key Features

| Feature | Description |
|---------|-------------|
| **Minimum Withdrawal** | $50 USD |
| **KYC Threshold** | $1,000 USD |
| **Withdrawal Fee** | 1% of amount |
| **Supported Tokens** | ETH, USDC, USDT |
| **Confirmations** | 12 blocks (~3 min) |
| **Processing Time** | Instant |

## 🛡️ Security Checklist

- [ ] Set strong private key for withdrawal wallet
- [ ] Enable KYC for your platform
- [ ] Monitor hot wallet balance
- [ ] Set up alerts for failed withdrawals
- [ ] Implement rate limiting
- [ ] Use testnet for development

## 📊 API Endpoints

```bash
# Get quote
GET /api/v1/payouts/crypto/quote?amountUSD=100&token=USDC&walletAddress=0x...

# Create withdrawal
POST /api/v1/payouts/crypto/create
{
  "userId": "user-123",
  "walletAddress": "0x...",
  "amountUSD": 100,
  "token": "USDC"
}

# Check status
GET /api/v1/payouts/crypto/:withdrawalId/status

# Get history
GET /api/v1/payouts/crypto/history/:userId

# Cancel withdrawal
POST /api/v1/payouts/crypto/:withdrawalId/cancel

# Get limits
GET /api/v1/payouts/crypto/limits/:userId
```

## ⚠️ Common Issues

### "Withdrawal wallet not configured"
**Solution:** Set `WITHDRAWAL_WALLET_PRIVATE_KEY` in `.env`

### "KYC verification required"
**Solution:** User needs to complete KYC for withdrawals >$1000

### "Insufficient balance"
**Solution:** User needs more earnings before withdrawal

### "Invalid wallet address"
**Solution:** Check address format (must be valid Ethereum address)

## 📚 Next Steps

1. Read full documentation: `CRYPTO_WITHDRAWAL.md`
2. Implement frontend UI for withdrawals
3. Set up monitoring and alerts
4. Configure hot wallet with sufficient balance
5. Test on testnet before production

## 🆘 Support

- Documentation: `packages/backend/docs/CRYPTO_WITHDRAWAL.md`
- Test Script: `packages/backend/src/scripts/test-crypto-withdrawal.ts`
- Service: `packages/backend/src/services/crypto-withdrawal.service.ts`
- Routes: `packages/backend/src/routes/payout.routes.ts`

---

**Ready to go!** 🎉 Your crypto withdrawal system is now set up and ready to use.
