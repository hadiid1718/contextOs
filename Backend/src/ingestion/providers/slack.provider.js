import { env } from '../../config/env.js';
import { requestWithRetry } from './providerHttpClient.js';

export const pollSlackEvents = async ({ credentials, sinceEpochSeconds }) => {
  const accessToken = credentials?.accessToken;
  const channel = credentials?.channelId;

  if (!accessToken || !channel) {
    return [];
  }

  const response = await requestWithRetry({
    method: 'GET',
    url: `${env.slackApiBaseUrl}/conversations.history`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      channel,
      oldest: sinceEpochSeconds,
      limit: 100,
      inclusive: true,
    },
  });

  return (response.data?.messages || []).map(message => ({
    eventType: 'slack.message_polled',
    payload: message,
    metadata: {
      channel,
      user: message.user,
      ts: message.ts,
    },
  }));
};

