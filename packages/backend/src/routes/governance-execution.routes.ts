import { Router } from 'express'
import { governanceExecutionController } from '../controllers/governance-execution.controller'

const router = Router()

/**
 * @route GET /api/v1/governance/execution/queue
 * @desc Get execution queue status
 * @access Public
 */
router.get('/queue', governanceExecutionController.getQueueStatus)

/**
 * @route GET /api/v1/governance/execution/queue/:proposalId
 * @desc Get specific queue item
 * @access Public
 */
router.get('/queue/:proposalId', governanceExecutionController.getQueueItem)

/**
 * @route GET /api/v1/governance/execution/ready
 * @desc Get items ready for execution
 * @access Public
 */
router.get('/ready', governanceExecutionController.getReadyForExecution)

/**
 * @route GET /api/v1/governance/execution/failed
 * @desc Get failed executions
 * @access Public
 */
router.get('/failed', governanceExecutionController.getFailedExecutions)

/**
 * @route POST /api/v1/governance/execution/:proposalId/execute
 * @desc Manually execute a proposal
 * @access Protected
 */
router.post('/:proposalId/execute', governanceExecutionController.manualExecute)

/**
 * @route POST /api/v1/governance/execution/:proposalId/cancel
 * @desc Cancel a queued execution
 * @access Protected
 */
router.post('/:proposalId/cancel', governanceExecutionController.cancelExecution)

/**
 * @route POST /api/v1/governance/execution/:proposalId/retry
 * @desc Retry a failed execution
 * @access Protected
 */
router.post('/:proposalId/retry', governanceExecutionController.retryExecution)

/**
 * @route POST /api/v1/governance/execution/cleanup
 * @desc Cleanup old queue items
 * @access Protected (Admin only)
 */
router.post('/cleanup', governanceExecutionController.cleanupQueue)

export default router
