import { logger } from '../utils/logger.js';

export const notFound = (_req, res) => {
  res.status(404).json({ message: 'Route not found' });
};

export const errorHandler = (error, _req, res, _next) => {
  logger.error(error.stack || error.message);

  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    message: error.message || 'Internal server error',
  });
};

