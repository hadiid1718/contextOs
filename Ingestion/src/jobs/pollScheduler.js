import cron from 'node-cron';

import { env } from '../config/env.js';
import { pollConfluence } from '../integrations/confluence.client.js';
import { pollGithub } from '../integrations/github.client.js';
import { pollJira } from '../integrations/jira.client.js';
import { pollSlack } from '../integrations/slack.client.js';
import { OAuthCredential } from '../models/OAuthCredential.js';
import { processPolledItems } from '../services/ingestion.service.js';
import { logger } from '../utils/logger.js';
import { retryWithBackoff } from '../utils/retry.js';

const buildSinceIso = () => {
  const now = Date.now();
  return new Date(now - env.pollLookbackMinutes * 60 * 1000).toISOString();
};

const runSourcePoll = async ({ org_id, source, poller, sinceIso }) => {
  const items = await retryWithBackoff(() => poller({ org_id, sinceIso }), {
    retries: 4,
    baseDelayMs: 300,
    maxDelayMs: 5000,
    jitterRatio: 0.3,
    onRetry: ({ attempt, delay, error }) => {
      logger.warn(
        `Poll retry source=${source} org=${org_id} #${attempt} delay=${delay}ms err=${error.message}`
      );
    },
  });

  if (items.length > 0) {
    await processPolledItems({ org_id, source, items });
    logger.info(`Polled ${source} for org ${org_id}: ${items.length} events`);
  }
};

export const runPollingCycle = async () => {
  const orgIds = await OAuthCredential.distinct('org_id');
  const sinceIso = buildSinceIso();

  for (const org_id of orgIds) {
    await runSourcePoll({ org_id, source: 'github', poller: pollGithub, sinceIso });
    await runSourcePoll({ org_id, source: 'jira', poller: pollJira, sinceIso });
    await runSourcePoll({ org_id, source: 'slack', poller: pollSlack, sinceIso });
    await runSourcePoll({
      org_id,
      source: 'confluence',
      poller: pollConfluence,
      sinceIso,
    });
  }
};

export const startPollScheduler = () => {
  const task = cron.schedule(env.pollCron, async () => {
    try {
      await runPollingCycle();
    } catch (error) {
      logger.error(`Polling cycle failed: ${error.message}`);
    }
  });

  logger.info(`Poll scheduler started with cron: ${env.pollCron}`);
  return task;
};

