import { env } from '../../config/env.js';
import { requestWithRetry } from './providerHttpClient.js';

const extractRepo = settings => {
  if (settings?.owner && settings?.repo) {
    return { owner: settings.owner, repo: settings.repo };
  }

  if (settings?.repositoryFullName?.includes('/')) {
    const [owner, repo] = settings.repositoryFullName.split('/');
    return { owner, repo };
  }

  return null;
};

export const pollGithubEvents = async ({ credentials, settings, sinceIso }) => {
  const repository = extractRepo(settings);
  const accessToken = credentials?.accessToken;

  if (!accessToken || !repository) {
    return [];
  }

  const response = await requestWithRetry({
    method: 'GET',
    url: `${env.githubApiBaseUrl}/repos/${repository.owner}/${repository.repo}/events`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'contextos-ingestion-service',
    },
    params: {
      per_page: 100,
      since: sinceIso,
    },
  });

  const allowedTypes = new Set(['PushEvent', 'PullRequestEvent', 'IssuesEvent']);

  return (response.data || [])
    .filter(event => allowedTypes.has(event.type))
    .map(event => ({
      eventType: event.type,
      payload: event,
      metadata: {
        delivery_id: event.id,
        repository: event.repo?.name,
        actor: event.actor?.login,
      },
    }));
};

