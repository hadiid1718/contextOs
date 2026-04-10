import { publishNotificationEvent } from './services/notificationPublisher.service.js';

const run = async () => {
  const result = await publishNotificationEvent({
    user_id: 'smoke-user',
    org_id: 'smoke-org',
    type: 'SMOKE_TEST',
    message: 'Smoke test event from Backend notification publisher',
  });

  console.log('Notification publish smoke result:', result);
};

run().catch(error => {
  console.error('Notification publish smoke failed', error);
  process.exit(1);
});
