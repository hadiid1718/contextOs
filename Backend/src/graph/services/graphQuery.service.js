import { GraphEdge } from '../models/GraphEdge.js';
import { GraphNode } from '../models/GraphNode.js';
import { AppError } from '../../utils/appError.js';

const MAX_HOPS = 5;

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

  const boundedHops = Math.min(MAX_HOPS, Math.max(1, Number(maxHops) || MAX_HOPS));
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

      const neighbourId = edge.from_id === current.id ? edge.to_id : edge.from_id;
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

