const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const defaultJitter = baseDelayMs => Math.floor(baseDelayMs * (0.5 + Math.random()));

export const withRetry = async (
  operation,
  {
    maxRetries = 4,
    baseDelayMs = 250,
    maxDelayMs = 10000,
    onRetry = null,
    jitter = defaultJitter,
  } = {}
) => {
  let attempt = 0;
  let lastError;

  while (attempt <= maxRetries) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const calculatedDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const waitTime = Math.max(0, jitter(calculatedDelay));

      if (typeof onRetry === 'function') {
        onRetry({ attempt: attempt + 1, waitTime, error: lastError });
      }

      await delay(waitTime);
      attempt += 1;
    }
  }

  throw lastError;
};

