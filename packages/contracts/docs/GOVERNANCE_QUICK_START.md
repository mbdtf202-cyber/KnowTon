# KnowTon Governance - Quick Start Guide

## Overview

This guide will help you quickly get started with the KnowTon DAO Governance system.

## Prerequisites

- Node.js v18+
- Hardhat
- MetaMask or similar Web3 wallet
- KNOW tokens (governance token)

## Quick Setup

### 1. Install Dependencies

```bash
cd packages/contracts
npm install
```

### 2. Compile Contracts

```bash
npx hardhat compile
```

### 3. Run Tests

```bash
npx hardhat test test/KnowTonGovernance.test.ts
```

### 4. Deploy Locally

```bash
# Start local node
npx hardhat node

# In another terminal, deploy
npx hardhat run scripts/deploy-governance.ts --network localhost
```

## Using the Governance System

### Step 1: Get KNOW Tokens

You need KNOW tokens to participate in governance:

```typescript
// Request tokens from faucet or purchase
const token = await ethers.getContractAt('KnowTonToken', tokenAddress);
```

### Step 2: Delegate Voting Power

Before you can vote, delegate voting power to yourself:

```typescript
// Self-delegate
await token.delegate(myAddress);

// Check your voting power
const votes = await token.getVotes(myAddress);
console.log('Voting power:', ethers.formatEther(votes));
```

### Step 3: Create a Proposal

To create a proposal, you need:
- At least 1,000 KNOW voting power
- 5,000 KNOW to stake

```typescript
// Approve stake
await token.approve(governanceAddress, ethers.parseEther('5000'));

// Create proposal
const targets = [targetContract];
const values = [0];
const calldatas = [
  targetContract.interface.encodeFunctionData('functionName', [args])
];
const description = 'Proposal: Do something important';

const tx = await governance.propose(targets, values, calldatas, description);
const receipt = await tx.wait();

// Get proposal ID from event
const proposalId = receipt.events[0].args.proposalId;
console.log('Proposal created:', proposalId);
```

### Step 4: Vote on Proposal

Wait for voting delay (1 block), then vote:

```typescript
// Vote options: 0 = Against, 1 = For, 2 = Abstain
await governance.castVote(proposalId, 1); // Vote "For"

// Check proposal status
const state = await governance.state(proposalId);
console.log('Proposal state:', state);
```

### Step 5: Queue Proposal

If the proposal passes, queue it for execution:

```typescript
await governance.queue(targets, values, calldatas, descriptionHash);
```

### Step 6: Execute Proposal

After 48 hours, execute the proposal:

```typescript
await governance.execute(targets, values, calldatas, descriptionHash);
```

## Common Operations

### Check Voting Weight

```typescript
const weight = await governance.getVotingWeight(address);
console.log('Quadratic voting weight:', ethers.formatEther(weight));
```

### Get Proposal Details

```typescript
const proposal = await governance.proposals(proposalId);
console.log('Proposer:', proposal.proposer);
console.log('Votes For:', proposal.forVotes);
console.log('Votes Against:', proposal.againstVotes);
```

### Check Activity Score

```typescript
const score = await governance.activityScore(address);
console.log('Activity score:', score);
```

## Example Proposals

### 1. Transfer Tokens

```typescript
const targets = [tokenAddress];
const values = [0];
const calldatas = [
  token.interface.encodeFunctionData('transfer', [
    recipientAddress,
    ethers.parseEther('1000')
  ])
];
const description = 'Transfer 1000 KNOW to community fund';
```

### 2. Update Configuration

```typescript
const targets = [configContract];
const values = [0];
const calldatas = [
  configContract.interface.encodeFunctionData('updateParameter', [
    'platformFee',
    1000 // 10%
  ])
];
const description = 'Update platform fee to 10%';
```

### 3. Grant Role

```typescript
const targets = [accessControl];
const values = [0];
const calldatas = [
  accessControl.interface.encodeFunctionData('grantRole', [
    MODERATOR_ROLE,
    moderatorAddress
  ])
];
const description = 'Grant moderator role to new team member';
```

## Voting Power Calculation

Your voting power is calculated using quadratic voting:

```
Base Weight = √(KNOW tokens)
Activity Boost = 0% to 50% based on activity score
Final Weight = Base Weight × (1 + Activity Boost)
```

### Examples

| KNOW Tokens | Base Weight | Activity Score | Boost | Final Weight |
|-------------|-------------|----------------|-------|--------------|
| 10,000 | 100 | 0 | 0% | 100 |
| 10,000 | 100 | 500 | 25% | 125 |
| 10,000 | 100 | 1000 | 50% | 150 |
| 100,000 | 316 | 1000 | 50% | 474 |

## Timeline

```
Proposal Created
    ↓
[1 block delay]
    ↓
Voting Opens
    ↓
[~1 week voting period]
    ↓
Voting Closes
    ↓
Queue Proposal (if passed)
    ↓
[48 hour timelock]
    ↓
Execute Proposal
```

## Testing Locally

### 1. Start Local Network

```bash
npx hardhat node
```

### 2. Deploy Contracts

```bash
npx hardhat run scripts/deploy-governance.ts --network localhost
```

### 3. Interact with Contracts

```bash
npx hardhat console --network localhost
```

```javascript
// Get contracts
const token = await ethers.getContractAt('KnowTonToken', TOKEN_ADDRESS);
const governance = await ethers.getContractAt('KnowTonGovernance', GOVERNANCE_ADDRESS);

// Delegate to self
await token.delegate(await ethers.provider.getSigner().getAddress());

// Create proposal
const targets = [token.address];
const values = [0];
const calldatas = [token.interface.encodeFunctionData('transfer', [ADDRESS, AMOUNT])];
const description = 'Test proposal';

await token.approve(governance.address, ethers.parseEther('5000'));
await governance.propose(targets, values, calldatas, description);
```

## Troubleshooting

### "Proposer votes below threshold"

**Problem**: You don't have enough voting power.

**Solution**: 
1. Get more KNOW tokens
2. Delegate to yourself: `await token.delegate(myAddress)`
3. Wait 1 block for delegation to take effect

### "Stake transfer failed"

**Problem**: Governance contract not approved to spend your tokens.

**Solution**: 
```typescript
await token.approve(governanceAddress, ethers.parseEther('5000'));
```

### "Proposal not active"

**Problem**: Trying to vote before voting period starts.

**Solution**: Wait for voting delay (1 block) after proposal creation.

### "Operation is not ready"

**Problem**: Trying to execute before timelock delay.

**Solution**: Wait 48 hours after queuing the proposal.

## Best Practices

1. **Test Proposals**: Always test on testnet first
2. **Clear Descriptions**: Write detailed proposal descriptions
3. **Community Discussion**: Discuss proposals in forum before creating
4. **Reasonable Timelines**: Allow sufficient time for community review
5. **Emergency Plans**: Have cancellation procedures ready
6. **Documentation**: Document all governance decisions

## Resources

- [Full Documentation](./GOVERNANCE_SYSTEM.md)
- [Smart Contracts](../contracts/)
- [Tests](../test/KnowTonGovernance.test.ts)
- [Deployment Script](../scripts/deploy-governance.ts)

## Next Steps

1. ✅ Deploy governance contracts
2. ✅ Distribute KNOW tokens to community
3. ✅ Set up governance forum/discussion platform
4. ✅ Create first proposal
5. ✅ Educate community on voting process
6. ✅ Monitor and iterate based on feedback

## Support

Need help? Reach out:
- GitHub: [github.com/knowton/governance](https://github.com/knowton/governance)
- Discord: [discord.gg/knowton](https://discord.gg/knowton)
- Docs: [docs.knowton.io](https://docs.knowton.io)
