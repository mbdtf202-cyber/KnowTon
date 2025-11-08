# Crypto Payment Quick Start Guide

## Overview

This guide will help you quickly integrate crypto payments (USDC/USDT/ETH) with Chainlink price oracle support into your application.

## Prerequisites

- Node.js 16+ installed
- Ethereum RPC endpoint (Alchemy, Infura, or local node)
- Basic understanding of Ethereum and ERC-20 tokens

## Quick Setup (5 minutes)

### 1. Install Dependencies

Already included in the project:
```bash
npm install ethers @prisma/client
```

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Required: Ethereum RPC URL
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Optional: Chain ID (default: 1 for mainnet)
CHAIN_ID=1

# Optional: Custom token addresses (defaults to mainnet)
USDC_CONTRACT_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USDT_CONTRACT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7

# Optional: Chainlink price feeds (defaults to mainnet)
CHAINLINK_ETH_USD_FEED=0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
CHAINLINK_USDC_USD_FEED=0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6
CHAINLINK_USDT_USD_FEED=0x3E7d1eAB13ad0104d2750B8863b489D65364e32D
```

### 3. Test the Integration

```bash
cd packages/backend
npx ts-node src/scripts/test-crypto-payment-integration.ts
```

## Basic Usage

### Get a Payment Quote

```typescript
import { cryptoPaymentService } from './services/crypto-payment.service';

// Get quote for 100 USD in USDC
const quote = await cryptoPaymentService.getPaymentQuote({
  amountUSD: 100,
  token: 'USDC',
  slippageTolerance: 1, // 1% slippage
});

console.log(`Pay ${quote.tokenAmount} ${quote.tokenSymbol}`);
console.log(`Exchange rate: $${quote.exchangeRate}`);
console.log(`Min amount: ${quote.minTokenAmount}`);
console.log(`Max amount: ${quote.maxTokenAmount}`);
```

### Create a Payment

```typescript
// Create payment record
const payment = await cryptoPaymentService.createCryptoPayment({
  userId: 'user-123',
  contentId: 'content-456',
  amountUSD: 100,
  token: 'USDC',
  buyerAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  recipientAddress: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
  slippageTolerance: 1,
});

console.log(`Payment ID: ${payment.paymentId}`);
```

### Monitor Transaction

```typescript
// After user sends transaction
const txHash = '0x1234...'; // From user's wallet

// Monitor status
const status = await cryptoPaymentService.monitorTransaction(
  payment.paymentId,
  txHash
);

console.log(`Status: ${status.status}`);
console.log(`Confirmations: ${status.confirmations}`);
```

## API Endpoints

### 1. Get Quote
```bash
curl -X POST http://localhost:3001/api/v1/payments/crypto/quote \
  -H "Content-Type: application/json" \
  -d '{
    "amountUSD": 100,
    "token": "USDC",
    "slippageTolerance": 1
  }'
```

### 2. Create Payment
```bash
curl -X POST http://localhost:3001/api/v1/payments/crypto/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "amountUSD": 100,
    "token": "USDC",
    "buyerAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "recipientAddress": "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
    "slippageTolerance": 1
  }'
```

### 3. Monitor Transaction
```bash
curl -X POST http://localhost:3001/api/v1/payments/crypto/monitor \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "payment-abc123",
    "txHash": "0x1234567890abcdef..."
  }'
```

## Frontend Integration

### React Example

```typescript
import { useState } from 'react';
import { ethers } from 'ethers';

function PayWithCrypto({ amount, contentId }) {
  const [quote, setQuote] = useState(null);
  const [status, setStatus] = useState('idle');

  const handlePayment = async () => {
    try {
      setStatus('loading');

      // 1. Get quote
      const quoteRes = await fetch('/api/v1/payments/crypto/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountUSD: amount,
          token: 'USDC',
          slippageTolerance: 1,
        }),
      });
      const { data: quoteData } = await quoteRes.json();
      setQuote(quoteData);

      // 2. Create payment
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();

      const paymentRes = await fetch('/api/v1/payments/crypto/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'current-user-id',
          contentId,
          amountUSD: amount,
          token: 'USDC',
          buyerAddress: userAddress,
          recipientAddress: 'PLATFORM_ADDRESS',
          slippageTolerance: 1,
        }),
      });
      const { data: paymentData } = await paymentRes.json();

      // 3. Execute blockchain transaction
      const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const usdcContract = new ethers.Contract(
        USDC_ADDRESS,
        ['function transfer(address to, uint256 amount) returns (bool)'],
        signer
      );

      const tx = await usdcContract.transfer(
        paymentData.recipientAddress,
        ethers.utils.parseUnits(quoteData.tokenAmount, 6)
      );

      setStatus('confirming');

      // 4. Monitor transaction
      const receipt = await tx.wait();
      
      await fetch('/api/v1/payments/crypto/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: paymentData.paymentId,
          txHash: receipt.transactionHash,
        }),
      });

      setStatus('success');
    } catch (error) {
      console.error('Payment failed:', error);
      setStatus('error');
    }
  };

  return (
    <div>
      <button onClick={handlePayment} disabled={status === 'loading'}>
        {status === 'loading' ? 'Processing...' : 
         status === 'confirming' ? 'Confirming...' :
         'Pay with USDC'}
      </button>
      {quote && (
        <p>Amount: {quote.tokenAmount} USDC (${quote.exchangeRate}/USDC)</p>
      )}
    </div>
  );
}
```

## Supported Tokens

| Token | Symbol | Decimals | Network |
|-------|--------|----------|---------|
| USD Coin | USDC | 6 | Ethereum |
| Tether USD | USDT | 6 | Ethereum |
| Ethereum | ETH | 18 | Ethereum |

## Slippage Tolerance

Slippage tolerance protects users from price volatility:

- **1%**: Low slippage, may fail in volatile markets
- **2%**: Moderate slippage, recommended for most transactions
- **3%**: High slippage, for volatile markets or large amounts

Example:
```typescript
// For $100 payment with 2% slippage
{
  tokenAmount: "100.000000",
  minTokenAmount: "98.000000",  // -2%
  maxTokenAmount: "102.000000"  // +2%
}
```

## Transaction Monitoring

Transactions go through several states:

1. **Pending**: Transaction submitted, waiting for confirmation
2. **Confirming**: Transaction included in block, accumulating confirmations
3. **Confirmed**: 12+ confirmations, payment finalized
4. **Failed**: Transaction reverted or failed

```typescript
// Poll transaction status
const pollStatus = async (paymentId, txHash) => {
  const interval = setInterval(async () => {
    const status = await fetch('/api/v1/payments/crypto/monitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId, txHash }),
    }).then(r => r.json());

    console.log(`Status: ${status.data.status}, Confirmations: ${status.data.confirmations}`);

    if (status.data.status === 'confirmed' || status.data.status === 'failed') {
      clearInterval(interval);
    }
  }, 5000); // Check every 5 seconds
};
```

## Error Handling

```typescript
try {
  const quote = await cryptoPaymentService.getPaymentQuote({
    amountUSD: 100,
    token: 'USDC',
    slippageTolerance: 1,
  });
} catch (error) {
  if (error.message.includes('Slippage tolerance')) {
    // Invalid slippage value
    console.error('Use slippage between 1% and 3%');
  } else if (error.message.includes('exchange rate')) {
    // Oracle connection issue
    console.error('Unable to fetch price, try again');
  } else {
    // Other errors
    console.error('Payment failed:', error.message);
  }
}
```

## Testing

### Unit Tests
```bash
npm test -- crypto-payment.test.ts
```

### Integration Test
```bash
npx ts-node src/scripts/test-crypto-payment-integration.ts
```

### Manual Testing with Testnet

1. Switch to Goerli testnet:
```bash
CHAIN_ID=5
ETHEREUM_RPC_URL=https://eth-goerli.g.alchemy.com/v2/YOUR_API_KEY
```

2. Use testnet token addresses:
```bash
USDC_CONTRACT_ADDRESS=0x07865c6E87B9F70255377e024ace6630C1Eaa37F
```

3. Get testnet tokens from faucets

## Common Issues

### Issue: "Failed to fetch exchange rate"
**Solution**: Check your ETHEREUM_RPC_URL is valid and has credits

### Issue: "Invalid address"
**Solution**: Ensure addresses are valid Ethereum addresses (0x + 40 hex chars)

### Issue: "Transaction failed"
**Solution**: Check user has sufficient token balance and gas

### Issue: "Slippage tolerance error"
**Solution**: Use value between 1 and 3

## Next Steps

1. ✅ Set up environment variables
2. ✅ Test the integration
3. ✅ Integrate into your frontend
4. ✅ Test with testnet
5. ✅ Deploy to production

## Resources

- [Full Documentation](./CRYPTO_PAYMENT_INTEGRATION.md)
- [Chainlink Price Feeds](https://docs.chain.link/data-feeds/price-feeds)
- [ethers.js Documentation](https://docs.ethers.org/)
- [USDC Documentation](https://www.circle.com/en/usdc)

## Support

Need help? Contact us:
- GitHub: [knowton-platform/issues](https://github.com/knowton-platform/issues)
- Email: support@knowton.io
