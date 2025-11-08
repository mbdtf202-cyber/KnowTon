# NFT Fractionalization - Quick Start Guide

## Overview

The FractionalizationVault allows NFT owners to split their NFTs into fungible ERC-20 tokens, enabling fractional ownership and democratic buyout mechanisms.

## Quick Start

### 1. Deploy the Contract

```bash
cd packages/contracts
npx hardhat run scripts/deploy-fractionalization.ts --network localhost
```

### 2. Create a Vault

```typescript
import { ethers } from "hardhat";

// Get contracts
const vault = await ethers.getContractAt("FractionalizationVault", vaultAddress);
const nft = await ethers.getContractAt("CopyrightRegistrySimple", nftAddress);

// Approve NFT transfer
await nft.approve(vaultAddress, tokenId);

// Create vault
const tx = await vault.createVault(
  nftAddress,           // NFT contract address
  tokenId,              // NFT token ID
  ethers.parseEther("1000"),  // Total supply of fractions
  ethers.parseEther("10"),    // Reserve price (10 ETH)
  "My Fractional NFT",  // Token name
  "fNFT"                // Token symbol
);

await tx.wait();
console.log("Vault created!");
```

### 3. Transfer Fractions

```typescript
// Transfer fractions to other users
await vault.transfer(
  recipientAddress,
  ethers.parseEther("100")  // 100 tokens
);
```

### 4. Vote on Redemption

```typescript
// Start voting (any token holder can initiate)
await vault.startRedeemVoting(vaultId);

// Vote (true = support, false = oppose)
await vault.vote(vaultId, true);

// Check voting status
const [endTime, yesVotes, noVotes] = await vault.getVotingInfo(vaultId);
console.log(`Yes: ${yesVotes}, No: ${noVotes}`);
```

### 5. Execute Redemption

```typescript
// After 7 days, if vote passed (>50% yes)
await vault.executeRedeem(vaultId, {
  value: reservePrice  // Must pay reserve price
});

// Token holders can now redeem their fractions for ETH
await vault.redeemFractions(vaultId, tokenAmount);
```

## Key Parameters

| Parameter | Description | Range |
|-----------|-------------|-------|
| Total Supply | Number of fractional tokens | 1,000 - 1,000,000 |
| Reserve Price | Minimum buyout price | > 0 ETH |
| Voting Period | Duration of voting | 7 days (fixed) |
| Quorum | Required yes votes | > 50% of supply |

## Vault States

1. **Inactive (0)**: Vault doesn't exist
2. **Active (1)**: NFT locked, fractions tradeable
3. **RedeemVoting (2)**: Voting in progress
4. **Redeemed (3)**: NFT redeemed, ETH claimable

## Common Operations

### Check Vault Info

```typescript
const [nftContract, tokenId, curator, state, reservePrice, totalSupply] = 
  await vault.getVaultInfo(vaultId);

console.log(`State: ${state}`);
console.log(`Reserve Price: ${ethers.formatEther(reservePrice)} ETH`);
```

### Check Token Balance

```typescript
const balance = await vault.balanceOf(userAddress);
console.log(`Balance: ${ethers.formatEther(balance)} tokens`);
```

### Update Reserve Price (Curator Only)

```typescript
await vault.updateReservePrice(
  vaultId,
  ethers.parseEther("20")  // New price: 20 ETH
);
```

## Testing

Run the comprehensive test suite:

```bash
cd packages/contracts
npm test -- --grep "FractionalizationVault"
```

Expected output:
```
FractionalizationVault
  Vault Creation
    ✔ Should create vault and fractionalize NFT
    ✔ Should reject invalid parameters
  Voting
    ✔ Should start redeem voting
    ✔ Should allow token holders to vote
    ✔ Should prevent double voting
    ✔ Should reject votes after voting period
  Redemption
    ✔ Should execute redeem after successful vote
    ✔ Should reject redeem with insufficient payment
    ✔ Should reject redeem before voting ends
  Reserve Price
    ✔ Should update reserve price

10 passing
```

## Frontend Integration

### React Hook Example

```typescript
import { useContract } from './hooks/useContract';

function FractionalizationUI() {
  const vault = useContract('FractionalizationVault');
  
  const createVault = async (nftAddress, tokenId, supply, price) => {
    const tx = await vault.createVault(
      nftAddress,
      tokenId,
      ethers.parseEther(supply),
      ethers.parseEther(price),
      "Fractional NFT",
      "fNFT"
    );
    await tx.wait();
  };
  
  const vote = async (vaultId, support) => {
    const tx = await vault.vote(vaultId, support);
    await tx.wait();
  };
  
  return (
    <div>
      <button onClick={() => createVault(...)}>
        Create Vault
      </button>
      <button onClick={() => vote(1, true)}>
        Vote Yes
      </button>
    </div>
  );
}
```

## Events

The contract emits the following events:

```solidity
event VaultCreated(uint256 indexed vaultId, address indexed nftContract, 
                   uint256 indexed tokenId, address curator, uint256 totalSupply);

event RedeemVotingStarted(uint256 indexed vaultId, uint256 votingEndTime);

event VoteCast(uint256 indexed vaultId, address indexed voter, 
               bool support, uint256 votes);

event VaultRedeemed(uint256 indexed vaultId, address indexed redeemer);

event ReservePriceUpdated(uint256 indexed vaultId, uint256 newPrice);

event FractionsRedeemed(uint256 indexed vaultId, address indexed holder, 
                        uint256 amount, uint256 payout);
```

## Error Messages

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid NFT contract" | Zero address provided | Provide valid NFT address |
| "Invalid supply" | Supply out of range | Use 1,000 - 1,000,000 |
| "Vault not active" | Wrong state | Check vault state |
| "Already voted" | Double voting attempt | Each address votes once |
| "Voting ended" | Voting period expired | Wait for next voting |
| "Insufficient payment" | Payment < reserve price | Send exact or higher amount |
| "Not curator" | Unauthorized access | Only curator can update |

## Security Best Practices

1. **Always approve NFT transfer before creating vault**
2. **Verify vault state before operations**
3. **Check voting end time before executing redemption**
4. **Ensure sufficient ETH for redemption payment**
5. **Monitor events for vault activity**

## Gas Estimates

Approximate gas costs (at 30 gwei):

| Operation | Gas Used | Cost (ETH) |
|-----------|----------|------------|
| Create Vault | ~300,000 | ~0.009 |
| Start Voting | ~80,000 | ~0.0024 |
| Cast Vote | ~100,000 | ~0.003 |
| Execute Redeem | ~150,000 | ~0.0045 |
| Redeem Fractions | ~80,000 | ~0.0024 |

## Next Steps

1. **TASK-1.9.2**: Integrate with Uniswap V3 for liquidity pools
2. **TASK-1.9.3**: Build fractionalization UI components
3. Add Chainlink price oracle for dynamic pricing
4. Implement governance delegation

## Support

For issues or questions:
- Check the full documentation: `FRACTIONALIZATION_IMPLEMENTATION.md`
- Review test cases: `test/FractionalizationVault.test.ts`
- Contact the development team

## License

MIT License - See LICENSE file for details
