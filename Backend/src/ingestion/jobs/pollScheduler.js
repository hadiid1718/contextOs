import cron from 'node-cron';

import { env } from '../../config/env.js';
import logger from '../../config/loggers.js';
import { runPollingCycle } from '../services/polling.service.js';

export const startPollScheduler = () => {
  const task = cron.schedule(
    env.pollCron,
    async () => {
      try {
        await runPollingCycle();
      } catch (error) {
        logger.error(`Polling cycle failed: ${error.message}`);
      }
    },
    { scheduled: true }
  );

  logger.info(`Ingestion poll scheduler started with cron: ${env.pollCron}`);
  return task;
};

