import { env } from '../../config/env.js';
import { normalizeEvent } from '../normalizers/eventNormalizer.js';
import {
  requestJson,
  buildBearerHeaders,
  buildBasicAuthHeaders,
} from './providerHttpClient.js';

const buildJqlSince = since => {
  const date = new Date(since);
  const formatted = date.toISOString().slice(0, 19).replace('T', ' ');
  return `updated >= "${formatted}" ORDER BY updated ASC`;
};

const isAtlassianPlaceholderUrl = url =>
  /your-domain\.atlassian\.net/i.test(String(url || ''));

const resolveJiraBaseUrl = decryptedCredentials => {
  const credentialBaseUrl = String(decryptedCredentials?.baseUrl || '').trim();
  if (credentialBaseUrl) {
    if (isAtlassianPlaceholderUrl(credentialBaseUrl)) {
      throw new Error(
        'Jira base URL is still set to the placeholder. Update the integration with your real Atlassian site URL.'
      );
    }

    return credentialBaseUrl;
  }

  const envBaseUrl = String(env.jiraApiBaseUrl || '').trim();
  if (!envBaseUrl || isAtlassianPlaceholderUrl(envBaseUrl)) {
    throw new Error(
      'Jira base URL is not configured. Set a real Atlassian site URL in integration settings or JIRA_API_BASE_URL.'
    );
  }

  return envBaseUrl;
};

export const pollJiraCredential = async ({
  credential,
  decryptedCredentials,
  since,
}) => {
  const token =
    decryptedCredentials?.accessToken ||
    decryptedCredentials?.apiToken ||
    decryptedCredentials?.token;

  if (!token) {
    return [];
  }

  const emailCandidate =
    decryptedCredentials?.email ||
    decryptedCredentials?.username ||
    credential?.externalId ||
    credential?.accountName;
  const atlassianEmail = String(emailCandidate || '').trim();
  const useBasicAuth = atlassianEmail.includes('@');
  const headers = useBasicAuth
    ? buildBasicAuthHeaders(atlassianEmail, token)
    : buildBearerHeaders(token);

  const baseURL = resolveJiraBaseUrl(decryptedCredentials);
  const jql = buildJqlSince(since);
  const data = await requestJson(
    {
      baseURL,
      url: '/rest/api/3/search',
      headers,
      params: {
        jql,
        maxResults: 50,
        fields: 'summary,status,assignee,reporter,project,updated,created',
      },
    },
    {
      maxRetries: env.retryMaxRetries,
      baseDelayMs: env.retryBaseDelayMs,
      maxDelayMs: env.retryMaxDelayMs,
    }
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
