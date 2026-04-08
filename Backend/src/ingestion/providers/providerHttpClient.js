import axios from 'axios';

import { env } from '../../config/env.js';
import { withRetry } from '../services/retry.service.js';

const isRetriableHttpError = error => {
  const status = error?.response?.status;

  if (!status) {
    return true;
  }

  return status === 429 || status >= 500;
};

export const requestWithRetry = config =>
  withRetry(() => axios(config), {
    retries: env.retryMaxRetries,
    baseDelayMs: env.retryBaseDelayMs,
    maxDelayMs: env.retryMaxDelayMs,
    isRetriable: isRetriableHttpError,
  });

