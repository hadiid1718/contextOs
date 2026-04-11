const nodeTypeMeta = {
  commit: {
    label: 'Commit',
    tone: 'blue',
    nodeClass: 'border-sky-400/50 bg-sky-400/15 text-sky-200',
    edgeClass: 'stroke-sky-300',
  },
  pr: {
    label: 'PR',
    tone: 'teal',
    nodeClass: 'border-teal-400/50 bg-teal-400/15 text-teal-200',
    edgeClass: 'stroke-teal-300',
  },
  ticket: {
    label: 'Ticket',
    tone: 'amber',
    nodeClass: 'border-amber-400/50 bg-amber-400/15 text-amber-200',
    edgeClass: 'stroke-amber-300',
  },
  decision: {
    label: 'Decision',
    tone: 'purple',
    nodeClass: 'border-violet-400/50 bg-violet-400/15 text-violet-200',
    edgeClass: 'stroke-violet-300',
  },
  message: {
    label: 'Message',
    tone: 'pink',
    nodeClass: 'border-pink-400/50 bg-pink-400/15 text-pink-200',
    edgeClass: 'stroke-pink-300',
  },
  document: {
    label: 'Document',
    tone: 'neutral',
    nodeClass: 'border-border bg-surface text-text2',
    edgeClass: 'stroke-text3',
  },
};

export const graphNodeTypes = ['commit', 'pr', 'ticket', 'decision', 'message', 'document'];

export const getNodeTypeMeta = (value) => nodeTypeMeta[value] || nodeTypeMeta.document;

export const getNodeLabel = (node) => {
  if (!node) return 'Unknown node';

  const type = String(node.node_type || '').toLowerCase();
  const content = node.content || {};

  if (type === 'commit') {
    return content.message || content.summary || node._id || 'Commit';
  }

  if (type === 'pr') {
    return content.title || content.summary || (content.number ? `PR ${content.number}` : node._id || 'Pull request');
  }

  if (type === 'ticket') {
    return content.key || content.id || content.number || content.summary || node._id || 'Ticket';
  }

  if (type === 'decision') {
    return content.summary || content.title || content.text || node._id || 'Decision';
  }

  if (type === 'message') {
    return content.text || content.message || content.summary || node._id || 'Message';
  }

  if (type === 'document') {
    return content.title || content.summary || node._id || 'Document';
  }

  return node._id || 'Unknown node';
};

export const getNodeSubtitle = (node) => {
  if (!node) return '';
  const content = node.content || {};
  const type = String(node.node_type || '').toLowerCase();

  if (type === 'commit') return content.author?.name || content.author || node.source || '';
  if (type === 'pr') return content.repository || content.url || node.source || '';
  if (type === 'ticket') return content.status || content.project || node.source || '';
  if (type === 'decision') return content.owner || content.author || node.source || '';
  if (type === 'message') return content.channel || content.author || node.source || '';
  if (type === 'document') return content.file || content.url || node.source || '';

  return node.source || '';
};

export const formatGraphConfidence = (value) => {
  const score = Number(value);
  if (Number.isNaN(score)) return '—';
  return `${Math.round(score * 100)}%`;
};

export const formatGraphRelativeTime = (value) => {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (diffMs < 0 || minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export const getNodeSearchText = (node) => {
  if (!node) return '';

  try {
    return [node._id, node.node_type, node.source, JSON.stringify(node.content || {}), JSON.stringify(node.metadata || {})]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  } catch {
    return `${node._id || ''} ${node.node_type || ''} ${node.source || ''}`.toLowerCase();
  }
};

export const buildBfsSteps = (chain) => {
  const root = chain?.root;
  const nodes = Array.isArray(chain?.nodes) ? chain.nodes : [];
  const edges = Array.isArray(chain?.edges) ? chain.edges : [];

  if (!root) return [];

  const nodeMap = new Map(nodes.map((node) => [node._id, node]));
  nodeMap.set(root._id, root);

  const adjacency = new Map();
  const ensureList = (id) => {
    if (!adjacency.has(id)) adjacency.set(id, []);
    return adjacency.get(id);
  };

  edges.forEach((edge) => {
    ensureList(edge.from_id).push({ neighborId: edge.to_id, edge });
    ensureList(edge.to_id).push({ neighborId: edge.from_id, edge });
  });

  const visited = new Set([root._id]);
  const queue = [{ id: root._id, depth: 0, viaEdge: null, parentId: null }];
  const steps = [];

  while (queue.length > 0) {
    const current = queue.shift();
    const currentNode = nodeMap.get(current.id) || { _id: current.id };
    steps.push({
      id: current.id,
      depth: current.depth,
      node: currentNode,
      viaEdge: current.viaEdge,
      parentId: current.parentId,
    });

    const neighbours = adjacency.get(current.id) || [];
    neighbours.forEach(({ neighborId, edge }) => {
      if (visited.has(neighborId)) return;
      visited.add(neighborId);
      queue.push({
        id: neighborId,
        depth: current.depth + 1,
        viaEdge: edge,
        parentId: current.id,
      });
    });
  }

  return steps;
};

export const buildNodeTypeMap = (values = []) => {
  return values.reduce((acc, value) => {
    acc[value] = true;
    return acc;
  }, {});
};

export const getEdgeKey = (edge) => `${edge.from_id}:${edge.to_id}:${edge.relationship_type}`;

export const getConnectedNodeId = (edge, nodeId) => (edge.from_id === nodeId ? edge.to_id : edge.from_id);

