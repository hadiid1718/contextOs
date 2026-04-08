import { AppError } from '../../utils/appError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ingestEvent } from '../services/eventIngestion.service.js';

const assertOrgId = req => {
  const orgId = req.org_id || req.headers['x-org-id'];

  if (!orgId) {
    throw new AppError(
      'Missing organisation id. Provide x-org-id header or org context.',
      400
    );
  }

  return String(orgId);
};

export const receiveGithubWebhook = asyncHandler(async (req, res) => {
  const eventType = req.headers['x-github-event'];
  const allowed = new Set(['push', 'pull_request', 'issues']);

  if (!allowed.has(eventType)) {
    throw new AppError(`Unsupported GitHub event: ${eventType || 'unknown'}`, 400);
  }

  const normalized = await ingestEvent({
    orgId: assertOrgId(req),
    source: 'github',
    eventType,
    payload: req.body,
    metadata: {
      delivery_id: req.headers['x-github-delivery'] || null,
      hook_id: req.headers['x-github-hook-id'] || null,
    },
  });

  res.status(202).json({ status: 'accepted', event: normalized });
});

export const receiveJiraWebhook = asyncHandler(async (req, res) => {
  const eventType = req.body?.webhookEvent;
  const allowed = new Set(['jira:issue_created', 'jira:issue_updated']);

  if (!allowed.has(eventType)) {
    throw new AppError(`Unsupported Jira event: ${eventType || 'unknown'}`, 400);
  }

  const normalized = await ingestEvent({
    orgId: assertOrgId(req),
    source: 'jira',
    eventType,
    payload: req.body,
    metadata: {
      webhook_id: req.headers['x-atlassian-webhook-identifier'] || null,
      issue_key: req.body?.issue?.key || null,
    },
  });

  res.status(202).json({ status: 'accepted', event: normalized });
});

export const receiveSlackWebhook = asyncHandler(async (req, res) => {
  if (req.body?.type === 'url_verification') {
    return res.status(200).json({ challenge: req.body.challenge });
  }

  const event = req.body?.event;
  if (!event || event.type !== 'message') {
    throw new AppError('Unsupported Slack event. Expected message event.', 400);
  }

  const normalized = await ingestEvent({
    orgId: assertOrgId(req),
    source: 'slack',
    eventType: 'message',
    payload: req.body,
    metadata: {
      event_id: req.body?.event_id || null,
      channel: event.channel || null,
      user: event.user || null,
    },
  });

  return res.status(202).json({ status: 'accepted', event: normalized });
});

