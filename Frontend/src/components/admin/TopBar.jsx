import { Bell, Hexagon, LogOut } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Button from '../Button';

const TopBar = ({ alertsCount = 0, onLogout }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const utcTime = useMemo(() => {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
      hour12: false,
    }).format(now);
  }, [now]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#1e2a38] bg-[#0d1117]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 text-[#e2e8f0]">
            <Hexagon size={16} className="text-[#38bdf8]" />
            <span className="text-lg font-semibold tracking-tight">ContextOS</span>
          </div>
          <span className="hidden text-xs uppercase tracking-[0.22em] text-[#38bdf8] sm:inline">
            System Admin / Mission Control
          </span>
          <span className="inline-flex rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f59e0b]">
            Superadmin only
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm text-[#94a3b8]">
          <span className="font-mono text-xs">{utcTime} UTC</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[#22d3a0]/35 bg-[#22d3a0]/10 px-2 py-1 text-xs text-[#22d3a0]">
            <span className="h-2 w-2 rounded-full bg-[#22d3a0] animate-admin-pulse" />
            Live
          </span>
          <button
            type="button"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#1e2a38] bg-[#131920] text-[#cbd5e1]"
            aria-label="Open admin alerts"
          >
            <Bell size={16} />
            {alertsCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#f43f5e] px-1 text-[10px] font-semibold text-white">
                {alertsCount > 99 ? '99+' : alertsCount}
              </span>
            ) : null}
          </button>
          <span className="inline-flex items-center rounded-full border border-[#1e2a38] bg-[#131920] px-2 py-1 text-xs text-[#e2e8f0]">
            SA
          </span>
          <Button type="button" variant="secondary" className="!px-3 !py-1.5" onClick={onLogout}>
            <LogOut size={14} className="mr-1" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
