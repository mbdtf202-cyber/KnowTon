# KnowTon DAO Governance System

## Overview

The KnowTon DAO Governance System enables decentralized decision-making for the platform through a comprehensive governance framework with token-based voting, proposal management, and timelock execution.

## Architecture

### Components

1. **KnowTonToken (KNOW)** - ERC20 governance token with voting capabilities
2. **KnowTonTimelock** - 48-hour timelock for proposal execution
3. **KnowTonGovernance** - Main governance contract with quadratic voting

### Key Features

- ✅ Proposal creation with token staking (5000 KNOW required)
- ✅ Quadratic voting mechanism (voting power = √tokens)
- ✅ Activity-based voting weight boost (up to 50%)
- ✅ 48-hour timelock for execution safety
- ✅ Proposal lifecycle management (create, vote, queue, execute, cancel)
- ✅ Delegation support for voting power
- ✅ Gasless approvals via EIP-2612 permits

## Smart Contracts

### KnowTonToken

**Purpose**: Governance token with voting capabilities

**Key Functions**:
- `mint(address to, uint256 amount)` - Mint new tokens (owner only)
- `delegate(address delegatee)` - Delegate voting power
- `getVotes(address account)` - Get current voting power
- `getPastVotes(address account, uint256 blockNumber)` - Get historical voting power

**Token Details**:
- Name: KnowTon Governance Token
- Symbol: KNOW
- Max Supply: 100,000,000 KNOW
- Decimals: 18

### KnowTonTimelock

**Purpose**: Enforce 48-hour delay before proposal execution

**Key Functions**:
- `schedule()` - Queue a proposal for execution
- `execute()` - Execute a queued proposal after delay
- `cancel()` - Cancel a queued proposal

**Configuration**:
- Minimum Delay: 48 hours (172,800 seconds)
- Roles: PROPOSER, EXECUTOR, CANCELLER, ADMIN

### KnowTonGovernance

**Purpose**: Main governance contract for proposal management and voting

**Key Functions**:
- `propose()` - Create a new proposal (requires staking)
- `castVote()` - Vote on a proposal
- `queue()` - Queue a successful proposal
- `execute()` - Execute a queued proposal
- `cancel()` - Cancel a proposal
- `getVotingWeight()` - Calculate quadratic voting weight

**Voting Parameters**:
- Voting Delay: 1 block
- Voting Period: 50,400 blocks (~1 week)
- Proposal Threshold: 1,000 KNOW
- Quorum: 4% of total supply
- Proposal Stake: 5,000 KNOW

## Governance Process

### 1. Proposal Creation

```solidity
// Approve stake
await token.approve(governanceAddress, proposalStake);

// Create proposal
const targets = [targetContract];
const values = [0];
const calldatas = [encodedFunctionCall];
const description = "Proposal description";

await governance.propose(targets, values, calldatas, description);
```

**Requirements**:
- Proposer must have ≥1,000 KNOW voting power
- Proposer must stake 5,000 KNOW tokens
- Stake is returned after execution or cancellation

### 2. Voting

```solidity
// Vote on proposal
// 0 = Against, 1 = For, 2 = Abstain
await governance.castVote(proposalId, 1);
```

**Voting Weight Calculation**:
```
weight = √(tokens) × (1 + activityMultiplier)
```

Where:
- `tokens` = delegated voting power
- `activityMultiplier` = 0 to 0.5 based on activity score (0-1000)

**Example**:
- User with 100,000 KNOW tokens: √100,000 ≈ 316 base votes
- With max activity (1000): 316 × 1.5 = 474 votes
- Without activity: 316 × 1.0 = 316 votes

### 3. Proposal States

1. **Pending** - Waiting for voting delay to pass
2. **Active** - Voting is open
3. **Succeeded** - Voting passed, ready to queue
4. **Queued** - Waiting for timelock delay
5. **Executed** - Proposal executed successfully
6. **Defeated** - Voting failed
7. **Canceled** - Proposal was canceled
8. **Expired** - Proposal expired without execution

### 4. Execution

```solidity
// Queue the proposal
await governance.queue(targets, values, calldatas, descriptionHash);

// Wait 48 hours...

// Execute the proposal
await governance.execute(targets, values, calldatas, descriptionHash);
```

**Requirements**:
- Proposal must have succeeded (passed quorum and majority)
- Must wait 48 hours after queuing
- Stake is returned to proposer after execution

## Quadratic Voting

### Why Quadratic Voting?

Quadratic voting reduces the influence of large token holders and gives more voice to smaller holders:

- **Linear voting**: 1 token = 1 vote (whales dominate)
- **Quadratic voting**: voting power = √tokens (more balanced)

### Examples

| Tokens | Linear Votes | Quadratic Votes | Difference |
|--------|--------------|-----------------|------------|
| 100 | 100 | 10 | -90% |
| 10,000 | 10,000 | 100 | -99% |
| 1,000,000 | 1,000,000 | 1,000 | -99.9% |

### Activity Boost

Users with high platform activity get up to 50% voting power boost:

```
Activity Score | Boost
0-200         | 0-10%
200-500       | 10-25%
500-800       | 25-40%
800-1000      | 40-50%
```

## Security Features

### 1. Timelock Protection

- 48-hour delay before execution prevents rushed decisions
- Allows community to react to malicious proposals
- Emergency cancellation available

### 2. Proposal Staking

- 5,000 KNOW stake required to create proposals
- Prevents spam and low-quality proposals
- Stake returned after execution/cancellation

### 3. Quorum Requirements

- 4% of total supply must participate
- Ensures sufficient community engagement
- Prevents minority control

### 4. Role-Based Access

- Timelock uses OpenZeppelin's AccessControl
- Separate roles for proposing, executing, and canceling
- Admin role can be renounced for full decentralization

## Integration Guide

### Frontend Integration

```typescript
import { ethers } from 'ethers';
import GovernanceABI from './abis/KnowTonGovernance.json';

// Connect to governance contract
const governance = new ethers.Contract(
  governanceAddress,
  GovernanceABI,
  signer
);

// Create proposal
async function createProposal(
  targets: string[],
  values: bigint[],
  calldatas: string[],
  description: string
) {
  // Approve stake
  await token.approve(governanceAddress, proposalStake);
  
  // Create proposal
  const tx = await governance.propose(
    targets,
    values,
    calldatas,
    description
  );
  
  const receipt = await tx.wait();
  const proposalId = receipt.events[0].args.proposalId;
  
  return proposalId;
}

// Vote on proposal
async function vote(proposalId: bigint, support: number) {
  const tx = await governance.castVote(proposalId, support);
  await tx.wait();
}

// Get voting weight
async function getVotingWeight(address: string) {
  return await governance.getVotingWeight(address);
}
```

### Backend Integration

```typescript
// Listen for governance events
governance.on('ProposalCreated', (
  proposalId,
  proposer,
  targets,
  values,
  signatures,
  calldatas,
  startBlock,
  endBlock,
  description
) => {
  console.log('New proposal created:', proposalId);
  // Store in database, send notifications, etc.
});

governance.on('VoteCast', (
  voter,
  proposalId,
  support,
  weight,
  reason
) => {
  console.log('Vote cast:', { voter, proposalId, support, weight });
  // Update vote counts, send notifications, etc.
});

governance.on('ProposalExecuted', (proposalId) => {
  console.log('Proposal executed:', proposalId);
  // Update proposal status, send notifications, etc.
});
```

## Deployment

### Local Development

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test test/KnowTonGovernance.test.ts

# Deploy to local network
npx hardhat run scripts/deploy-governance.ts --network localhost
```

### Testnet Deployment

```bash
# Deploy to Arbitrum Sepolia
npx hardhat run scripts/deploy-governance.ts --network arbitrumSepolia

# Verify contracts
npx hardhat verify --network arbitrumSepolia <TOKEN_ADDRESS>
npx hardhat verify --network arbitrumSepolia <TIMELOCK_ADDRESS>
npx hardhat verify --network arbitrumSepolia <GOVERNANCE_ADDRESS>
```

### Mainnet Deployment

```bash
# Deploy to Arbitrum mainnet
npx hardhat run scripts/deploy-governance.ts --network arbitrum

# Verify contracts
npx hardhat verify --network arbitrum <TOKEN_ADDRESS>
npx hardhat verify --network arbitrum <TIMELOCK_ADDRESS>
npx hardhat verify --network arbitrum <GOVERNANCE_ADDRESS>
```

## Post-Deployment Setup

### 1. Token Distribution

```typescript
// Distribute tokens to initial holders
await token.batchMint(
  [address1, address2, address3],
  [amount1, amount2, amount3]
);
```

### 2. Delegate Voting Power

Users must delegate to themselves or others:

```typescript
// Self-delegate
await token.delegate(myAddress);

// Delegate to someone else
await token.delegate(delegateAddress);
```

### 3. Renounce Admin Role (Optional)

For full decentralization:

```typescript
const ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();
await timelock.renounceRole(ADMIN_ROLE, deployerAddress);
```

## Governance Examples

### Example 1: Update Platform Fee

```typescript
// Proposal to change platform fee to 10%
const targets = [platformContract];
const values = [0];
const calldatas = [
  platformContract.interface.encodeFunctionData('updateFee', [1000]) // 10%
];
const description = 'Update platform fee to 10%';

await governance.propose(targets, values, calldatas, description);
```

### Example 2: Treasury Allocation

```typescript
// Proposal to allocate 100,000 KNOW from treasury
const targets = [tokenAddress];
const values = [0];
const calldatas = [
  token.interface.encodeFunctionData('transfer', [
    recipientAddress,
    ethers.parseEther('100000')
  ])
];
const description = 'Allocate 100k KNOW for marketing campaign';

await governance.propose(targets, values, calldatas, description);
```

### Example 3: Contract Upgrade

```typescript
// Proposal to upgrade a contract
const targets = [proxyAdmin];
const values = [0];
const calldatas = [
  proxyAdmin.interface.encodeFunctionData('upgrade', [
    proxyAddress,
    newImplementationAddress
  ])
];
const description = 'Upgrade ContentRegistry to v2';

await governance.propose(targets, values, calldatas, description);
```

## Testing

### Run Tests

```bash
npx hardhat test test/KnowTonGovernance.test.ts
```

### Test Coverage

- ✅ Deployment and initialization
- ✅ Proposal creation with staking
- ✅ Voting mechanism
- ✅ Quadratic voting calculations
- ✅ Activity score updates
- ✅ Proposal execution with timelock
- ✅ Stake return after execution
- ✅ Proposal cancellation
- ✅ Access control and permissions

## Gas Optimization

- Uses OpenZeppelin's battle-tested implementations
- Efficient quadratic voting calculation (Babylonian method)
- Batch operations for token distribution
- Minimal storage usage

## Security Considerations

1. **Timelock Delay**: 48-hour delay prevents rushed decisions
2. **Proposal Staking**: Prevents spam and ensures commitment
3. **Quorum Requirements**: Ensures sufficient participation
4. **Quadratic Voting**: Reduces whale influence
5. **Role-Based Access**: Granular permission control
6. **Audited Dependencies**: Uses OpenZeppelin contracts

## Troubleshooting

### Common Issues

**Issue**: "Governor: proposer votes below proposal threshold"
- **Solution**: Ensure proposer has ≥1,000 KNOW voting power and has delegated to themselves

**Issue**: "Governor: stake transfer failed"
- **Solution**: Approve governance contract to spend stake amount before proposing

**Issue**: "TimelockController: operation is not ready"
- **Solution**: Wait 48 hours after queuing before executing

**Issue**: "Governor: proposal not successful"
- **Solution**: Ensure proposal passed quorum and majority vote

## References

- [OpenZeppelin Governor](https://docs.openzeppelin.com/contracts/4.x/governance)
- [EIP-2612: Permit Extension](https://eips.ethereum.org/EIPS/eip-2612)
- [Quadratic Voting](https://en.wikipedia.org/wiki/Quadratic_voting)
- [Timelock Controller](https://docs.openzeppelin.com/contracts/4.x/api/governance#TimelockController)

## Support

For questions or issues:
- GitHub Issues: [knowton/governance](https://github.com/knowton/governance/issues)
- Discord: [KnowTon Community](https://discord.gg/knowton)
- Documentation: [docs.knowton.io](https://docs.knowton.io)
