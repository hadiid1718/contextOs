import {
  decryptJsonPayload,
  encryptJsonPayload,
} from './services/encryption.service.js';
import {
  normalizeEvent,
  normalizeGitHubWebhookEvent,
} from './normalizers/eventNormalizer.js';

const sampleSecret = {
  accessToken: 'sample-access-token',
  refreshToken: 'sample-refresh-token',
  scope: ['repo', 'read:org'],
};

const encrypted = encryptJsonPayload(sampleSecret);
const decrypted = decryptJsonPayload(encrypted);

const normalized = normalizeEvent({
  orgId: 'org-smoke-test',
  source: 'github',
  eventType: 'push',
  content: {
    branch: 'main',
    commits: 1,
  },
  metadata: {
    smokeTest: true,
  },
});

const githubWebhookSample = normalizeGitHubWebhookEvent({
  orgId: 'org-smoke-test',
  req: {
    headers: {
      'x-github-event': 'push',
      'x-github-delivery': 'delivery-123',
    },
  },
  payload: {
    action: 'push',
    repository: { full_name: 'stackmind/demo', id: 'repo-1' },
    sender: { login: 'demo-user' },
    commits: [
      {
        id: 'abc123',
        message: 'feat: ingestion smoke test',
        author: { name: 'Demo User' },
        url: 'https://example.com/commit/abc123',
      },
    ],
  },
});

const output = {
  encryptionRoundTrip: decrypted,
  normalized,
  githubWebhookSample,
};

console.log(JSON.stringify(output, null, 2));
