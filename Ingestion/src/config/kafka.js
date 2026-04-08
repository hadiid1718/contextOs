import { Kafka } from 'kafkajs';

import { env } from './env.js';
import { logger } from '../utils/logger.js';

const kafka = new Kafka({
  clientId: env.kafkaClientId,
  brokers: env.kafkaBrokers,
});

export const producer = kafka.producer();

export const connectKafka = async () => {
  if (env.mockKafka) {
    logger.warn('MOCK_KAFKA=true, Kafka producer connect skipped');
    return;
  }

  await producer.connect();
  logger.info(`Kafka producer connected: ${env.kafkaBrokers.join(',')}`);
};

export const disconnectKafka = async () => {
  if (env.mockKafka) {
    return;
  }

  await producer.disconnect();
};

