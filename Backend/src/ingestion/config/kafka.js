import { Kafka, logLevel } from 'kafkajs';

import { env } from '../../config/env.js';
import logger from '../../config/loggers.js';
import { withRetry } from '../services/retry.service.js';

let producer;
let isConnected = false;

const createProducer = () => {
  if (producer) {
    return producer;
  }

  const kafka = new Kafka({
    clientId: env.kafkaClientId,
    brokers: env.kafkaBrokers,
    logLevel: logLevel.NOTHING,
  });

  producer = kafka.producer({ allowAutoTopicCreation: true });
  return producer;
};

export const connectKafka = async () => {
  if (env.mockKafka) {
    logger.warn('MOCK_KAFKA enabled: Kafka events will only be logged');
    isConnected = true;
    return;
  }

  const kafkaProducer = createProducer();

  await withRetry(() => kafkaProducer.connect(), {
    retries: env.retryMaxRetries,
    baseDelayMs: env.retryBaseDelayMs,
    maxDelayMs: env.retryMaxDelayMs,
  });

  isConnected = true;
  logger.info('Kafka producer connected for ingestion module');
};

export const disconnectKafka = async () => {
  if (producer && isConnected && !env.mockKafka) {
    await producer.disconnect();
  }

  isConnected = false;
};

export const sendKafkaMessage = async message => {
  if (env.mockKafka) {
    logger.info(
      `MOCK Kafka publish topic=${env.kafkaTopic} payload=${JSON.stringify(message)}`
    );
    return;
  }

  if (!producer || !isConnected) {
    throw new Error('Kafka producer is not connected');
  }

  await withRetry(
    () =>
      producer.send({
        topic: env.kafkaTopic,
        messages: [{ value: JSON.stringify(message) }],
      }),
    {
      retries: env.retryMaxRetries,
      baseDelayMs: env.retryBaseDelayMs,
      maxDelayMs: env.retryMaxDelayMs,
    }
  );
};

