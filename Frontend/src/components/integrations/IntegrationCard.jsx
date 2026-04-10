import Badge from '../Badge';
import Button from '../Button';
import { formatDateTime } from '../../lib/dateFormatters';

const formatRelativeTime = (value, now) => {
  if (!value) return 'Never synced';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never synced';

  const diffMs = now - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (diffMs < 0) return 'Just now';
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};


const IntegrationCard = ({ integration, now, onConnect, onManualSync, onDisconnect, highlight = false, isBusy = false }) => {
  const Icon = integration.icon;
  const connectedDotClass = integration.active ? 'bg-success animate-pulse' : 'bg-text3';

  return (
    <article
      className={`rounded-xl border bg-bg2 p-5 transition ${
        highlight ? 'border-success/40 shadow-[0_0_0_1px_rgba(52,211,153,0.18)]' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-border bg-bg3 p-2 text-text2">
            <Icon size={18} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-text">{integration.label}</h3>
              <span className={`inline-flex h-2.5 w-2.5 rounded-full ${connectedDotClass}`} aria-hidden="true" />
              <Badge tone={integration.connected ? 'success' : 'neutral'}>
                {integration.connected ? (integration.active ? 'Connected' : 'Configured') : 'Disconnected'}
              </Badge>
              <Badge tone={integration.webhookHealth.tone}>{integration.webhookHealth.label}</Badge>
            </div>
            <p className="mt-1 text-sm text-text2">{integration.description}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-text2 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-bg3/70 p-3">
          <p className="text-xs uppercase tracking-wide text-text3">Account</p>
          <p className="mt-1 font-medium text-text">{integration.accountName}</p>
          <p className="mt-1 text-xs text-text3">{integration.externalId ? `External ID: ${integration.externalId}` : 'No external account ID saved yet.'}</p>
        </div>
        <div className="rounded-lg border border-border bg-bg3/70 p-3">
          <p className="text-xs uppercase tracking-wide text-text3">Last sync</p>
          <p className="mt-1 font-medium text-text">{formatRelativeTime(integration.lastSyncedAt, now)}</p>
          <p className="mt-1 text-xs text-text3">{integration.lastSyncedAt ? formatDateTime(integration.lastSyncedAt) : 'Waiting for the first ingestion run.'}</p>
        </div>
        <div className="rounded-lg border border-border bg-bg3/70 p-3">
          <p className="text-xs uppercase tracking-wide text-text3">Webhook health</p>
          <p className="mt-1 font-medium text-text">{integration.webhookHealth.label}</p>
          <p className="mt-1 text-xs text-text3">
            {integration.lastError
              ? integration.lastError
              : integration.connected
                ? integration.webhookPath
                  ? `Watching ${integration.webhookPath}`
                  : 'Scheduled polling only.'
                : 'Connect to enable webhook monitoring.'}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg3/70 p-3">
          <p className="text-xs uppercase tracking-wide text-text3">Scopes</p>
          <p className="mt-1 font-medium text-text">{integration.scopes.length > 0 ? integration.scopes.join(', ') : 'No scopes recorded'}</p>
          <p className="mt-1 text-xs text-text3">Polling refreshes every 15 minutes.</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={() => onConnect(integration)} disabled={isBusy}>
          {integration.connected ? 'Reconnect' : 'Connect'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => onManualSync(integration)} disabled={!integration.connected || isBusy}>
          Manual sync
        </Button>
        {integration.connected ? (
          <Button type="button" variant="ghost" onClick={() => onDisconnect(integration)} disabled={isBusy}>
            Disconnect
          </Button>
        ) : null}
      </div>
    </article>
  );
};

export default IntegrationCard;

