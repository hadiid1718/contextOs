import { OAuthCredential } from '../models/OAuthCredential.js';
import { decryptJson, encryptJson } from './crypto.service.js';

export const upsertCredential = async ({ org_id, source, token }) => {
  const encrypted = encryptJson(token);

  await OAuthCredential.findOneAndUpdate(
    { org_id, source },
    { encrypted },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const getCredential = async ({ org_id, source }) => {
  const doc = await OAuthCredential.findOne({ org_id, source }).lean();
  if (!doc) {
    return null;
  }

  return decryptJson(doc.encrypted);
};

