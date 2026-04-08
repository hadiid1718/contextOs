const sleep = delayMs =>
  new Promise(resolve => {
    setTimeout(resolve, delayMs);
  });

const computeDelay = ({ attempt, baseDelayMs, maxDelayMs, jitterRatio }) => {
  const uncapped = baseDelayMs * 2 ** (attempt - 1);
  const capped = Math.min(uncapped, maxDelayMs);
  const jitter = Math.floor(Math.random() * capped * jitterRatio);
  return capped + jitter;
};

export const withRetry = async (
  operation,
  {
    retries = 4,
    baseDelayMs = 250,
    maxDelayMs = 10000,
    jitterRatio = 0.25,
    isRetriable = () => true,
  } = {}
) => {
  let lastError;

  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;

      if (attempt > retries || !isRetriable(error)) {
        break;
      }

      const delay = computeDelay({
        attempt,
        baseDelayMs,
        maxDelayMs,
        jitterRatio,
      });
      await sleep(delay);
    }
  }

  throw lastError;
};

