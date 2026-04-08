import axios from 'axios';

import { env } from '../config/env.js';
import { getCredential } from '../services/credential.service.js';

export const pollGithub = async ({ org_id, sinceIso }) => {
  const token = await getCredential({ org_id, source: 'github' });
  if (!token?.accessToken) {
    return [];
  }

  const response = await axios.get(`${env.githubApiBaseUrl}/events`, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      Accept: 'application/vnd.github+json',
    },
    params: { per_page: 20 },
  });

  return (response.data || [])
    .filter(item => !sinceIso || new Date(item.created_at) >= new Date(sinceIso))
    .map(item => ({
      event_type: item.type || 'poll_update',
      content: item.repo?.name || 'GitHub polled event',
      metadata: {
        actor: item.actor?.login,
        repo: item.repo?.name,
        id: item.id,
      },
      timestamp: item.created_at,
    }));
};

