import { createHmac, timingSafeEqual } from 'node:crypto';

import { env } from '../../config/env.js';
import logger from '../../config/loggers.js';
import { AppError } from '../../utils/appError.js';
import { extractClientIp, isIpInAllowlist } from '../utils/ipAllowlist.js';

const hashHex = (secret, payload) =>
  createHmac('sha256', secret).update(payload, 'utf8').digest('hex');

const safeCompare = (left, right) => {
  const leftBuffer = Buffer.from(left || '', 'utf8');
  const rightBuffer = Buffer.from(right || '', 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

const verifyGithubSignature = (secret, req) => {
  const expected = `sha256=${hashHex(secret, req.rawBody || '')}`;
  const provided = req.headers['x-hub-signature-256'];
  return safeCompare(expected, provided);
};

const verifyJiraSignature = (secret, req) => {
  const expected = hashHex(secret, req.rawBody || '');
  const provided = req.headers['x-jira-signature'];
  return safeCompare(expected, provided);
};

const verifySlackSignature = (secret, req) => {
  const timestamp = req.headers['x-slack-request-timestamp'];
  const signature = req.headers['x-slack-signature'];

  if (!timestamp || !signature) {
    return false;
  }

  const ageMs = Math.abs(Date.now() - Number(timestamp) * 1000);
  if (Number.isNaN(ageMs) || ageMs > 5 * 60 * 1000) {
    return false;
  }

  const payload = `v0:${timestamp}:${req.rawBody || ''}`;
  const expected = `v0=${hashHex(secret, payload)}`;

  return safeCompare(expected, signature);
};

const providerSecurityConfig = {
  github: {
    getSecret: () => env.githubWebhookSecret,
    allowlist: env.githubWebhookIpAllowlist,
    verifySignature: verifyGithubSignature,
  },
  jira: {
    getSecret: () => env.jiraWebhookSecret,
    allowlist: env.jiraWebhookIpAllowlist,
    verifySignature: verifyJiraSignature,
  },
  slack: {
    getSecret: () => env.slackSigningSecret,
    allowlist: env.slackWebhookIpAllowlist,
    verifySignature: verifySlackSignature,
  },
};

export const verifyWebhookTrust = provider => (req, _res, next) => {
  const config = providerSecurityConfig[provider];

  if (!config) {
    return next(new AppError(`Unsupported webhook provider: ${provider}`, 400));
  }

  const secret = config.getSecret();
  if (!secret) {
    return next(new AppError(`${provider} webhook secret is not configured`, 500));
  }

  const requestIp = extractClientIp(req);
  const isAllowedIp = isIpInAllowlist(requestIp, config.allowlist);

  if (!isAllowedIp) {
    logger.warn(`Rejected ${provider} webhook due to IP allowlist: ${requestIp}`);
    return next(new AppError('Webhook IP is not allowlisted', 403));
  }

  const hasValidSignature = config.verifySignature(secret, req);
  if (!hasValidSignature) {
    return next(new AppError('Invalid webhook signature', 401));
  }

  return next();
};

