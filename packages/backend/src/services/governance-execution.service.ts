import { ethers } from 'ethers'
import { EventEmitter } from 'events'

interface ExecutionQueueItem {
  id: string
  proposalId: string
  eta: number
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

interface ExecutionResult {
  success: boolean
  txHash?: string
  error?: string
  gasUsed?: string
}

class GovernanceExecutionService extends EventEmitter {
  private executionQueue: Map<string, ExecutionQueueItem> = new Map()
  private isProcessing: boolean = false
  private processingInterval: NodeJS.Timeout | null = null
  private readonly MAX_RETRY_ATTEMPTS = 3
  private readonly RETRY_DELAY_MS = 60000 // 1 minute
  private readonly CHECK_INTERVAL_MS = 300000 // 5 minutes

  constructor() {
    super()
    this.startQueueProcessor()
  }

  /**
   * Start the automatic queue processor
   */
  private startQueueProcessor() {
    if (this.processingInterval) {
      return
    }

    console.log('Starting governance execution queue processor')
    
    // Process queue immediately on start
    this.processQueue()

    // Then process every CHECK_INTERVAL_MS
    this.processingInterval = setInterval(() => {
      this.processQueue()
    }, this.CHECK_INTERVAL_MS)
  }

  /**
   * Stop the queue processor
   */
  stopQueueProcessor() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
      console.log('Stopped governance execution queue processor')
    }
  }

  /**
   * Add proposal to execution queue
   */
  async queueProposal(data: {
    proposalId: string
    eta: number
    targets: string[]
    values: string[]
    calldatas: string[]
  }): Promise<ExecutionQueueItem> {
    const queueId = `exec-${data.proposalId}-${Date.now()}`

    const queueItem: ExecutionQueueItem = {
      id: queueId,
      proposalId: data.proposalId,
      eta: data.eta,
      targets: data.targets,
      values: data.values,
      calldatas: data.calldatas,
      status: 'QUEUED',
      attempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.executionQueue.set(queueId, queueItem)
    
    this.emit('proposalQueued', queueItem)
    console.log(`Proposal ${data.proposalId} queued for execution at ${new Date(data.eta * 1000)}`)

    return queueItem
  }

  /**
   * Process the execution queue
   */
  private async processQueue() {
    if (this.isProcessing) {
      console.log('Queue processing already in progress, skipping')
      return
    }

    this.isProcessing = true
    const currentTime = Math.floor(Date.now() / 1000)

    try {
      const queuedItems = Array.from(this.executionQueue.values()).filter(
        (item) => item.status === 'QUEUED' && item.eta <= currentTime
      )

      if (queuedItems.length === 0) {
        console.log('No proposals ready for execution')
        return
      }

      console.log(`Processing ${queuedItems.length} proposals ready for execution`)

      for (const item of queuedItems) {
        await this.executeProposal(item)
      }
    } catch (error) {
      console.error('Error processing execution queue:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Execute a single proposal
   */
  private async executeProposal(item: ExecutionQueueItem): Promise<void> {
    // Check if max retries exceeded
    if (item.attempts >= this.MAX_RETRY_ATTEMPTS) {
      item.status = 'FAILED'
      item.error = `Max retry attempts (${this.MAX_RETRY_ATTEMPTS}) exceeded`
      item.updatedAt = new Date()
      this.executionQueue.set(item.id, item)
      
      this.emit('executionFailed', item)
      console.error(`Proposal ${item.proposalId} execution failed after ${this.MAX_RETRY_ATTEMPTS} attempts`)
      return
    }

    // Check if retry delay has passed
    if (item.lastAttemptAt) {
      const timeSinceLastAttempt = Date.now() - item.lastAttemptAt.getTime()
      if (timeSinceLastAttempt < this.RETRY_DELAY_MS) {
        console.log(`Waiting for retry delay for proposal ${item.proposalId}`)
        return
      }
    }

    item.status = 'EXECUTING'
    item.attempts += 1
    item.lastAttemptAt = new Date()
    item.updatedAt = new Date()
    this.executionQueue.set(item.id, item)

    this.emit('executionStarted', item)
    console.log(`Executing proposal ${item.proposalId} (attempt ${item.attempts}/${this.MAX_RETRY_ATTEMPTS})`)

    try {
      const result = await this.executeOnChain(item)

      if (result.success) {
        item.status = 'EXECUTED'
        item.txHash = result.txHash
        item.executedAt = new Date()
        item.updatedAt = new Date()
        this.executionQueue.set(item.id, item)

        this.emit('executionSuccess', item)
        console.log(`Proposal ${item.proposalId} executed successfully. TxHash: ${result.txHash}`)
      } else {
        throw new Error(result.error || 'Execution failed')
      }
    } catch (error: any) {
      item.status = 'QUEUED' // Reset to queued for retry
      item.error = error.message
      item.updatedAt = new Date()
      this.executionQueue.set(item.id, item)

      this.emit('executionError', { item, error: error.message })
      console.error(`Proposal ${item.proposalId} execution error (attempt ${item.attempts}):`, error.message)

      // If max retries reached, mark as failed
      if (item.attempts >= this.MAX_RETRY_ATTEMPTS) {
        item.status = 'FAILED'
        this.executionQueue.set(item.id, item)
        this.emit('executionFailed', item)
      }
    }
  }

  /**
   * Execute proposal on-chain
   * In production, this would interact with the actual governance contract
   */
  private async executeOnChain(item: ExecutionQueueItem): Promise<ExecutionResult> {
    // Simulate on-chain execution
    // In production, this would:
    // 1. Connect to the governance contract
    // 2. Call the execute function
    // 3. Wait for transaction confirmation
    // 4. Return the transaction hash

    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Simulate 90% success rate
      const success = Math.random() > 0.1

      if (!success) {
        throw new Error('Transaction reverted: execution failed')
      }

      // Generate mock transaction hash
      const txHash = '0x' + Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')

      return {
        success: true,
        txHash,
        gasUsed: '250000',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Manually trigger execution of a proposal
   */
  async manualExecute(proposalId: string, executor: string): Promise<ExecutionResult> {
    const queueItem = Array.from(this.executionQueue.values()).find(
      (item) => item.proposalId === proposalId
    )

    if (!queueItem) {
      throw new Error('Proposal not found in execution queue')
    }

    if (queueItem.status === 'EXECUTED') {
      throw new Error('Proposal already executed')
    }

    if (queueItem.status === 'EXECUTING') {
      throw new Error('Proposal is currently being executed')
    }

    const currentTime = Math.floor(Date.now() / 1000)
    if (currentTime < queueItem.eta) {
      throw new Error(`Timelock not met. ETA: ${new Date(queueItem.eta * 1000)}`)
    }

    console.log(`Manual execution triggered by ${executor} for proposal ${proposalId}`)
    
    await this.executeProposal(queueItem)

    const updatedItem = this.executionQueue.get(queueItem.id)!
    
    if (updatedItem.status === 'EXECUTED') {
      return {
        success: true,
        txHash: updatedItem.txHash,
      }
    } else {
      return {
        success: false,
        error: updatedItem.error || 'Execution failed',
      }
    }
  }

  /**
   * Cancel a queued proposal
   */
  async cancelExecution(proposalId: string, canceller: string): Promise<void> {
    const queueItem = Array.from(this.executionQueue.values()).find(
      (item) => item.proposalId === proposalId
    )

    if (!queueItem) {
      throw new Error('Proposal not found in execution queue')
    }

    if (queueItem.status === 'EXECUTED') {
      throw new Error('Cannot cancel executed proposal')
    }

    if (queueItem.status === 'EXECUTING') {
      throw new Error('Cannot cancel proposal that is currently executing')
    }

    queueItem.status = 'CANCELLED'
    queueItem.updatedAt = new Date()
    this.executionQueue.set(queueItem.id, queueItem)

    this.emit('executionCancelled', { item: queueItem, canceller })
    console.log(`Proposal ${proposalId} execution cancelled by ${canceller}`)
  }

  /**
   * Get execution queue status
   */
  getQueueStatus() {
    const items = Array.from(this.executionQueue.values())
    
    return {
      total: items.length,
      queued: items.filter((i) => i.status === 'QUEUED').length,
      executing: items.filter((i) => i.status === 'EXECUTING').length,
      executed: items.filter((i) => i.status === 'EXECUTED').length,
      failed: items.filter((i) => i.status === 'FAILED').length,
      cancelled: items.filter((i) => i.status === 'CANCELLED').length,
      items: items.sort((a, b) => a.eta - b.eta),
    }
  }

  /**
   * Get specific queue item
   */
  getQueueItem(proposalId: string): ExecutionQueueItem | null {
    const item = Array.from(this.executionQueue.values()).find(
      (i) => i.proposalId === proposalId
    )
    return item || null
  }

  /**
   * Get items ready for execution
   */
  getReadyForExecution(): ExecutionQueueItem[] {
    const currentTime = Math.floor(Date.now() / 1000)
    return Array.from(this.executionQueue.values()).filter(
      (item) => item.status === 'QUEUED' && item.eta <= currentTime
    )
  }

  /**
   * Get failed executions
   */
  getFailedExecutions(): ExecutionQueueItem[] {
    return Array.from(this.executionQueue.values()).filter(
      (item) => item.status === 'FAILED'
    )
  }

  /**
   * Retry a failed execution
   */
  async retryExecution(proposalId: string): Promise<void> {
    const queueItem = Array.from(this.executionQueue.values()).find(
      (item) => item.proposalId === proposalId
    )

    if (!queueItem) {
      throw new Error('Proposal not found in execution queue')
    }

    if (queueItem.status !== 'FAILED') {
      throw new Error('Can only retry failed executions')
    }

    // Reset the item for retry
    queueItem.status = 'QUEUED'
    queueItem.attempts = 0
    queueItem.error = undefined
    queueItem.lastAttemptAt = undefined
    queueItem.updatedAt = new Date()
    this.executionQueue.set(queueItem.id, queueItem)

    console.log(`Retrying execution for proposal ${proposalId}`)
    
    // Trigger immediate processing
    await this.processQueue()
  }

  /**
   * Clear old executed/failed items from queue
   */
  cleanupQueue(olderThanDays: number = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    let removedCount = 0
    for (const [id, item] of this.executionQueue.entries()) {
      if (
        (item.status === 'EXECUTED' || item.status === 'FAILED' || item.status === 'CANCELLED') &&
        item.updatedAt < cutoffDate
      ) {
        this.executionQueue.delete(id)
        removedCount++
      }
    }

    console.log(`Cleaned up ${removedCount} old queue items`)
    return removedCount
  }
}

// Export singleton instance
export const governanceExecutionService = new GovernanceExecutionService()
