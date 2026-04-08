const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export const retryWithBackoff = async (
  fn,
  {
    retries = 5,
    baseDelayMs = 250,
    maxDelayMs = 5000,
    jitterRatio = 0.2,
    onRetry,
  } = {}
) => {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }

      const exponentialDelay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      const jitter = exponentialDelay * jitterRatio * Math.random();
      const delay = Math.round(exponentialDelay + jitter);

      if (onRetry) {
        onRetry({ attempt: attempt + 1, delay, error });
      }

      await sleep(delay);
      attempt += 1;
    }
  }

  throw new Error('retryWithBackoff exhausted unexpectedly');
};

