import assert from 'node:assert/strict';
import test from 'node:test';

import { decryptJson, encryptJson } from '../src/services/crypto.service.js';
import {
  normalizeGithubWebhook,
  normalizeJiraWebhook,
  normalizePolledItem,
  normalizeSlackWebhook,
} from '../src/services/normalizer.service.js';
import { retryWithBackoff } from '../src/utils/retry.js';

test('AES-256-GCM encryption round trip works', () => {
  const token = {
    accessToken: 'access-token-example',
    refreshToken: 'refresh-token-example',
    expiresAt: '2026-04-08T12:00:00.000Z',
  };

  const encrypted = encryptJson(token);
  const decrypted = decryptJson(encrypted);

  assert.deepEqual(decrypted, token);
});

test('normalizes GitHub webhook payload', () => {
  const normalized = normalizeGithubWebhook({
    org_id: 'org-123',
    eventName: 'push',
    payload: {
      head_commit: { message: 'feat: update parser' },
      repository: { full_name: 'contextos/repo' },
      sender: { login: 'alice' },
      deliveryId: 'delivery-id-1',
    },
  });

  assert.equal(normalized.org_id, 'org-123');
  assert.equal(normalized.source, 'github');
  assert.equal(normalized.event_type, 'push');
  assert.equal(normalized.content, 'feat: update parser');
  assert.equal(normalized.metadata.repository, 'contextos/repo');
});

test('normalizes Jira and Slack webhook payloads', () => {
  const jiraEvent = normalizeJiraWebhook({
    org_id: 'org-123',
    payload: {
      webhookEvent: 'jira:issue_created',
      issue: {
        key: 'CTX-101',
        fields: {
          summary: 'Fix ingestion retry edge case',
          project: { key: 'CTX' },
        },
      },
      user: { accountId: 'jira-user-1' },
    },
  });

  const slackEvent = normalizeSlackWebhook({
    org_id: 'org-123',
    payload: {
      team_id: 'T001',
      event_id: 'Ev001',
      event: {
        type: 'message',
        text: 'Hello from Slack',
        channel: 'C001',
        user: 'U001',
        event_ts: '1712500000',
      },
    },
  });

  assert.equal(jiraEvent.event_type, 'jira:issue_created');
  assert.equal(slackEvent.source, 'slack');
  assert.equal(slackEvent.content, 'Hello from Slack');
});

test('normalizes polled items to canonical schema', () => {
  const normalized = normalizePolledItem({
    org_id: 'org-123',
    source: 'confluence',
    item: {
      event_type: 'confluence:page_polled',
      content: 'Architecture Notes',
      metadata: { id: '12345' },
      timestamp: '2026-04-08T00:00:00.000Z',
    },
  });

  assert.equal(normalized.source, 'confluence');
  assert.equal(normalized.metadata.id, '12345');
  assert.equal(normalized.timestamp, '2026-04-08T00:00:00.000Z');
});

test('retryWithBackoff retries and succeeds', async () => {
  let attempts = 0;

  const result = await retryWithBackoff(
    async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error('temporary failure');
      }
      return 'ok';
    },
    { retries: 4, baseDelayMs: 1, maxDelayMs: 10, jitterRatio: 0 }
  );

  assert.equal(result, 'ok');
  assert.equal(attempts, 3);
});

