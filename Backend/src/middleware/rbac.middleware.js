import { AppError } from '../utils/appError.js';

const roleWeight = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

export const requireRole = (...allowedRoles) => {
  return (req, _res, next) => {
    const userRole = req.auth?.role;

    if (!userRole) {
      return next(new AppError('Authentication required', 401));
    }

    const minAllowedWeight = Math.min(
      ...allowedRoles.map(role => roleWeight[role])
    );
    if (roleWeight[userRole] < minAllowedWeight) {
      return next(new AppError('Insufficient permissions', 403));
    }

    return next();
  };
};
