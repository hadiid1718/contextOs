import { env } from '../../config/env.js';
import { normalizeEvent } from '../normalizers/eventNormalizer.js';
import { requestJson, buildBearerHeaders } from './providerHttpClient.js';

const toChannelList = metadata => {
  if (Array.isArray(metadata?.channels) && metadata.channels.length > 0) {
    return metadata.channels;
  }

  if (metadata?.channel) {
    return [metadata.channel];
  }

  return [];
};

export const pollSlackCredential = async ({
  credential,
  decryptedCredentials,
  since,
}) => {
  const token =
    decryptedCredentials?.accessToken || decryptedCredentials?.token;
  if (!token) {
    return [];
  }

  const channels = toChannelList(credential.metadata);
  if (channels.length === 0) {
    return [];
  }

  const latest = Math.floor(new Date(since).getTime() / 1000);
  const results = [];

  for (const channel of channels) {
    const data = await requestJson(
      {
        baseURL: decryptedCredentials?.baseUrl || env.slackApiBaseUrl,
        url: '/conversations.history',
        headers: buildBearerHeaders(token),
        params: {
          channel,
          oldest: latest,
          inclusive: true,
          limit: 100,
        },
      },
      {
        maxRetries: env.retryMaxRetries,
        baseDelayMs: env.retryBaseDelayMs,
        maxDelayMs: env.retryMaxDelayMs,
      }
    );

    const messages = Array.isArray(data?.messages) ? data.messages : [];

    for (const message of messages) {
      if (message.subtype && message.subtype !== 'message_changed') {
        continue;
      }

      results.push(
        normalizeEvent({
          orgId: credential.org_id,
          source: 'slack',
          eventType: 'message',
          content: {
            channel,
            user: message.user || null,
            text: message.text || null,
            thread_ts: message.thread_ts || null,
            ts: message.ts || null,
            subtype: message.subtype || null,
          },
          metadata: {
            provider: 'slack',
            channel,
            accountName: credential.accountName,
          },
          timestamp: new Date(Number(message.ts || Date.now() / 1000) * 1000),
        })
      );
    }
  }

  return results;
};
