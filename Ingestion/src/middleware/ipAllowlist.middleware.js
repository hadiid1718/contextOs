import { logger } from '../utils/logger.js';

const normalizeIp = raw => {
  if (!raw) {
    return '';
  }

  return raw.replace('::ffff:', '');
};

export const enforceIpAllowlist = allowlist => (req, res, next) => {
  if (!allowlist || allowlist.length === 0) {
    return next();
  }

  const clientIp = normalizeIp(req.ip || req.socket?.remoteAddress);

  if (allowlist.includes(clientIp)) {
    return next();
  }

  logger.warn(`Webhook IP rejected: ${clientIp}`);
  return res.status(403).json({ message: 'IP not allowed' });
};

