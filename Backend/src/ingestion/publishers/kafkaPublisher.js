import { env } from '../../config/env.js';
import logger from '../../config/loggers.js';
import { processGraphEvent } from '../../graph/services/graphIngestion.service.js';
import { publishToKafka } from '../config/kafka.js';

const shouldMirrorEventToGraph = () => {
  return env.graphEnabled && (env.mockKafka || env.graphMockKafka);
};

export const publishNormalizedEvent = async event => {
  const result = await publishToKafka(env.kafkaTopic, event);

  // In local/mock Kafka mode, mirror events directly into the graph store
  // so integrations still populate the knowledge graph.
  if (shouldMirrorEventToGraph()) {
    try {
      await processGraphEvent(event);
    } catch (error) {
      logger.error(
        JSON.stringify({
          service: 'knowledge-graph',
          mode: 'direct-mock-ingestion',
          message:
            'Failed to process ingested event directly while Kafka consumer is mocked',
          error: error?.message || String(error),
          org_id: event?.org_id,
          event_type: event?.event_type,
          source_provider: event?.source_provider,
        })
      );
    }
  }

  return result;
};
