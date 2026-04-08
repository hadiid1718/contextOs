import { Membership } from '../models/Membership.js';
import { AppError } from '../utils/appError.js';

const roleWeight = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

export const requireOrganisationContext = (req, _res, next) => {
  const orgId = req.auth?.org_id || req.auth?.orgId;

  if (!orgId) {
    return next(new AppError('Organisation context is required', 400));
  }

  req.orgId = orgId;
  req.org_id = orgId;
  return next();
};

export const requireOrganisationMembership = (...allowedRoles) => {
  return async (req, _res, next) => {
    try {
      const orgId = req.orgId || req.auth?.org_id || req.auth?.orgId;

      if (!orgId) {
        return next(new AppError('Organisation context is required', 400));
      }

      const membership = await Membership.findOne({
        org_id: orgId,
        user: req.auth?.sub,
        status: 'active',
      });

      if (!membership) {
        return next(new AppError('Organisation membership required', 403));
      }

      req.orgId = orgId;
      req.org_id = orgId;
      req.organisationMembership = membership;

      if (allowedRoles.length > 0) {
        const minimumAllowedWeight = Math.min(
          ...allowedRoles.map(role => roleWeight[role])
        );

        if (roleWeight[membership.role] < minimumAllowedWeight) {
          return next(
            new AppError('Insufficient organisation permissions', 403)
          );
        }
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export const requireOrganisationAccess = (...allowedRoles) => {
  return async (req, _res, next) => {
    try {
      const orgId = req.params?.orgId;

      if (!orgId) {
        return next(new AppError('Organisation identifier is required', 400));
      }

      const membership = await Membership.findOne({
        org_id: orgId,
        user: req.auth?.sub,
        status: 'active',
      });

      if (!membership) {
        return next(new AppError('Organisation membership required', 403));
      }

      req.orgId = orgId;
      req.org_id = orgId;
      req.organisationMembership = membership;

      if (allowedRoles.length > 0) {
        const minimumAllowedWeight = Math.min(
          ...allowedRoles.map(role => roleWeight[role])
        );

        if (roleWeight[membership.role] < minimumAllowedWeight) {
          return next(
            new AppError('Insufficient organisation permissions', 403)
          );
        }
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export const requireOrganisationRole = (...allowedRoles) =>
  requireOrganisationMembership(...allowedRoles);
