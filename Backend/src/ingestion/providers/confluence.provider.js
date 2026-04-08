import { env } from '../../config/env.js';
import { requestWithRetry } from './providerHttpClient.js';

export const pollConfluenceEvents = async ({ credentials }) => {
  const accessToken = credentials?.accessToken;

  if (!accessToken) {
    return [];
  }

  const response = await requestWithRetry({
    method: 'GET',
    url: `${env.confluenceApiBaseUrl.replace(/\/$/, '')}/content`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    params: {
      limit: 25,
      expand: 'version,space',
    },
  });

  return (response.data?.results || []).map(page => ({
    eventType: 'confluence.content_polled',
    payload: page,
    metadata: {
      content_id: page.id,
      content_type: page.type,
      space: page.space?.key,
    },
  }));
};

