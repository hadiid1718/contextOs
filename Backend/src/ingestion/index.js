import { env } from '../config/env.js';
import logger from '../config/loggers.js';
import {
  getIngestionStatus,
  setIngestionStatus,
} from '../config/ingestionStatus.js';
import {
  connectKafkaProducer,
  disconnectKafkaProducer,
} from './config/kafka.js';
import {
  startPollingScheduler,
  stopPollingScheduler,
} from './jobs/pollScheduler.js';

let initialized = false;

export const initializeIngestionModule = async () => {
  if (initialized) {
    return getIngestionStatus();
  }

  setIngestionStatus({
    enabled: env.ingestionEnabled,
    kafkaConnected: false,
    schedulerStarted: false,
    startupError: null,
  });

  if (!env.ingestionEnabled) {
    initialized = true;
    return getIngestionStatus();
  }

  try {
    await connectKafkaProducer();
    setIngestionStatus({ kafkaConnected: true });
    startPollingScheduler();
    setIngestionStatus({ schedulerStarted: true, startupError: null });
    initialized = true;
    return getIngestionStatus();
  } catch (error) {
    setIngestionStatus({
      kafkaConnected: false,
      schedulerStarted: false,
      startupError: error?.message || String(error),
    });
    logger.error(
      JSON.stringify({
        service: 'ingestion',
        message: 'Ingestion module failed to initialize',
        error: error?.message || String(error),
      })
    );
    throw error;
  }
};

export const shutdownIngestionModule = async () => {
  stopPollingScheduler();
  await disconnectKafkaProducer();
  initialized = false;
  setIngestionStatus({ schedulerStarted: false, kafkaConnected: false });
};
