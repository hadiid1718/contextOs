import { env } from '../../config/env.js';
import { normalizeEvent } from '../normalizers/eventNormalizer.js';
import { requestJson, buildBearerHeaders } from './providerHttpClient.js';

const buildJqlSince = since => {
  const date = new Date(since);
  const formatted = date.toISOString().slice(0, 19).replace('T', ' ');
  return `updated >= "${formatted}" ORDER BY updated ASC`;
};

export const pollJiraCredential = async ({ credential, decryptedCredentials, since }) => {
  const token =
    decryptedCredentials?.accessToken ||
    decryptedCredentials?.apiToken ||
    decryptedCredentials?.token;

  if (!token) {
    return [];
  }

  const baseURL = decryptedCredentials?.baseUrl || env.jiraApiBaseUrl;
  const jql = buildJqlSince(since);
  const data = await requestJson(
    {
      baseURL,
      url: '/rest/api/3/search',
      headers: buildBearerHeaders(token),
      params: {
        jql,
        maxResults: 50,
        fields: 'summary,status,assignee,reporter,project,updated,created',
      },
    },
    { maxRetries: env.retryMaxRetries, baseDelayMs: env.retryBaseDelayMs, maxDelayMs: env.retryMaxDelayMs }
  );

  const issues = Array.isArray(data?.issues) ? data.issues : [];

  return issues.map(issue => {
    const issueType =
      new Date(issue.fields?.created || 0).getTime() > new Date(since).getTime()
        ? 'jira:issue_created'
        : 'jira:issue_updated';

    return normalizeEvent({
      orgId: credential.org_id,
      source: 'jira',
      eventType: issueType,
      content: {
        issue: {
          id: issue.id || null,
          key: issue.key || null,
          summary: issue.fields?.summary || null,
          status: issue.fields?.status?.name || null,
          assignee: issue.fields?.assignee?.displayName || null,
          reporter: issue.fields?.reporter?.displayName || null,
          updated: issue.fields?.updated || null,
          created: issue.fields?.created || null,
        },
      },
      metadata: {
        provider: 'jira',
        issueKey: issue.key || null,
        accountName: credential.accountName,
      },
      timestamp: issue.fields?.updated || new Date(),
    });
  });
};

