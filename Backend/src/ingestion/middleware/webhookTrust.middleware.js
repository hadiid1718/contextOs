import crypto from 'node:crypto';

import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';
import { isIpAllowed } from '../utils/ipAllowlist.js';

const getClientIp = req =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress;

const rawBodyToString = req =>
  typeof req.rawBody === 'string'
    ? req.rawBody
    : Buffer.isBuffer(req.rawBody)
      ? req.rawBody.toString('utf8')
      : '';

const safeCompare = (left, right) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const verifyHmacSignature = ({ secret, rawBody, expected }) => {
  if (!secret || !expected) {
    return false;
  }

  const computed = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')}`;

  return safeCompare(computed, expected);
};

const verifySlackSignature = ({ secret, rawBody, signature, timestamp }) => {
  if (!secret || !signature || !timestamp) {
    return false;
  }

  const requestAgeSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(requestAgeSeconds) || requestAgeSeconds > 60 * 5) {
    return false;
  }

  const computed = `v0=${crypto
    .createHmac('sha256', secret)
    .update(`v0:${timestamp}:${rawBody}`)
    .digest('hex')}`;

  return safeCompare(computed, signature);
};

const getWebhookEventType = (provider, req) => {
  if (provider === 'github') {
    return req.headers['x-github-event'] || req.body?.action || 'unknown';
  }

  if (provider === 'jira') {
    return (
      req.headers['x-atlassian-webhook-event'] ||
      req.body?.webhookEvent ||
      req.body?.issue_event_type_name ||
      'unknown'
    );
  }

  if (provider === 'slack') {
    return req.body?.type || req.body?.event?.type || 'unknown';
  }

  return 'unknown';
};

const getProviderSecret = provider => {
  if (provider === 'github') {
    return env.githubWebhookSecret;
  }

  if (provider === 'jira') {
    return env.jiraWebhookSecret;
  }

  if (provider === 'slack') {
    return env.slackSigningSecret;
  }

  return null;
};

const getProviderAllowlist = provider => {
  if (provider === 'github') {
    return env.githubWebhookIpAllowlist;
  }

  if (provider === 'jira') {
    return env.jiraWebhookIpAllowlist;
  }

  if (provider === 'slack') {
    return env.slackWebhookIpAllowlist;
  }

  return [];
};

export const requireWebhookTrust = provider => (req, _res, next) => {
  const rawBody = rawBodyToString(req);
  const clientIp = getClientIp(req);
  const allowlist = getProviderAllowlist(provider);
  const secret = getProviderSecret(provider);

  if (allowlist.length > 0 && !isIpAllowed(clientIp, allowlist)) {
    return next(new AppError('Webhook source IP is not allowed', 403));
  }

  if (!rawBody) {
    return next(new AppError('Webhook raw body is required', 400));
  }

  if (!secret) {
    return next(
      new AppError(`Missing webhook secret for ${provider}`, 500, {
        provider,
      })
    );
  }

  if (provider === 'github') {
    const signature = req.headers['x-hub-signature-256'] || req.headers['x-hub-signature'];
    if (!verifyHmacSignature({ secret, rawBody, expected: signature })) {
      return next(new AppError('Invalid GitHub webhook signature', 401));
    }
  }

  if (provider === 'jira') {
    const signature =
      req.headers['x-atlassian-webhook-signature'] || req.headers['x-hub-signature'];
    if (!verifyHmacSignature({ secret, rawBody, expected: signature })) {
      return next(new AppError('Invalid Jira webhook signature', 401));
    }
  }

  if (provider === 'slack') {
    const signature = req.headers['x-slack-signature'];
    const timestamp = req.headers['x-slack-request-timestamp'];
    if (
      !verifySlackSignature({
        secret,
        rawBody,
        signature,
        timestamp,
      })
    ) {
      return next(new AppError('Invalid Slack webhook signature', 401));
    }
  }

  req.ingestionWebhook = {
    provider,
    eventType: getWebhookEventType(provider, req),
    clientIp,
  };

  return next();
};

