import { env } from '../../config/env.js';
import { normalizeEvent } from '../normalizers/eventNormalizer.js';
import { requestJson, buildBearerHeaders } from './providerHttpClient.js';

const toRepositoryList = metadata => {
  if (
    Array.isArray(metadata?.repositories) &&
    metadata.repositories.length > 0
  ) {
    return metadata.repositories;
  }

  if (metadata?.repository) {
    return [metadata.repository];
  }

  return [];
};

const discoverRepositoriesFromToken = async token => {
  const data = await requestJson(
    {
      baseURL: env.githubApiBaseUrl,
      url: '/user/repos',
      headers: {
        ...buildBearerHeaders(token),
        'X-GitHub-Api-Version': '2022-11-28',
      },
      params: {
        sort: 'updated',
        direction: 'desc',
        per_page: 20,
        page: 1,
      },
    },
    {
      maxRetries: env.retryMaxRetries,
      baseDelayMs: env.retryBaseDelayMs,
      maxDelayMs: env.retryMaxDelayMs,
    }
  );

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map(repository => String(repository?.full_name || '').trim())
    .filter(Boolean)
    .slice(0, 10);
};

const normalizeGithubApiEvent = ({ orgId, credential, repo, event }) => {
  const eventType = event.type || 'unknown';
  const eventMap = {
    PushEvent: 'push',
    PullRequestEvent: 'pull_request',
    IssuesEvent: 'issues',
  };
  const mappedType = eventMap[eventType] || eventType;

  if (!['push', 'pull_request', 'issues'].includes(mappedType)) {
    return null;
  }

  return normalizeEvent({
    orgId,
    source: 'github',
    eventType: mappedType,
    content: {
      repository: repo,
      action: event.payload?.action || null,
      ref: event.payload?.ref || null,
      commits: event.payload?.commits || [],
      pull_request: event.payload?.pull_request || null,
      issue: event.payload?.issue || null,
    },
    metadata: {
      provider: 'github',
      repository: repo,
      eventId: event.id || null,
      decryptedAccount: credential.accountName,
    },
    timestamp: event.created_at || event.updated_at || new Date(),
  });
};

export const pollGithubCredential = async ({
  credential,
  decryptedCredentials,
}) => {
  const token =
    decryptedCredentials?.accessToken || decryptedCredentials?.token;
  if (!token) {
    return [];
  }

  const configuredRepositories = toRepositoryList(credential.metadata);
  const repositories =
    configuredRepositories.length > 0
      ? configuredRepositories
      : await discoverRepositoriesFromToken(token);

  if (repositories.length === 0) {
    return [];
  }

  const results = [];

  for (const repository of repositories) {
    const events = await requestJson(
      {
        baseURL: env.githubApiBaseUrl,
        url: `/repos/${repository}/events`,
        headers: {
          ...buildBearerHeaders(token),
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
      {
        maxRetries: env.retryMaxRetries,
        baseDelayMs: env.retryBaseDelayMs,
        maxDelayMs: env.retryMaxDelayMs,
      }
    );

    for (const event of Array.isArray(events) ? events : []) {
      const normalizedEvent = normalizeGithubApiEvent({
        orgId: credential.org_id,
        credential,
        repo: repository,
        event,
      });

      if (normalizedEvent) {
        results.push(normalizedEvent);
      }
    }
  }

  return results;
};
