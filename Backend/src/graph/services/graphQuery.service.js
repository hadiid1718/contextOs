import { GraphEdge } from '../models/GraphEdge.js';
import { GraphNode } from '../models/GraphNode.js';
import { AppError } from '../../utils/appError.js';

const MAX_HOPS = 5;

const safeStringify = value => {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return '';
  }
};

const buildSearchText = node => {
  return [
    node?._id,
    node?.node_type,
    node?.source,
    safeStringify(node?.content),
    safeStringify(node?.metadata),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

export const getGraphNodeById = async id => {
  const node = await GraphNode.findById(id).lean();
  if (!node) {
    throw new AppError('Graph node not found', 404);
  }

  return node;
};

export const getCausalChain = async ({ nodeId, maxHops = MAX_HOPS }) => {
  const rootNode = await GraphNode.findById(nodeId).lean();
  if (!rootNode) {
    throw new AppError('Graph node not found', 404);
  }

  const boundedHops = Math.min(
    MAX_HOPS,
    Math.max(1, Number(maxHops) || MAX_HOPS)
  );
  const queue = [{ id: nodeId, depth: 0 }];
  const visited = new Set([nodeId]);
  const edgeKeys = new Set();
  const edges = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.depth >= boundedHops) {
      continue;
    }

    const linkedEdges = await GraphEdge.find({
      org_id: rootNode.org_id,
      $or: [{ from_id: current.id }, { to_id: current.id }],
    }).lean();

    for (const edge of linkedEdges) {
      const edgeKey = `${edge.from_id}:${edge.to_id}:${edge.relationship_type}`;
      if (!edgeKeys.has(edgeKey)) {
        edgeKeys.add(edgeKey);
        edges.push(edge);
      }

      const neighbourId =
        edge.from_id === current.id ? edge.to_id : edge.from_id;
      if (!visited.has(neighbourId)) {
        visited.add(neighbourId);
        queue.push({ id: neighbourId, depth: current.depth + 1 });
      }
    }
  }

  const nodes = await GraphNode.find({
    _id: { $in: [...visited] },
    org_id: rootNode.org_id,
  }).lean();

  return {
    root: rootNode,
    max_hops: boundedHops,
    nodes,
    edges,
  };
};

export const getDecisionsForFile = async ({ orgId, file }) => {
  const filters = {
    org_id: orgId,
    node_type: 'decision',
  };

  if (file) {
    filters.$or = [
      { 'metadata.file': file },
      { 'metadata.files': file },
      { 'content.file': file },
      { 'content.files': file },
      { 'content.text': { $regex: file, $options: 'i' } },
      { 'content.summary': { $regex: file, $options: 'i' } },
    ];
  }

  const decisions = await GraphNode.find(filters)
    .sort({ created_at: -1 })
    .limit(200)
    .lean();

  return decisions;
};

export const getGraphOverview = async ({
  orgId,
  nodeTypes = [],
  q = '',
  from = null,
  to = null,
  minConfidence = 0,
  limit = 250,
}) => {
  if (!orgId) {
    throw new AppError('Organisation id is required', 400);
  }

  const nodeFilters = {
    org_id: orgId,
  };

  if (Array.isArray(nodeTypes) && nodeTypes.length > 0) {
    nodeFilters.node_type = { $in: nodeTypes };
  }

  if (from || to) {
    nodeFilters.created_at = {};

    if (from) {
      nodeFilters.created_at.$gte = new Date(from);
    }

    if (to) {
      nodeFilters.created_at.$lte = new Date(to);
    }
  }

  const boundedLimit = Math.min(500, Math.max(25, Number(limit) || 250));
  const searchTerm = String(q || '')
    .trim()
    .toLowerCase();

  const nodes = await GraphNode.find(nodeFilters)
    .sort({ created_at: -1 })
    .limit(boundedLimit)
    .lean();

  const filteredNodes = searchTerm
    ? nodes.filter(node => buildSearchText(node).includes(searchTerm))
    : nodes;

  const nodeIds = new Set(filteredNodes.map(node => node._id));
  const edgeFilters = {
    org_id: orgId,
  };

  const boundedConfidence = Math.min(
    1,
    Math.max(0, Number(minConfidence) || 0)
  );
  if (boundedConfidence > 0) {
    edgeFilters.confidence_score = { $gte: boundedConfidence };
  }

  const edges = await GraphEdge.find(edgeFilters).lean();
  const filteredEdges = edges.filter(
    edge => nodeIds.has(edge.from_id) && nodeIds.has(edge.to_id)
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
    summary: {
      nodeCount: filteredNodes.length,
      edgeCount: filteredEdges.length,
      minConfidence: boundedConfidence,
      nodeTypes: Array.isArray(nodeTypes) ? nodeTypes : [],
      search: searchTerm || null,
      dateRange: {
        from: from || null,
        to: to || null,
      },
    },
  };
};
