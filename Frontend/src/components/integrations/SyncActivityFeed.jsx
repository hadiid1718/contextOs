import Badge from '../Badge';
import { formatDateTime } from '../../lib/dateFormatters';

const toneClasses = {
  success: 'border-success/20 bg-success/10 text-success',
  warning: 'border-warning/20 bg-warning/10 text-warning',
  error: 'border-error/20 bg-error/10 text-error',
  neutral: 'border-border bg-bg3 text-text2',
};

const SyncActivityFeed = ({ items = [] }) => {
  return (
    <div className="space-y-3">
      {items.length === 0 ? <p className="text-sm text-text3">No sync activity yet. Connect a provider to start ingesting events.</p> : null}

      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div key={item.id} className="rounded-xl border border-border bg-bg2 p-4">
            <div className="flex items-start gap-3">
              <div className={`rounded-lg border p-2 ${toneClasses[item.tone] || toneClasses.neutral}`}>
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-text">{item.title}</h4>
                  <Badge tone={item.tone === 'error' ? 'error' : item.tone === 'warning' ? 'warning' : 'success'}>
                    {item.provider}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-text2">{item.detail}</p>
                <p className="mt-2 text-xs text-text3">{formatDateTime(item.timestamp)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SyncActivityFeed;

