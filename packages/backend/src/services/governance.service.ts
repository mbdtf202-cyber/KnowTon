import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class GovernanceService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private governanceContract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'
    );

    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', this.provider);

    const contractAddress = process.env.DAO_GOVERNANCE_ADDRESS || '';
    const abi = [
      'function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) external returns (uint256)',
      'function castVote(uint256 proposalId, uint8 support) external returns (uint256)',
      'function castVoteWithReason(uint256 proposalId, uint8 support, string reason) external returns (uint256)',
      'function queue(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) external returns (uint256)',
      'function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) external payable returns (uint256)',
      'function cancel(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) external returns (uint256)',
      'function state(uint256 proposalId) external view returns (uint8)',
      'function proposalVotes(uint256 proposalId) external view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)',
      'function hasVoted(uint256 proposalId, address account) external view returns (bool)',
      'function hashProposal(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) external pure returns (uint256)',
    ];

    this.governanceContract = new ethers.Contract(contractAddress, abi, this.wallet);
  }

  async createProposal(
    proposer: string,
    targets: string[],
    values: string[],
    calldatas: string[],
    description: string
  ) {
    try {
      const tx = await this.governanceContract.propose(targets, values, calldatas, description, {
        gasLimit: 1000000,
      });

      const receipt = await tx.wait();

      const descriptionHash = ethers.id(description);
      const proposalId = await this.governanceContract.hashProposal(
        targets,
        values,
        calldatas,
        descriptionHash
      );

      await prisma.proposal.create({
        data: {
          proposalId: proposalId.toString(),
          proposer,
          targets,
          values,
          calldatas,
          description,
          descriptionHash,
          status: 'pending',
          txHash: receipt.hash,
          createdAt: new Date(),
        },
      });

      logger.info(`Proposal created: proposalId=${proposalId}, tx=${receipt.hash}`);

      return {
        proposalId: proposalId.toString(),
        txHash: receipt.hash,
      };
    } catch (error) {
      logger.error('Error creating proposal:', error);
      throw error;
    }
  }

  async vote(proposalId: string, voter: string, support: number, reason?: string) {
    try {
      let tx;
      if (reason) {
        tx = await this.governanceContract.castVoteWithReason(proposalId, support, reason, {
          gasLimit: 300000,
        });
      } else {
        tx = await this.governanceContract.castVote(proposalId, support, {
          gasLimit: 300000,
        });
      }

      await tx.wait();

      await prisma.vote.create({
        data: {
          proposalId,
          voter,
          support,
          reason,
          txHash: tx.hash,
          createdAt: new Date(),
        },
      });

      logger.info(`Vote cast: proposalId=${proposalId}, voter=${voter}, support=${support}, tx=${tx.hash}`);

      return {
        txHash: tx.hash,
        proposalId,
        support,
      };
    } catch (error) {
      logger.error('Error voting:', error);
      throw error;
    }
  }

  async queueProposal(
    proposalId: string,
    targets: string[],
    values: string[],
    calldatas: string[],
    descriptionHash: string
  ) {
    try {
      const tx = await this.governanceContract.queue(targets, values, calldatas, descriptionHash, {
        gasLimit: 500000,
      });

      await tx.wait();

      await prisma.proposal.update({
        where: { proposalId },
        data: {
          status: 'queued',
          updatedAt: new Date(),
        },
      });

      logger.info(`Proposal queued: proposalId=${proposalId}, tx=${tx.hash}`);

      return {
        txHash: tx.hash,
        proposalId,
      };
    } catch (error) {
      logger.error('Error queuing proposal:', error);
      throw error;
    }
  }

  async executeProposal(
    proposalId: string,
    targets: string[],
    values: string[],
    calldatas: string[],
    descriptionHash: string
  ) {
    try {
      const tx = await this.governanceContract.execute(targets, values, calldatas, descriptionHash, {
        gasLimit: 1000000,
      });

      await tx.wait();

      await prisma.proposal.update({
        where: { proposalId },
        data: {
          status: 'executed',
          updatedAt: new Date(),
        },
      });

      logger.info(`Proposal executed: proposalId=${proposalId}, tx=${tx.hash}`);

      return {
        txHash: tx.hash,
        proposalId,
      };
    } catch (error) {
      logger.error('Error executing proposal:', error);
      throw error;
    }
  }

  async cancelProposal(
    proposalId: string,
    targets: string[],
    values: string[],
    calldatas: string[],
    descriptionHash: string
  ) {
    try {
      const tx = await this.governanceContract.cancel(targets, values, calldatas, descriptionHash, {
        gasLimit: 500000,
      });

      await tx.wait();

      await prisma.proposal.update({
        where: { proposalId },
        data: {
          status: 'cancelled',
          updatedAt: new Date(),
        },
      });

      logger.info(`Proposal cancelled: proposalId=${proposalId}, tx=${tx.hash}`);

      return {
        txHash: tx.hash,
        proposalId,
      };
    } catch (error) {
      logger.error('Error cancelling proposal:', error);
      throw error;
    }
  }

  async getProposalState(proposalId: string) {
    try {
      const state = await this.governanceContract.state(proposalId);
      const stateNames = [
        'Pending',
        'Active',
        'Canceled',
        'Defeated',
        'Succeeded',
        'Queued',
        'Expired',
        'Executed',
      ];
      return stateNames[state] || 'Unknown';
    } catch (error) {
      logger.error('Error getting proposal state:', error);
      throw error;
    }
  }

  async getProposalVotes(proposalId: string) {
    try {
      const votes = await this.governanceContract.proposalVotes(proposalId);
      return {
        againstVotes: votes.againstVotes.toString(),
        forVotes: votes.forVotes.toString(),
        abstainVotes: votes.abstainVotes.toString(),
      };
    } catch (error) {
      logger.error('Error getting proposal votes:', error);
      throw error;
    }
  }

  async hasVoted(proposalId: string, address: string) {
    try {
      return await this.governanceContract.hasVoted(proposalId, address);
    } catch (error) {
      logger.error('Error checking if voted:', error);
      throw error;
    }
  }

  async getProposal(proposalId: string) {
    const proposal = await prisma.proposal.findUnique({
      where: { proposalId },
      include: {
        votes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    const [state, votes] = await Promise.all([
      this.getProposalState(proposalId),
      this.getProposalVotes(proposalId),
    ]);

    return {
      ...proposal,
      state,
      votes: {
        ...votes,
        details: proposal.votes,
      },
    };
  }

  async getAllProposals(limit: number = 50, offset: number = 0) {
    const proposals = await prisma.proposal.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        _count: {
          select: { votes: true },
        },
      },
    });

    const total = await prisma.proposal.count();

    return {
      proposals,
      total,
      limit,
      offset,
    };
  }

  async getUserVotes(address: string) {
    return await prisma.vote.findMany({
      where: { voter: address },
      orderBy: { createdAt: 'desc' },
      include: {
        proposal: true,
      },
    });
  }
}
