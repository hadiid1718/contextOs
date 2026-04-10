import axios from 'axios';

import { env } from '../../config/env.js';
import { withRetry } from '../services/retry.service.js';

export const requestJson = async (
  {
    baseURL,
    url,
    method = 'get',
    headers = {},
    params = undefined,
    data = undefined,
    timeout = 15000,
  },
  retryOptions = {}
) => {
  const client = axios.create({
    baseURL,
    timeout,
    headers: {
      'User-Agent': 'ContextOS-Ingestion-Service',
      ...headers,
    },
  });

  const response = await withRetry(
    () => client.request({ url, method, params, data }),
    retryOptions
  );

  return response.data;
};

export const buildBearerHeaders = token => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
});

export const buildBasicAuthHeaders = (username, token) => ({
  Authorization: `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`,
  Accept: 'application/json',
});

export const isProviderConfigured = provider => {
  if (provider === 'github') {
    return Boolean(env.githubApiBaseUrl);
  }

  if (provider === 'jira') {
    return Boolean(env.jiraApiBaseUrl);
  }

  if (provider === 'slack') {
    return Boolean(env.slackApiBaseUrl);
  }

  if (provider === 'confluence') {
    return Boolean(env.confluenceApiBaseUrl);
  }

  return false;
};
