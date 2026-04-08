import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';

const IV_LENGTH = 12;
const KEY_VERSION = 'v1';

const getKeyBuffer = () => {
  const key = env.ingestionEncryptionKey;

  if (!/^[a-fA-F0-9]{64}$/.test(key)) {
    throw new AppError(
      'Invalid INGESTION encryption key; expected a 64-char hex string',
      500
    );
  }

  return Buffer.from(key, 'hex');
};

export const encryptCredentials = plainValue => {
  const key = getKeyBuffer();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const payload = Buffer.from(JSON.stringify(plainValue), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
    keyVersion: KEY_VERSION,
  };
};

export const decryptCredentials = encryptedValue => {
  const key = getKeyBuffer();
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(encryptedValue.iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(encryptedValue.authTag, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue.ciphertext, 'hex')),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString('utf8'));
};

