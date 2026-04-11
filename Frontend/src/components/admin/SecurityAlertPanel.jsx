import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';

const SecurityAlertPanel = ({ alerts = [] }) => {
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    if (alerts.length <= 1) return undefined;

    const interval = setInterval(() => {
      setStartIndex((current) => (current + 1) % alerts.length);
    }, 30000);

    return () => clearInterval(interval);
  }, [alerts.length]);

  const orderedAlerts = useMemo(() => {
    if (!alerts.length) return [];

    const head = alerts.slice(startIndex);
    const tail = alerts.slice(0, startIndex);
    return [...head, ...tail];
  }, [alerts, startIndex]);

  return (
    <section className="rounded-2xl border border-[#1e2a38] bg-[#0d1117] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#cbd5e1]">Security Alerts</h3>

      <div className="mt-4 space-y-3">
        {orderedAlerts.slice(0, 5).map((alert) => {
          const isCritical = alert.severity === 'critical';

          return (
            <article key={alert.id} className="rounded-xl border border-[#1e2a38] bg-[#131920] px-3 py-3">
              <div className="flex items-start gap-2">
                {isCritical ? (
                  <ShieldAlert size={16} className="mt-0.5 text-[#f43f5e]" />
                ) : (
                  <AlertTriangle size={16} className="mt-0.5 text-[#f59e0b]" />
                )}
                <div>
                  <p className="text-sm font-medium text-[#e2e8f0]">{alert.title}</p>
                  <p className="text-xs text-[#94a3b8]">
                    {alert.org}
                    {alert.ip ? ` - ${alert.ip}` : ''}
                  </p>
                  <p className="mt-1 text-[11px] text-[#64748b]">
                    {formatDistanceToNowStrict(new Date(alert.ts), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default SecurityAlertPanel;
