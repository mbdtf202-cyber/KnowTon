# Governance Execution System

## Overview

The Governance Execution System provides automatic and manual execution of passed proposals after the timelock period. It includes retry logic, failure handling, and a queue management system.

## Architecture

### Components

1. **Execution Queue Service** (`governance-execution.service.ts`)
   - Manages the execution queue
   - Automatically processes proposals after timelock
   - Handles retries and failures
   - Provides queue status and monitoring

2. **Execution Controller** (`governance-execution.controller.ts`)
   - REST API endpoints for queue management
   - Manual execution triggers
   - Queue status queries

3. **Execution Queue UI** (`ExecutionQueue.tsx`)
   - Visual queue management
   - Real-time status updates
   - Manual execution controls

## Features

### 1. Automatic Execution

Proposals are automatically executed after the timelock period (48 hours) expires:

```typescript
// Automatic processing runs every 5 minutes
const CHECK_INTERVAL_MS = 300000 // 5 minutes

// Queue processor checks for ready proposals
const currentTime = Math.floor(Date.now() / 1000)
const readyProposals = queue.filter(
  item => item.status === 'QUEUED' && item.eta <= currentTime
)
```

### 2. Retry Logic

Failed executions are automatically retried up to 3 times:

```typescript
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 60000 // 1 minute between retries

// Retry with exponential backoff
if (item.attempts < MAX_RETRY_ATTEMPTS) {
  // Wait for retry delay
  // Attempt execution again
} else {
  // Mark as failed after max attempts
  item.status = 'FAILED'
}
```

### 3. Failure Handling

The system handles various failure scenarios:

- **Transaction Reverted**: Retries with same parameters
- **Network Issues**: Waits and retries
- **Gas Estimation Failures**: Logs error and retries
- **Max Retries Exceeded**: Marks as failed for manual intervention

### 4. Queue Management

Queue items track execution state:

```typescript
interface ExecutionQueueItem {
  id: string
  proposalId: string
  eta: number // Unix timestamp
  targets: string[]
  values: string[]
  calldatas: string[]
  status: 'QUEUED' | 'EXECUTING' | 'EXECUTED' | 'FAILED' | 'CANCELLED'
  attempts: number
  lastAttemptAt?: Date
  error?: string
  executedAt?: Date
  txHash?: string
  createdAt: Date
  updatedAt: Date
}
```

## API Endpoints

### Get Queue Status

```http
GET /api/v1/governance/execution/queue
```

Response:
```json
{
  "success": true,
  "queue": {
    "total": 10,
    "queued": 3,
    "executing": 1,
    "executed": 5,
    "failed": 1,
    "cancelled": 0,
    "items": [...]
  }
}
```

### Get Queue Item

```http
GET /api/v1/governance/execution/queue/:proposalId
```

### Get Ready for Execution

```http
GET /api/v1/governance/execution/ready
```

Returns proposals that are past their ETA and ready to execute.

### Get Failed Executions

```http
GET /api/v1/governance/execution/failed
```

Returns proposals that failed after max retry attempts.

### Manual Execute

```http
POST /api/v1/governance/execution/:proposalId/execute
```

Manually trigger execution of a proposal (must be past ETA).

### Retry Failed Execution

```http
POST /api/v1/governance/execution/:proposalId/retry
```

Reset a failed execution and retry.

### Cancel Execution

```http
POST /api/v1/governance/execution/:proposalId/cancel
```

Cancel a queued execution (cannot cancel if already executing or executed).

### Cleanup Queue

```http
POST /api/v1/governance/execution/cleanup?days=30
```

Remove old executed/failed items from queue (admin only).

## Usage

### Automatic Execution Flow

1. Proposal passes voting
2. Proposal is queued with `queue()` function
3. ETA is set to current time + 48 hours
4. Proposal is added to execution queue
5. Queue processor checks every 5 minutes
6. When ETA is reached, execution is attempted
7. On success: marked as EXECUTED
8. On failure: retried up to 3 times
9. After max retries: marked as FAILED

### Manual Execution

Users can manually trigger execution through the UI:

```typescript
// In ExecutionQueue component
const handleManualExecute = async (proposalId: string) => {
  const response = await fetch(
    `/api/v1/governance/execution/${proposalId}/execute`,
    { method: 'POST' }
  )
  // Handle response
}
```

### Monitoring

The execution queue can be monitored through:

1. **UI Dashboard**: Real-time queue status
2. **API Endpoints**: Programmatic access
3. **Events**: Service emits events for monitoring

```typescript
// Listen to execution events
governanceExecutionService.on('executionSuccess', (item) => {
  console.log(`Proposal ${item.proposalId} executed successfully`)
})

governanceExecutionService.on('executionFailed', (item) => {
  console.error(`Proposal ${item.proposalId} failed after ${item.attempts} attempts`)
})
```

## Events

The execution service emits the following events:

- `proposalQueued`: When a proposal is added to queue
- `executionStarted`: When execution begins
- `executionSuccess`: When execution succeeds
- `executionError`: When an execution attempt fails
- `executionFailed`: When max retries are exceeded
- `executionCancelled`: When execution is cancelled

## Configuration

Key configuration parameters:

```typescript
// Maximum retry attempts before marking as failed
MAX_RETRY_ATTEMPTS = 3

// Delay between retry attempts
RETRY_DELAY_MS = 60000 // 1 minute

// Queue check interval
CHECK_INTERVAL_MS = 300000 // 5 minutes

// Timelock delay (from governance contract)
MIN_DELAY = 172800 // 48 hours
```

## Error Handling

### Common Errors

1. **Timelock Not Met**
   - Error: "Timelock not met. ETA: [timestamp]"
   - Solution: Wait until ETA is reached

2. **Transaction Reverted**
   - Error: "Transaction reverted: execution failed"
   - Solution: Automatic retry (up to 3 times)

3. **Insufficient Gas**
   - Error: "Gas estimation failed"
   - Solution: Automatic retry with higher gas limit

4. **Network Issues**
   - Error: "Network request failed"
   - Solution: Automatic retry after delay

### Manual Intervention

For failed executions after max retries:

1. Check the error message in queue item
2. Investigate the root cause
3. Fix any issues (e.g., contract state, permissions)
4. Use retry endpoint to attempt again
5. Or manually execute through governance contract

## Security Considerations

1. **Timelock Enforcement**: Minimum 48-hour delay cannot be bypassed
2. **Permission Checks**: Only authorized addresses can execute
3. **Replay Protection**: Each execution is tracked and cannot be repeated
4. **Gas Limits**: Reasonable gas limits to prevent DoS
5. **Rate Limiting**: API endpoints are rate-limited

## Best Practices

1. **Monitor Queue**: Regularly check queue status for failed items
2. **Set Alerts**: Configure alerts for execution failures
3. **Test Proposals**: Test proposal execution on testnet first
4. **Gas Estimation**: Ensure proposals have sufficient gas
5. **Cleanup**: Periodically cleanup old queue items

## Troubleshooting

### Execution Stuck in Queue

**Symptoms**: Proposal past ETA but not executing

**Solutions**:
1. Check queue processor is running
2. Verify ETA is in the past
3. Check for errors in service logs
4. Manually trigger execution

### Repeated Failures

**Symptoms**: Execution fails on every attempt

**Solutions**:
1. Check error message in queue item
2. Verify contract state allows execution
3. Check gas limits
4. Verify timelock permissions
5. Test execution on testnet

### Queue Growing Too Large

**Symptoms**: Many old items in queue

**Solutions**:
1. Run cleanup endpoint
2. Adjust cleanup schedule
3. Investigate why items aren't completing

## Future Enhancements

1. **Priority Queue**: Execute high-priority proposals first
2. **Gas Price Optimization**: Wait for lower gas prices
3. **Batch Execution**: Execute multiple proposals in one transaction
4. **Advanced Retry Strategies**: Exponential backoff, jitter
5. **Notification System**: Alert users of execution status
6. **Analytics**: Track execution success rates and timing

## References

- [KnowTonGovernance.sol](../contracts/KnowTonGovernance.sol)
- [KnowTonTimelock.sol](../contracts/KnowTonTimelock.sol)
- [Governance Service](../../backend/src/services/governance.service.ts)
- [Execution Service](../../backend/src/services/governance-execution.service.ts)
