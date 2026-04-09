import cron from 'node-cron';

import { env } from '../../config/env.js';
import logger from '../../config/loggers.js';
import { setIngestionStatus } from '../../config/ingestionStatus.js';
import { runPollingCycle } from '../services/polling.service.js';

let scheduledJob = null;
let running = false;

export const startPollingScheduler = () => {
  if (!env.ingestionEnabled) {
    setIngestionStatus({ schedulerStarted: false });
    return null;
  }

  if (scheduledJob) {
    return scheduledJob;
  }

  scheduledJob = cron.schedule(env.pollCron, async () => {
    if (running) {
      return;
    }

    running = true;
    try {
      await runPollingCycle({ lookbackMinutes: env.pollLookbackMinutes });
      setIngestionStatus({ schedulerStarted: true, startupError: null });
    } catch (error) {
      logger.error(
        JSON.stringify({
          service: 'ingestion',
          message: 'Polling scheduler execution failed',
          error: error?.message || String(error),
        })
      );
      setIngestionStatus({ startupError: error?.message || String(error) });
    } finally {
      running = false;
    }
  });

  setIngestionStatus({ schedulerStarted: true });
  return scheduledJob;
};

export const stopPollingScheduler = () => {
  scheduledJob?.stop();
  scheduledJob = null;
  running = false;
};

