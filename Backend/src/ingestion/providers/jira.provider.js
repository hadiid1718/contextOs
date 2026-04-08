import { env } from '../../config/env.js';
import { requestWithRetry } from './providerHttpClient.js';

export const pollJiraEvents = async ({ credentials, sinceIso }) => {
  const accessToken = credentials?.accessToken;
  const jql = credentials?.jql || 'order by updated DESC';
  const sinceMs = new Date(sinceIso).getTime();

  if (!accessToken) {
    return [];
  }

  const response = await requestWithRetry({
    method: 'GET',
    url: `${env.jiraApiBaseUrl.replace(/\/$/, '')}/rest/api/3/search`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    params: {
      jql,
      maxResults: 50,
      fields: 'summary,status,issuetype,updated,created,project,priority',
      expand: 'changelog',
    },
  });

  return (response.data?.issues || [])
    .filter(issue => {
      const updatedMs = new Date(issue.fields?.updated || 0).getTime();
      return Number.isFinite(updatedMs) && updatedMs >= sinceMs;
    })
    .map(issue => ({
      eventType: 'jira.issue_polled',
      payload: issue,
      metadata: {
        issue_key: issue.key,
        project: issue.fields?.project?.key,
      },
    }));
};

