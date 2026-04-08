import { sendKafkaMessage } from '../config/kafka.js';

export const publishNormalizedEvent = async normalizedEvent => {
  await sendKafkaMessage(normalizedEvent);
};

