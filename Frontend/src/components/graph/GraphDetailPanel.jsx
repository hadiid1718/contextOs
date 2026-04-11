import Badge from '../Badge';
import Button from '../Button';
import { formatDateTime } from '../../lib/dateFormatters';
import { formatGraphConfidence, getNodeLabel, getNodeTypeMeta } from '../../lib/graph';

const renderValue = (value) => {
  if (value == null) return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value, null, 2);
};

const GraphDetailPanel = ({
  node,
  relatedEdges = [],
  nodeMap = new Map(),
  onClose,
}) => {
  const meta = getNodeTypeMeta(node?.node_type);

  return (
    <aside className="fixed right-4 top-4 z-40 h-[calc(100vh-2rem)] w-[min(100vw-2rem,420px)] overflow-hidden rounded-2xl border border-border bg-bg2 shadow-2xl">
      <div className="flex h-full flex-col">
        <div className="border-b border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Badge tone={meta.tone}>{meta.label}</Badge>
              <h3 className="mt-3 truncate text-lg font-semibold text-text">{getNodeLabel(node)}</h3>
              <p className="mt-1 text-sm text-text2">{node?.source || 'Unknown source'} • {formatDateTime(node?.created_at)}</p>
            </div>
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <section className="space-y-2">
            <h4 className="text-xs uppercase tracking-wide text-text3">Content</h4>
            <pre className="whitespace-pre-wrap rounded-xl border border-border bg-bg3 p-3 text-sm text-text2">
              {renderValue(node?.content)}
            </pre>
          </section>

          <section className="space-y-2">
            <h4 className="text-xs uppercase tracking-wide text-text3">Metadata</h4>
            <pre className="whitespace-pre-wrap rounded-xl border border-border bg-bg3 p-3 text-sm text-text2">
              {renderValue(node?.metadata)}
            </pre>
          </section>

          <section className="space-y-2">
            <h4 className="text-xs uppercase tracking-wide text-text3">Connected edges</h4>
            {relatedEdges.length === 0 ? (
              <p className="rounded-xl border border-border bg-bg3 p-3 text-sm text-text3">No linked edges are currently available for this node.</p>
            ) : (
              <div className="space-y-2">
                {relatedEdges.map((edge) => {
                  const otherNodeId = edge.from_id === node?._id ? edge.to_id : edge.from_id;
                  const otherNode = nodeMap.get(otherNodeId);
                  const otherLabel = otherNode ? getNodeLabel(otherNode) : otherNodeId;
                  const score = Math.max(0, Math.min(1, Number(edge.confidence_score) || 0));

                  return (
                    <div key={`${edge.from_id}:${edge.to_id}:${edge.relationship_type}`} className="rounded-xl border border-border bg-bg3 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-text">{edge.relationship_type}</p>
                          <p className="text-xs text-text3">{otherLabel}</p>
                        </div>
                        <Badge tone={score >= 0.75 ? 'success' : score >= 0.45 ? 'warning' : 'error'}>
                          {formatGraphConfidence(score)}
                        </Badge>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full bg-brand transition-all"
                          style={{ width: `${score * 100}%` }}
                          aria-hidden="true"
                        />
                      </div>
                      <p className="mt-2 text-xs text-text3">
                        {edge.from_id} → {edge.to_id}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </aside>
  );
};

export default GraphDetailPanel;

