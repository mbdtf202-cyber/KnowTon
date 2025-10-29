import { Request, Response } from 'express';
import { GovernanceService } from '../services/governance.service';
import { logger } from '../utils/logger';

const governanceService = new GovernanceService();

export class GovernanceController {
  async createProposal(req: Request, res: Response) {
    try {
      const { targets, values, calldatas, description } = req.body;
      const proposer = (req as any).user?.address;

      if (!proposer) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!targets || !values || !calldatas || !description) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await governanceService.createProposal(
        proposer,
        targets,
        values,
        calldatas,
        description
      );

      res.json({
        success: true,
        proposalId: result.proposalId,
        txHash: result.txHash,
      });
    } catch (error) {
      logger.error('Error creating proposal:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async vote(req: Request, res: Response) {
    try {
      const { proposalId } = req.params;
      const { support, reason } = req.body;
      const voter = (req as any).user?.address;

      if (!voter) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!proposalId || support === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await governanceService.vote(proposalId, voter, parseInt(support), reason);

      res.json({
        success: true,
        txHash: result.txHash,
        proposalId: result.proposalId,
        support: result.support,
      });
    } catch (error) {
      logger.error('Error voting:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async queueProposal(req: Request, res: Response) {
    try {
      const { proposalId } = req.params;
      const { targets, values, calldatas, descriptionHash } = req.body;

      if (!proposalId || !targets || !values || !calldatas || !descriptionHash) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await governanceService.queueProposal(
        proposalId,
        targets,
        values,
        calldatas,
        descriptionHash
      );

      res.json({
        success: true,
        txHash: result.txHash,
        proposalId: result.proposalId,
      });
    } catch (error) {
      logger.error('Error queuing proposal:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async executeProposal(req: Request, res: Response) {
    try {
      const { proposalId } = req.params;
      const { targets, values, calldatas, descriptionHash } = req.body;

      if (!proposalId || !targets || !values || !calldatas || !descriptionHash) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await governanceService.executeProposal(
        proposalId,
        targets,
        values,
        calldatas,
        descriptionHash
      );

      res.json({
        success: true,
        txHash: result.txHash,
        proposalId: result.proposalId,
      });
    } catch (error) {
      logger.error('Error executing proposal:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async cancelProposal(req: Request, res: Response) {
    try {
      const { proposalId } = req.params;
      const { targets, values, calldatas, descriptionHash } = req.body;

      if (!proposalId || !targets || !values || !calldatas || !descriptionHash) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await governanceService.cancelProposal(
        proposalId,
        targets,
        values,
        calldatas,
        descriptionHash
      );

      res.json({
        success: true,
        txHash: result.txHash,
        proposalId: result.proposalId,
      });
    } catch (error) {
      logger.error('Error cancelling proposal:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getProposal(req: Request, res: Response) {
    try {
      const { proposalId } = req.params;

      if (!proposalId) {
        return res.status(400).json({ error: 'Proposal ID is required' });
      }

      const proposal = await governanceService.getProposal(proposalId);

      res.json(proposal);
    } catch (error) {
      logger.error('Error getting proposal:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAllProposals(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await governanceService.getAllProposals(limit, offset);

      res.json(result);
    } catch (error) {
      logger.error('Error getting all proposals:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserVotes(req: Request, res: Response) {
    try {
      const { address } = req.params;

      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }

      const votes = await governanceService.getUserVotes(address);

      res.json({
        address,
        votesCount: votes.length,
        votes,
      });
    } catch (error) {
      logger.error('Error getting user votes:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async hasVoted(req: Request, res: Response) {
    try {
      const { proposalId, address } = req.params;

      if (!proposalId || !address) {
        return res.status(400).json({ error: 'Proposal ID and address are required' });
      }

      const hasVoted = await governanceService.hasVoted(proposalId, address);

      res.json({
        proposalId,
        address,
        hasVoted,
      });
    } catch (error) {
      logger.error('Error checking if voted:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
