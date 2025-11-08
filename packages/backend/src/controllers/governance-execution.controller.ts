import { Request, Response } from 'express'
import { governanceExecutionService } from '../services/governance-execution.service'

class GovernanceExecutionController {
  /**
   * Get execution queue status
   */
  async getQueueStatus(req: Request, res: Response) {
    try {
      const status = governanceExecutionService.getQueueStatus()

      res.json({
        success: true,
        queue: status,
      })
    } catch (error: any) {
      console.error('Get queue status error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get queue status',
      })
    }
  }

  /**
   * Get specific queue item
   */
  async getQueueItem(req: Request, res: Response) {
    try {
      const { proposalId } = req.params

      const item = governanceExecutionService.getQueueItem(proposalId)

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Queue item not found',
        })
      }

      res.json({
        success: true,
        item,
      })
    } catch (error: any) {
      console.error('Get queue item error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get queue item',
      })
    }
  }

  /**
   * Get items ready for execution
   */
  async getReadyForExecution(req: Request, res: Response) {
    try {
      const items = governanceExecutionService.getReadyForExecution()

      res.json({
        success: true,
        items,
        count: items.length,
      })
    } catch (error: any) {
      console.error('Get ready for execution error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get ready items',
      })
    }
  }

  /**
   * Get failed executions
   */
  async getFailedExecutions(req: Request, res: Response) {
    try {
      const items = governanceExecutionService.getFailedExecutions()

      res.json({
        success: true,
        items,
        count: items.length,
      })
    } catch (error: any) {
      console.error('Get failed executions error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get failed executions',
      })
    }
  }

  /**
   * Manually execute a proposal
   */
  async manualExecute(req: Request, res: Response) {
    try {
      const { proposalId } = req.params
      const executor = (req as any).user?.address || 'unknown'

      const result = await governanceExecutionService.manualExecute(proposalId, executor)

      if (result.success) {
        res.json({
          success: true,
          txHash: result.txHash,
          message: 'Proposal executed successfully',
        })
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Execution failed',
        })
      }
    } catch (error: any) {
      console.error('Manual execute error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to execute proposal',
      })
    }
  }

  /**
   * Cancel a queued execution
   */
  async cancelExecution(req: Request, res: Response) {
    try {
      const { proposalId } = req.params
      const canceller = (req as any).user?.address || 'unknown'

      await governanceExecutionService.cancelExecution(proposalId, canceller)

      res.json({
        success: true,
        message: 'Execution cancelled successfully',
      })
    } catch (error: any) {
      console.error('Cancel execution error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cancel execution',
      })
    }
  }

  /**
   * Retry a failed execution
   */
  async retryExecution(req: Request, res: Response) {
    try {
      const { proposalId } = req.params

      await governanceExecutionService.retryExecution(proposalId)

      res.json({
        success: true,
        message: 'Execution retry initiated',
      })
    } catch (error: any) {
      console.error('Retry execution error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retry execution',
      })
    }
  }

  /**
   * Cleanup old queue items
   */
  async cleanupQueue(req: Request, res: Response) {
    try {
      const { days = 30 } = req.query

      const removedCount = governanceExecutionService.cleanupQueue(Number(days))

      res.json({
        success: true,
        removedCount,
        message: `Cleaned up ${removedCount} old queue items`,
      })
    } catch (error: any) {
      console.error('Cleanup queue error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cleanup queue',
      })
    }
  }
}

export const governanceExecutionController = new GovernanceExecutionController()
