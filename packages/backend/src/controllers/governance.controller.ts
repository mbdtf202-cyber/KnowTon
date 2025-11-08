import { Request, Response } from 'express'
import { governanceService } from '../services/governance.service'

class GovernanceController {
  // Get all proposals
  async getProposals(req: Request, res: Response) {
    try {
      const { status, proposalType, limit = 50, offset = 0 } = req.query

      const proposals = await governanceService.getProposals({
        status: status as string,
        proposalType: proposalType as string,
        limit: Number(limit),
        offset: Number(offset),
      })

      res.json({
        success: true,
        proposals,
      })
    } catch (error: any) {
      console.error('Get proposals error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get proposals',
      })
    }
  }

  // Get single proposal
  async getProposal(req: Request, res: Response) {
    try {
      const { proposalId } = req.params

      const proposal = await governanceService.getProposal(proposalId)

      if (!proposal) {
        return res.status(404).json({
          success: false,
          error: 'Proposal not found',
        })
      }

      res.json({
        success: true,
        proposal,
      })
    } catch (error: any) {
      console.error('Get proposal error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get proposal',
      })
    }
  }

  // Create proposal
  async createProposal(req: Request, res: Response) {
    try {
      const { proposalType, description, targets, values, calldatas } = req.body
      const proposer = (req as any).user.address

      const proposal = await governanceService.createProposal({
        proposer,
        proposalType,
        description,
        targets,
        values,
        calldatas,
      })

      res.json({
        success: true,
        proposal,
      })
    } catch (error: any) {
      console.error('Create proposal error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create proposal',
      })
    }
  }

  // Vote on proposal
  async vote(req: Request, res: Response) {
    try {
      const { proposalId } = req.params
      const { support, reason } = req.body
      const voter = (req as any).user.address

      const vote = await governanceService.castVote({
        proposalId,
        voter,
        support,
        reason,
      })

      res.json({
        success: true,
        vote,
      })
    } catch (error: any) {
      console.error('Vote error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cast vote',
      })
    }
  }

  // Execute proposal
  async execute(req: Request, res: Response) {
    try {
      const { proposalId } = req.params
      const executor = (req as any).user.address

      const result = await governanceService.executeProposal(proposalId, executor)

      res.json({
        success: true,
        result,
      })
    } catch (error: any) {
      console.error('Execute proposal error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to execute proposal',
      })
    }
  }

  // Cancel proposal
  async cancel(req: Request, res: Response) {
    try {
      const { proposalId } = req.params
      const canceller = (req as any).user.address

      const result = await governanceService.cancelProposal(proposalId, canceller)

      res.json({
        success: true,
        result,
      })
    } catch (error: any) {
      console.error('Cancel proposal error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cancel proposal',
      })
    }
  }

  // Get comments
  async getComments(req: Request, res: Response) {
    try {
      const { proposalId } = req.params

      const comments = await governanceService.getComments(proposalId)

      res.json({
        success: true,
        comments,
      })
    } catch (error: any) {
      console.error('Get comments error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get comments',
      })
    }
  }

  // Create comment
  async createComment(req: Request, res: Response) {
    try {
      const { proposalId } = req.params
      const { content } = req.body
      const author = (req as any).user.address

      const comment = await governanceService.createComment({
        proposalId,
        author,
        content,
      })

      res.json({
        success: true,
        comment,
      })
    } catch (error: any) {
      console.error('Create comment error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create comment',
      })
    }
  }

  // Create reply
  async createReply(req: Request, res: Response) {
    try {
      const { proposalId, commentId } = req.params
      const { content } = req.body
      const author = (req as any).user.address

      const reply = await governanceService.createReply({
        proposalId,
        parentCommentId: commentId,
        author,
        content,
      })

      res.json({
        success: true,
        reply,
      })
    } catch (error: any) {
      console.error('Create reply error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create reply',
      })
    }
  }

  // Update comment
  async updateComment(req: Request, res: Response) {
    try {
      const { proposalId, commentId } = req.params
      const { content } = req.body
      const author = (req as any).user.address

      const comment = await governanceService.updateComment({
        commentId,
        author,
        content,
      })

      res.json({
        success: true,
        comment,
      })
    } catch (error: any) {
      console.error('Update comment error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update comment',
      })
    }
  }

  // Delete comment
  async deleteComment(req: Request, res: Response) {
    try {
      const { proposalId, commentId } = req.params
      const author = (req as any).user.address

      await governanceService.deleteComment(commentId, author)

      res.json({
        success: true,
      })
    } catch (error: any) {
      console.error('Delete comment error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete comment',
      })
    }
  }

  // Get voting power
  async getVotingPower(req: Request, res: Response) {
    try {
      const { address } = req.params

      const votingPower = await governanceService.getVotingPower(address)

      res.json({
        success: true,
        votingPower,
      })
    } catch (error: any) {
      console.error('Get voting power error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get voting power',
      })
    }
  }

  // Get votes for a proposal
  async getVotes(req: Request, res: Response) {
    try {
      const { proposalId } = req.params

      const votes = await governanceService.getVotes(proposalId)

      res.json({
        success: true,
        votes,
      })
    } catch (error: any) {
      console.error('Get votes error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get votes',
      })
    }
  }

  // Queue proposal
  async queueProposal(req: Request, res: Response) {
    try {
      const { proposalId } = req.params
      const queuer = (req as any).user.address

      const result = await governanceService.queueProposal(proposalId, queuer)

      res.json({
        success: true,
        result,
      })
    } catch (error: any) {
      console.error('Queue proposal error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to queue proposal',
      })
    }
  }

  // Get proposal state
  async getProposalState(req: Request, res: Response) {
    try {
      const { proposalId } = req.params

      const state = await governanceService.getProposalState(proposalId)

      res.json({
        success: true,
        state,
      })
    } catch (error: any) {
      console.error('Get proposal state error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get proposal state',
      })
    }
  }

  // Get proposal timeline
  async getProposalTimeline(req: Request, res: Response) {
    try {
      const { proposalId } = req.params

      const timeline = await governanceService.getProposalTimeline(proposalId)

      res.json({
        success: true,
        timeline,
      })
    } catch (error: any) {
      console.error('Get proposal timeline error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get proposal timeline',
      })
    }
  }

  // Get delegation status
  async getDelegationStatus(req: Request, res: Response) {
    try {
      const { address } = req.params

      const delegation = await governanceService.getDelegationStatus(address)

      res.json({
        success: true,
        delegation,
      })
    } catch (error: any) {
      console.error('Get delegation status error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get delegation status',
      })
    }
  }

  // Delegate votes
  async delegateVotes(req: Request, res: Response) {
    try {
      const { delegatee } = req.body
      const delegator = (req as any).user.address

      const result = await governanceService.delegateVotes(delegator, delegatee)

      res.json({
        success: true,
        result,
      })
    } catch (error: any) {
      console.error('Delegate votes error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delegate votes',
      })
    }
  }

  // Undelegate votes
  async undelegateVotes(req: Request, res: Response) {
    try {
      const delegator = (req as any).user.address

      const result = await governanceService.undelegateVotes(delegator)

      res.json({
        success: true,
        result,
      })
    } catch (error: any) {
      console.error('Undelegate votes error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to undelegate votes',
      })
    }
  }
}

export const governanceController = new GovernanceController()
