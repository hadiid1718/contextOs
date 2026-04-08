import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/appError.js';
import {
  disableCredential,
  getCredentialSummary,
  listCredentialSummaries,
  upsertCredential,
} from '../services/integrationCredential.service.js';

const getOrgId = req => {
  const orgId = req.org_id || req.auth?.org_id || req.auth?.orgId;

  if (!orgId) {
    throw new AppError('Organisation context is required', 400);
  }

  return String(orgId);
};

export const upsertIntegrationCredential = asyncHandler(async (req, res) => {
  const credential = await upsertCredential({
    orgId: getOrgId(req),
    provider: req.params.provider,
    rawCredentials: req.body.credentials,
    settings: req.body.settings,
    updatedBy: req.auth?.sub || null,
  });

  res.status(201).json({
    message: 'Integration credential saved',
    credential: {
      org_id: credential.org_id,
      provider: credential.provider,
      status: credential.status,
      settings: credential.settings,
      updatedAt: credential.updatedAt,
    },
  });
});

export const getIntegrationCredential = asyncHandler(async (req, res) => {
  const credential = await getCredentialSummary({
    orgId: getOrgId(req),
    provider: req.params.provider,
  });

  if (!credential) {
    throw new AppError('Integration credential not found', 404);
  }

  res.status(200).json({ credential });
});

export const listIntegrationCredentials = asyncHandler(async (req, res) => {
  const credentials = await listCredentialSummaries(getOrgId(req));
  res.status(200).json({ credentials });
});

export const disableIntegrationCredential = asyncHandler(async (req, res) => {
  const updated = await disableCredential({
    orgId: getOrgId(req),
    provider: req.params.provider,
  });

  if (!updated) {
    throw new AppError('Integration credential not found', 404);
  }

  res.status(200).json({
    message: 'Integration credential disabled',
    credential: {
      org_id: updated.org_id,
      provider: updated.provider,
      status: updated.status,
      updatedAt: updated.updatedAt,
    },
  });
});

