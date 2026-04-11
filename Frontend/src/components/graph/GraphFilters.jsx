import Badge from '../Badge';
import Button from '../Button';
import { graphNodeTypes, getNodeTypeMeta } from '../../lib/graph';

const GraphFilters = ({
  filters,
  onChange,
  onReset,
  onRefresh,
  canTrace = false,
  onTraceCause,
  isRefreshing = false,
  summary = {},
}) => {
  const update = (next) => onChange({ ...filters, ...next });

  const toggleNodeType = (type) => {
    const nodeTypes = filters.nodeTypes.includes(type)
      ? filters.nodeTypes.filter((item) => item !== type)
      : [...filters.nodeTypes, type];
    update({ nodeTypes });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-bg2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text">Graph filters</h3>
          <p className="text-sm text-text2">Search the current organisation graph and refine the force canvas in real time.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="success">{summary.nodeCount || 0} nodes</Badge>
          <Badge tone="neutral">{summary.edgeCount || 0} edges</Badge>
          <Badge tone="warning">Min confidence {Math.round((filters.minConfidence || 0) * 100)}%</Badge>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <label className="space-y-1 text-sm text-text2">
          <span className="text-xs uppercase tracking-wide text-text3">Keyword</span>
          <input
            value={filters.q}
            onChange={(event) => update({ q: event.target.value })}
            placeholder="Search commits, tickets, docs..."
            className="w-full rounded-lg border border-border bg-bg3 px-3 py-2 text-sm text-text outline-none transition placeholder:text-text3 focus:border-border-strong"
          />
        </label>

        <label className="space-y-1 text-sm text-text2">
          <span className="text-xs uppercase tracking-wide text-text3">From</span>
          <input
            type="date"
            value={filters.from}
            onChange={(event) => update({ from: event.target.value })}
            className="w-full rounded-lg border border-border bg-bg3 px-3 py-2 text-sm text-text outline-none transition focus:border-border-strong"
          />
        </label>

        <label className="space-y-1 text-sm text-text2">
          <span className="text-xs uppercase tracking-wide text-text3">To</span>
          <input
            type="date"
            value={filters.to}
            onChange={(event) => update({ to: event.target.value })}
            className="w-full rounded-lg border border-border bg-bg3 px-3 py-2 text-sm text-text outline-none transition focus:border-border-strong"
          />
        </label>

        <label className="space-y-1 text-sm text-text2">
          <span className="text-xs uppercase tracking-wide text-text3">Minimum confidence</span>
          <div className="rounded-lg border border-border bg-bg3 px-3 py-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={filters.minConfidence}
              onChange={(event) => update({ minConfidence: Number(event.target.value) })}
              className="h-2 w-full cursor-pointer accent-brand"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-text3">
              <span>0%</span>
              <span>{Math.round((filters.minConfidence || 0) * 100)}%</span>
              <span>100%</span>
            </div>
          </div>
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-text3">Node types</p>
        <div className="flex flex-wrap gap-2">
          {graphNodeTypes.map((type) => {
            const meta = getNodeTypeMeta(type);
            const active = filters.nodeTypes.includes(type);
            return (
              <button
                type="button"
                key={type}
                onClick={() => toggleNodeType(type)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active ? meta.nodeClass : 'border-border bg-bg3 text-text2 hover:bg-surface'
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-current' : 'bg-text3'}`} aria-hidden="true" />
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={onRefresh} disabled={isRefreshing}>
          Refresh graph
        </Button>
        <Button type="button" variant="ghost" onClick={onReset} disabled={isRefreshing}>
          Reset filters
        </Button>
        <Button type="button" onClick={onTraceCause} disabled={!canTrace || isRefreshing}>
          Trace Cause
        </Button>
      </div>
    </div>
  );
};

export default GraphFilters;

