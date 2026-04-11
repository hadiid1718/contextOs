import Badge from '../Badge';

const OrgRateLimitPanel = ({ rows = [] }) => {
  return (
    <section className="rounded-2xl border border-[#1e2a38] bg-[#0d1117] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#cbd5e1]">Org Rate Limits</h3>
      <div className="mt-4 space-y-3">
        {rows.slice(0, 6).map((row) => {
          const width = Math.min(100, Math.max(2, row.pct));
          const barClass = row.pct > 90 ? 'bg-[#f43f5e]' : row.pct > 80 ? 'bg-[#f59e0b]' : 'bg-[#38bdf8]';

          return (
            <div key={row.orgId} className="rounded-xl border border-[#1e2a38] bg-[#131920] px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-[#e2e8f0]">{row.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#94a3b8]">{row.reqPerMin} req/min</span>
                  <Badge tone={row.flag === '429' ? 'error' : row.flag === 'watch' ? 'warning' : 'success'}>
                    {row.flag === '429' ? '429x12' : row.flag}
                  </Badge>
                </div>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#1e293b]">
                <div className={`h-full ${barClass}`} style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default OrgRateLimitPanel;
