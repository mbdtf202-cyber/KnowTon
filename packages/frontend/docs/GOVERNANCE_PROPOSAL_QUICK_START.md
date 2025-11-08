# Governance Proposal System - Quick Start Guide

## Overview

The KnowTon governance proposal system allows token holders to participate in platform governance through proposal creation, voting, and discussion.

## Features

- 📝 **Proposal Creation** - Submit proposals with detailed descriptions
- 🗳️ **Quadratic Voting** - Fair voting system based on token holdings
- 💬 **Discussion Forum** - Threaded discussions on proposals
- ⏱️ **Lifecycle Management** - Automated state transitions
- 🔒 **Timelock Protection** - 48-hour delay before execution
- 🌐 **Multilingual** - English and Chinese support

## Quick Start

### 1. Access Governance Page

Navigate to `/governance` or click "Governance" in the navigation menu.

### 2. View Proposals

Browse all proposals with filtering options:
- **All Proposals** - View all proposals
- **Active** - Currently open for voting
- **Pending** - Waiting to start
- **Ended** - Voting completed

### 3. Create a Proposal

**Requirements:**
- Minimum 1,000 KNOW voting power
- 5,000 KNOW stake (returned after execution/cancellation)

**Steps:**
1. Click "Create Proposal" button
2. Select proposal type:
   - ⚙️ Parameter Change
   - 💰 Treasury Allocation
   - ⚖️ Dispute Resolution
   - 🔧 Contract Upgrade
3. Enter title and description
4. (Optional) Add call data for on-chain execution
5. Submit proposal

### 4. Vote on Proposals

**Requirements:**
- Connected wallet
- Voting power > 0
- Proposal status: ACTIVE

**Steps:**
1. Select a proposal from the list
2. Review proposal details
3. Choose your vote:
   - ✅ **For** - Support the proposal
   - ❌ **Against** - Oppose the proposal
   - ⚪ **Abstain** - Neutral position
4. Click "Submit Vote"

### 5. Participate in Discussions

**Features:**
- Post comments on proposals
- Reply to existing comments
- Edit/delete your own comments

**Steps:**
1. Select a proposal
2. Scroll to "Discussion" section
3. Write your comment
4. Click "Post Comment"

### 6. Execute Proposals

**Requirements:**
- Proposal status: SUCCEEDED or QUEUED
- Timelock delay passed (48 hours)

**Steps:**
1. Select a succeeded proposal
2. Click "Execute Proposal"
3. Confirm transaction

## Proposal Types

### Parameter Change
Modify platform parameters like fees, limits, or thresholds.

**Example:**
```
Title: Reduce Platform Fee to 2%
Description: Proposal to reduce the platform transaction fee from 2.5% to 2.0% 
to increase competitiveness and attract more users.
```

### Treasury Allocation
Allocate funds from the DAO treasury for specific purposes.

**Example:**
```
Title: Marketing Campaign Budget
Description: Allocate 100,000 USDC from the DAO treasury for Q2 marketing 
campaign including social media, KOL partnerships, and community events.
```

### Dispute Resolution
Resolve copyright disputes and content conflicts.

**Example:**
```
Title: Copyright Dispute Resolution - Token #12345
Description: AI oracle detected 92% similarity. Propose to revoke NFT and 
compensate original creator.
```

### Contract Upgrade
Upgrade smart contracts with new features or fixes.

**Example:**
```
Title: Upgrade RoyaltyDistributor to v2.0
Description: Upgrade contract to add batch distribution and gas optimization, 
expected to reduce gas costs by 30%.
```

## Voting Power

Your voting power is calculated using quadratic voting:

```
Voting Power = √(Token Balance) × (1 + Activity Multiplier)
```

**Activity Multiplier:**
- 0-200 activity score: 0-10% boost
- 200-500: 10-25% boost
- 500-800: 25-40% boost
- 800-1000: 40-50% boost

**Example:**
- 100,000 KNOW tokens = √100,000 ≈ 316 base votes
- With max activity (1000): 316 × 1.5 = 474 votes
- Without activity: 316 × 1.0 = 316 votes

## Proposal Lifecycle

### 1. Creation (PENDING)
- Proposer stakes 5,000 KNOW
- Voting delay: 1 block
- Status: PENDING

### 2. Voting (ACTIVE)
- Voting period: 50,400 blocks (~1 week)
- Community votes For/Against/Abstain
- Status: ACTIVE

### 3. Result (SUCCEEDED/DEFEATED)
- Quorum: 4% of total supply
- Pass condition: For votes > Against votes
- Status: SUCCEEDED or DEFEATED

### 4. Timelock (QUEUED)
- 48-hour delay for security
- Community can react to malicious proposals
- Status: QUEUED

### 5. Execution (EXECUTED)
- Proposal executed on-chain
- Stake returned to proposer
- Status: EXECUTED

## API Reference

### Get All Proposals
```typescript
GET /api/v1/governance/proposals
Query: ?status=ACTIVE&limit=50&offset=0
```

### Get Proposal Details
```typescript
GET /api/v1/governance/proposals/:proposalId
```

### Create Proposal
```typescript
POST /api/v1/governance/proposals
Body: {
  proposalType: 'PARAMETER_CHANGE',
  description: 'Proposal description',
  targets: ['0x...'],
  values: ['0'],
  calldatas: ['0x...']
}
```

### Cast Vote
```typescript
POST /api/v1/governance/proposals/:proposalId/vote
Body: {
  support: 1, // 0=Against, 1=For, 2=Abstain
  reason: 'Optional reason'
}
```

### Get Comments
```typescript
GET /api/v1/governance/proposals/:proposalId/comments
```

### Post Comment
```typescript
POST /api/v1/governance/proposals/:proposalId/comments
Body: {
  content: 'Comment text'
}
```

## Component Usage

### ProposalList
```tsx
import ProposalList from '@/components/ProposalList'

<ProposalList
  proposals={proposals}
  onSelectProposal={setSelectedProposalId}
  selectedProposalId={selectedProposalId}
/>
```

### ProposalDetails
```tsx
import ProposalDetails from '@/components/ProposalDetails'

<ProposalDetails
  proposal={proposal}
  votingPower={votingPower}
  onVote={handleVote}
  onExecute={handleExecute}
  isVoting={isVoting}
  isExecuting={isExecuting}
/>
```

### CreateProposalForm
```tsx
import CreateProposalForm from '@/components/CreateProposalForm'

<CreateProposalForm
  onSubmit={handleCreateProposal}
  onCancel={() => setShowForm(false)}
  isSubmitting={isSubmitting}
  votingPower={votingPower}
/>
```

## Best Practices

### Creating Proposals
1. **Be Specific** - Provide detailed information and rationale
2. **Include Links** - Reference relevant documents or data
3. **Set Clear Goals** - Define measurable outcomes
4. **Consider Impact** - Think about effects on all stakeholders
5. **Engage Community** - Discuss in forum before proposing

### Voting
1. **Read Carefully** - Review full proposal before voting
2. **Check Discussion** - Read community feedback
3. **Consider Long-term** - Think beyond immediate effects
4. **Vote Responsibly** - Your vote affects the platform

### Discussing
1. **Be Respectful** - Maintain civil discourse
2. **Stay On Topic** - Focus on the proposal
3. **Provide Evidence** - Support claims with data
4. **Ask Questions** - Seek clarification when needed
5. **Be Constructive** - Offer solutions, not just criticism

## Troubleshooting

### Cannot Create Proposal
- **Issue**: "Below threshold" error
- **Solution**: Ensure you have ≥1,000 KNOW voting power and have delegated to yourself

### Cannot Vote
- **Issue**: "Not active" error
- **Solution**: Check proposal status - must be ACTIVE

### Cannot Execute
- **Issue**: "Timelock not met" error
- **Solution**: Wait 48 hours after queuing

### Comments Not Loading
- **Issue**: Comments not appearing
- **Solution**: Refresh page or check network connection

## Security

### Proposal Creation
- Stake requirement prevents spam
- Voting power threshold ensures commitment
- Proposer can cancel before execution

### Voting
- One vote per address
- Quadratic voting reduces whale influence
- Vote weight based on delegated power

### Execution
- 48-hour timelock for security
- Community can react to malicious proposals
- Emergency cancellation available

## Support

### Resources
- [Governance Documentation](./GOVERNANCE_SYSTEM.md)
- [Smart Contract Reference](../../contracts/docs/GOVERNANCE_REFERENCE.md)
- [API Documentation](./TASK_3.1.2_IMPLEMENTATION_SUMMARY.md)

### Community
- Discord: [KnowTon Community](https://discord.gg/knowton)
- Forum: [governance.knowton.io](https://governance.knowton.io)
- GitHub: [knowton/governance](https://github.com/knowton/governance)

## Examples

### Example 1: Fee Reduction Proposal
```typescript
const proposal = {
  proposalType: 'PARAMETER_CHANGE',
  description: `
# Reduce Platform Fee to 2%

## Rationale
Current 2.5% fee is higher than competitors. Reducing to 2% will:
- Increase platform competitiveness
- Attract more creators
- Boost trading volume

## Implementation
Update PlatformFee parameter in main contract from 250 to 200 basis points.

## Timeline
Effective 7 days after execution.

## Expected Impact
- 15% increase in new creators
- 20% increase in trading volume
- Minimal revenue impact due to volume increase
  `,
  targets: ['0xPlatformContract'],
  values: ['0'],
  calldatas: ['0x...'] // encodeFunctionData('updateFee', [200])
}
```

### Example 2: Treasury Allocation
```typescript
const proposal = {
  proposalType: 'TREASURY_ALLOCATION',
  description: `
# Q2 Marketing Campaign Budget

## Request
Allocate 100,000 USDC for Q2 marketing campaign.

## Budget Breakdown
- Social Media Ads: 40,000 USDC
- KOL Partnerships: 30,000 USDC
- Community Events: 20,000 USDC
- Content Creation: 10,000 USDC

## Expected Results
- 50,000 new users
- 1,000 new creators
- 2x social media engagement

## Accountability
Monthly progress reports to DAO.
  `,
  targets: ['0xTreasuryContract'],
  values: ['0'],
  calldatas: ['0x...'] // encodeFunctionData('transfer', [recipient, amount])
}
```

## Conclusion

The governance proposal system empowers the KnowTon community to shape the platform's future through transparent, democratic decision-making. Start participating today!
