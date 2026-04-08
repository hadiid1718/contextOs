import { env } from '../config/env.js';
import { producer } from '../config/kafka.js';
import { logger } from '../utils/logger.js';
import { retryWithBackoff } from '../utils/retry.js';

export const publishEvent = async normalizedEvent => {
  const message = {
    key: `${normalizedEvent.org_id}:${normalizedEvent.source}:${normalizedEvent.event_type}`,
    value: JSON.stringify(normalizedEvent),
    headers: {
      source: normalizedEvent.source,
      event_type: normalizedEvent.event_type,
    },
  };

  await retryWithBackoff(
    async () => {
      if (env.mockKafka) {
        logger.info(`MOCK publish to ${env.kafkaTopic}: ${message.key}`);
        return;
      }

      await producer.send({
        topic: env.kafkaTopic,
        messages: [message],
      });
    },
    {
      retries: 5,
      baseDelayMs: 250,
      maxDelayMs: 8000,
      jitterRatio: 0.35,
      onRetry: ({ attempt, delay, error }) => {
        logger.warn(
          `Kafka publish retry #${attempt} in ${delay}ms: ${error.message}`
        );
      },
    }
  );
};

