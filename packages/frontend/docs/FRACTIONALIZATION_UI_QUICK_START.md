# Fractionalization UI - Quick Start Guide

## Overview
The Fractionalization UI allows NFT owners to split their NFTs into tradeable fractional tokens (ERC-20) with automatic Uniswap V3 liquidity pool creation.

## Accessing the Fractionalization Page

### From NFT Details Page
1. Navigate to any NFT you own
2. Click the **"Fractionalize NFT"** button (purple button, only visible to owners)
3. You'll be redirected to `/fractionalize/:tokenId`

### Direct URL
Navigate to: `https://your-domain.com/fractionalize/:tokenId`

## Step-by-Step Guide

### 1. Connect Your Wallet
- Ensure your wallet is connected
- You must be the owner of the NFT to fractionalize it

### 2. Fill Out the Fractionalization Form

#### Token Name
- Enter a descriptive name for your fractional token
- Example: "Fractional Art Token"

#### Token Symbol
- Enter a short symbol (max 10 characters)
- Example: "FART"
- Will be automatically converted to uppercase

#### Total Supply
- Choose between 1,000 and 1,000,000 tokens
- Default: 10,000
- This determines how many fractional tokens will be created

#### Reserve Price (ETH)
- Set the minimum price for buyout redemption
- This is the total price someone must pay to redeem the NFT
- Example: 1.0 ETH

#### Initial Liquidity (ETH)
- Amount of ETH to add to the Uniswap liquidity pool
- This enables immediate trading
- Example: 0.5 ETH

### 3. Submit and Confirm

1. Click **"Fractionalize NFT"**
2. **Sign the transaction** in your wallet
3. Wait for confirmation (shows progress):
   - Preparing fractionalization
   - Signing transaction
   - Confirming transaction
   - Creating liquidity pool
   - Complete!

### 4. View Vault Information

After successful fractionalization, you'll see:
- **Vault ID**: Unique identifier for your vault
- **Token Information**: Name and symbol
- **Fractional Token Address**: ERC-20 contract address (with copy button)
- **Pool Address**: Uniswap V3 pool address (with copy button)
- **Transaction Hash**: Link to view on block explorer

## Using the Tabs

### Distribution Tab
View how fractional tokens are distributed among holders:
- **Summary Stats**: Total holders, top 10 holdings, total supply
- **Visual Chart**: Top 10 holders with progress bars
- **Full Table**: All holders with sorting options
  - Sort by balance or percentage
  - Click addresses to view profiles
  - Copy addresses to clipboard

### Liquidity Pool Tab
Monitor and manage the Uniswap V3 liquidity pool:
- **Key Metrics**:
  - Current price per token
  - Total liquidity (TVL)
  - 24h trading volume
  - Fee tier
- **Pool Composition**: ETH and token balances
- **Add Liquidity**: Form to add more liquidity
- **Recent Activity**: Latest swaps and transactions

### Trade Tab
Swap between ETH and fractional tokens:
- **Swap Interface**: Built-in Uniswap integration
- **Slippage Settings**: Adjust tolerance (0.1%, 0.5%, 1.0%, or custom)
- **Price Impact**: Real-time calculation
- **Minimum Received**: Slippage protection
- **Pool Stats**: Live liquidity and volume data

## Key Features

### Real-Time Updates
- Pool stats refresh every 30 seconds
- Transaction status updates in real-time
- Live price and liquidity data

### Copy & Share
- Copy token addresses with one click
- Copy holder addresses
- Share pool address with traders

### Block Explorer Integration
- View transactions on Arbiscan
- Verify smart contract interactions
- Track transaction history

### Responsive Design
- Works on desktop, tablet, and mobile
- Optimized for all screen sizes
- Touch-friendly interface

## Important Notes

### What Happens When You Fractionalize?
1. Your NFT is locked in a vault contract
2. Fractional ERC-20 tokens are minted to your wallet
3. A Uniswap V3 liquidity pool is created
4. Token holders can vote to redeem the NFT

### Redemption Process
- Token holders can vote on redemption proposals
- Requires >50% of tokens to vote "yes"
- Redeemer must pay the reserve price
- After redemption, token holders can claim their share of ETH

### Risks
- **Impermanent Loss**: Providing liquidity involves price risk
- **Voting Power**: More tokens = more voting power
- **Reserve Price**: Set carefully - this is the buyout price

## Troubleshooting

### "Connect Wallet First"
- Make sure your wallet is connected
- Try refreshing the page

### "Invalid NFT Token ID"
- Check that the token ID is correct
- Ensure the NFT exists

### Transaction Failed
- Check you have enough ETH for gas
- Ensure you own the NFT
- Try increasing gas limit

### Pool Not Showing
- Wait for transaction confirmation
- Refresh the page
- Check the pool address on Arbiscan

## Example Workflow

1. **Navigate** to your NFT details page
2. **Click** "Fractionalize NFT"
3. **Fill form**:
   - Name: "My Artwork Fractions"
   - Symbol: "MYART"
   - Supply: 10,000
   - Reserve: 1.0 ETH
   - Liquidity: 0.5 ETH
4. **Submit** and sign transaction
5. **Wait** for confirmation (~30 seconds)
6. **View** vault info and copy addresses
7. **Switch** to Distribution tab to see holders
8. **Switch** to Pool tab to monitor liquidity
9. **Switch** to Trade tab to swap tokens

## API Endpoints Used

- `POST /api/v1/fractional/create` - Create vault
- `POST /api/v1/fractional/pool` - Create liquidity pool
- `GET /api/v1/fractional/vault/:vaultId` - Get vault info
- `GET /api/v1/uniswap/pools/:vaultId` - Get pool info
- `POST /api/v1/uniswap/swap` - Execute swap

## Smart Contracts

- **FractionalizationVault**: Manages NFT locking and token minting
- **UniswapV3PoolManager**: Creates and manages liquidity pools
- **ChainlinkOracleAdapter**: Provides price feeds

## Support

For issues or questions:
1. Check the info boxes on each tab
2. Review transaction on block explorer
3. Contact support with vault ID and transaction hash

## Next Steps

After fractionalization:
1. **Share** the token address with potential buyers
2. **Monitor** the distribution and pool stats
3. **Add liquidity** to improve trading
4. **Trade** your fractional tokens
5. **Participate** in redemption votes (when proposed)

---

**Happy Fractionalizing! 🎨✨**
