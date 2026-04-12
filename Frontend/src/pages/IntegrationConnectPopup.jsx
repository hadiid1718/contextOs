import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import Spinner from '../components/Spinner';
import useOrg from '../hooks/useOrg';
import useIntegrations, { integrationCatalog } from '../hooks/useIntegrations';

const providerTemplates = {
  github: {
    accountName: 'GitHub account',
    tokenLabel: 'Access token',
    tokenKey: 'accessToken',
    tokenPlaceholder: 'ghp_...',
    baseUrl: '',
    defaultScopes: ['repo', 'read:org'],
  },
  jira: {
    accountName: 'Jira account',
    requiresEmail: true,
    emailLabel: 'Atlassian email',
    emailPlaceholder: 'you@company.com',
    tokenLabel: 'API token',
    tokenKey: 'accessToken',
    tokenPlaceholder: 'Paste Jira API token',
    baseUrl: 'https://your-domain.atlassian.net',
    defaultScopes: ['read:jira-work', 'read:jira-user'],
  },
  slack: {
    accountName: 'Slack workspace',
    tokenLabel: 'Bot token',
    tokenKey: 'token',
    tokenPlaceholder: 'xoxb-...',
    baseUrl: 'https://slack.com/api',
    defaultScopes: ['channels:history', 'groups:history', 'chat:write'],
  },
  confluence: {
    accountName: 'Confluence space',
    requiresEmail: true,
    emailLabel: 'Atlassian email',
    emailPlaceholder: 'you@company.com',
    tokenLabel: 'API token',
    tokenKey: 'accessToken',
    tokenPlaceholder: 'Paste Confluence API token',
    baseUrl: 'https://your-domain.atlassian.net/wiki/rest/api',
    defaultScopes: ['read:confluence-content.all'],
  },
};

const IntegrationConnectPopup = () => {
  const { provider = '' } = useParams();
  const navigate = useNavigate();
  const activatedOrgRef = useRef(null);
  const {
    organisations,
    currentOrg,
    setActiveOrg,
    isLoading: organisationsLoading,
  } = useOrg();
  const { saveIntegration, isSaving } = useIntegrations();
  const providerConfig = useMemo(() => integrationCatalog.find((item) => item.provider === provider), [provider]);
  const providerTemplate = useMemo(() => providerTemplates[provider] || providerTemplates.github, [provider]);
  const [error, setError] = useState('');
  const [contextReady, setContextReady] = useState(false);
  const [contextError, setContextError] = useState('');
  const [form, setForm] = useState(() => ({
    accountName: providerTemplate.accountName,
    email: '',
    token: '',
    baseUrl: providerTemplate.baseUrl,
  }));

  useEffect(() => {
    let mounted = true;

    const ensureOrganisationContext = async () => {
      const targetOrg = currentOrg || organisations[0];

      if (!targetOrg?.org_id) {
        activatedOrgRef.current = null;
        if (!organisationsLoading && mounted) {
          setContextReady(false);
          setContextError('No organisation found. Please create or select an organisation first.');
        }
        return;
      }

      if (activatedOrgRef.current === targetOrg.org_id) {
        if (mounted) {
          setContextReady(true);
        }
        return;
      }

      setContextError('');
      const activated = await setActiveOrg(targetOrg);

      if (mounted) {
        if (!activated) {
          setContextReady(false);
          setContextError('Could not activate organisation context. Re-select your organisation and try again.');
          return;
        }

        activatedOrgRef.current = targetOrg.org_id;
        setContextReady(true);
      }
    };

    void ensureOrganisationContext();

    return () => {
      mounted = false;
    };
  }, [currentOrg, organisations, organisationsLoading, setActiveOrg]);

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

  const handleCancel = () => {
    if (window.opener) {
      window.close();
      return;
    }

    navigate('/integrations', { replace: true });
  };

  if (!providerConfig) {
    return (
      <div className="min-h-screen bg-bg px-4 py-10 text-text">
        <Card title="Unknown integration" description="The selected provider is not available.">
          <p className="text-sm text-text2">Choose GitHub, Jira, Slack, or Confluence.</p>
          <Button type="button" className="mt-4" onClick={handleCancel}>
            Back to integrations
          </Button>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!contextReady) {
      setError(contextError || 'Organisation context is still loading. Please try again in a moment.');
      return;
    }

    const accountName = form.accountName.trim();
    const email = form.email.trim();
    const tokenValue = form.token.trim();
    const baseUrl = form.baseUrl.trim();

    if (!accountName) {
      setError('Account name is required.');
      return;
    }

    if (!tokenValue) {
      setError(`${providerTemplate.tokenLabel} is required.`);
      return;
    }

    if (providerTemplate.requiresEmail && !email) {
      setError('Atlassian email is required for this provider.');
      return;
    }

    const credentials = {
      [providerTemplate.tokenKey]: tokenValue,
    };

    if (providerTemplate.requiresEmail) {
      credentials.email = email;
    }

    if (baseUrl) {
      credentials.baseUrl = baseUrl;
    }

    const payload = {
      accountName,
      status: 'active',
      scopes: providerTemplate.defaultScopes,
      metadata: baseUrl ? { baseUrl } : {},
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
          description="Enter the basic credentials below, then save the connection."
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Account name"
              value={form.accountName}
              onChange={(event) => setForm((value) => ({ ...value, accountName: event.target.value }))}
              required
            />

            {providerTemplate.requiresEmail ? (
              <Input
                label={providerTemplate.emailLabel}
                type="email"
                value={form.email}
                onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
                placeholder={providerTemplate.emailPlaceholder}
                required
              />
            ) : null}

            <Input
              label={providerTemplate.tokenLabel}
              type="password"
              enablePasswordToggle
              value={form.token}
              onChange={(event) => setForm((value) => ({ ...value, token: event.target.value }))}
              placeholder={providerTemplate.tokenPlaceholder}
              required
            />

            <Input
              label="Base URL (optional)"
              value={form.baseUrl}
              onChange={(event) => setForm((value) => ({ ...value, baseUrl: event.target.value }))}
              placeholder="https://..."
            />

            {contextError ? <p className="text-sm text-warning">{contextError}</p> : null}

            {error ? <p className="text-sm text-error">{error}</p> : null}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button type="submit" disabled={isSaving || !contextReady}>
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <Spinner size={4} />
                    Saving...
                  </span>
                ) : !contextReady ? (
                  'Preparing context...'
                ) : (
                  'Save Connection'
                )}
              </Button>
              <Button type="button" variant="secondary" onClick={handleCancel}>
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

