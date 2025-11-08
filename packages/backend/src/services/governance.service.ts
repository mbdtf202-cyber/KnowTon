import { ethers } from 'ethers'
import { governanceExecutionService } from './governance-execution.service'

interface Proposal {
  id: string
  proposer: string
  proposalType: 'PARAMETER_CHANGE' | 'DISPUTE_RESOLUTION' | 'TREASURY_ALLOCATION' | 'CONTRACT_UPGRADE'
  description: string
  status: 'PENDING' | 'ACTIVE' | 'SUCCEEDED' | 'DEFEATED' | 'EXECUTED' | 'CANCELLED' | 'QUEUED' | 'EXPIRED'
  forVotes: string
  againstVotes: string
  abstainVotes: string
  startBlock: number
  endBlock: number
  eta?: number
  createdAt: Date
  updatedAt: Date
}

interface Comment {
  id: string
  proposalId: string
  parentCommentId?: string
  author: string
  authorAddress: string
  content: string
  createdAt: Date
  updatedAt: Date
  replies?: Comment[]
}

interface Vote {
  id: string
  proposalId: string
  voter: string
  support: number
  weight: string
  reason?: string
  createdAt: Date
}

class GovernanceService {
  private proposals: Map<string, Proposal> = new Map()
  private comments: Map<string, Comment[]> = new Map()
  private votes: Map<string, Vote[]> = new Map()

  constructor() {
    // Initialize with mock data
    this.initializeMockData()
  }

  private initializeMockData() {
    const mockProposals: Proposal[] = [
      {
        id: '1',
        proposer: '0x1234567890abcdef',
        proposalType: 'PARAMETER_CHANGE',
        description: 'Proposal to reduce platform fee from 2.5% to 2.0%',
        status: 'ACTIVE',
        forVotes: '125000',
        againstVotes: '45000',
        abstainVotes: '10000',
        startBlock: 1000000,
        endBlock: 1050000,
        createdAt: new Date(Date.now() - 86400000 * 2),
        updatedAt: new Date(Date.now() - 86400000 * 2),
      },
      {
        id: '2',
        proposer: '0xabcdef1234567890',
        proposalType: 'TREASURY_ALLOCATION',
        description: 'Allocate 100,000 USDC from DAO treasury for marketing campaign',
        status: 'ACTIVE',
        forVotes: '200000',
        againstVotes: '80000',
        abstainVotes: '20000',
        startBlock: 1020000,
        endBlock: 1070000,
        createdAt: new Date(Date.now() - 86400000 * 3),
        updatedAt: new Date(Date.now() - 86400000 * 3),
      },
    ]

    mockProposals.forEach((p) => this.proposals.set(p.id, p))
  }

  // Get all proposals
  async getProposals(filters: {
    status?: string
    proposalType?: string
    limit: number
    offset: number
  }) {
    let proposals = Array.from(this.proposals.values())

    if (filters.status) {
      proposals = proposals.filter((p) => p.status === filters.status)
    }

    if (filters.proposalType) {
      proposals = proposals.filter((p) => p.proposalType === filters.proposalType)
    }

    // Sort by creation date (newest first)
    proposals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Apply pagination
    const paginatedProposals = proposals.slice(filters.offset, filters.offset + filters.limit)

    return {
      proposals: paginatedProposals,
      total: proposals.length,
      limit: filters.limit,
      offset: filters.offset,
    }
  }

  // Get single proposal
  async getProposal(proposalId: string) {
    return this.proposals.get(proposalId) || null
  }

  // Create proposal
  async createProposal(data: {
    proposer: string
    proposalType: Proposal['proposalType']
    description: string
    targets?: string[]
    values?: string[]
    calldatas?: string[]
  }) {
    const proposalId = String(this.proposals.size + 1)
    const currentBlock = 1100000 // Mock current block

    const proposal: Proposal = {
      id: proposalId,
      proposer: data.proposer,
      proposalType: data.proposalType,
      description: data.description,
      status: 'PENDING',
      forVotes: '0',
      againstVotes: '0',
      abstainVotes: '0',
      startBlock: currentBlock + 1, // Voting delay
      endBlock: currentBlock + 50401, // Voting period
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.proposals.set(proposalId, proposal)

    // Initialize empty comments and votes
    this.comments.set(proposalId, [])
    this.votes.set(proposalId, [])

    return proposal
  }

  // Cast vote
  async castVote(data: { proposalId: string; voter: string; support: number; reason?: string }) {
    const proposal = this.proposals.get(data.proposalId)
    if (!proposal) {
      throw new Error('Proposal not found')
    }

    if (proposal.status !== 'ACTIVE') {
      throw new Error('Proposal is not active')
    }

    // Check if already voted
    const proposalVotes = this.votes.get(data.proposalId) || []
    const existingVote = proposalVotes.find((v) => v.voter === data.voter)
    if (existingVote) {
      throw new Error('Already voted')
    }

    // Mock voting power (in real implementation, get from contract)
    const votingPower = '50000'

    const vote: Vote = {
      id: String(Date.now()),
      proposalId: data.proposalId,
      voter: data.voter,
      support: data.support,
      weight: votingPower,
      reason: data.reason,
      createdAt: new Date(),
    }

    proposalVotes.push(vote)
    this.votes.set(data.proposalId, proposalVotes)

    // Update proposal vote counts
    if (data.support === 1) {
      proposal.forVotes = String(Number(proposal.forVotes) + Number(votingPower))
    } else if (data.support === 0) {
      proposal.againstVotes = String(Number(proposal.againstVotes) + Number(votingPower))
    } else if (data.support === 2) {
      proposal.abstainVotes = String(Number(proposal.abstainVotes) + Number(votingPower))
    }

    proposal.updatedAt = new Date()
    this.proposals.set(data.proposalId, proposal)

    return vote
  }

  // Execute proposal
  async executeProposal(proposalId: string, executor: string) {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) {
      throw new Error('Proposal not found')
    }

    if (proposal.status !== 'SUCCEEDED' && proposal.status !== 'QUEUED') {
      throw new Error('Proposal cannot be executed')
    }

    // Check timelock if queued
    if (proposal.status === 'QUEUED' && proposal.eta) {
      if (Date.now() / 1000 < proposal.eta) {
        throw new Error('Timelock not met')
      }
    }

    proposal.status = 'EXECUTED'
    proposal.updatedAt = new Date()
    this.proposals.set(proposalId, proposal)

    return {
      proposalId,
      executor,
      executedAt: new Date(),
    }
  }

  // Cancel proposal
  async cancelProposal(proposalId: string, canceller: string) {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) {
      throw new Error('Proposal not found')
    }

    if (proposal.proposer !== canceller) {
      throw new Error('Only proposer can cancel')
    }

    if (proposal.status === 'EXECUTED') {
      throw new Error('Cannot cancel executed proposal')
    }

    proposal.status = 'CANCELLED'
    proposal.updatedAt = new Date()
    this.proposals.set(proposalId, proposal)

    return {
      proposalId,
      canceller,
      cancelledAt: new Date(),
    }
  }

  // Get comments
  async getComments(proposalId: string) {
    const comments = this.comments.get(proposalId) || []

    // Organize comments with replies
    const topLevelComments = comments.filter((c) => !c.parentCommentId)
    const repliesMap = new Map<string, Comment[]>()

    comments
      .filter((c) => c.parentCommentId)
      .forEach((reply) => {
        const parentId = reply.parentCommentId!
        if (!repliesMap.has(parentId)) {
          repliesMap.set(parentId, [])
        }
        repliesMap.get(parentId)!.push(reply)
      })

    // Attach replies to parent comments
    const commentsWithReplies = topLevelComments.map((comment) => ({
      ...comment,
      replies: repliesMap.get(comment.id) || [],
    }))

    return commentsWithReplies
  }

  // Create comment
  async createComment(data: { proposalId: string; author: string; content: string }) {
    const proposal = this.proposals.get(data.proposalId)
    if (!proposal) {
      throw new Error('Proposal not found')
    }

    const comment: Comment = {
      id: String(Date.now()),
      proposalId: data.proposalId,
      author: 'User', // In real implementation, get from user profile
      authorAddress: data.author,
      content: data.content,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const proposalComments = this.comments.get(data.proposalId) || []
    proposalComments.push(comment)
    this.comments.set(data.proposalId, proposalComments)

    return comment
  }

  // Create reply
  async createReply(data: {
    proposalId: string
    parentCommentId: string
    author: string
    content: string
  }) {
    const proposal = this.proposals.get(data.proposalId)
    if (!proposal) {
      throw new Error('Proposal not found')
    }

    const proposalComments = this.comments.get(data.proposalId) || []
    const parentComment = proposalComments.find((c) => c.id === data.parentCommentId)
    if (!parentComment) {
      throw new Error('Parent comment not found')
    }

    const reply: Comment = {
      id: String(Date.now()),
      proposalId: data.proposalId,
      parentCommentId: data.parentCommentId,
      author: 'User',
      authorAddress: data.author,
      content: data.content,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    proposalComments.push(reply)
    this.comments.set(data.proposalId, proposalComments)

    return reply
  }

  // Update comment
  async updateComment(data: { commentId: string; author: string; content: string }) {
    for (const [proposalId, comments] of this.comments.entries()) {
      const comment = comments.find((c) => c.id === data.commentId)
      if (comment) {
        if (comment.authorAddress !== data.author) {
          throw new Error('Not authorized to update this comment')
        }

        comment.content = data.content
        comment.updatedAt = new Date()
        this.comments.set(proposalId, comments)

        return comment
      }
    }

    throw new Error('Comment not found')
  }

  // Delete comment
  async deleteComment(commentId: string, author: string) {
    for (const [proposalId, comments] of this.comments.entries()) {
      const commentIndex = comments.findIndex((c) => c.id === commentId)
      if (commentIndex !== -1) {
        const comment = comments[commentIndex]
        if (comment.authorAddress !== author) {
          throw new Error('Not authorized to delete this comment')
        }

        comments.splice(commentIndex, 1)
        this.comments.set(proposalId, comments)

        return
      }
    }

    throw new Error('Comment not found')
  }

  // Get voting power
  async getVotingPower(address: string) {
    // In real implementation, call governance contract
    const tokenBalance = '100000'
    const quadraticWeight = Math.sqrt(Number(tokenBalance)).toFixed(2)
    const activityScore = 750
    const activityMultiplier = activityScore > 1000 ? 50 : (activityScore * 50) / 1000
    const totalVotingPower = (Number(quadraticWeight) * (1 + activityMultiplier / 100)).toFixed(2)

    return {
      address,
      votingPower: totalVotingPower,
      tokenBalance,
      quadraticWeight,
      activityScore,
      activityMultiplier,
      totalVotingPower,
    }
  }

  // Get delegation status
  async getDelegationStatus(address: string) {
    // In real implementation, call governance contract
    // Mock: randomly return delegation status
    const isDelegated = Math.random() > 0.7
    return {
      address,
      isDelegated,
      delegatee: isDelegated ? '0x' + Math.random().toString(16).substring(2, 42) : null,
    }
  }

  // Delegate votes
  async delegateVotes(delegator: string, delegatee: string) {
    // In real implementation, call governance contract
    return {
      delegator,
      delegatee,
      txHash: '0x' + Math.random().toString(16).substring(2, 66),
      timestamp: new Date(),
    }
  }

  // Undelegate votes
  async undelegateVotes(delegator: string) {
    // In real implementation, call governance contract
    return {
      delegator,
      txHash: '0x' + Math.random().toString(16).substring(2, 66),
      timestamp: new Date(),
    }
  }

  // Get votes
  async getVotes(proposalId: string) {
    return this.votes.get(proposalId) || []
  }

  // Queue proposal
  async queueProposal(proposalId: string, queuer: string) {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) {
      throw new Error('Proposal not found')
    }

    if (proposal.status !== 'SUCCEEDED') {
      throw new Error('Proposal has not succeeded')
    }

    // Set ETA (48 hours from now)
    const eta = Math.floor(Date.now() / 1000) + 172800

    proposal.status = 'QUEUED'
    proposal.eta = eta
    proposal.updatedAt = new Date()
    this.proposals.set(proposalId, proposal)

    // Add to execution queue
    await governanceExecutionService.queueProposal({
      proposalId,
      eta,
      targets: [], // In production, get from proposal
      values: [], // In production, get from proposal
      calldatas: [], // In production, get from proposal
    })

    return {
      proposalId,
      eta,
      queuedAt: new Date(),
    }
  }

  // Get proposal state
  async getProposalState(proposalId: string) {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) {
      throw new Error('Proposal not found')
    }

    const currentBlock = 1100000 // Mock current block
    let state = proposal.status

    // Update state based on block numbers
    if (currentBlock <= proposal.startBlock) {
      state = 'PENDING'
    } else if (currentBlock <= proposal.endBlock) {
      state = 'ACTIVE'
    } else if (state === 'ACTIVE') {
      // Check if passed
      const totalVotes =
        Number(proposal.forVotes) + Number(proposal.againstVotes) + Number(proposal.abstainVotes)
      const quorum = 40000 // 4% of 1M total supply
      const passed = Number(proposal.forVotes) > Number(proposal.againstVotes) && totalVotes >= quorum

      state = passed ? 'SUCCEEDED' : 'DEFEATED'
    }

    return {
      proposalId,
      state,
      currentBlock,
      startBlock: proposal.startBlock,
      endBlock: proposal.endBlock,
    }
  }

  // Get proposal timeline
  async getProposalTimeline(proposalId: string) {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) {
      throw new Error('Proposal not found')
    }

    const timeline = [
      {
        event: 'Created',
        timestamp: proposal.createdAt,
        description: `Proposal created by ${proposal.proposer}`,
      },
      {
        event: 'Voting Started',
        block: proposal.startBlock,
        description: 'Voting period began',
      },
      {
        event: 'Voting Ends',
        block: proposal.endBlock,
        description: 'Voting period ends',
      },
    ]

    if (proposal.status === 'QUEUED' && proposal.eta) {
      timeline.push({
        event: 'Queued',
        timestamp: new Date(proposal.eta * 1000 - 172800000),
        description: 'Proposal queued for execution',
      })
      timeline.push({
        event: 'Executable',
        timestamp: new Date(proposal.eta * 1000),
        description: 'Proposal can be executed',
      })
    }

    if (proposal.status === 'EXECUTED') {
      timeline.push({
        event: 'Executed',
        timestamp: proposal.updatedAt,
        description: 'Proposal executed',
      })
    }

    if (proposal.status === 'CANCELLED') {
      timeline.push({
        event: 'Cancelled',
        timestamp: proposal.updatedAt,
        description: 'Proposal cancelled',
      })
    }

    return timeline
  }
}

export const governanceService = new GovernanceService()
