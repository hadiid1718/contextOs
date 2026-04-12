import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';

export const requireIngestionEnabled = (_req, _res, next) => {
  if (!env.ingestionEnabled) {
    return next(new AppError('Ingestion module is disabled', 503));
  }

  return next();
};

export const resolveIngestionOrgContext = (req, _res, next) => {
  const orgId =
    req.orgId ||
    req.headers['x-org-id'] ||
    req.headers['x-contextos-org-id'] ||
    req.headers['x-stackmind-org-id'] ||
    req.body?.org_id ||
    req.query?.org_id;

  if (req.body?.type === 'url_verification' && !orgId) {
    return next();
  }

  if (!orgId) {
    return next(new AppError('Organisation identifier is required', 400));
  }

  req.orgId = String(orgId);
  req.org_id = String(orgId);
  return next();
};
