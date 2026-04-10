import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import Spinner from '../components/Spinner';
import useIntegrations, { integrationCatalog } from '../hooks/useIntegrations';

const defaultTemplates = {
  github: {
    accountName: 'GitHub account',
    externalId: '',
    scopes: 'repo,read:org',
    metadataJson: '{\n  "repositories": ["owner/repository"]\n}',
    credentialsJson: '{\n  "accessToken": "ghp_your_token_here"\n}',
  },
  jira: {
    accountName: 'Jira account',
    externalId: '',
    scopes: 'read:jira-work,read:jira-user',
    metadataJson: '{\n  "projects": ["OPS"]\n}',
    credentialsJson: '{\n  "accessToken": "your_jira_token",\n  "baseUrl": "https://your-domain.atlassian.net"\n}',
  },
  slack: {
    accountName: 'Slack workspace',
    externalId: '',
    scopes: 'channels:history,groups:history,chat:write',
    metadataJson: '{\n  "channels": ["general"]\n}',
    credentialsJson: '{\n  "token": "xoxb-your-token",\n  "baseUrl": "https://slack.com/api"\n}',
  },
  confluence: {
    accountName: 'Confluence space',
    externalId: '',
    scopes: 'read:confluence-content.all',
    metadataJson: '{\n  "spaces": ["ENG"]\n}',
    credentialsJson: '{\n  "accessToken": "your_confluence_token",\n  "baseUrl": "https://your-domain.atlassian.net/wiki/rest/api"\n}',
  },
};

const parseCsv = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const prettyLabel = (value) => value.charAt(0).toUpperCase() + value.slice(1);

const IntegrationConnectPopup = () => {
  const { provider = '' } = useParams();
  const navigate = useNavigate();
  const { saveIntegration, isSaving } = useIntegrations();
  const providerConfig = useMemo(() => integrationCatalog.find((item) => item.provider === provider), [provider]);
  const initialTemplate = useMemo(() => defaultTemplates[provider] || defaultTemplates.github, [provider]);
  const [error, setError] = useState('');
  const [form, setForm] = useState(initialTemplate);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'oauth:success') {
        window.opener?.postMessage({ type: 'integration:connected', provider }, window.location.origin);
        window.setTimeout(() => window.close(), 150);
      }
      if (event.data?.type === 'oauth:failure') {
        setError('OAuth connection failed. Please try again.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [provider]);

  if (!providerConfig) {
    return (
      <div className="min-h-screen bg-bg px-4 py-10 text-text">
        <Card title="Unknown integration" description="The selected provider is not available.">
          <p className="text-sm text-text2">Choose GitHub, Jira, Slack, or Confluence.</p>
          <Button type="button" className="mt-4" onClick={() => navigate('/integrations', { replace: true })}>
            Back to integrations
          </Button>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    let metadata = {};
    let credentials = {};

    try {
      metadata = form.metadataJson ? JSON.parse(form.metadataJson) : {};
    } catch {
      setError('Metadata must be valid JSON.');
      return;
    }

    try {
      credentials = form.credentialsJson ? JSON.parse(form.credentialsJson) : {};
    } catch {
      setError('Credentials must be valid JSON.');
      return;
    }

    const payload = {
      accountName: form.accountName.trim(),
      externalId: form.externalId.trim() || undefined,
      status: 'active',
      scopes: parseCsv(form.scopes),
      metadata,
      credentials,
    };

    try {
      const response = await saveIntegration({ provider, payload });
      const credential = response?.credential || response?.data?.credential || response?.data || response;
      window.opener?.postMessage(
        {
          type: 'integration:connected',
          provider,
          credential,
        },
        window.location.origin
      );
      window.setTimeout(() => window.close(), 150);
    } catch (connectError) {
      setError(connectError?.response?.data?.message || 'Unable to save integration.');
    }
  };

  return (
    <div className="min-h-screen bg-bg px-4 py-8 text-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Card
          title={`Connect ${providerConfig.label}`}
          description="Save the provider credentials and metadata so ingestion can start polling and accepting webhooks."
        >
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-text2">
            <Badge tone="warning">Popup window</Badge>
            <span>{prettyLabel(providerConfig.connectMode)} flow</span>
            <span>•</span>
            <span>{providerConfig.webhookPath || 'Scheduled polling only'}</span>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Account name"
              value={form.accountName}
              onChange={(event) => setForm((value) => ({ ...value, accountName: event.target.value }))}
              required
            />

            <Input
              label="External account ID"
              value={form.externalId}
              onChange={(event) => setForm((value) => ({ ...value, externalId: event.target.value }))}
              placeholder="Optional"
            />

            <Input
              label="Scopes"
              value={form.scopes}
              onChange={(event) => setForm((value) => ({ ...value, scopes: event.target.value }))}
              placeholder="Comma-separated scopes"
            />

            <label className="block text-sm text-text2">
              <span className="mb-1 block font-medium">Metadata JSON</span>
              <textarea
                rows={5}
                className="w-full rounded-lg border border-border bg-bg3 px-3 py-2 text-sm text-text outline-none ring-brand transition placeholder:text-text3 focus:border-border-strong focus:ring-1"
                value={form.metadataJson}
                onChange={(event) => setForm((value) => ({ ...value, metadataJson: event.target.value }))}
              />
            </label>

            <label className="block text-sm text-text2">
              <span className="mb-1 block font-medium">Credentials JSON</span>
              <textarea
                rows={8}
                className="w-full rounded-lg border border-border bg-bg3 px-3 py-2 text-sm text-text outline-none ring-brand transition placeholder:text-text3 focus:border-border-strong focus:ring-1"
                value={form.credentialsJson}
                onChange={(event) => setForm((value) => ({ ...value, credentialsJson: event.target.value }))}
              />
            </label>

            {error ? <p className="text-sm text-error">{error}</p> : null}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <Spinner size={4} />
                    Saving...
                  </span>
                ) : (
                  'Save connection'
                )}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/integrations', { replace: true })}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default IntegrationConnectPopup;

