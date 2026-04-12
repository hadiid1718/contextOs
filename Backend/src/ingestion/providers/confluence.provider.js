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

  const spaces = toSpaceList(credential.metadata);
  if (spaces.length === 0) {
    return [];
  }

  const cqlSince = new Date(since).toISOString().slice(0, 19).replace('T', ' ');
  const results = [];

  for (const space of spaces) {
    const data = await requestJson(
      {
        baseURL: decryptedCredentials?.baseUrl || env.confluenceApiBaseUrl,
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
