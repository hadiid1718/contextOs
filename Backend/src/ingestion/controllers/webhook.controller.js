import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  normalizeGitHubWebhookEvent,
  normalizeJiraWebhookEvent,
  normalizeSlackWebhookEvent,
} from '../normalizers/eventNormalizer.js';
import { ingestNormalizedEvent } from '../services/eventIngestion.service.js';

const supportedGithubEvents = new Set(['push', 'pull_request', 'issues']);
const supportedJiraEvents = new Set([
  'jira:issue_created',
  'jira:issue_updated',
  'issue_created',
  'issue_updated',
]);
const supportedSlackEvents = new Set(['event_callback', 'message']);

const handleIgnoredWebhook = (res, provider, eventType) =>
  res.status(202).json({
    message: `${provider} webhook ignored`,
    provider,
    eventType,
  });

export const githubWebhook = asyncHandler(async (req, res) => {
  const eventType =
    req.ingestionWebhook?.eventType || req.headers['x-github-event'];

  if (!supportedGithubEvents.has(eventType)) {
    return handleIgnoredWebhook(res, 'github', eventType);
  }

  const normalizedEvent = normalizeGitHubWebhookEvent({
    orgId: req.orgId,
    req,
    payload: req.body,
  });

  await ingestNormalizedEvent(normalizedEvent);

  return res.status(202).json({
    message: 'GitHub webhook accepted',
    event: normalizedEvent,
  });
});

export const jiraWebhook = asyncHandler(async (req, res) => {
  const eventType = req.ingestionWebhook?.eventType || req.body?.webhookEvent;

  if (!supportedJiraEvents.has(eventType)) {
    return handleIgnoredWebhook(res, 'jira', eventType);
  }

  const normalizedEvent = normalizeJiraWebhookEvent({
    orgId: req.orgId,
    req,
    payload: req.body,
  });

  await ingestNormalizedEvent(normalizedEvent);

  return res.status(202).json({
    message: 'Jira webhook accepted',
    event: normalizedEvent,
  });
});

export const slackWebhook = asyncHandler(async (req, res) => {
  if (req.body?.type === 'url_verification') {
    return res.status(200).json({ challenge: req.body.challenge });
  }

  const eventType =
    req.ingestionWebhook?.eventType || req.body?.event?.type || req.body?.type;
  const resolvedSlackEventType =
    eventType === 'event_callback'
      ? req.body?.event?.type || eventType
      : eventType;

  if (!supportedSlackEvents.has(resolvedSlackEventType)) {
    return handleIgnoredWebhook(res, 'slack', resolvedSlackEventType);
  }

  const normalizedEvent = normalizeSlackWebhookEvent({
    orgId: req.orgId,
    req,
    payload: req.body,
  });

  if (normalizedEvent.content.subtype === 'bot_message') {
    return handleIgnoredWebhook(res, 'slack', 'bot_message');
  }

  await ingestNormalizedEvent(normalizedEvent);

  return res.status(202).json({
    message: 'Slack webhook accepted',
    event: normalizedEvent,
  });
});
