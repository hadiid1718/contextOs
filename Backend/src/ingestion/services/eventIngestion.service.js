import { normalizeEvent } from '../normalizers/eventNormalizer.js';
import { publishNormalizedEvent } from '../publishers/kafkaPublisher.js';

export const ingestEvent = async ({
  orgId,
  source,
  eventType,
  payload,
  metadata = {},
}) => {
  const normalized = normalizeEvent({
    orgId,
    source,
    eventType,
    payload,
    metadata,
  });

  await publishNormalizedEvent(normalized);
  return normalized;
};

