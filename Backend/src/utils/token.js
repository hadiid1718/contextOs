import crypto from 'crypto';

import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';

export const generateTokenId = () => crypto.randomUUID();

export const generateAccessToken = payload =>
  jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessExpiresIn });

export const generateRefreshToken = payload =>
  jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  });

export const verifyAccessToken = token =>
  jwt.verify(token, env.jwtAccessSecret);

export const verifyRefreshToken = token =>
  jwt.verify(token, env.jwtRefreshSecret);

export const generateRandomToken = (bytes = 32) =>
  crypto.randomBytes(bytes).toString('hex');
