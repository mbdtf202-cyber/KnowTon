import { Kafka, Producer, Consumer } from 'kafkajs';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export class DataSyncService {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'data-sync-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'data-sync-group' });
  }

  async start() {
    await this.producer.connect();
    await this.consumer.connect();

    await this.consumer.subscribe({
      topics: [
        'nft-minted',
        'trades',
        'royalty-distributions',
        'content-uploaded',
        'staking-events',
        'proposals-created',
        'votes-cast',
        'bonds-issued',
        'loans-borrowed',
      ],
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const data = JSON.parse(message.value?.toString() || '{}');
          await this.processMessage(topic, data);
        } catch (error) {
          console.error(`Error processing message from ${topic}:`, error);
          await this.sendToDLQ(topic, message);
        }
      },
    });
  }

  private async processMessage(topic: string, data: any) {
    switch (topic) {
      case 'nft-minted':
        await this.syncNFTMinted(data);
        break;
      case 'trades':
        await this.syncTrade(data);
        break;
      case 'royalty-distributions':
        await this.syncRoyaltyDistribution(data);
        break;
      case 'content-uploaded':
        await this.syncContentUploaded(data);
        break;
      case 'staking-events':
        await this.syncStakingEvent(data);
        break;
      case 'proposals-created':
        await this.syncProposalCreated(data);
        break;
      case 'votes-cast':
        await this.syncVoteCast(data);
        break;
      default:
        console.log(`Unhandled topic: ${topic}`);
    }
  }

  private async syncNFTMinted(data: any) {
    await redis.del(`analytics:content:${data.tokenId}`);
    
    await this.producer.send({
      topic: 'analytics-events',
      messages: [{
        value: JSON.stringify({
          type: 'nft_minted',
          tokenId: data.tokenId,
          creator: data.creator,
          timestamp: Date.now(),
        }),
      }],
    });
  }

  private async syncTrade(data: any) {
    await redis.del(`analytics:content:${data.tokenId}`);
    await redis.del(`analytics:creator:${data.seller}`);
    await redis.del(`analytics:creator:${data.buyer}`);
    await redis.del('analytics:platform');
    
    await this.producer.send({
      topic: 'analytics-events',
      messages: [{
        value: JSON.stringify({
          type: 'trade_executed',
          tokenId: data.tokenId,
          buyer: data.buyer,
          seller: data.seller,
          price: data.price,
          timestamp: Date.now(),
        }),
      }],
    });
  }

  private async syncRoyaltyDistribution(data: any) {
    await redis.del(`analytics:content:${data.tokenId}`);
    
    for (const beneficiary of data.beneficiaries) {
      await redis.del(`analytics:creator:${beneficiary.address}`);
    }
  }

  private async syncContentUploaded(data: any) {
    await redis.del(`analytics:creator:${data.creatorAddress}`);
  }

  private async syncStakingEvent(data: any) {
    await redis.del(`analytics:creator:${data.userAddress}`);
  }

  private async syncProposalCreated(data: any) {
    await redis.del('analytics:platform');
  }

  private async syncVoteCast(data: any) {
    await redis.del('analytics:platform');
  }

  private async sendToDLQ(topic: string, message: any) {
    await this.producer.send({
      topic: 'dlq-failed-events',
      messages: [{
        value: JSON.stringify({
          originalTopic: topic,
          message: message.value?.toString(),
          error: 'Processing failed',
          timestamp: Date.now(),
        }),
      }],
    });
  }

  async stop() {
    await this.consumer.disconnect();
    await this.producer.disconnect();
  }
}
