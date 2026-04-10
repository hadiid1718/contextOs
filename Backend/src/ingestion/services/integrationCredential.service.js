import { IntegrationCredential } from '../models/IntegrationCredential.js';
import {
  cloneEncryptedPayload,
  decryptJsonPayload,
  encryptJsonPayload,
} from './encryption.service.js';

const safeCredentialView = credential => ({
  id: credential.id || credential._id?.toString?.() || null,
  org_id: credential.org_id,
  provider: credential.provider,
  accountName: credential.accountName,
  externalId: credential.externalId || null,
  status: credential.status,
  scopes: credential.scopes || [],
  metadata: credential.metadata || {},
  lastSyncedAt: credential.lastSyncedAt || null,
  lastPolledAt: credential.lastPolledAt || null,
  createdAt: credential.createdAt,
  updatedAt: credential.updatedAt,
});

export const saveIntegrationCredential = async ({
  orgId,
  provider,
  accountName,
  credentials,
  externalId = null,
  status = 'active',
  scopes = [],
  metadata = {},
  createdBy = null,
  updatedBy = null,
}) => {
  const encryptedPayload = encryptJsonPayload(credentials);
  const payload = {
    org_id: orgId,
    provider,
    accountName,
    externalId,
    status,
    scopes,
    metadata,
    createdBy,
    updatedBy,
    encryptedPayload,
    encryptionAlgorithm: encryptedPayload.algorithm,
    encryptionIv: encryptedPayload.iv,
    encryptionAuthTag: encryptedPayload.authTag,
    lastPolledAt: null,
  };

  const credential = await IntegrationCredential.findOneAndUpdate(
    { org_id: orgId, provider },
    { $set: payload },
    { upsert: true, new: true, runValidators: true }
  );

  return safeCredentialView(credential);
};

export const listIntegrationCredentials = async orgId => {
  const credentials = await IntegrationCredential.find({ org_id: orgId })
    .sort({ createdAt: -1 })
    .lean();

  return credentials.map(safeCredentialView);
};

export const getIntegrationCredential = async (orgId, provider) => {
  const credential = await IntegrationCredential.findOne({
    org_id: orgId,
    provider,
  });

  if (!credential) {
    return null;
  }

  const decryptedCredentials = decryptJsonPayload(
    cloneEncryptedPayload(credential.encryptedPayload)
  );

  return {
    ...safeCredentialView(credential),
    credentials: decryptedCredentials,
  };
};

export const deleteIntegrationCredential = async (orgId, provider) =>
  IntegrationCredential.findOneAndDelete({ org_id: orgId, provider });

export const markCredentialSync = async (
  credentialId,
  { lastSyncedAt, error }
) => {
  const update = {
    lastPolledAt: new Date(),
    updatedAt: new Date(),
  };

  if (lastSyncedAt) {
    update.lastSyncedAt = lastSyncedAt;
  }

  if (error) {
    update.lastError = String(error?.message || error);
  }

  return IntegrationCredential.findByIdAndUpdate(
    credentialId,
    { $set: update },
    { new: true }
  );
};

export const decryptStoredCredential = credential =>
  decryptJsonPayload(cloneEncryptedPayload(credential.encryptedPayload));
