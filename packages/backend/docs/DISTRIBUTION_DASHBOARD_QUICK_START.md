# Distribution Dashboard - Quick Start Guide

## Overview
The Distribution Dashboard allows creators to view, manage, and execute royalty distributions for their content sales.

## Accessing the Dashboard

1. **Connect Your Wallet**
   - Click "Connect Wallet" in the header
   - Select your preferred wallet (MetaMask, WalletConnect, or Coinbase Wallet)
   - Approve the connection

2. **Navigate to Dashboard**
   - Click "Dashboard" in the navigation menu
   - Or visit: `http://localhost:5173/dashboard`

3. **Select Distributions Tab**
   - Click on the "💰 Distributions" tab

## Dashboard Features

### 1. Statistics Overview

At the top of the dashboard, you'll see three key metrics:

- **Total Revenue**: Your cumulative earnings from all distributions
- **Pending Revenue**: Amount waiting to be distributed
- **Success Rate**: Percentage of successful distributions

### 2. Pending Distributions

This section shows distributions that are waiting to be executed:

- **Individual Execution**: Click "Execute Now" on any pending distribution
- **Batch Processing**: Click "⚡ Process All" to execute all pending distributions at once

**Steps to Execute**:
1. Click "Execute Now" or "Process All"
2. Review the gas estimate in the confirmation modal
3. Click "Confirm" to proceed
4. Sign the transaction in your wallet
5. Wait for confirmation

### 3. Gas Estimate Display

Shows current network conditions:
- **Current Gas Price**: Real-time gas price in Gwei
- **Estimated Cost**: Approximate cost to execute a distribution

💡 **Tip**: Execute distributions when gas prices are low to save on fees!

### 4. Distribution History

View all past distributions with details:

- **Token ID**: The NFT token associated with the distribution
- **Amount**: Total distribution amount
- **Status**: Completed, Pending, or Failed
- **Beneficiaries**: Breakdown of recipients and their shares
- **Transaction Link**: Click to view on Arbiscan

**Navigation**:
- Use "← Previous" and "Next →" buttons to browse pages
- 10 distributions shown per page

## API Usage

### For Developers

#### Get Distribution History
```bash
curl http://localhost:3001/api/royalty-distribution/history/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb?page=1&limit=10
```

#### Get Distribution Statistics
```bash
curl http://localhost:3001/api/royalty-distribution/stats/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

#### Get Gas Estimate
```bash
curl http://localhost:3001/api/royalty-distribution/gas-estimate
```

#### Get Pending Distributions
```bash
curl http://localhost:3001/api/royalty-distribution/pending
```

#### Execute Distribution
```bash
curl -X POST http://localhost:3001/api/royalty-distribution/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tokenId": "123",
    "amount": "1.5"
  }'
```

#### Calculate Distribution (Off-chain)
```bash
curl -X POST http://localhost:3001/api/royalty-distribution/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "tokenId": "123",
    "totalAmount": "1.0",
    "beneficiaries": [
      {"recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", "percentage": 7000},
      {"recipient": "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199", "percentage": 3000}
    ]
  }'
```

## Testing

### Run Backend Tests
```bash
cd packages/backend
npm run ts-node src/scripts/test-distribution-dashboard.ts
```

### Manual Testing Checklist

- [ ] Dashboard loads without errors
- [ ] Statistics display correctly
- [ ] Pending distributions show up
- [ ] Gas estimate updates
- [ ] Individual execution works
- [ ] Batch processing works
- [ ] History pagination works
- [ ] Transaction links open correctly
- [ ] Mobile responsive layout works
- [ ] Error messages display properly

## Common Issues

### Issue: "No pending distributions"
**Solution**: Create a sale transaction to generate a pending distribution.

### Issue: "Failed to execute distribution"
**Possible Causes**:
- Insufficient gas in wallet
- Network congestion
- Invalid token ID
- Smart contract error

**Solution**: Check wallet balance, wait for lower gas prices, or contact support.

### Issue: "Distribution history is empty"
**Solution**: Ensure you're connected with the correct wallet address that has made sales.

### Issue: Gas estimate not showing
**Solution**: Check your RPC connection and ensure the backend can connect to the blockchain.

## Best Practices

1. **Monitor Gas Prices**: Execute distributions during off-peak hours for lower fees
2. **Batch Processing**: Use batch processing for multiple pending distributions to save gas
3. **Regular Checks**: Check the dashboard regularly to avoid accumulating too many pending distributions
4. **Verify Transactions**: Always verify transaction completion on the block explorer
5. **Keep Records**: Export or screenshot important distribution records for your records

## Support

For issues or questions:
- Check the implementation summary: `TASK_1.5.3_IMPLEMENTATION_SUMMARY.md`
- Review the main documentation: `ROYALTY_DISTRIBUTION.md`
- Contact the development team

## Next Steps

After familiarizing yourself with the distribution dashboard:
1. Explore other dashboard tabs (Overview, Content, Analytics)
2. Set up automatic distribution processing (coming soon)
3. Configure distribution notifications (coming soon)
4. Export distribution reports (coming soon)

---

**Last Updated**: November 2, 2025
**Version**: 1.0.0
