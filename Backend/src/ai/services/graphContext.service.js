import axios from 'axios';

import { env } from '../../config/env.js';
import logger from '../../config/loggers.js';

const graphClient = axios.create({
  baseURL: env.aiGraphServiceBaseUrl,
  timeout: env.aiGraphServiceTimeoutMs,
});

const toGraphSummary = chain => ({
  root_id: chain?.root?._id,
  root_type: chain?.root?.node_type,
  max_hops: chain?.max_hops,
  node_count: Array.isArray(chain?.nodes) ? chain.nodes.length : 0,
  edge_count: Array.isArray(chain?.edges) ? chain.edges.length : 0,
  nodes: (chain?.nodes || []).slice(0, 8).map(node => ({
    id: node._id,
    type: node.node_type,
    source: node.source,
    metadata: node.metadata,
  })),
});

export const fetchGraphContextForChunks = async ({ orgId, chunks, maxNodes = 3, maxHops = 2 }) => {
  if (!env.aiGraphContextEnabled) {
    return [];
  }

  const nodeIds = [...new Set(chunks.map(chunk => chunk.node_id).filter(Boolean))].slice(
    0,
    maxNodes
  );

  if (nodeIds.length === 0) {
    return [];
  }

  const responses = await Promise.allSettled(
    nodeIds.map(nodeId =>
      graphClient.get(`/causal-chain/${encodeURIComponent(nodeId)}`, {
        params: {
          max_hops: maxHops,
          org_id: orgId,
        },
      })
    )
  );

  const context = [];

  responses.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      context.push(toGraphSummary(result.value?.data?.data));
      return;
    }

    logger.warn(
      `Graph context fetch failed for node ${nodeIds[index]}: ${result.reason?.message || 'unknown error'}`
    );
  });

  return context;
};

