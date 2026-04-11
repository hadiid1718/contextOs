import { useEffect, useMemo, useRef, useState } from 'react';
import {
  formatGraphConfidence,
  formatGraphRelativeTime,
  getEdgeKey,
  getNodeLabel,
  getNodeSearchText,
  getNodeSubtitle,
  getNodeTypeMeta,
} from '../../lib/graph';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 760;

const createInitialLayout = (nodes) => {
  const radius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.28;
  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT / 2;

  return nodes.map((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
    const spiral = radius + index * 4;
    return {
      ...node,
      x: centerX + Math.cos(angle) * spiral * 0.5,
      y: centerY + Math.sin(angle) * spiral * 0.5,
      vx: 0,
      vy: 0,
    };
  });
};

const simulateLayout = (nodes, edges) => {
  if (!nodes.length) return [];

  const width = CANVAS_WIDTH;
  const height = CANVAS_HEIGHT;
  const centerX = width / 2;
  const centerY = height / 2;
  const simulationNodes = createInitialLayout(nodes);
  const nodeMap = new Map(simulationNodes.map((node) => [node._id, node]));
  const links = edges
    .map((edge) => ({
      ...edge,
      source: nodeMap.get(edge.from_id),
      target: nodeMap.get(edge.to_id),
    }))
    .filter((edge) => edge.source && edge.target);

  for (let tick = 0; tick < 110; tick += 1) {
    for (let i = 0; i < simulationNodes.length; i += 1) {
      const source = simulationNodes[i];
      for (let j = i + 1; j < simulationNodes.length; j += 1) {
        const target = simulationNodes[j];
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distanceSq = Math.max(120, dx * dx + dy * dy);
        const force = 2400 / distanceSq;
        const fx = (dx / Math.sqrt(distanceSq)) * force;
        const fy = (dy / Math.sqrt(distanceSq)) * force;
        source.vx -= fx;
        source.vy -= fy;
        target.vx += fx;
        target.vy += fy;
      }
    }

    links.forEach((edge) => {
      const { source, target } = edge;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const desired = 150;
      const confidence = Math.max(0, Math.min(1, Number(edge.confidence_score) || 0));
      const spring = (distance - desired) * 0.003 * (0.7 + confidence);
      const fx = (dx / distance) * spring;
      const fy = (dy / distance) * spring;
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    });

    simulationNodes.forEach((node) => {
      node.vx += (centerX - node.x) * 0.0018;
      node.vy += (centerY - node.y) * 0.0018;
      node.vx *= 0.85;
      node.vy *= 0.85;
      node.x += node.vx;
      node.y += node.vy;
      node.x = Math.min(width - 60, Math.max(60, node.x));
      node.y = Math.min(height - 60, Math.max(60, node.y));
    });
  }

  return simulationNodes;
};

const GraphCanvas = ({
  nodes = [],
  edges = [],
  selectedNodeId = null,
  traceNodeIds = new Set(),
  traceEdgeKeys = new Set(),
  onNodeSelect,
  onNodeHover,
  onNodeLeave,
}) => {
  const viewportRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragState, setDragState] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  const layout = useMemo(() => simulateLayout(nodes, edges), [nodes, edges]);
  const layoutMap = useMemo(() => new Map(layout.map((node) => [node._id, node])), [layout]);


  const pathEdgeKeys = useMemo(() => {
    if (!traceEdgeKeys || traceEdgeKeys.size === 0) return new Set();
    return new Set(traceEdgeKeys);
  }, [traceEdgeKeys]);

  const activeTraceNodes = useMemo(() => {
    if (!traceNodeIds || traceNodeIds.size === 0) return new Set();
    return new Set(traceNodeIds);
  }, [traceNodeIds]);

  const handleWheel = (event) => {
    event.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;

    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const scaleFactor = event.deltaY > 0 ? 0.92 : 1.08;

    setTransform((current) => {
      const nextScale = Math.min(2.25, Math.max(0.45, current.scale * scaleFactor));
      const worldX = (pointerX - current.x) / current.scale;
      const worldY = (pointerY - current.y) / current.scale;
      return {
        scale: nextScale,
        x: pointerX - worldX * nextScale,
        y: pointerY - worldY * nextScale,
      };
    });
  };

  const handlePointerDown = (event) => {
    if (event.target.closest('[data-graph-node]')) return;
    setDragState({ x: event.clientX, y: event.clientY, originX: transform.x, originY: transform.y });
  };

  const handlePointerMove = (event) => {
    if (!dragState) return;
    const deltaX = event.clientX - dragState.x;
    const deltaY = event.clientY - dragState.y;
    setTransform({
      ...transform,
      x: dragState.originX + deltaX,
      y: dragState.originY + deltaY,
    });
  };

  const handlePointerUp = () => setDragState(null);

  useEffect(() => {
    if (!dragState) return undefined;
    const stopDragging = () => setDragState(null);
    window.addEventListener('pointerup', stopDragging);
    return () => window.removeEventListener('pointerup', stopDragging);
  }, [dragState]);

  const visibleEdges = useMemo(() => {
    return edges
      .map((edge) => {
        const source = layoutMap.get(edge.from_id);
        const target = layoutMap.get(edge.to_id);
        if (!source || !target) return null;
        return {
          ...edge,
          source,
          target,
          key: getEdgeKey(edge),
        };
      })
      .filter(Boolean);
  }, [edges, layoutMap]);

  return (
    <div
      ref={viewportRef}
      className="relative overflow-hidden rounded-2xl border border-border bg-bg2"
      style={{ touchAction: 'none' }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2 text-xs text-text3">
        <span className="rounded-full border border-border bg-bg3 px-3 py-1">Drag to pan</span>
        <span className="rounded-full border border-border bg-bg3 px-3 py-1">Scroll to zoom</span>
        <span className="rounded-full border border-border bg-bg3 px-3 py-1">Hover for details</span>
      </div>

      <svg viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} className="h-[760px] w-full">
        <defs>
          <marker id="graph-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>

        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
          {visibleEdges.map((edge) => {
            const confidence = Math.max(0, Math.min(1, Number(edge.confidence_score) || 0));
            const active = pathEdgeKeys.has(edge.key) || activeTraceNodes.has(edge.from_id) || activeTraceNodes.has(edge.to_id);
            const sourceType = getNodeTypeMeta(edge.source.node_type);
            const strokeWidth = 1.2 + confidence * 3.2;
            const midX = (edge.source.x + edge.target.x) / 2;
            const midY = (edge.source.y + edge.target.y) / 2;
            const showLabel = active || confidence >= 0.75;

            return (
              <g key={edge.key}>
                <line
                  x1={edge.source.x}
                  y1={edge.source.y}
                  x2={edge.target.x}
                  y2={edge.target.y}
                  className={`${sourceType.edgeClass} ${active ? 'opacity-100' : 'opacity-50'}`}
                  strokeWidth={strokeWidth}
                  markerEnd="url(#graph-arrow)"
                  strokeLinecap="round"
                />
                {showLabel ? (
                  <g transform={`translate(${midX} ${midY})`}>
                    <rect x="-22" y="-12" rx="6" ry="6" width="44" height="24" className="fill-bg2 stroke-border" strokeWidth="1" />
                    <text textAnchor="middle" dominantBaseline="middle" className="fill-text3 text-[11px] font-medium">
                      {formatGraphConfidence(confidence)}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}

          {layout.map((node) => {
            const meta = getNodeTypeMeta(node.node_type);
            const selected = selectedNodeId === node._id;
            const traced = activeTraceNodes.has(node._id);
            const radius = selected ? 26 : traced ? 22 : 18;
            const label = getNodeLabel(node);
            const subtitle = getNodeSubtitle(node);
            const fillClass = selected ? 'fill-brand' : traced ? 'fill-success' : 'fill-bg3';
            const strokeClass = selected ? 'stroke-brand' : traced ? 'stroke-success' : 'stroke-border';

            return (
              <g
                key={node._id}
                data-graph-node="true"
                role="button"
                tabIndex={0}
                className="cursor-pointer outline-none"
                transform={`translate(${node.x} ${node.y})`}
                onClick={() => onNodeSelect?.(node._id)}
                onFocus={() => onNodeHover?.(node)}
                onMouseEnter={(event) => {
                  const searchText = getNodeSearchText(node);
                  setTooltip({
                    node,
                    x: event.clientX,
                    y: event.clientY,
                    searchText,
                  });
                  onNodeHover?.(node);
                }}
                onMouseMove={(event) => {
                  setTooltip((current) => {
                    if (!current?.node || current.node._id !== node._id) return current;
                    return {
                      ...current,
                      x: event.clientX,
                      y: event.clientY,
                    };
                  });
                }}
                onMouseLeave={() => {
                  setTooltip(null);
                  onNodeLeave?.();
                }}
              >
                <circle
                  r={radius}
                  className={`${fillClass} ${strokeClass}`}
                  fillOpacity={0.8}
                  strokeWidth={selected ? 3 : 2}
                />
                <circle r={Math.max(4, radius - 6)} className={`${meta.nodeClass} opacity-80`} stroke="none" />
                <text y={radius + 16} textAnchor="middle" className="fill-text text-[11px] font-semibold">
                  {label.length > 18 ? `${label.slice(0, 18)}…` : label}
                </text>
                <text y={radius + 30} textAnchor="middle" className="fill-text3 text-[10px]">
                  {subtitle.length > 20 ? `${subtitle.slice(0, 20)}…` : subtitle}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {tooltip?.node ? (
        <div
          className="pointer-events-none fixed z-50 max-w-xs rounded-xl border border-border bg-bg2 px-3 py-2 shadow-2xl"
          style={{ left: Math.min(tooltip.x + 16, window.innerWidth - 320), top: Math.min(tooltip.y + 16, window.innerHeight - 180) }}
        >
          <p className="text-xs uppercase tracking-wide text-text3">{getNodeTypeMeta(tooltip.node.node_type).label}</p>
          <p className="mt-1 text-sm font-semibold text-text">{getNodeLabel(tooltip.node)}</p>
          <p className="mt-1 text-xs text-text2">{tooltip.node.source || 'Unknown source'}</p>
          <p className="mt-1 text-xs text-text3">{formatGraphRelativeTime(tooltip.node.created_at)} • {tooltip.searchText.slice(0, 72)}</p>
        </div>
      ) : null}
    </div>
  );
};

export default GraphCanvas;

