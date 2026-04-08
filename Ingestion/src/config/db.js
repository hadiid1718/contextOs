import mongoose from 'mongoose';

import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const connectToDatabase = async () => {
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });

  logger.info(`MongoDB connected: ${mongoose.connection.host}`);
};

export const disconnectDatabase = async () => {
  await mongoose.disconnect();
};

