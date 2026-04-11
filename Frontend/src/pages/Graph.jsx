import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, RefreshCcw, Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Card from '../components/Card';
import GraphCanvas from '../components/graph/GraphCanvas';
import GraphDetailPanel from '../components/graph/GraphDetailPanel';
import GraphFilters from '../components/graph/GraphFilters';
import GraphTimeline from '../components/graph/GraphTimeline';
import useGraph from '../hooks/useGraph';
import useOrg from '../hooks/useOrg';
import { formatDateTime } from '../lib/dateFormatters';
import {
  buildBfsSteps,
  getEdgeKey,
  getNodeLabel,
  getNodeTypeMeta,
  graphNodeTypes,
} from '../lib/graph';

const defaultFilters = {
  nodeTypes: [...graphNodeTypes],
  q: '',
  from: '',
  to: '',
  minConfidence: 0.25,
};

const dedupeEdges = (edges = []) => {
  const seen = new Map();
  edges.forEach((edge) => {
    const key = getEdgeKey(edge);
    if (!seen.has(key)) {
      seen.set(key, edge);
    }
  });
  return [...seen.values()];
};

const dedupeNodes = (nodes = []) => {
  const seen = new Map();
  nodes.forEach((node) => {
    if (node?._id && !seen.has(node._id)) {
      seen.set(node._id, node);
    }
  });
  return [...seen.values()];
};

const Graph = () => {
  const queryClient = useQueryClient();
  const { organisations, currentOrg, setActiveOrg } = useOrg();
  const [contextReady, setContextReady] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [isTracing, setIsTracing] = useState(false);
  const [traceStepIndex, setTraceStepIndex] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    const activateContext = async () => {
      if (!currentOrg?.org_id) {
        if (mounted) setContextReady(false);
        return;
      }

      try {
        await setActiveOrg(currentOrg);
      } finally {
        if (mounted) setContextReady(true);
      }
    };

    void activateContext();
    return () => {
      mounted = false;
    };
  }, [currentOrg, setActiveOrg]);

  const {
    overview,
    selectedNode,
    causalChain,
    decisions,
    isLoading,
    isFetching,
    error,
    errorMessage,
    refetchAll,
  } = useGraph({
    orgId: currentOrg?.org_id,
    enabled: Boolean(currentOrg?.org_id) && contextReady,
    nodeTypes: filters.nodeTypes,
    q: filters.q,
    from: filters.from || null,
    to: filters.to || null,
    minConfidence: filters.minConfidence,
    selectedNodeId: activeNodeId,
    maxHops: 5,
    limit: 250,
  });

  const graphNodes = overview.nodes || [];
  const graphEdges = overview.edges || [];

  useEffect(() => {
    if (activeNodeId && graphNodes.some((node) => node._id === activeNodeId)) {
      return;
    }

    const nextActive =
      graphNodes.find((node) => node.node_type === 'decision') ||
      decisions.find((node) => node.node_type === 'decision') ||
      graphNodes[0] ||
      decisions[0] ||
      null;

    if (nextActive?._id) {
      setActiveNodeId(nextActive._id);
    }
  }, [activeNodeId, decisions, graphNodes]);

  const activeNode = useMemo(() => {
    return selectedNode || graphNodes.find((node) => node._id === activeNodeId) || null;
  }, [activeNodeId, graphNodes, selectedNode]);

  const activeNodeMap = useMemo(() => {
    const map = new Map(graphNodes.map((node) => [node._id, node]));
    if (selectedNode?._id) {
      map.set(selectedNode._id, selectedNode);
    }
    return map;
  }, [graphNodes, selectedNode]);

  const relatedEdges = useMemo(() => {
    if (!activeNodeId) return [];
    const chainEdges = Array.isArray(causalChain?.edges) ? causalChain.edges : [];
    const scoped = [...graphEdges, ...chainEdges].filter(
      (edge) => edge.from_id === activeNodeId || edge.to_id === activeNodeId
    );
    return dedupeEdges(scoped);
  }, [activeNodeId, causalChain?.edges, graphEdges]);

  const traceSteps = useMemo(() => buildBfsSteps(causalChain), [causalChain]);

  useEffect(() => {
    if (!isTracing || traceSteps.length === 0) return undefined;

    setTraceStepIndex(0);
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      if (index >= traceSteps.length) {
        window.clearInterval(timer);
        setTraceStepIndex(Math.max(traceSteps.length - 1, 0));
        setIsTracing(false);
        return;
      }

      setTraceStepIndex(index);
    }, 700);

    return () => window.clearInterval(timer);
  }, [isTracing, traceSteps]);

  const traceNodeIds = useMemo(() => {
    return new Set(traceSteps.slice(0, traceStepIndex + 1).map((step) => step.id));
  }, [traceStepIndex, traceSteps]);

  const traceEdgeKeys = useMemo(() => {
    return new Set(
      traceSteps
        .slice(1, traceStepIndex + 1)
        .filter((step) => step.viaEdge)
        .map((step) => getEdgeKey(step.viaEdge))
    );
  }, [traceStepIndex, traceSteps]);

  const activeOrgLabel = useMemo(() => {
    if (currentOrg?.name) return currentOrg.name;
    if (organisations[0]?.name) return organisations[0].name;
    return 'No active organisation';
  }, [currentOrg, organisations]);

  const nodeStats = overview.summary || {};
  const backendConnected = contextReady && Boolean(currentOrg?.org_id);
  const graphConnectedDot = isFetching ? 'bg-warning animate-pulse' : 'bg-success animate-pulse';

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    setActiveNodeId(null);
    setIsTracing(false);
    setTraceStepIndex(0);
  };

  const handleTraceCause = () => {
    if (!activeNodeId) return;
    setIsTracing(true);
    setTraceStepIndex(0);
  };

  const handleTimelineStep = (index) => {
    const step = traceSteps[index];
    if (!step?.id) return;
    setActiveNodeId(step.id);
    setTraceStepIndex(index);
    setIsTracing(false);
  };

  const quickDecisionNodes = useMemo(() => {
    return dedupeNodes([
      ...graphNodes.filter((node) => node.node_type === 'decision'),
      ...decisions,
    ]).slice(0, 8);
  }, [decisions, graphNodes]);

  return (
    <div className="space-y-6">
      <Card
        title="Module 4 Knowledge Graph Service"
        description="Interactive force-directed graph canvas with node detail inspection, BFS trace animation, edge confidence visuals, and backend-driven filters."
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm text-text2">
              <span className={`h-2.5 w-2.5 rounded-full ${backendConnected ? graphConnectedDot : 'bg-text3'}`} aria-hidden="true" />
              {backendConnected ? 'Connected to the knowledge graph backend' : 'Select an organisation to load the graph'}
            </p>
            <p className="text-sm text-text2">
              Active organisation: <span className="font-medium text-text">{activeOrgLabel}</span>
            </p>
            <p className="text-xs text-text3">
              Selected node: {activeNode ? getNodeLabel(activeNode) : 'None'} • Last refreshed: {formatDateTime(now)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success">
              <span className="inline-flex items-center gap-1">
                <Activity size={12} />
                {nodeStats.nodeCount || 0} nodes
              </span>
            </Badge>
            <Badge tone="neutral">{nodeStats.edgeCount || 0} edges</Badge>
            <Badge tone="warning">Depth {traceSteps.length ? Math.min(traceStepIndex + 1, traceSteps.length) : 0}</Badge>
            <Button type="button" variant="secondary" onClick={() => refetchAll()} disabled={isFetching}>
              <RefreshCcw size={16} className="mr-2" />
              Refresh graph
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            {
              title: 'Force graph',
              detail: 'Drag to pan, scroll to zoom, and hover nodes for context.',
            },
            {
              title: 'Trace Cause',
              detail: 'Click a node, then animate the BFS path through connected edges.',
            },
            {
              title: 'Edge confidence',
              detail: 'Thickness and labels reflect backend confidence scores.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-bg3 p-4">
              <p className="text-sm font-semibold text-text">{item.title}</p>
              <p className="mt-1 text-xs text-text3">{item.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      {errorMessage ? (
        <Card
          title="Readable graph error"
          description="The frontend received a backend error, but the page stays usable so you can adjust the org or refresh the graph."
        >
          <div className="rounded-xl border border-error/20 bg-error/10 p-4 text-sm text-error">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium">{errorMessage}</p>
                {error?.response?.data?.details ? (
                  <p className="mt-1 text-xs text-error/80">{error.response.data.details}</p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => refetchAll()}>
              Retry now
            </Button>
            <Button type="button" variant="ghost" onClick={() => setActiveNodeId(null)}>
              Clear node selection
            </Button>
          </div>
        </Card>
      ) : null}

      <GraphFilters
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['graph'] });
          void refetchAll();
        }}
        canTrace={Boolean(activeNodeId && traceSteps.length > 0)}
        onTraceCause={handleTraceCause}
        isRefreshing={isFetching}
        summary={nodeStats}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card
            title="/graph"
            description="Force-directed canvas built from the backend graph overview endpoint. Node colors match the graph service types."
          >
            <GraphCanvas
              nodes={graphNodes}
              edges={graphEdges}
              selectedNodeId={activeNodeId}
              traceNodeIds={traceNodeIds}
              traceEdgeKeys={traceEdgeKeys}
              onNodeSelect={setActiveNodeId}
            />
          </Card>

          <Card
            title="Decision roots"
            description="Quick-select decision nodes returned by the backend decisions endpoint."
          >
            {quickDecisionNodes.length === 0 ? (
              <div className="rounded-xl border border-border bg-bg3 p-4 text-sm text-text3">
                No decision nodes are available for the current filters.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {quickDecisionNodes.map((node) => {
                  const active = activeNodeId === node._id;
                  const meta = getNodeTypeMeta(node.node_type);
                  return (
                    <button
                      key={node._id}
                      type="button"
                      onClick={() => setActiveNodeId(node._id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        active ? 'border-brand/50 bg-brand/10' : 'border-border bg-bg3 hover:border-border-strong'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${meta.nodeClass}`}>
                          {meta.label}
                        </span>
                        <span className="text-xs text-text3">{formatDateTime(node.created_at)}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-text">{getNodeLabel(node)}</p>
                      <p className="mt-1 text-xs text-text2">{node.source || 'Unknown source'}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <Card
            title="Causal chain timeline"
            description="Breadth-first traversal of the selected node's causal chain with live step highlighting."
          >
            <GraphTimeline steps={traceSteps} activeStep={traceStepIndex} isTracing={isTracing} onStepSelect={handleTimelineStep} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Graph status" description="Backend-fed graph module state for the active organisation.">
            <div className="space-y-3 text-sm text-text2">
              <div className="rounded-xl border border-border bg-bg3 p-4">
                <p className="text-xs uppercase tracking-wide text-text3">Selected node</p>
                <p className="mt-1 font-medium text-text">{activeNode ? getNodeLabel(activeNode) : 'None selected'}</p>
                <p className="mt-1 text-xs text-text3">{activeNode?.source || 'Click a node to inspect it.'}</p>
              </div>
              <div className="rounded-xl border border-border bg-bg3 p-4">
                <p className="text-xs uppercase tracking-wide text-text3">Refresh cadence</p>
                <p className="mt-1 font-medium text-text">15 minute polling</p>
                <p className="mt-1 text-xs text-text3">The overview and decisions endpoints refresh on polling intervals.</p>
              </div>
              <div className="rounded-xl border border-border bg-bg3 p-4">
                <p className="text-xs uppercase tracking-wide text-text3">Filter scope</p>
                <p className="mt-1 font-medium text-text">
                  {filters.nodeTypes.length} node types • min confidence {Math.round(filters.minConfidence * 100)}%
                </p>
                <p className="mt-1 text-xs text-text3">Search: {filters.q || 'No keyword filter'}</p>
              </div>
            </div>
          </Card>

          <Card title="Current backend snapshot" description="Useful values pulled from the graph module response.">
            {isLoading ? (
              <p className="text-sm text-text3">Loading graph snapshot...</p>
            ) : (
              <div className="space-y-3 text-sm text-text2">
                <p>
                  Nodes returned: <span className="font-medium text-text">{nodeStats.nodeCount || 0}</span>
                </p>
                <p>
                  Edges returned: <span className="font-medium text-text">{nodeStats.edgeCount || 0}</span>
                </p>
                <p>
                  Trace steps: <span className="font-medium text-text">{traceSteps.length || 0}</span>
                </p>
                <p>
                  Last refresh: <span className="font-medium text-text">{formatDateTime(now)}</span>
                </p>
              </div>
            )}
          </Card>

          <Card title="Module focus" description="The UI mirrors the backend model and keeps the graph explainable.">
            <div className="space-y-2 text-sm text-text2">
              {[
                'Node hover tooltip',
                'Zoom and pan interaction',
                'BFS path animation',
                'Edge confidence visualization',
                'Readable API errors',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-lg border border-border bg-bg3 px-3 py-2">
                  <Sparkles size={14} className="text-brand" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {activeNode ? (
        <GraphDetailPanel
          node={activeNode}
          relatedEdges={relatedEdges}
          nodeMap={activeNodeMap}
          onClose={() => setActiveNodeId(null)}
        />
      ) : null}
    </div>
  );
};

export default Graph;

