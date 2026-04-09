import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/appError.js';
import {
  deleteIntegrationCredential,
  getIntegrationCredential,
  listIntegrationCredentials,
  saveIntegrationCredential,
} from '../services/integrationCredential.service.js';

export const listCredentials = asyncHandler(async (req, res) => {
  const credentials = await listIntegrationCredentials(req.orgId);

  res.status(200).json({
    credentials,
  });
});

export const getCredentialByProvider = asyncHandler(async (req, res) => {
  const credential = await getIntegrationCredential(req.orgId, req.params.provider);

  if (!credential) {
    throw new AppError('Integration credential not found', 404);
  }

  res.status(200).json({
    credential,
  });
});

export const upsertCredential = asyncHandler(async (req, res) => {
  const credential = await saveIntegrationCredential({
    orgId: req.orgId,
    provider: req.params.provider,
    accountName: req.body.accountName,
    credentials: req.body.credentials,
    externalId: req.body.externalId,
    status: req.body.status,
    scopes: req.body.scopes,
    metadata: req.body.metadata,
    createdBy: req.auth?.sub || null,
    updatedBy: req.auth?.sub || null,
  });

  res.status(201).json({
    message: 'Integration credential saved successfully',
    credential,
  });
});

export const removeCredential = asyncHandler(async (req, res) => {
  const credential = await deleteIntegrationCredential(req.orgId, req.params.provider);

  if (!credential) {
    throw new AppError('Integration credential not found', 404);
  }

  res.status(200).json({
    message: 'Integration credential deleted successfully',
  });
});

