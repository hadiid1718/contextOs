import { env } from '../../config/env.js';
import { publishToKafka } from '../config/kafka.js';

export const publishNormalizedEvent = async event =>
  publishToKafka(env.kafkaTopic, event);
