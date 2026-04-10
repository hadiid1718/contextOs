import { env } from '../config/env.js';
import { setGraphStatus, getGraphStatus } from '../config/graphStatus.js';
import logger from '../config/loggers.js';
import { createGraphIndexes } from '../config/graphMigrations.js';
import {
  startGraphConsumer,
  stopGraphConsumer,
} from './config/kafkaConsumer.js';

let initialized = false;

export const initializeKnowledgeGraphModule = async () => {
  if (initialized) {
    return getGraphStatus();
  }

  setGraphStatus({
    enabled: env.graphEnabled,
    kafkaConnected: false,
    consumerRunning: false,
    startupError: null,
    processedEvents: 0,
  });

  if (!env.graphEnabled) {
    initialized = true;
    return getGraphStatus();
  }

  try {
    await createGraphIndexes();
    await startGraphConsumer();
    initialized = true;
    return getGraphStatus();
  } catch (error) {
    setGraphStatus({
      kafkaConnected: false,
      consumerRunning: false,
      startupError: error?.message || String(error),
    });
    logger.error(
      JSON.stringify({
        service: 'knowledge-graph',
        message: 'Knowledge graph module failed to initialize',
        error: error?.message || String(error),
      })
    );
    throw error;
  }
};

export const shutdownKnowledgeGraphModule = async () => {
  await stopGraphConsumer();
  initialized = false;
  setGraphStatus({ kafkaConnected: false, consumerRunning: false });
};
