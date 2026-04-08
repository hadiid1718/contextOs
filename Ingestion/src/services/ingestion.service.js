import {
  normalizeGithubWebhook,
  normalizeJiraWebhook,
  normalizePolledItem,
  normalizeSlackWebhook,
} from './normalizer.service.js';
import { publishEvent } from './publisher.service.js';

const publishIfPresent = async event => {
  if (!event) {
    return null;
  }

  await publishEvent(event);
  return event;
};

export const processGithubWebhook = async ({ org_id, eventName, payload }) => {
  const event = normalizeGithubWebhook({ org_id, eventName, payload });
  return publishIfPresent(event);
};

export const processJiraWebhook = async ({ org_id, payload }) => {
  const event = normalizeJiraWebhook({ org_id, payload });
  return publishIfPresent(event);
};

export const processSlackWebhook = async ({ org_id, payload }) => {
  const event = normalizeSlackWebhook({ org_id, payload });
  return publishIfPresent(event);
};

export const processPolledItems = async ({ org_id, source, items }) => {
  const processed = [];

  for (const item of items) {
    const event = normalizePolledItem({ org_id, source, item });
    await publishEvent(event);
    processed.push(event);
  }

  return processed;
};

