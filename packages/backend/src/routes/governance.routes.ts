import { Router } from 'express';
import { GovernanceController } from '../controllers/governance.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const governanceController = new GovernanceController();

router.post(
  '/proposals',
  authMiddleware,
  governanceController.createProposal.bind(governanceController)
);

router.post(
  '/proposals/:proposalId/vote',
  authMiddleware,
  governanceController.vote.bind(governanceController)
);

router.post(
  '/proposals/:proposalId/queue',
  authMiddleware,
  governanceController.queueProposal.bind(governanceController)
);

router.post(
  '/proposals/:proposalId/execute',
  authMiddleware,
  governanceController.executeProposal.bind(governanceController)
);

router.post(
  '/proposals/:proposalId/cancel',
  authMiddleware,
  governanceController.cancelProposal.bind(governanceController)
);

router.get('/proposals/:proposalId', governanceController.getProposal.bind(governanceController));

router.get('/proposals', governanceController.getAllProposals.bind(governanceController));

router.get('/votes/:address', governanceController.getUserVotes.bind(governanceController));

router.get(
  '/proposals/:proposalId/has-voted/:address',
  governanceController.hasVoted.bind(governanceController)
);

export default router;
