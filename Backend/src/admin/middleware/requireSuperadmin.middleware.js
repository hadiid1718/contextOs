import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';

export const requireSuperadmin = (req, _res, next) => {
  const signedToken = req.signedCookies?.[env.adminCookieName];
  const rawToken = req.cookies?.[env.adminCookieName];
  const token = signedToken || rawToken;

  if (!token) {
    return next(new AppError('Superadmin authentication required', 401));
  }

  try {
    const payload = jwt.verify(token, env.adminJwtSecret);

    if (payload?.role !== 'superadmin') {
      return next(new AppError('Superadmin access required', 403));
    }

    req.adminUser = payload;
    return next();
  } catch {
    return next(new AppError('Invalid or expired admin token', 401));
  }
};
