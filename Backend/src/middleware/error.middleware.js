import { ZodError } from 'zod';

import { AppError } from '../utils/appError.js';
import logger from '../config/loggers.js';

export const notFoundHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export const errorHandler = (error, _req, res, _next) => {
  if (error instanceof SyntaxError && error?.type === 'entity.parse.failed') {
    return res.status(400).json({
      message: 'Invalid JSON payload',
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: error.flatten(),
    });
  }

  if (error?.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed',
      details: error.message,
    });
  }

  if (error?.code === 11000) {
    const duplicateField = Object.keys(error.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      message: `${duplicateField} already exists`,
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
  }

  logger.error(error?.stack || error?.message || 'Unknown server error');

  return res.status(500).json({
    message: 'Internal server error',
  });
};
