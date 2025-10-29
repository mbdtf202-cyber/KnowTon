import { PrismaClient } from '@prisma/client';
import { KafkaProducer } from '../utils/kafka';
import { IPFSClient } from '../utils/ipfs';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const prisma = new PrismaClient();
const kafka = new KafkaProducer();
const ipfs = new IPFSClient();

interface UploadContentInput {
  creatorAddress: string;
  file: {
    data: string; // base64
    name: string;
    type: string;
    size: number;
  };
  metadata: {
    title: string;
    description?: string;
    category: string;
    tags?: string[];
  };
}

export class ContentService {
  async uploadContent(input: UploadContentInput) {
    const { creatorAddress, file, metadata } = input;

    // 1. Validate file size and type
    this.validateFile(file);

    // 2. Upload to IPFS
    const fileBuffer = Buffer.from(file.data, 'base64');
    const ipfsHash = await ipfs.upload(fileBuffer, file.name);

    // 3. Generate content hash
    const contentHash = this.generateContentHash(fileBuffer);

    // 4. Generate AI fingerprint (mock for now)
    const aiFingerprint = await this.generateAIFingerprint(fileBuffer, file.type);

    // 5. Store metadata in MongoDB/PostgreSQL
    const content = await prisma.content.create({
      data: {
        creatorAddress,
        title: metadata.title,
        description: metadata.description,
        category: metadata.category,
        tags: metadata.tags || [],
        ipfsHash,
        contentHash,
        aiFingerprint,
        fileType: file.type,
        fileSize: file.size,
        fileName: file.name,
        status: 'uploaded',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 6. Emit ContentUploaded event to Kafka
    await kafka.send({
      topic: 'content-uploaded',
      messages: [
        {
          key: content.id,
          value: JSON.stringify({
            contentId: content.id,
            creatorAddress,
            ipfsHash,
            contentHash,
            aiFingerprint,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });

    logger.info(`Content uploaded: ${content.id}, IPFS: ${ipfsHash}`);

    return {
      id: content.id,
      ipfsHash,
      contentHash,
      aiFingerprint,
      status: 'uploaded',
    };
  }

  async updateMetadata(contentId: string, creatorAddress: string, metadata: any) {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new Error('Content not found');
    }

    if (content.creatorAddress !== creatorAddress) {
      throw new Error('Unauthorized');
    }

    const updated = await prisma.content.update({
      where: { id: contentId },
      data: {
        ...metadata,
        updatedAt: new Date(),
      },
    });

    return updated;
  }

  async getContentStatus(contentId: string) {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new Error('Content not found');
    }

    return {
      id: content.id,
      status: content.status,
      ipfsHash: content.ipfsHash,
      createdAt: content.createdAt,
    };
  }

  async deleteContent(contentId: string, creatorAddress: string) {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new Error('Content not found');
    }

    if (content.creatorAddress !== creatorAddress) {
      throw new Error('Unauthorized');
    }

    await prisma.content.delete({
      where: { id: contentId },
    });

    logger.info(`Content deleted: ${contentId}`);
  }

  private validateFile(file: any) {
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    const ALLOWED_TYPES = [
      'audio/mpeg',
      'audio/wav',
      'video/mp4',
      'image/jpeg',
      'image/png',
      'application/pdf',
    ];

    if (file.size > MAX_SIZE) {
      throw new Error('File too large');
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('File type not allowed');
    }
  }

  private generateContentHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private async generateAIFingerprint(
    buffer: Buffer,
    fileType: string
  ): Promise<string> {
    // In production, call Oracle Adapter Service
    // For now, generate a mock fingerprint
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    return `ai-fp-${hash.slice(0, 16)}`;
  }
}
