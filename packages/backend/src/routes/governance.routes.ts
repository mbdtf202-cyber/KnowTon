import { Router } from 'express'
import { governanceController } from '../controllers/governance.controller'
import { authenticate } from '../middleware/auth.middleware'
import executionRoutes from './governance-execution.routes'

const router = Router()

// Proposal routes
router.get('/proposals', governanceController.getProposals)
router.get('/proposals/:proposalId', governanceController.getProposal)
router.post('/proposals', authenticate, governanceController.createProposal)
router.post('/proposals/:proposalId/vote', authenticate, governanceController.vote)
router.post('/proposals/:proposalId/execute', authenticate, governanceController.execute)
router.post('/proposals/:proposalId/cancel', authenticate, governanceController.cancel)

// Discussion/Comment routes
router.get('/proposals/:proposalId/comments', governanceController.getComments)
router.post('/proposals/:proposalId/comments', authenticate, governanceController.createComment)
router.post(
  '/proposals/:proposalId/comments/:commentId/replies',
  authenticate,
  governanceController.createReply
)
router.put(
  '/proposals/:proposalId/comments/:commentId',
  authenticate,
  governanceController.updateComment
)
router.delete(
  '/proposals/:proposalId/comments/:commentId',
  authenticate,
  governanceController.deleteComment
)

// Voting power routes
router.get('/voting-power/:address', governanceController.getVotingPower)
router.get('/proposals/:proposalId/votes', governanceController.getVotes)

// Lifecycle management routes
router.post('/proposals/:proposalId/queue', authenticate, governanceController.queueProposal)
router.get('/proposals/:proposalId/state', governanceController.getProposalState)
router.get('/proposals/:proposalId/timeline', governanceController.getProposalTimeline)

// Delegation routes
router.get('/delegation/:address', governanceController.getDelegationStatus)
router.post('/delegate', authenticate, governanceController.delegateVotes)
router.post('/undelegate', authenticate, governanceController.undelegateVotes)

// Execution system routes
router.use('/execution', executionRoutes)

export default router
