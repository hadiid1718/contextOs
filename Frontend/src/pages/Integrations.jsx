import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, CircleAlert, CircleCheck, Plug, RefreshCcw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Card from '../components/Card';
import IntegrationCard from '../components/integrations/IntegrationCard';
import SyncActivityFeed from '../components/integrations/SyncActivityFeed';
import { formatDateTime } from '../lib/dateFormatters';
import useOrg from '../hooks/useOrg';
import useIntegrations, { integrationCatalog } from '../hooks/useIntegrations';

const providerLabelMap = integrationCatalog.reduce((acc, provider) => {
  acc[provider.provider] = provider;
  return acc;
}, {});

const buildOAuthUrl = (provider) => {
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1').replace(/\/+$/, '');
  return `${base}/auth/oauth/${provider}`;
};

const Integrations = () => {
  const { organisations, currentOrg, setActiveOrg } = useOrg();
  const queryClient = useQueryClient();
  const activatedOrgRef = useRef(null);
  const [contextReady, setContextReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [feedback, setFeedback] = useState('');
  const [highlightedProvider, setHighlightedProvider] = useState(null);
  const [pendingOAuthProvider, setPendingOAuthProvider] = useState(null);
  const [localActivity, setLocalActivity] = useState([]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    const activateContext = async () => {
      if (!currentOrg?.org_id) {
        activatedOrgRef.current = null;
        if (mounted) setContextReady(false);
        return;
      }

      if (activatedOrgRef.current === currentOrg.org_id) {
        if (mounted) setContextReady(true);
        return;
      }

      const activated = await setActiveOrg(currentOrg);

      if (mounted) {
        if (!activated) {
          setContextReady(false);
          return;
        }

        activatedOrgRef.current = currentOrg.org_id;
        setContextReady(true);
      }
    };

    void activateContext();
    return () => {
      mounted = false;
    };
  }, [currentOrg, setActiveOrg]);

  const {
    integrations,
    activityFeed,
    isLoading,
    isError,
    error,
    refetch,
    removeIntegration,
    isRemoving,
  } = useIntegrations({
    orgId: currentOrg?.org_id,
    enabled: Boolean(currentOrg?.org_id) && contextReady,
  });

  const summary = useMemo(() => {
    const connected = integrations.filter((item) => item.active).length;
    const pending = integrations.filter((item) => !item.connected || item.webhookHealth.tone === 'warning').length;
    const errorCount = integrations.filter((item) => item.webhookHealth.tone === 'error').length;
    return { connected, pending, errorCount };
  }, [integrations]);

  const mergedActivity = useMemo(() => {
    return [...localActivity, ...activityFeed].sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
  }, [activityFeed, localActivity]);

  useEffect(() => {
    const handleMessage = async (event) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'oauth:success') {
        const provider = pendingOAuthProvider || 'github';
        setPendingOAuthProvider(null);
        setHighlightedProvider(provider);
        setFeedback(`${providerLabelMap[provider]?.label || 'GitHub'} connected successfully.`);
        setLocalActivity((items) => [
          {
            id: `${provider}-oauth-${Date.now()}`,
            provider,
            icon: providerLabelMap[provider]?.icon || Activity,
            title: `${providerLabelMap[provider]?.label || 'GitHub'} OAuth completed`,
            detail: 'Connection saved and ready for the next polling cycle.',
            timestamp: new Date().toISOString(),
            tone: 'success',
          },
          ...items,
        ]);
        await refetch();
        queryClient.invalidateQueries({ queryKey: ['ingestion', 'integrations'] });
        window.setTimeout(() => setHighlightedProvider(null), 3500);
        return;
      }

      if (event.data?.type === 'oauth:failure') {
        setPendingOAuthProvider(null);
        setFeedback('OAuth connection failed. Please try again.');
        return;
      }

      if (event.data?.type === 'integration:connected') {
        const provider = event.data?.provider;
        setHighlightedProvider(provider);
        setFeedback(`${providerLabelMap[provider]?.label || provider} connected successfully.`);
        setLocalActivity((items) => [
          {
            id: `${provider}-connected-${Date.now()}`,
            provider,
            icon: providerLabelMap[provider]?.icon || Activity,
            title: `${providerLabelMap[provider]?.label || provider} connection saved`,
            detail: 'The ingestion credentials were updated and will be polled automatically.',
            timestamp: new Date().toISOString(),
            tone: 'success',
          },
          ...items,
        ]);
        await refetch();
        window.setTimeout(() => setHighlightedProvider(null), 3500);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentOrg?.org_id, pendingOAuthProvider, queryClient, refetch]);

  const openProviderPopup = (integration) => {
    setFeedback('');

    if (integration.provider === 'github') {
      setPendingOAuthProvider('github');
      const popup = window.open(
        buildOAuthUrl('github'),
        'contextos-github-oauth',
        'width=560,height=760,menubar=no,toolbar=no,location=yes,status=no,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        setPendingOAuthProvider(null);
        setFeedback('Please allow pop-ups to complete GitHub OAuth.');
      }

      popup?.focus();
      return;
    }

    const popup = window.open(
      `${window.location.origin}/integrations/connect/${integration.provider}`,
      `contextos-${integration.provider}-connect`,
      'width=700,height=900,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      setFeedback('Please allow pop-ups to connect this provider.');
      return;
    }

    popup.focus();
  };

  const handleManualSync = async (integration) => {
    setFeedback('');
    setHighlightedProvider(integration.provider);
    setLocalActivity((items) => [
      {
        id: `${integration.provider}-manual-${Date.now()}`,
        provider: integration.provider,
        icon: integration.icon,
        title: `${integration.label} manual sync requested`,
        detail: 'The UI refreshed the connection status and will pick up the next polling run.',
        timestamp: new Date().toISOString(),
        tone: 'warning',
      },
      ...items,
    ]);

    try {
      await refetch();
      setFeedback(`${integration.label} status refreshed.`);
    } finally {
      window.setTimeout(() => setHighlightedProvider(null), 2500);
    }
  };

  const handleDisconnect = async (integration) => {
    if (!window.confirm(`Disconnect ${integration.label}?`)) return;

    setFeedback('');
    try {
      await removeIntegration(integration.provider);
      setFeedback(`${integration.label} disconnected.`);
      setLocalActivity((items) => [
        {
          id: `${integration.provider}-disconnect-${Date.now()}`,
          provider: integration.provider,
          icon: integration.icon,
          title: `${integration.label} disconnected`,
          detail: 'The integration was removed from the active ingestion roster.',
          timestamp: new Date().toISOString(),
          tone: 'warning',
        },
        ...items,
      ]);
    } catch (disconnectError) {
      setFeedback(disconnectError?.response?.data?.message || `Unable to disconnect ${integration.label}.`);
    }
  };

  const activeOrgLabel = useMemo(() => {
    if (currentOrg?.name) return currentOrg.name;
    if (organisations[0]?.name) return organisations[0].name;
    return 'No active organisation';
  }, [currentOrg, organisations]);

  return (
    <div className="space-y-6">
      <Card
        title="Ingestion & Data Integrations"
        description="Connect GitHub, Jira, Slack, and Confluence. Webhook health is tracked per provider and the feed refreshes every 15 minutes."
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-text3">Active organisation</p>
            <p className="text-sm font-medium text-text">{activeOrgLabel}</p>
            <p className="mt-1 text-xs text-text3">Connected providers can ingest commits, tickets, messages, and docs into the context graph.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success">
              <span className="inline-flex items-center gap-1">
                <Activity size={12} />
                15 min polling
              </span>
            </Badge>
            <Button type="button" variant="secondary" onClick={() => refetch()}>
              <RefreshCcw size={16} className="mr-2" />
              Refresh now
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-bg3 p-4">
            <div className="flex items-center gap-2 text-text2">
              <CircleCheck size={16} />
              <span className="text-sm font-medium">Connected</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-text">{summary.connected}</p>
            <p className="text-xs text-text3">Providers with an active credential</p>
          </div>
          <div className="rounded-xl border border-border bg-bg3 p-4">
            <div className="flex items-center gap-2 text-text2">
              <Plug size={16} />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-text">{summary.pending}</p>
            <p className="text-xs text-text3">Providers awaiting a sync or setup</p>
          </div>
          <div className="rounded-xl border border-border bg-bg3 p-4">
            <div className="flex items-center gap-2 text-text2">
              <CircleAlert size={16} />
              <span className="text-sm font-medium">Webhook issues</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-text">{summary.errorCount}</p>
            <p className="text-xs text-text3">Providers reporting webhook or sync errors</p>
          </div>
        </div>
      </Card>

      <Card
        title="Integration cards"
        description="Connected providers show a pulsing green dot. Disconnected providers stay muted until a popup flow completes."
      >
        {isLoading ? <p className="text-sm text-text3">Loading integrations...</p> : null}
        {isError ? (
          <p className="text-sm text-warning">
            {error?.response?.data?.message || 'Could not load integration credentials for the current organisation.'}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.provider}
              integration={integration}
              now={now}
              highlight={highlightedProvider === integration.provider}
              onConnect={openProviderPopup}
              onManualSync={handleManualSync}
              onDisconnect={handleDisconnect}
              isBusy={isRemoving}
            />
          ))}
        </div>
      </Card>

      <Card
        title="Sync activity feed"
        description="Latest ingested commits, tickets, messages, and docs are reflected here with provider icons and timestamps."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-text3">
          <span>Last refreshed: {formatDateTime(now)}</span>
          <span>•</span>
          <span>OAuth and setup popups return the connection state back to this page.</span>
        </div>
        <SyncActivityFeed items={mergedActivity} />
      </Card>

      {feedback ? (
        <p className="rounded-lg border border-border bg-bg2 px-4 py-3 text-sm text-text2">{feedback}</p>
      ) : null}
    </div>
  );
};

export default Integrations;

