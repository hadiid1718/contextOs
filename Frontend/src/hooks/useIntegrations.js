import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Github, MessageSquare, Ticket } from 'lucide-react';
import ingestionService from '../services/ingestionService';

export const integrationCatalog = [
  {
    provider: 'github',
    label: 'GitHub',
    description: 'Pull commits, pull requests, and issues into the knowledge graph.',
    icon: Github,
    eventLabel: 'commit',
    connectMode: 'oauth',
    webhookPath: '/api/v1/webhooks/github',
  },
  {
    provider: 'jira',
    label: 'Jira',
    description: 'Ingest tickets, status changes, and delivery signals from Jira.',
    icon: Ticket,
    eventLabel: 'ticket',
    connectMode: 'popup',
    webhookPath: '/api/v1/webhooks/jira',
  },
  {
    provider: 'slack',
    label: 'Slack',
    description: 'Capture channel messages and team updates from Slack.',
    icon: MessageSquare,
    eventLabel: 'message',
    connectMode: 'popup',
    webhookPath: '/api/v1/webhooks/slack',
  },
  {
    provider: 'confluence',
    label: 'Confluence',
    description: 'Sync pages, docs, and working notes from Confluence.',
    icon: BookOpen,
    eventLabel: 'document',
    connectMode: 'popup',
    webhookPath: null,
  },
];

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toHealthState = (credential) => {
  if (!credential) {
    return { label: 'Pending', tone: 'warning' };
  }

  if (credential.status === 'revoked' || credential.lastError) {
    return { label: 'Error', tone: 'error' };
  }

  if (credential.status === 'paused') {
    return { label: 'Pending', tone: 'warning' };
  }

  if (!credential.lastSyncedAt) {
    return { label: 'Pending', tone: 'warning' };
  }

  return { label: 'Active', tone: 'success' };
};

const buildActivityFeed = (integrations) => {
  const items = integrations.flatMap((integration) => {
    const createdAt = toDate(integration.lastSyncedAt || integration.lastPolledAt || integration.updatedAt || integration.createdAt);
    const errorAt = toDate(integration.updatedAt || integration.lastPolledAt || integration.createdAt);
    const providerLabel = integration.label;
    const accountName = integration.accountName || 'Unknown account';

    const baseItems = [];

    if (createdAt) {
      baseItems.push({
        id: `${integration.provider}-sync-${createdAt.toISOString()}`,
        provider: integration.provider,
        icon: integration.icon,
        title: `${providerLabel} ${integration.eventLabel} batch ingested`,
        timestamp: createdAt.toISOString(),
        detail: `${accountName} is feeding ContextOS${integration.webhookPath ? ` via ${integration.webhookPath}` : ' via scheduled polling'}.`,
        tone: integration.connected ? 'success' : 'warning',
      });
    }

    if (integration.lastError) {
      baseItems.push({
        id: `${integration.provider}-error-${errorAt?.toISOString() || 'unknown'}`,
        provider: integration.provider,
        icon: integration.icon,
        title: `${providerLabel} webhook issue detected`,
        timestamp: errorAt?.toISOString() || new Date().toISOString(),
        detail: String(integration.lastError),
        tone: 'error',
      });
    }

    return baseItems;
  });

  return items.sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
};

const useIntegrations = ({ orgId = null, enabled = true } = {}) => {
  const queryClient = useQueryClient();

  const integrationsQuery = useQuery({
    queryKey: ['ingestion', 'integrations', orgId || 'unknown'],
    queryFn: ingestionService.listIntegrations,
    enabled,
    refetchInterval: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const credentials = useMemo(() => {
    const raw = integrationsQuery.data?.credentials || integrationsQuery.data?.data || integrationsQuery.data || [];
    return Array.isArray(raw) ? raw : [];
  }, [integrationsQuery.data]);

  const credentialByProvider = useMemo(() => {
    return credentials.reduce((acc, credential) => {
      if (credential?.provider) {
        acc[credential.provider] = credential;
      }
      return acc;
    }, {});
  }, [credentials]);

  const integrations = useMemo(() => {
    return integrationCatalog.map((provider) => {
      const credential = credentialByProvider[provider.provider] || null;
      const connected = Boolean(credential) && credential.status !== 'revoked';
      const active = Boolean(credential) && credential.status === 'active' && !credential.lastError;

      return {
        ...provider,
        credential,
        connected,
        active,
        accountName: credential?.accountName || 'Not connected',
        externalId: credential?.externalId || null,
        status: credential?.status || 'disconnected',
        scopes: credential?.scopes || [],
        metadata: credential?.metadata || {},
        lastSyncedAt: credential?.lastSyncedAt || null,
        lastPolledAt: credential?.lastPolledAt || null,
        lastError: credential?.lastError || null,
        createdAt: credential?.createdAt || null,
        updatedAt: credential?.updatedAt || null,
        webhookHealth: toHealthState(credential),
      };
    });
  }, [credentialByProvider]);

  const activityFeed = useMemo(() => buildActivityFeed(integrations), [integrations]);

  const saveIntegrationMutation = useMutation({
    mutationFn: ({ provider, payload }) => ingestionService.saveIntegration(provider, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingestion', 'integrations'] });
    },
  });

  const removeIntegrationMutation = useMutation({
    mutationFn: (provider) => ingestionService.removeIntegration(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingestion', 'integrations'] });
    },
  });

  return {
    integrations,
    activityFeed,
    isLoading: integrationsQuery.isLoading,
    isError: integrationsQuery.isError,
    error: integrationsQuery.error,
    refetch: integrationsQuery.refetch,
    saveIntegration: saveIntegrationMutation.mutateAsync,
    removeIntegration: removeIntegrationMutation.mutateAsync,
    isSaving: saveIntegrationMutation.isPending,
    isRemoving: removeIntegrationMutation.isPending,
  };
};

export default useIntegrations;

