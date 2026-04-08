import { AppError } from '../../utils/appError.js';
import { IntegrationCredential } from '../models/IntegrationCredential.js';
import {
  decryptCredentials,
  encryptCredentials,
} from './encryption.service.js';

export const VALID_PROVIDERS = ['github', 'jira', 'slack', 'confluence'];

const assertProvider = provider => {
  if (!VALID_PROVIDERS.includes(provider)) {
    throw new AppError(`Unsupported provider: ${provider}`, 400);
  }
};

export const upsertCredential = async ({
  orgId,
  provider,
  rawCredentials,
  settings,
  updatedBy,
}) => {
  assertProvider(provider);

  const encryptedCredentials = encryptCredentials(rawCredentials);

  const credential = await IntegrationCredential.findOneAndUpdate(
    { org_id: orgId, provider },
    {
      $set: {
        encryptedCredentials,
        settings: settings || {},
        status: 'active',
        updatedBy: updatedBy || null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return credential;
};

export const getCredentialSummary = async ({ orgId, provider }) => {
  assertProvider(provider);

  const credential = await IntegrationCredential.findOne({
    org_id: orgId,
    provider,
  }).lean();

  if (!credential) {
    return null;
  }

  return {
    org_id: credential.org_id,
    provider: credential.provider,
    status: credential.status,
    settings: credential.settings,
    lastPolledAt: credential.lastPolledAt,
    updatedAt: credential.updatedAt,
  };
};

export const disableCredential = async ({ orgId, provider }) => {
  assertProvider(provider);

  const updated = await IntegrationCredential.findOneAndUpdate(
    { org_id: orgId, provider },
    { $set: { status: 'disabled' } },
    { new: true }
  );

  return updated;
};

export const getActiveCredentialsForProvider = provider =>
  IntegrationCredential.find({ provider, status: 'active' });

export const listCredentialSummaries = async orgId => {
  const credentials = await IntegrationCredential.find({ org_id: orgId }).lean();

  return credentials.map(credential => ({
    org_id: credential.org_id,
    provider: credential.provider,
    status: credential.status,
    settings: credential.settings,
    lastPolledAt: credential.lastPolledAt,
    updatedAt: credential.updatedAt,
  }));
};

export const listActiveCredentialsForPolling = async provider => {
  assertProvider(provider);

  const credentials = await IntegrationCredential.find({
    provider,
    status: 'active',
  });

  return credentials.map(credential => ({
    id: credential._id,
    org_id: credential.org_id,
    provider: credential.provider,
    settings: credential.settings || {},
    credentials: decryptCredentials(credential.encryptedCredentials),
  }));
};

export const markCredentialPolled = async id => {
  await IntegrationCredential.findByIdAndUpdate(id, {
    $set: { lastPolledAt: new Date() },
  });
};

export const getDecryptedCredential = async ({ orgId, provider }) => {
  assertProvider(provider);

  const credential = await IntegrationCredential.findOne({
    org_id: orgId,
    provider,
    status: 'active',
  });

  if (!credential) {
    return null;
  }

  return {
    ...credential.toObject(),
    credentials: decryptCredentials(credential.encryptedCredentials),
  };
};

