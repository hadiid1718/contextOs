import { env } from '../../config/env.js';
import logger from '../../config/loggers.js';
import { ingestEvent } from './eventIngestion.service.js';
import {
  listActiveCredentialsForPolling,
  markCredentialPolled,
} from './integrationCredential.service.js';
import { pollConfluenceEvents } from '../providers/confluence.provider.js';
import { pollGithubEvents } from '../providers/github.provider.js';
import { pollJiraEvents } from '../providers/jira.provider.js';
import { pollSlackEvents } from '../providers/slack.provider.js';

const providers = {
  github: pollGithubEvents,
  jira: pollJiraEvents,
  slack: pollSlackEvents,
  confluence: pollConfluenceEvents,
};

const buildTimeWindow = () => {
  const now = new Date();
  const since = new Date(now.getTime() - env.pollLookbackMinutes * 60 * 1000);

  return {
    now,
    sinceIso: since.toISOString(),
    sinceEpochSeconds: Math.floor(since.getTime() / 1000),
  };
};

export const runPollingCycle = async () => {
  const { sinceIso, sinceEpochSeconds } = buildTimeWindow();

  for (const [provider, pollProvider] of Object.entries(providers)) {
    const credentials = await listActiveCredentialsForPolling(provider);

    for (const credential of credentials) {
      try {
        const polledEvents = await pollProvider({
          credentials: credential.credentials,
          settings: credential.settings,
          sinceIso,
          sinceEpochSeconds,
        });

        for (const event of polledEvents) {
          await ingestEvent({
            orgId: credential.org_id,
            source: provider,
            eventType: event.eventType,
            payload: event.payload,
            metadata: {
              ...event.metadata,
              delivery_mode: 'poll',
            },
          });
        }

        await markCredentialPolled(credential.id);
      } catch (error) {
        logger.error(
          `Polling failed for provider=${provider} org_id=${credential.org_id}: ${error.message}`
        );
      }
    }
  }
};

