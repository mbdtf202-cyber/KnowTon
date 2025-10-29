import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { KafkaProducer } from '../utils/kafka';
import { CeramicClient } from '../utils/ceramic';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const kafka = new KafkaProducer();
const ceramic = new CeramicClient();

interface RegisterCreatorInput {
  walletAddress: string;
  signature: string;
  message: string;
  profile?: {
    displayName?: string;
    bio?: string;
    avatar?: string;
    website?: string;
    social?: {
      twitter?: string;
      instagram?: string;
      youtube?: string;
    };
  };
}

export class CreatorService {
  async registerCreator(input: RegisterCreatorInput) {
    const { walletAddress, signature, message, profile } = input;

    // 1. Verify wallet signature (SIWE)
    const isValid = await this.verifySignature(walletAddress, signature, message);
    if (!isValid) {
      throw new Error('Invalid signature');
    }

    // 2. Check if creator already exists
    const existing = await prisma.creator.findUnique({
      where: { walletAddress },
    });

    if (existing) {
      throw new Error('Creator already registered');
    }

    // 3. Create DID on Ceramic
    const did = await ceramic.createDID(walletAddress);

    // 4. Store creator profile in PostgreSQL
    const creator = await prisma.creator.create({
      data: {
        walletAddress,
        did,
        displayName: profile?.displayName || walletAddress.slice(0, 8),
        bio: profile?.bio,
        avatar: profile?.avatar,
        website: profile?.website,
        social: profile?.social || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 5. Emit CreatorRegistered event to Kafka
    await kafka.send({
      topic: 'creator-registered',
      messages: [
        {
          key: walletAddress,
          value: JSON.stringify({
            walletAddress,
            did,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });

    logger.info(`Creator registered: ${walletAddress}, DID: ${did}`);

    return creator;
  }

  async getCreatorProfile(walletAddress: string) {
    const creator = await prisma.creator.findUnique({
      where: { walletAddress },
      include: {
        contents: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return creator;
  }

  async updateCreatorProfile(walletAddress: string, updates: any) {
    const creator = await prisma.creator.update({
      where: { walletAddress },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });

    return creator;
  }

  async getCreatorPortfolio(walletAddress: string) {
    const contents = await prisma.content.findMany({
      where: { creatorAddress: walletAddress },
      orderBy: { createdAt: 'desc' },
    });

    const stats = await prisma.content.aggregate({
      where: { creatorAddress: walletAddress },
      _count: true,
      _sum: {
        views: true,
        likes: true,
      },
    });

    return {
      contents,
      stats: {
        totalContents: stats._count,
        totalViews: stats._sum.views || 0,
        totalLikes: stats._sum.likes || 0,
      },
    };
  }

  private async verifySignature(
    address: string,
    signature: string,
    message: string
  ): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      logger.error('Signature verification failed:', error);
      return false;
    }
  }
}
