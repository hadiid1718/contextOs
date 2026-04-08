import crypto from 'node:crypto';

const safeEqual = (a, b) => {
  const aBuffer = Buffer.from(a, 'utf8');
  const bBuffer = Buffer.from(b, 'utf8');

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
};

export const verifyGithubSignature = secret => (req, res, next) => {
  if (!secret) {
    return next();
  }

  const signature = req.header('x-hub-signature-256');
  const rawBody = req.rawBody || '';
  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')}`;

  if (!signature || !safeEqual(signature, expected)) {
    return res.status(401).json({ message: 'Invalid GitHub signature' });
  }

  return next();
};

export const verifyJiraSignature = secret => (req, res, next) => {
  if (!secret) {
    return next();
  }

  const signature = req.header('x-atlassian-webhook-signature');
  const rawBody = req.rawBody || '';
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');

  if (!signature || !safeEqual(signature, expected)) {
    return res.status(401).json({ message: 'Invalid Jira signature' });
  }

  return next();
};

export const verifySlackSignature = secret => (req, res, next) => {
  if (!secret) {
    return next();
  }

  const timestamp = req.header('x-slack-request-timestamp');
  const signature = req.header('x-slack-signature');
  const rawBody = req.rawBody || '';

  if (!timestamp || !signature) {
    return res.status(401).json({ message: 'Missing Slack signature headers' });
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - Number(timestamp)) > 300) {
    return res.status(401).json({ message: 'Stale Slack request timestamp' });
  }

  const baseString = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${crypto
    .createHmac('sha256', secret)
    .update(baseString)
    .digest('hex')}`;

  if (!safeEqual(signature, expected)) {
    return res.status(401).json({ message: 'Invalid Slack signature' });
  }

  return next();
};

