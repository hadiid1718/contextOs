import axios from 'axios';

import { env } from '../config/env.js';
import { getCredential } from '../services/credential.service.js';

export const pollConfluence = async ({ org_id, sinceIso }) => {
  const token = await getCredential({ org_id, source: 'confluence' });
  if (!token?.accessToken || !env.confluenceApiBaseUrl) {
    return [];
  }

  const response = await axios.get(`${env.confluenceApiBaseUrl}/content`, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      Accept: 'application/json',
    },
    params: {
      limit: 20,
      expand: 'history',
    },
  });

  return (response.data?.results || [])
    .map(page => ({
      event_type: 'confluence:page_polled',
      content: page.title || 'Confluence page update',
      metadata: {
        id: page.id,
        type: page.type,
        lastUpdatedBy: page.history?.lastUpdated?.by?.displayName,
      },
      timestamp: page.history?.lastUpdated?.when,
    }))
    .filter(item => !sinceIso || !item.timestamp || new Date(item.timestamp) >= new Date(sinceIso));
};

