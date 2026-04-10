import crypto from 'node:crypto';

const HEADER_NAME = 'x-correlation-id';

export const attachCorrelationId = (req, res, next) => {
  const incomingHeader = req.headers[HEADER_NAME];
  const existingId = Array.isArray(incomingHeader)
    ? incomingHeader[0]
    : incomingHeader;

  const correlationId =
    (typeof existingId === 'string' && existingId.trim()) ||
    crypto.randomUUID();

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
};
