import { env } from '../../config/env.js';
import { normalizeConfluenceActivity } from '../normalizers/eventNormalizer.js';
import {
  requestJson,
  buildBearerHeaders,
  buildBasicAuthHeaders,
} from './providerHttpClient.js';

const toSpaceList = metadata => {
  if (Array.isArray(metadata?.spaces) && metadata.spaces.length > 0) {
    return metadata.spaces;
  }

  if (metadata?.spaceKey) {
    return [metadata.spaceKey];
  }

  return [];
};

const isAtlassianPlaceholderUrl = url =>
  /your-domain\.atlassian\.net/i.test(String(url || ''));

const resolveConfluenceBaseUrl = decryptedCredentials => {
  const credentialBaseUrl = String(decryptedCredentials?.baseUrl || '').trim();
  if (credentialBaseUrl) {
    if (isAtlassianPlaceholderUrl(credentialBaseUrl)) {
      throw new Error(
        'Confluence base URL is still set to the placeholder. Update the integration with your real Atlassian site URL.'
      );
    }

    return credentialBaseUrl;
  }

  const envBaseUrl = String(env.confluenceApiBaseUrl || '').trim();
  if (!envBaseUrl || isAtlassianPlaceholderUrl(envBaseUrl)) {
    throw new Error(
      'Confluence base URL is not configured. Set a real Atlassian site URL in integration settings or CONFLUENCE_API_BASE_URL.'
    );
  }

  return envBaseUrl;
};

const discoverSpacesFromToken = async ({ baseURL, headers }) => {
  const data = await requestJson(
    {
      baseURL,
      url: '/space',
      headers,
      params: {
        limit: 25,
      },
    },
    {
      maxRetries: env.retryMaxRetries,
      baseDelayMs: env.retryBaseDelayMs,
      maxDelayMs: env.retryMaxDelayMs,
    }
  );

  const spaces = Array.isArray(data?.results) ? data.results : [];

  return spaces
    .map(space => String(space?.key || '').trim())
    .filter(Boolean)
    .slice(0, 20);
};

export const pollConfluenceCredential = async ({
  credential,
  decryptedCredentials,
  since,
}) => {
  const token =
    decryptedCredentials?.accessToken || decryptedCredentials?.token;
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

  const baseURL = resolveConfluenceBaseUrl(decryptedCredentials);

  const configuredSpaces = toSpaceList(credential.metadata);
  const spaces =
    configuredSpaces.length > 0
      ? configuredSpaces
      : await discoverSpacesFromToken({ baseURL, headers });

  if (spaces.length === 0) {
    return [];
  }

  const cqlSince = new Date(since).toISOString().slice(0, 19).replace('T', ' ');
  const results = [];

  for (const space of spaces) {
    const data = await requestJson(
      {
        baseURL,
        url: '/content/search',
        headers,
        params: {
          cql: `space="${space}" AND lastmodified >= "${cqlSince}"`,
          limit: 25,
          expand: 'version,space',
        },
      },
      {
        maxRetries: env.retryMaxRetries,
        baseDelayMs: env.retryBaseDelayMs,
        maxDelayMs: env.retryMaxDelayMs,
      }
    );

    const pages = Array.isArray(data?.results) ? data.results : [];

    for (const page of pages) {
      results.push(
        normalizeConfluenceActivity({
          orgId: credential.org_id,
          item: page,
          metadata: {
            provider: 'confluence',
            space,
            accountName: credential.accountName,
          },
        })
      );
    }
  }

  return results;
};
