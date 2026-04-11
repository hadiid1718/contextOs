const RedisStatsPanel = ({ stats }) => {
  const safeStats = stats || { hitRate: 0, memUsedGb: 0, memTotalGb: 1, ttlAvg: 0 };
  const hitRateWidth = Math.min(100, Math.max(0, Number(safeStats.hitRate) || 0));
  const memPct = Math.min(
    100,
    Math.max(0, ((Number(safeStats.memUsedGb) || 0) / Math.max(Number(safeStats.memTotalGb) || 1, 1)) * 100)
  );

  return (
    <section className="rounded-xl border border-[#1e2a38] bg-[#0d1117] p-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#cbd5e1]">Redis Stats</h3>

      <div className="mt-3 space-y-3">
        <div>
          <div className="flex items-center justify-between text-[11px] text-[#94a3b8]">
            <span>Hit rate</span>
            <span>{safeStats.hitRate}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#1e293b]">
            <div className="h-full bg-[#22d3a0]" style={{ width: `${hitRateWidth}%` }} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] text-[#94a3b8]">
            <span>Memory</span>
            <span>
              {safeStats.memUsedGb}GB / {safeStats.memTotalGb}GB
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#1e293b]">
            <div
              className={`h-full ${memPct > 90 ? 'bg-[#f43f5e]' : memPct > 75 ? 'bg-[#f59e0b]' : 'bg-[#38bdf8]'}`}
              style={{ width: `${memPct}%` }}
            />
          </div>
        </div>

        <p className="text-[11px] text-[#94a3b8]">TTL avg {safeStats.ttlAvg}s - volatile-lru policy</p>
      </div>
    </section>
  );
};

export default RedisStatsPanel;
