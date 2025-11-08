# IPBond Contract - Quick Start Guide

## Overview

The IPBond contract enables IP asset-backed bonds with a 3-tier structure (Senior, Mezzanine, Junior) that provides different risk/return profiles for investors.

## Contract Address

**Testnet**: TBD (Deploy using deployment scripts)
**Mainnet**: TBD

## Quick Start

### 1. Issue a Bond

```typescript
import { ethers } from "ethers";
import { IPBond } from "./typechain-types";

// Connect to contract
const ipBond = await ethers.getContractAt("IPBond", IPBOND_ADDRESS);

// Issue a bond
const nftContract = "0x..."; // Your NFT contract address
const tokenId = 1;
const totalValue = ethers.parseEther("100"); // 100 ETH
const maturityDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year
const seniorAPY = 500; // 5% (in basis points)
const mezzanineAPY = 1000; // 10%
const juniorAPY = 2000; // 20%

const tx = await ipBond.issueBond(
  nftContract,
  tokenId,
  totalValue,
  maturityDate,
  seniorAPY,
  mezzanineAPY,
  juniorAPY
);

const receipt = await tx.wait();
console.log("Bond issued with ID:", receipt.events[0].args.bondId);
```

### 2. Invest in a Bond

```typescript
// Invest in Senior tranche (index 0)
const bondId = 1;
const investAmount = ethers.parseEther("10");

const tx = await ipBond.invest(bondId, 0, { value: investAmount });
await tx.wait();

console.log("Investment successful!");
```

### 3. Distribute Revenue

```typescript
// Distribute revenue to bond holders
const revenue = ethers.parseEther("5");

const tx = await ipBond.distributeRevenue(bondId, { value: revenue });
await tx.wait();

console.log("Revenue distributed!");
```

### 4. Redeem Investment

```typescript
// After maturity, mark bond as matured
await ipBond.markMatured(bondId);

// Redeem investment with yield
const tx = await ipBond.redeem(bondId, 0); // Redeem from Senior tranche
await tx.wait();

console.log("Investment redeemed!");
```

## Tranche Structure

| Tranche | Allocation | Risk Level | Typical APY | Priority |
|---------|-----------|------------|-------------|----------|
| Senior | 50% | Low | 5-8% | Highest |
| Mezzanine | 33% | Medium | 10-12% | Medium |
| Junior | 17% | High | 15-20% | Lowest |

## Key Functions

### For Issuers

```typescript
// Issue a new bond
issueBond(nftContract, tokenId, totalValue, maturityDate, seniorAPY, mezzanineAPY, juniorAPY)

// Distribute revenue
distributeRevenue(bondId) payable

// Mark bond as matured
markMatured(bondId)

// Mark bond as defaulted
markDefaulted(bondId)
```

### For Investors

```typescript
// Invest in a tranche
invest(bondId, trancheIndex) payable

// Redeem investment
redeem(bondId, trancheIndex)

// Check investment amount
getInvestment(bondId, trancheIndex, investor)

// Calculate current yield
calculateCurrentYield(bondId, trancheIndex, investor)
```

### Query Functions

```typescript
// Get bond information
getBondInfo(bondId)

// Get tranche information
getTrancheInfo(bondId, trancheIndex)
```

## Events

```typescript
// Listen for bond issuance
ipBond.on("BondIssued", (bondId, issuer, nftContract, tokenId, totalValue, maturityDate) => {
  console.log(`Bond ${bondId} issued by ${issuer}`);
});

// Listen for investments
ipBond.on("Investment", (bondId, trancheIndex, investor, amount) => {
  console.log(`${investor} invested ${amount} in tranche ${trancheIndex}`);
});

// Listen for revenue distribution
ipBond.on("RevenueDistributed", (bondId, amount) => {
  console.log(`Revenue ${amount} distributed to bond ${bondId}`);
});

// Listen for redemptions
ipBond.on("BondRedeemed", (bondId, trancheIndex, investor, principal, yield) => {
  console.log(`${investor} redeemed ${principal} + ${yield} yield`);
});
```

## Example: Complete Bond Lifecycle

```typescript
import { ethers } from "ethers";

async function bondLifecycle() {
  const ipBond = await ethers.getContractAt("IPBond", IPBOND_ADDRESS);
  const [issuer, investor1, investor2, investor3] = await ethers.getSigners();

  // 1. Issue bond
  console.log("1. Issuing bond...");
  const tx1 = await ipBond.connect(issuer).issueBond(
    "0x1234567890123456789012345678901234567890",
    1,
    ethers.parseEther("100"),
    Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
    500,  // 5% Senior
    1000, // 10% Mezzanine
    2000  // 20% Junior
  );
  const receipt1 = await tx1.wait();
  const bondId = 1;
  console.log("✓ Bond issued:", bondId);

  // 2. Investors invest in different tranches
  console.log("\n2. Investors investing...");
  await ipBond.connect(investor1).invest(bondId, 0, { value: ethers.parseEther("20") });
  console.log("✓ Investor1 invested 20 ETH in Senior");
  
  await ipBond.connect(investor2).invest(bondId, 1, { value: ethers.parseEther("15") });
  console.log("✓ Investor2 invested 15 ETH in Mezzanine");
  
  await ipBond.connect(investor3).invest(bondId, 2, { value: ethers.parseEther("10") });
  console.log("✓ Investor3 invested 10 ETH in Junior");

  // 3. Distribute revenue over time
  console.log("\n3. Distributing revenue...");
  await ipBond.connect(issuer).distributeRevenue(bondId, { value: ethers.parseEther("5") });
  console.log("✓ Distributed 5 ETH revenue");

  // 4. Check yields
  console.log("\n4. Checking yields...");
  const yield1 = await ipBond.calculateCurrentYield(bondId, 0, investor1.address);
  const yield2 = await ipBond.calculateCurrentYield(bondId, 1, investor2.address);
  const yield3 = await ipBond.calculateCurrentYield(bondId, 2, investor3.address);
  console.log("Senior yield:", ethers.formatEther(yield1), "ETH");
  console.log("Mezzanine yield:", ethers.formatEther(yield2), "ETH");
  console.log("Junior yield:", ethers.formatEther(yield3), "ETH");

  // 5. Fast forward to maturity
  console.log("\n5. Fast forwarding to maturity...");
  await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
  await ethers.provider.send("evm_mine", []);

  // 6. Mark as matured
  await ipBond.connect(issuer).markMatured(bondId);
  console.log("✓ Bond marked as matured");

  // 7. Investors redeem
  console.log("\n6. Investors redeeming...");
  await ipBond.connect(investor1).redeem(bondId, 0);
  console.log("✓ Investor1 redeemed from Senior");
  
  await ipBond.connect(investor2).redeem(bondId, 1);
  console.log("✓ Investor2 redeemed from Mezzanine");
  
  await ipBond.connect(investor3).redeem(bondId, 2);
  console.log("✓ Investor3 redeemed from Junior");

  console.log("\n✅ Bond lifecycle complete!");
}

bondLifecycle().catch(console.error);
```

## Security Considerations

1. **Access Control**: Only addresses with ISSUER_ROLE can issue bonds
2. **Reentrancy Protection**: All state-changing functions are protected
3. **Pausable**: Admin can pause contract in emergencies
4. **Input Validation**: All parameters are validated
5. **Maturity Checks**: Redemption only allowed after maturity

## Best Practices

1. **Risk Assessment**: Always assess IP asset value before issuing bonds
2. **Diversification**: Investors should diversify across tranches
3. **Revenue Monitoring**: Track revenue distribution regularly
4. **Maturity Planning**: Plan for redemption at maturity
5. **Emergency Procedures**: Have procedures for default scenarios

## Testing

Run the comprehensive test suite:

```bash
cd packages/contracts
npm test -- test/IPBondEnhanced.test.ts
```

## Support

For issues or questions:
- GitHub Issues: [KnowTon Repository]
- Documentation: [Full Documentation]
- Discord: [Community Discord]

## License

MIT License - See LICENSE file for details
