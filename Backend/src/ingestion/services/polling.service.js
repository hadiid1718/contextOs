import logger from '../../config/loggers.js';
import { IntegrationCredential } from '../models/IntegrationCredential.js';
import { ingestNormalizedEvents } from './eventIngestion.service.js';
import { markCredentialSync, decryptStoredCredential } from './integrationCredential.service.js';
import { pollConfluenceCredential } from '../providers/confluence.provider.js';
import { pollGithubCredential } from '../providers/github.provider.js';
import { pollJiraCredential } from '../providers/jira.provider.js';
import { pollSlackCredential } from '../providers/slack.provider.js';

const pollers = {
  github: pollGithubCredential,
  jira: pollJiraCredential,
  slack: pollSlackCredential,
  confluence: pollConfluenceCredential,
};

const buildLookbackDate = lookbackMinutes =>
  new Date(Date.now() - lookbackMinutes * 60 * 1000);

export const runPollingCycle = async ({ lookbackMinutes = 15 } = {}) => {
  const credentials = await IntegrationCredential.find({ status: 'active' }).sort({ updatedAt: -1 });
  const cycleStartedAt = new Date();
  const results = [];

  for (const credential of credentials) {
    const poller = pollers[credential.provider];

    if (!poller) {
      continue;
    }

    try {
      const events = await poller({
        credential,
        decryptedCredentials: decryptStoredCredential(credential),
        since: credential.lastSyncedAt || buildLookbackDate(lookbackMinutes),
      });

      if (events.length > 0) {
        await ingestNormalizedEvents(events);
      }

      await markCredentialSync(credential.id, {
        lastSyncedAt: cycleStartedAt,
      });

      results.push({
        credentialId: credential.id,
        provider: credential.provider,
        ingested: events.length,
      });
    } catch (error) {
      logger.error(
        JSON.stringify({
          service: 'ingestion',
          message: 'Polling cycle failed for credential',
          credentialId: credential.id,
          provider: credential.provider,
          error: error?.message || String(error),
        })
      );

      await markCredentialSync(credential.id, {
        error,
      });

      results.push({
        credentialId: credential.id,
        provider: credential.provider,
        ingested: 0,
        error: error?.message || String(error),
      });
    }
  }

  return results;
};

