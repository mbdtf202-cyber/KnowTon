# Execution System Quick Start

## Overview

The Governance Execution System automatically executes passed proposals after the 48-hour timelock period. This guide shows you how to use it.

## Quick Start

### 1. Queue a Proposal

After a proposal passes voting, queue it for execution:

```typescript
// Queue the proposal
await governance.queue(proposalId)

// This sets ETA to current time + 48 hours
// and adds it to the execution queue
```

### 2. Monitor Execution Queue

View the execution queue in the UI:

1. Go to Governance page
2. Click "Execution Queue" tab
3. See all queued, executing, and executed proposals

Or use the API:

```bash
curl http://localhost:3001/api/v1/governance/execution/queue
```

### 3. Wait for Automatic Execution

The system automatically executes proposals after the timelock:

- Queue processor runs every 5 minutes
- Proposals past their ETA are executed automatically
- Failed executions are retried up to 3 times

### 4. Manual Execution (Optional)

If you want to execute immediately after timelock:

**Via UI:**
1. Go to Execution Queue tab
2. Find your proposal (status: QUEUED, ETA passed)
3. Click "Execute Now"

**Via API:**
```bash
curl -X POST http://localhost:3001/api/v1/governance/execution/PROPOSAL_ID/execute
```

## Common Scenarios

### Scenario 1: Normal Execution

```
1. Proposal passes voting
2. Queue proposal → ETA set to +48 hours
3. Wait 48 hours
4. Automatic execution succeeds
5. Status: EXECUTED ✓
```

### Scenario 2: Execution Failure with Retry

```
1. Proposal queued
2. Wait 48 hours
3. First execution attempt fails (network issue)
4. System waits 1 minute
5. Second attempt succeeds
6. Status: EXECUTED ✓
```

### Scenario 3: Max Retries Exceeded

```
1. Proposal queued
2. Wait 48 hours
3. Execution fails 3 times
4. Status: FAILED ✗
5. Admin investigates error
6. Admin clicks "Retry" after fixing issue
7. Execution succeeds
8. Status: EXECUTED ✓
```

## Monitoring

### Check Queue Status

```bash
# Get overall queue status
GET /api/v1/governance/execution/queue

# Get specific proposal
GET /api/v1/governance/execution/queue/PROPOSAL_ID

# Get proposals ready to execute
GET /api/v1/governance/execution/ready

# Get failed executions
GET /api/v1/governance/execution/failed
```

### Queue Statistics

The UI shows:
- **Total**: All items in queue
- **Queued**: Waiting for ETA
- **Executing**: Currently being executed
- **Executed**: Successfully completed
- **Failed**: Failed after max retries

## Troubleshooting

### Proposal Not Executing

**Check 1**: Is ETA in the past?
```bash
GET /api/v1/governance/execution/queue/PROPOSAL_ID
# Check "eta" field
```

**Check 2**: Is queue processor running?
```bash
# Check service logs
# Should see: "Processing X proposals ready for execution"
```

**Solution**: Manually trigger execution
```bash
POST /api/v1/governance/execution/PROPOSAL_ID/execute
```

### Execution Failed

**Check error message:**
```bash
GET /api/v1/governance/execution/queue/PROPOSAL_ID
# Check "error" field
```

**Common errors:**
- "Timelock not met" → Wait until ETA
- "Transaction reverted" → Check proposal parameters
- "Network request failed" → Temporary issue, will retry

**Retry failed execution:**
```bash
POST /api/v1/governance/execution/PROPOSAL_ID/retry
```

## Configuration

### Adjust Retry Settings

Edit `governance-execution.service.ts`:

```typescript
// Maximum retry attempts
private readonly MAX_RETRY_ATTEMPTS = 3

// Delay between retries
private readonly RETRY_DELAY_MS = 60000 // 1 minute

// Queue check interval
private readonly CHECK_INTERVAL_MS = 300000 // 5 minutes
```

### Adjust Timelock Delay

Edit `KnowTonTimelock.sol`:

```solidity
// Minimum delay: 48 hours
uint256 public constant MIN_DELAY = 2 days;
```

## API Reference

### Queue Status
```http
GET /api/v1/governance/execution/queue
```

### Manual Execute
```http
POST /api/v1/governance/execution/:proposalId/execute
```

### Retry Failed
```http
POST /api/v1/governance/execution/:proposalId/retry
```

### Cancel Execution
```http
POST /api/v1/governance/execution/:proposalId/cancel
```

### Cleanup Old Items
```http
POST /api/v1/governance/execution/cleanup?days=30
```

## Best Practices

1. **Monitor the Queue**: Check execution queue regularly
2. **Set Alerts**: Configure alerts for failed executions
3. **Test First**: Test proposals on testnet before mainnet
4. **Gas Estimation**: Ensure sufficient gas for execution
5. **Cleanup**: Run cleanup monthly to remove old items

## Next Steps

- Read [Full Documentation](./EXECUTION_SYSTEM.md)
- Review [Governance System](./GOVERNANCE_SYSTEM.md)
- Check [API Reference](./GOVERNANCE_REFERENCE.md)

## Support

For issues or questions:
- Check service logs for errors
- Review queue status in UI
- Contact development team
