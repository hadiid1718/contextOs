import axios from 'axios';

import { env } from '../config/env.js';
import { getCredential } from '../services/credential.service.js';

export const pollJira = async ({ org_id, sinceIso }) => {
  const token = await getCredential({ org_id, source: 'jira' });
  if (!token?.accessToken || !env.jiraApiBaseUrl) {
    return [];
  }

  const jql = sinceIso ? `updated >= \"${sinceIso}\"` : 'order by updated desc';

  const response = await axios.get(`${env.jiraApiBaseUrl}/rest/api/3/search`, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      Accept: 'application/json',
    },
    params: {
      jql,
      maxResults: 20,
    },
  });

  return (response.data?.issues || []).map(issue => ({
    event_type: 'jira:issue_polled',
    content: issue.fields?.summary || 'Jira polled issue',
    metadata: {
      issueKey: issue.key,
      projectKey: issue.fields?.project?.key,
      status: issue.fields?.status?.name,
    },
    timestamp: issue.fields?.updated,
  }));
};

