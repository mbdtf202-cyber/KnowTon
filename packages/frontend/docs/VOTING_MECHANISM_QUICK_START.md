# Voting Mechanism - Quick Start Guide

## Overview
This guide helps you quickly understand and use the voting mechanism features in the KnowTon DAO governance system.

## Features

### 1. Voting UI
Cast votes on active proposals with a simple, intuitive interface.

### 2. Vote Delegation
Delegate your voting power to trusted community members who can vote on your behalf.

### 3. Voting Power Calculator
Understand how your voting power is calculated based on token holdings and activity.

## Quick Start

### Viewing Your Voting Power

1. Navigate to the Governance page
2. Your total voting power is displayed in the blue card at the top
3. Click the "Calculator" button to see detailed breakdown

### Understanding Voting Power Calculation

Your voting power is calculated using:

```
Base Power = √(Token Balance)
Activity Bonus = (Activity Score / 1000) × 50%
Total Voting Power = Base Power × (1 + Activity Bonus)
```

**Example**:
- Token Balance: 100,000 KNOWN
- Base Power: √100,000 = 316.23
- Activity Score: 750
- Activity Bonus: (750/1000) × 50% = 37.5%
- Total Voting Power: 316.23 × 1.375 = 434.82

### Casting a Vote

1. Navigate to Governance page
2. Select a proposal from the list
3. Review proposal details
4. Choose your vote: For, Against, or Abstain
5. Click "Submit Vote"
6. Confirm transaction in your wallet
7. Wait for confirmation

### Delegating Your Votes

**Why Delegate?**
- Let experienced members vote on your behalf
- Maintain voting power when you're busy
- Support trusted delegates

**How to Delegate**:

1. Go to Governance page
2. Click "Delegate" button in the voting power card
3. Click "Delegate Votes"
4. Enter the delegatee's Ethereum address (0x...)
5. Click "Confirm Delegation"
6. Sign the transaction in your wallet
7. Wait for confirmation

**Important Notes**:
- You retain token ownership
- You can undelegate at any time
- Delegatee votes with your combined power
- You cannot vote while delegation is active

### Undelegating Your Votes

1. Go to Governance page
2. Click "Delegate" button
3. View your current delegation
4. Click "Undelegate"
5. Confirm transaction
6. Your voting power returns to you

## Voting Power Components

### 1. Token Balance
The number of KNOWN tokens you hold in your wallet.

### 2. Quadratic Weight
Square root of your token balance. This prevents whales from dominating governance.

**Why Quadratic?**
- 100 tokens = 10 voting power
- 10,000 tokens = 100 voting power (not 1000)
- Encourages broader participation

### 3. Activity Score
Measures your participation in governance:
- Creating proposals: +50 points
- Voting on proposals: +10 points
- Commenting on proposals: +5 points
- Maximum score: 1000 points

### 4. Activity Multiplier
Bonus percentage based on activity score:
- 0-200 points: 0-10% bonus
- 200-500 points: 10-25% bonus
- 500-800 points: 25-40% bonus
- 800-1000 points: 40-50% bonus

## Tips for Maximizing Voting Power

### Increase Token Holdings
- Acquire more KNOWN tokens
- Stake tokens for governance participation

### Boost Activity Score
- Vote on every proposal
- Create quality proposals
- Engage in discussions
- Participate consistently

### Strategic Delegation
- Delegate to active, trusted members
- Review delegate voting history
- Undelegate if delegate becomes inactive

## Common Scenarios

### Scenario 1: New User
**Situation**: Just joined, have 1,000 tokens, no activity

**Voting Power**:
- Base: √1,000 = 31.62
- Activity: 0 (0% bonus)
- Total: 31.62

**Recommendation**: Start voting and participating to build activity score

### Scenario 2: Active Participant
**Situation**: 10,000 tokens, activity score 600

**Voting Power**:
- Base: √10,000 = 100
- Activity: 600 (30% bonus)
- Total: 100 × 1.30 = 130

**Recommendation**: Continue active participation to reach max bonus

### Scenario 3: Whale with Low Activity
**Situation**: 1,000,000 tokens, activity score 100

**Voting Power**:
- Base: √1,000,000 = 1,000
- Activity: 100 (5% bonus)
- Total: 1,000 × 1.05 = 1,050

**Recommendation**: Increase participation or delegate to active member

### Scenario 4: Delegated Votes
**Situation**: 5,000 tokens, delegated to trusted member

**Your Voting Power**: 0 (delegated)
**Delegatee's Power**: Their power + your power

**Recommendation**: Monitor delegatee's voting behavior

## Troubleshooting

### Cannot Vote
**Problem**: Vote button is disabled

**Solutions**:
- Check if proposal is active
- Ensure you have voting power > 0
- Verify you haven't already voted
- Check if votes are delegated

### Delegation Failed
**Problem**: Delegation transaction failed

**Solutions**:
- Verify delegatee address is valid (0x + 40 hex chars)
- Check wallet has enough gas
- Ensure you're not already delegated
- Try again with higher gas limit

### Voting Power is Zero
**Problem**: Calculator shows 0 voting power

**Solutions**:
- Acquire KNOWN tokens
- Check token balance in wallet
- Verify you're on correct network
- Refresh the page

### Calculator Not Loading
**Problem**: Voting power breakdown not displaying

**Solutions**:
- Click "Refresh" button
- Check network connection
- Reconnect wallet
- Clear browser cache

## Best Practices

### For Voters
1. **Research Proposals**: Read full proposal before voting
2. **Participate Regularly**: Build activity score over time
3. **Engage in Discussions**: Share your perspective
4. **Vote Thoughtfully**: Consider long-term platform impact

### For Delegates
1. **Be Transparent**: Share voting rationale
2. **Stay Active**: Vote on all proposals
3. **Communicate**: Update delegators on decisions
4. **Build Trust**: Maintain consistent voting record

### For Token Holders
1. **Diversify**: Don't put all tokens in one wallet
2. **Secure Wallet**: Use hardware wallet for large holdings
3. **Monitor Activity**: Track your activity score
4. **Review Delegation**: Periodically check delegate performance

## API Integration

### Get Voting Power
```javascript
const response = await fetch(`/api/v1/governance/voting-power/${address}`)
const data = await response.json()
console.log(data.votingPower)
```

### Check Delegation Status
```javascript
const response = await fetch(`/api/v1/governance/delegation/${address}`)
const data = await response.json()
console.log(data.isDelegated, data.delegatee)
```

### Delegate Votes
```javascript
const response = await fetch('/api/v1/governance/delegate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ delegatee: '0x...' })
})
```

## Smart Contract Interaction

### Get Voting Weight
```solidity
uint256 weight = governance.getVotingWeight(address);
```

### Delegate Votes
```solidity
token.delegate(delegatee);
```

### Cast Vote
```solidity
governance.castVote(proposalId, support);
```

## Security Tips

### Protect Your Wallet
- Never share private keys
- Use hardware wallet for large holdings
- Enable 2FA where possible
- Verify transaction details before signing

### Verify Addresses
- Double-check delegatee address
- Use ENS names when available
- Verify on block explorer
- Start with small test delegation

### Monitor Activity
- Review transaction history
- Check delegation status regularly
- Monitor delegatee voting behavior
- Set up alerts for important votes

## Support

### Need Help?
- Discord: [KnowTon Community](https://discord.gg/knowton)
- Forum: [governance.knowton.io](https://governance.knowton.io)
- Docs: [docs.knowton.io/governance](https://docs.knowton.io/governance)
- Email: governance@knowton.io

### Report Issues
- GitHub: [github.com/knowton/platform/issues](https://github.com/knowton/platform/issues)
- Bug Bounty: [knowton.io/security](https://knowton.io/security)

## Additional Resources

### Documentation
- [Governance System Overview](./GOVERNANCE_SYSTEM.md)
- [Proposal Creation Guide](./GOVERNANCE_PROPOSAL_QUICK_START.md)
- [Smart Contract Reference](../../contracts/docs/GOVERNANCE_REFERENCE.md)

### Tutorials
- Video: "How to Vote in KnowTon DAO"
- Video: "Understanding Voting Power"
- Video: "Delegating Your Votes"

### Community
- Governance Forum
- Weekly Governance Calls
- Delegate Registry
- Voting Analytics Dashboard

## Changelog

### v2.0.0 (November 2025)
- ✅ Implemented voting UI
- ✅ Added vote delegation
- ✅ Created voting power calculator
- ✅ Added quadratic voting
- ✅ Implemented activity-based rewards

## Next Steps

1. **Connect Wallet**: Connect your wallet to the platform
2. **Acquire Tokens**: Get KNOWN tokens for voting
3. **Explore Proposals**: Browse active proposals
4. **Cast First Vote**: Participate in governance
5. **Build Activity**: Increase your activity score
6. **Consider Delegation**: Delegate if you're busy

Happy Governing! 🗳️
