import { Kafka } from 'kafkajs';

import { env } from '../../config/env.js';
import logger from '../../config/loggers.js';
import { AppError } from '../../utils/appError.js';

let kafkaClient = null;
let kafkaProducer = null;
let kafkaConnected = false;

const getKafkaClient = () => {
  if (!kafkaClient) {
    kafkaClient = new Kafka({
      clientId: env.kafkaClientId,
      brokers: env.kafkaBrokers,
    });
  }

  return kafkaClient;
};

export const connectKafkaProducer = async () => {
  if (env.mockKafka) {
    kafkaConnected = true;
    return { mock: true };
  }

  if (!kafkaProducer) {
    kafkaProducer = getKafkaClient().producer();
  }

  if (!kafkaConnected) {
    await kafkaProducer.connect();
    kafkaConnected = true;
  }

  return { mock: false };
};

export const publishToKafka = async (topic, message) => {
  if (env.mockKafka) {
    logger.info(
      JSON.stringify({
        service: 'ingestion',
        mode: 'mock-kafka',
        topic,
        message,
      })
    );
    return { mock: true };
  }

  if (!kafkaProducer) {
    kafkaProducer = getKafkaClient().producer();
  }

  if (!kafkaConnected) {
    await kafkaProducer.connect();
    kafkaConnected = true;
  }

  await kafkaProducer.send({
    topic,
    messages: [
      {
        key: message?.org_id || message?.orgId || undefined,
        value: JSON.stringify(message),
      },
    ],
  });

  return { mock: false };
};

export const disconnectKafkaProducer = async () => {
  if (kafkaProducer && kafkaConnected && !env.mockKafka) {
    await kafkaProducer.disconnect();
  }

  kafkaConnected = false;
};

export const ensureKafkaHealthy = async () => {
  try {
    await connectKafkaProducer();
    return true;
  } catch (error) {
    throw new AppError('Kafka connection failed', 503, error.message);
  }
};

export const isKafkaConnected = () => kafkaConnected || env.mockKafka;
