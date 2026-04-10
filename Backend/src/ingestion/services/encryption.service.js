import crypto from 'node:crypto';

import { env } from '../../config/env.js';

const algorithm = 'aes-256-gcm';
let resolvedKey = null;

const resolveKey = () => {
  if (resolvedKey) {
    return resolvedKey;
  }

  const configuredKey = String(env.ingestionEncryptionKey || '').trim();

  if (/^[a-fA-F0-9]{64}$/.test(configuredKey)) {
    resolvedKey = Buffer.from(configuredKey, 'hex');
    return resolvedKey;
  }

  resolvedKey = crypto.createHash('sha256').update(configuredKey).digest();
  return resolvedKey;
};

const toJsonString = value =>
  typeof value === 'string' ? value : JSON.stringify(value ?? {});

export const encryptJsonPayload = payload => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, resolveKey(), iv);
  const plaintext = Buffer.from(toJsonString(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    algorithm,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
};

export const decryptJsonPayload = ({ ciphertext, iv, authTag }) => {
  if (!ciphertext || !iv || !authTag) {
    return null;
  }

  const decipher = crypto.createDecipheriv(
    algorithm,
    resolveKey(),
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');

  return JSON.parse(plaintext);
};

export const cloneEncryptedPayload = record => ({
  algorithm: record.algorithm,
  iv: record.iv,
  authTag: record.authTag,
  ciphertext: record.ciphertext,
});
