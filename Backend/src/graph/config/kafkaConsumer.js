import { Kafka } from 'kafkajs';

import { env } from '../../config/env.js';
import logger from '../../config/loggers.js';
import {
  incrementGraphProcessedEvents,
  setGraphStatus,
} from '../../config/graphStatus.js';
import { processGraphEvent } from '../services/graphIngestion.service.js';

let kafkaClient = null;
let kafkaConsumer = null;
let connected = false;

const getKafkaClient = () => {
  if (!kafkaClient) {
    kafkaClient = new Kafka({
      clientId: env.graphKafkaClientId,
      brokers: env.kafkaBrokers,
    });
  }

  return kafkaClient;
};

export const startGraphConsumer = async () => {
  if (env.graphMockKafka) {
    setGraphStatus({ kafkaConnected: true, consumerRunning: false });
    logger.info(
      JSON.stringify({
        service: 'knowledge-graph',
        mode: 'mock-kafka',
        message: 'Kafka consumer skipped because GRAPH_MOCK_KAFKA is enabled',
      })
    );
    return { mock: true };
  }

  if (!kafkaConsumer) {
    kafkaConsumer = getKafkaClient().consumer({
      groupId: env.graphConsumerGroupId,
    });
  }

  if (!connected) {
    await kafkaConsumer.connect();
    await kafkaConsumer.subscribe({ topic: env.graphKafkaTopic, fromBeginning: false });

    await kafkaConsumer.run({
      eachMessage: async ({ message }) => {
        if (!message?.value) {
          return;
        }

        try {
          const parsed = JSON.parse(message.value.toString());
          await processGraphEvent(parsed);
          incrementGraphProcessedEvents();
        } catch (error) {
          logger.error(
            JSON.stringify({
              service: 'knowledge-graph',
              message: 'Failed to process graph event',
              error: error?.message || String(error),
            })
          );
        }
      },
    });

    connected = true;
    setGraphStatus({ kafkaConnected: true, consumerRunning: true, startupError: null });
  }

  return { mock: false };
};

export const stopGraphConsumer = async () => {
  if (kafkaConsumer && connected && !env.graphMockKafka) {
    await kafkaConsumer.disconnect();
  }

  connected = false;
  setGraphStatus({ kafkaConnected: false, consumerRunning: false });
};

