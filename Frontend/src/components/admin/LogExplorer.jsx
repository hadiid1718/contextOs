import { format } from 'date-fns';
import { Pause, Play, Search } from 'lucide-react';
import { useEffect, useRef } from 'react';

const tagClass = {
  ok: 'bg-[#22d3a0]/20 text-[#22d3a0]',
  slow: 'bg-[#f59e0b]/20 text-[#f59e0b]',
  sec: 'bg-[#f43f5e]/20 text-[#f43f5e]',
  429: 'bg-[#fb923c]/20 text-[#fb923c]',
};

const toClock = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--:--';
  return format(date, 'HH:mm:ss');
};

const LogExplorer = ({
  entries = [],
  query,
  onQueryChange,
  paused,
  onTogglePause,
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (paused || !containerRef.current) return;

    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [entries, paused]);

  return (
    <section className="rounded-xl border border-[#1e2a38] bg-[#0d1117] p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#cbd5e1]">Log Explorer</h3>
        <button
          type="button"
          className="inline-flex items-center rounded-lg border border-[#1e2a38] bg-[#131920] px-2.5 py-1 text-[11px] text-[#cbd5e1]"
          onClick={onTogglePause}
        >
          {paused ? <Play size={12} className="mr-1" /> : <Pause size={12} className="mr-1" />}
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>

      <div ref={containerRef} className="mt-3 max-h-[320px] overflow-auto rounded-lg border border-[#1e2a38] bg-[#070a10]">
        <table className="min-w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-[#0f172a] text-[#64748b]">
            <tr>
              <th className="px-2.5 py-1.5">TS</th>
              <th className="px-2.5 py-1.5">CorrId</th>
              <th className="px-2.5 py-1.5">Message</th>
              <th className="px-2.5 py-1.5">Tag</th>
            </tr>
          </thead>
          <tbody>
            {entries.slice(-20).map((row) => (
              <tr key={`${row.corrId}-${row.ts}`} className="border-t border-[#1e293b] text-[#cbd5e1]">
                <td className="px-2.5 py-1.5 text-[#94a3b8]">{toClock(row.ts)}</td>
                <td className="px-2.5 py-1.5 font-mono text-[#38bdf8]">{String(row.corrId || '').slice(0, 12)}</td>
                <td className="px-2.5 py-1.5">{row.message}</td>
                <td className="px-2.5 py-1.5">
                  <span className={`inline-flex rounded-full px-2 py-0.5 ${tagClass[row.tag] || tagClass.ok}`}>
                    {row.tag}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <label className="mt-3 flex items-center gap-2 rounded-lg border border-[#1e2a38] bg-[#131920] px-2.5 py-1.5 text-[11px] text-[#94a3b8]">
        <Search size={14} />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Filter by corrId, org, or route"
          className="w-full bg-transparent text-xs text-[#e2e8f0] outline-none placeholder:text-[#64748b]"
        />
      </label>
    </section>
  );
};

export default LogExplorer;
