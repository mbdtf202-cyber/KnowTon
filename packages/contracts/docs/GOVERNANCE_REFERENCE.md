# KnowTon Governance - Quick Reference

## Contract Addresses (After Deployment)

```
KnowTonToken:      [TO BE DEPLOYED]
KnowTonTimelock:   [TO BE DEPLOYED]
KnowTonGovernance: [TO BE DEPLOYED]
```

## Key Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Proposal Threshold | 1,000 KNOW | Min tokens to create proposal |
| Proposal Stake | 5,000 KNOW | Tokens staked when creating proposal |
| Voting Delay | 1 block | Delay before voting starts |
| Voting Period | 50,400 blocks | ~1 week voting duration |
| Quorum | 4% | Min participation required |
| Timelock Delay | 48 hours | Delay before execution |
| Max Supply | 100M KNOW | Maximum token supply |

## Quick Commands

### Deploy
```bash
npx hardhat run scripts/deploy-governance.ts --network localhost
```

### Test
```bash
npx hardhat test test/KnowTonGovernance.test.ts
```

### Verify
```bash
npx hardhat verify --network arbitrumSepolia <ADDRESS>
```

## Common Operations

### Create Proposal
```typescript
// 1. Approve stake
await token.approve(governance.address, ethers.parseEther('5000'));

// 2. Create proposal
const tx = await governance.propose(
  [targetAddress],
  [0],
  [calldata],
  "Proposal description"
);
```

### Vote
```typescript
// 0 = Against, 1 = For, 2 = Abstain
await governance.castVote(proposalId, 1);
```

### Execute
```typescript
// 1. Queue
await governance.queue(proposalId);

// 2. Wait 48 hours

// 3. Execute
await governance.execute(proposalId);
```

## Voting Weight Formula

```
Base Weight = √(KNOW tokens)
Activity Boost = (activity_score / 1000) × 50%
Final Weight = Base Weight × (1 + Activity Boost)
```

## Proposal States

1. **Pending** - Waiting for voting delay
2. **Active** - Voting in progress
3. **Succeeded** - Passed, ready to queue
4. **Defeated** - Failed to pass
5. **Queued** - Waiting for timelock
6. **Executed** - Successfully executed
7. **Canceled** - Canceled by proposer
8. **Expired** - Timelock expired

## Events

```solidity
ProposalCreated(proposalId, proposer, ...)
VoteCast(voter, proposalId, support, weight, reason)
ProposalQueued(proposalId, eta)
ProposalExecuted(proposalId)
ProposalCanceled(proposalId)
ProposalStaked(proposalId, proposer, amount)
ProposalStakeReturned(proposalId, proposer, amount)
ActivityScoreUpdated(user, newScore)
```

## Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Below threshold" | Not enough voting power | Get more KNOW tokens |
| "Stake failed" | Insufficient approval | Approve governance contract |
| "Not active" | Wrong proposal state | Wait for voting to start |
| "Already voted" | Duplicate vote | Can only vote once |
| "Not succeeded" | Proposal didn't pass | Proposal must pass to queue |
| "Timelock not met" | Too early to execute | Wait 48 hours after queuing |

## Gas Estimates

| Operation | Estimated Gas | Cost @ 0.1 gwei |
|-----------|---------------|-----------------|
| Deploy Token | ~2,500,000 | ~$0.25 |
| Deploy Timelock | ~1,800,000 | ~$0.18 |
| Deploy Governance | ~3,500,000 | ~$0.35 |
| Create Proposal | ~250,000 | ~$0.025 |
| Cast Vote | ~100,000 | ~$0.01 |
| Queue Proposal | ~150,000 | ~$0.015 |
| Execute Proposal | ~200,000+ | ~$0.02+ |

## Security Checklist

- [ ] Timelock delay set to 48 hours
- [ ] Proposal stake amount configured
- [ ] Quorum percentage set correctly
- [ ] Token max supply enforced
- [ ] Roles configured in timelock
- [ ] Admin role renounced (optional)
- [ ] Contracts verified on block explorer
- [ ] Emergency procedures documented

## Support

- Documentation: `docs/GOVERNANCE_SYSTEM.md`
- Quick Start: `docs/GOVERNANCE_QUICK_START.md`
- Tests: `test/KnowTonGovernance.test.ts`
- Deployment: `scripts/deploy-governance.ts`
