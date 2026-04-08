import { connectKafka, disconnectKafka } from './config/kafka.js';
import { normalizeEvent } from './normalizers/eventNormalizer.js';
import { publishNormalizedEvent } from './publishers/kafkaPublisher.js';
import { decryptCredentials, encryptCredentials } from './services/encryption.service.js';

const run = async () => {
  const sampleCredentials = {
    accessToken: 'sample-token',
    refreshToken: 'sample-refresh',
  };

  const encrypted = encryptCredentials(sampleCredentials);
  const decrypted = decryptCredentials(encrypted);

  if (decrypted.accessToken !== sampleCredentials.accessToken) {
    throw new Error('Encryption/decryption smoke test failed');
  }

  await connectKafka();

  const event = normalizeEvent({
    orgId: 'org-smoke',
    source: 'github',
    eventType: 'push',
    payload: { repository: { full_name: 'contextos/demo' } },
    metadata: { smoke: true },
  });

  await publishNormalizedEvent(event);
  await disconnectKafka();

  console.log('Ingestion smoke test passed');
};

run().catch(error => {
  console.error('Ingestion smoke test failed:', error.message);
  process.exit(1);
});

