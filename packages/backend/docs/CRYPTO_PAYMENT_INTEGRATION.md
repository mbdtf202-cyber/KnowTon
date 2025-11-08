# Crypto Payment Integration

## Overview

The crypto payment system provides support for USDC/USDT stablecoin payments with Chainlink price oracle integration, slippage tolerance handling, and comprehensive transaction monitoring.

## Features

### 1. Stablecoin Support
- **USDC (USD Coin)**: 6 decimals, widely adopted stablecoin
- **USDT (Tether USD)**: 6 decimals, most liquid stablecoin
- **ETH (Ethereum)**: 18 decimals, native cryptocurrency

### 2. Chainlink Price Oracle Integration
- Real-time price feeds for accurate exchange rates
- ETH/USD, USDC/USD, USDT/USD price feeds
- Automatic price updates from decentralized oracles
- High reliability and tamper-proof pricing

### 3. Slippage Tolerance
- Configurable slippage tolerance (1-3%)
- Automatic calculation of min/max token amounts
- Protection against price volatility
- User-friendly slippage settings

### 4. Transaction Monitoring
- Real-time transaction status tracking
- Confirmation counting (12 blocks for finality)
- Automatic payment status updates
- Failed transaction detection

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (User)                         │
│  - Request payment quote                                    │
│  - Initiate crypto payment                                  │
│  - Monitor transaction status                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Backend API (Express)                      │
│  - /api/v1/payments/crypto/quote                           │
│  - /api/v1/payments/crypto/create                          │
│  - /api/v1/payments/crypto/monitor                         │
│  - /api/v1/payments/crypto/verify                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              CryptoPaymentService (ethers.js)               │
│  - Price oracle integration                                 │
│  - Quote generation                                         │
│  - Transaction monitoring                                   │
│  - Token transfer verification                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Blockchain Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Chainlink   │  │  USDC/USDT   │  │   Ethereum   │    │
│  │ Price Feeds  │  │  Contracts   │  │   Network    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### 1. Get Payment Quote

Get a price quote for crypto payment with slippage tolerance.

**Endpoint**: `POST /api/v1/payments/crypto/quote`

**Request Body**:
```json
{
  "amountUSD": 100,
  "token": "USDC",
  "slippageTolerance": 1
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "amountUSD": 100,
    "tokenAmount": "100.000000",
    "tokenSymbol": "USDC",
    "tokenDecimals": 6,
    "exchangeRate": "1.0000",
    "slippageTolerance": 1,
    "minTokenAmount": "99.000000",
    "maxTokenAmount": "101.000000",
    "priceImpact": 0.1,
    "expiresAt": "2025-11-02T12:05:00.000Z"
  }
}
```

### 2. Create Crypto Payment

Create a new crypto payment record.

**Endpoint**: `POST /api/v1/payments/crypto/create`

**Request Body**:
```json
{
  "userId": "user-123",
  "contentId": "content-456",
  "amountUSD": 100,
  "token": "USDC",
  "buyerAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "recipientAddress": "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
  "slippageTolerance": 1,
  "metadata": {
    "orderId": "order-789"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentId": "payment-abc123",
    "quote": {
      "amountUSD": 100,
      "tokenAmount": "100.000000",
      "tokenSymbol": "USDC",
      "exchangeRate": "1.0000",
      "slippageTolerance": 1,
      "minTokenAmount": "99.000000",
      "maxTokenAmount": "101.000000"
    },
    "buyerAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "recipientAddress": "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed"
  }
}
```

### 3. Monitor Transaction

Monitor the status of a blockchain transaction.

**Endpoint**: `POST /api/v1/payments/crypto/monitor`

**Request Body**:
```json
{
  "paymentId": "payment-abc123",
  "txHash": "0x1234567890abcdef..."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "txHash": "0x1234567890abcdef...",
    "status": "confirmed",
    "confirmations": 15,
    "blockNumber": 18500000,
    "gasUsed": "65000",
    "timestamp": "2025-11-02T12:00:00.000Z"
  }
}
```

### 4. Verify Token Transfer

Verify that the correct amount was transferred on-chain.

**Endpoint**: `POST /api/v1/payments/crypto/verify`

**Request Body**:
```json
{
  "txHash": "0x1234567890abcdef...",
  "token": "USDC",
  "expectedAmount": "100.000000",
  "recipientAddress": "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "txHash": "0x1234567890abcdef..."
  }
}
```

### 5. Get Supported Tokens

Get list of supported cryptocurrencies.

**Endpoint**: `GET /api/v1/payments/crypto/tokens`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "symbol": "USDC",
      "name": "USD Coin",
      "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "decimals": 6
    },
    {
      "symbol": "USDT",
      "name": "Tether USD",
      "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      "decimals": 6
    },
    {
      "symbol": "ETH",
      "name": "Ethereum",
      "decimals": 18
    }
  ]
}
```

### 6. Get Token Balance

Get token balance for an address.

**Endpoint**: `GET /api/v1/payments/crypto/balance/:address/:token`

**Response**:
```json
{
  "success": true,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "token": "USDC",
    "balance": "1000.500000"
  }
}
```

### 7. Estimate Gas

Estimate gas cost for a token transfer.

**Endpoint**: `POST /api/v1/payments/crypto/estimate-gas`

**Request Body**:
```json
{
  "token": "USDC",
  "from": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "to": "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
  "amount": "100.000000"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "gasLimit": "65000",
    "gasPrice": "50.0",
    "estimatedCost": "0.00325"
  }
}
```

## Configuration

### Environment Variables

```bash
# Ethereum RPC URL (required)
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-api-key

# Chain ID (1 = Ethereum Mainnet, 5 = Goerli, 11155111 = Sepolia)
CHAIN_ID=1

# Stablecoin Contract Addresses (optional, defaults to mainnet)
USDC_CONTRACT_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USDT_CONTRACT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7

# Chainlink Price Feed Addresses (optional, defaults to mainnet)
CHAINLINK_ETH_USD_FEED=0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
CHAINLINK_USDC_USD_FEED=0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6
CHAINLINK_USDT_USD_FEED=0x3E7d1eAB13ad0104d2750B8863b489D65364e32D
```

## Usage Examples

### Frontend Integration

```typescript
import { useState } from 'react';
import { ethers } from 'ethers';

function CryptoPayment() {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);

  // Step 1: Get payment quote
  const getQuote = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/payments/crypto/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountUSD: 100,
          token: 'USDC',
          slippageTolerance: 1,
        }),
      });
      const data = await response.json();
      setQuote(data.data);
    } catch (error) {
      console.error('Error getting quote:', error);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Create payment and execute transfer
  const executePayment = async () => {
    if (!quote) return;

    try {
      // Create payment record
      const response = await fetch('/api/v1/payments/crypto/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-123',
          contentId: 'content-456',
          amountUSD: 100,
          token: 'USDC',
          buyerAddress: await getCurrentAddress(),
          recipientAddress: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
          slippageTolerance: 1,
        }),
      });
      const { data } = await response.json();

      // Execute blockchain transaction
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // For USDC/USDT
      const tokenContract = new ethers.Contract(
        USDC_ADDRESS,
        ['function transfer(address to, uint256 amount) returns (bool)'],
        signer
      );
      
      const tx = await tokenContract.transfer(
        data.recipientAddress,
        ethers.utils.parseUnits(quote.tokenAmount, 6)
      );

      // Step 3: Monitor transaction
      await monitorTransaction(data.paymentId, tx.hash);
    } catch (error) {
      console.error('Error executing payment:', error);
    }
  };

  // Step 3: Monitor transaction status
  const monitorTransaction = async (paymentId: string, txHash: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/v1/payments/crypto/monitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId, txHash }),
        });
        const { data } = await response.json();

        if (data.status === 'confirmed') {
          clearInterval(interval);
          console.log('Payment confirmed!');
        } else if (data.status === 'failed') {
          clearInterval(interval);
          console.error('Payment failed!');
        }
      } catch (error) {
        console.error('Error monitoring transaction:', error);
      }
    }, 5000); // Check every 5 seconds
  };

  return (
    <div>
      <button onClick={getQuote} disabled={loading}>
        Get Quote
      </button>
      {quote && (
        <div>
          <p>Amount: {quote.tokenAmount} {quote.tokenSymbol}</p>
          <p>Exchange Rate: ${quote.exchangeRate}</p>
          <button onClick={executePayment}>Pay Now</button>
        </div>
      )}
    </div>
  );
}
```

## Security Considerations

### 1. Slippage Protection
- Always enforce slippage tolerance (1-3%)
- Calculate min/max bounds before transaction
- Reject transactions outside tolerance range

### 2. Transaction Verification
- Verify transaction receipt on-chain
- Check transfer amount matches expected
- Validate recipient address
- Confirm transaction status (not reverted)

### 3. Price Oracle Security
- Use Chainlink decentralized oracles
- Check price feed freshness
- Implement circuit breakers for extreme price movements
- Monitor oracle health

### 4. Address Validation
- Always validate Ethereum addresses
- Use checksummed addresses
- Verify contract addresses match expected

## Testing

### Run Unit Tests
```bash
cd packages/backend
npm test -- crypto-payment.test.ts
```

### Run Integration Tests
```bash
cd packages/backend
npm run test:integration -- test-crypto-payment-integration.ts
```

### Manual Testing
```bash
# Test with local environment
cd packages/backend
npx ts-node src/scripts/test-crypto-payment-integration.ts
```

## Troubleshooting

### Common Issues

#### 1. "Failed to fetch exchange rate"
- **Cause**: Chainlink price feed not accessible
- **Solution**: Check ETHEREUM_RPC_URL and price feed addresses

#### 2. "Invalid transaction hash"
- **Cause**: Transaction hash format incorrect
- **Solution**: Ensure hash is 66 characters (0x + 64 hex chars)

#### 3. "Slippage tolerance must be between 1% and 3%"
- **Cause**: Invalid slippage value
- **Solution**: Use value between 1 and 3

#### 4. "Transaction failed on blockchain"
- **Cause**: Insufficient gas, reverted transaction
- **Solution**: Check gas estimation and transaction logs

## Performance Metrics

- **Quote Generation**: < 2 seconds
- **Transaction Monitoring**: 5-second intervals
- **Confirmation Time**: ~3 minutes (12 blocks)
- **API Response Time**: < 500ms

## Future Enhancements

1. **Multi-chain Support**: Add Polygon, Arbitrum, Optimism
2. **More Tokens**: Support DAI, BUSD, other stablecoins
3. **Automatic Retries**: Retry failed transactions with higher gas
4. **Gas Optimization**: Batch multiple payments
5. **Advanced Monitoring**: WebSocket for real-time updates

## Support

For issues or questions:
- GitHub Issues: [knowton-platform/issues](https://github.com/knowton-platform/issues)
- Documentation: [docs.knowton.io](https://docs.knowton.io)
- Email: support@knowton.io
