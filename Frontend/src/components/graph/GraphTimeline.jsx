import Badge from '../Badge';
import { formatDateTime } from '../../lib/dateFormatters';
import { getNodeLabel, getNodeTypeMeta, formatGraphConfidence } from '../../lib/graph';

const GraphTimeline = ({ steps = [], activeStep = 0, isTracing = false, onStepSelect }) => {
  if (!steps.length) {
    return (
      <div className="rounded-xl border border-border bg-bg2 p-4 text-sm text-text3">
        Trace Cause to animate the BFS path through the causal chain.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text">Causal chain timeline</h3>
          <p className="text-sm text-text2">{isTracing ? 'Animating the breadth-first trace through the selected chain.' : 'Click a step to focus it in the graph.'}</p>
        </div>
        <Badge tone={isTracing ? 'success' : 'neutral'}>{isTracing ? 'Tracing' : 'Idle'}</Badge>
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => {
          const meta = getNodeTypeMeta(step.node?.node_type);
          const active = index <= activeStep;
          return (
            <button
              key={`${step.id}-${index}`}
              type="button"
              onClick={() => onStepSelect?.(index)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                active ? 'border-brand/50 bg-brand/10' : 'border-border bg-bg3 hover:border-border-strong'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${meta.nodeClass}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs uppercase tracking-wide text-text3">Depth {step.depth}</span>
                    {step.viaEdge ? (
                      <Badge tone="warning">
                        {step.viaEdge.relationship_type} • {formatGraphConfidence(step.viaEdge.confidence_score)}
                      </Badge>
                    ) : (
                      <Badge tone="success">Root node</Badge>
                    )}
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold text-text">{getNodeLabel(step.node)}</p>
                  <p className="mt-1 text-xs text-text3">{step.node?.source || 'Unknown source'} • {formatDateTime(step.node?.created_at)}</p>
                </div>
                <div className="text-right text-xs text-text3">
                  <p>#{index + 1}</p>
                  <p className="mt-1">{step.parentId ? `From ${step.parentId}` : 'Selected root'}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GraphTimeline;

