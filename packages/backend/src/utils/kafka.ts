import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { logger } from './logger';

export class KafkaProducer {
  private kafka: Kafka;
  private producer: Producer;
  private connected: boolean = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'creator-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.producer = this.kafka.producer();
  }

  async connect() {
    if (!this.connected) {
      await this.producer.connect();
      this.connected = true;
      logger.info('Kafka producer connected');
    }
  }

  async send(record: ProducerRecord) {
    try {
      await this.connect();
      await this.producer.send(record);
    } catch (error) {
      logger.error('Kafka send error:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
    }
  }
}
