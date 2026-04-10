import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';
import { verifyAccessToken } from '../../utils/token.js';

const extractBearerToken = authHeader => {
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7);
};

export const requireGatewayAuth = (req, _res, next) => {
  const bearerToken = extractBearerToken(req.headers.authorization);
  const cookieToken = req.cookies?.[env.accessCookieName];
  const token = bearerToken || cookieToken;

  if (!token) {
    return next(new AppError('Authentication required', 401));
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = payload;
    req.userId = payload?.sub || null;
    req.orgId = payload?.org_id || payload?.orgId || null;
    return next();
  } catch {
    return next(new AppError('Invalid or expired access token', 401));
  }
};
