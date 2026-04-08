import axios from 'axios';

import { env } from '../config/env.js';
import { getCredential } from '../services/credential.service.js';

export const pollSlack = async ({ org_id, sinceIso }) => {
  const token = await getCredential({ org_id, source: 'slack' });
  if (!token?.accessToken) {
    return [];
  }

  const channelsResponse = await axios.get(`${env.slackApiBaseUrl}/conversations.list`, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
    },
    params: { limit: 10 },
  });

  const channels = channelsResponse.data?.channels || [];
  const events = [];

  for (const channel of channels.slice(0, 3)) {
    const historyResponse = await axios.get(
      `${env.slackApiBaseUrl}/conversations.history`,
      {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
        },
        params: { channel: channel.id, limit: 10 },
      }
    );

    const messages = historyResponse.data?.messages || [];
    for (const message of messages) {
      const timestamp = message.ts
        ? new Date(Number(message.ts) * 1000).toISOString()
        : undefined;

      if (sinceIso && timestamp && new Date(timestamp) < new Date(sinceIso)) {
        continue;
      }

      events.push({
        event_type: 'message',
        content: message.text || '',
        metadata: {
          channel: channel.id,
          user: message.user,
          ts: message.ts,
        },
        timestamp,
      });
    }
  }

  return events;
};

