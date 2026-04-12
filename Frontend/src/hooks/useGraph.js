import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import graphService from '../services/graphService';

const normalizeError = (error) => {
  if (!error) return null;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.data?.details) return error.response.data.details;
  if (error?.response?.status === 401) return 'Your session expired. Please sign in again to view the graph.';
  if (error?.response?.status === 403) return 'You do not have access to the selected organisation graph.';
  if (error?.response?.status === 404) return 'The requested graph record could not be found.';
  if (error?.code === 'ERR_NETWORK') return 'The graph service is unreachable right now. Check that the backend is running.';
  return error?.message || 'Unable to load the knowledge graph.';
};

const useGraph = ({
  orgId = null,
  enabled = true,
  nodeTypes = [],
  q = '',
  from = null,
  to = null,
  minConfidence = 0,
  limit = 250,
  selectedNodeId = null,
  maxHops = 5,
} = {}) => {
  const overviewDecisionLimit = useMemo(() => {
    return Math.min(500, Math.max(25, Number(limit) || 250));
  }, [limit]);

  const sanitizedSelectedNodeId = useMemo(() => {
    if (!selectedNodeId) return null;
    const normalized = String(selectedNodeId).trim();
    if (!normalized || normalized === 'null' || normalized === 'undefined') {
      return null;
    }
    return normalized;
  }, [selectedNodeId]);

  const overviewQuery = useQuery({
    queryKey: [
      'graph',
      'overview',
      orgId || 'unknown',
      nodeTypes.join(','),
      q,
      from || '',
      to || '',
      minConfidence,
      overviewDecisionLimit,
    ],
    queryFn: () =>
      graphService.getOverview({
        org_id: orgId,
        node_types: nodeTypes.length > 0 ? nodeTypes.join(',') : undefined,
        q: q || undefined,
        from: from || undefined,
        to: to || undefined,
        min_confidence: Number(minConfidence || 0),
        limit: overviewDecisionLimit,
      }),
    enabled: Boolean(enabled && orgId),
    refetchInterval: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const selectedNodeQuery = useQuery({
    queryKey: ['graph', 'node', sanitizedSelectedNodeId || 'none'],
    queryFn: () => graphService.getNode(sanitizedSelectedNodeId),
    enabled: Boolean(enabled && sanitizedSelectedNodeId),
    refetchOnWindowFocus: false,
  });

  const causalChainQuery = useQuery({
    queryKey: ['graph', 'causal-chain', sanitizedSelectedNodeId || 'none', maxHops],
    queryFn: () => graphService.getCausalChain({ nodeId: sanitizedSelectedNodeId, maxHops }),
    enabled: Boolean(enabled && sanitizedSelectedNodeId),
    refetchOnWindowFocus: false,
  });

  const decisionsQuery = useQuery({
    queryKey: ['graph', 'decisions', orgId || 'unknown', q, from || '', to || '', minConfidence, overviewDecisionLimit],
    queryFn: () => graphService.getDecisions({ orgId }),
    enabled: Boolean(enabled && orgId),
    refetchInterval: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const selectedNode = useMemo(() => {
    return selectedNodeQuery.data?.data || selectedNodeQuery.data || null;
  }, [selectedNodeQuery.data]);

  const causalChain = useMemo(() => {
    return causalChainQuery.data?.data || causalChainQuery.data || null;
  }, [causalChainQuery.data]);

  const decisions = useMemo(() => {
    const raw = decisionsQuery.data?.data || decisionsQuery.data || [];
    return Array.isArray(raw) ? raw : [];
  }, [decisionsQuery.data]);

  const overviewFromApi = useMemo(() => {
    return overviewQuery.data?.data || overviewQuery.data || null;
  }, [overviewQuery.data]);

  const overview = useMemo(() => {
    if (overviewFromApi && Array.isArray(overviewFromApi.nodes)) {
      return {
        nodes: Array.isArray(overviewFromApi.nodes) ? overviewFromApi.nodes : [],
        edges: Array.isArray(overviewFromApi.edges) ? overviewFromApi.edges : [],
        summary: overviewFromApi.summary || {
          nodeCount: Array.isArray(overviewFromApi.nodes)
            ? overviewFromApi.nodes.length
            : 0,
          edgeCount: Array.isArray(overviewFromApi.edges)
            ? overviewFromApi.edges.length
            : 0,
          minConfidence: Number(minConfidence || 0),
          nodeTypes,
          search: q || null,
          dateRange: {
            from: from || null,
            to: to || null,
          },
        },
      };
    }

    const root = selectedNode || causalChain?.root || decisions[0] || null;
    const causalNodes = Array.isArray(causalChain?.nodes) ? causalChain.nodes : [];
    const causalEdges = Array.isArray(causalChain?.edges) ? causalChain.edges : [];

    const nodeById = new Map();
    const addNode = (node) => {
      if (node?._id && !nodeById.has(node._id)) {
        nodeById.set(node._id, node);
      }
    };

    decisions.forEach(addNode);
    causalNodes.forEach(addNode);
    addNode(root);
    addNode(selectedNode);

    const filteredNodes = [...nodeById.values()]
      .filter((node) => {
        if (!node) return false;
        if (nodeTypes.length > 0 && !nodeTypes.includes(node.node_type)) {
          return false;
        }

        const searchable = [node._id, node.node_type, node.source, JSON.stringify(node.content || {}), JSON.stringify(node.metadata || {})]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (q && !searchable.includes(String(q).trim().toLowerCase())) {
          return false;
        }

        if (from || to) {
          const createdAt = node.created_at ? new Date(node.created_at) : null;
          if (!createdAt || Number.isNaN(createdAt.getTime())) {
            return false;
          }
          if (from && createdAt < new Date(from)) return false;
          if (to && createdAt > new Date(to)) return false;
        }

        return true;
      })
      .slice(0, overviewDecisionLimit);

    const allowedIds = new Set(filteredNodes.map((node) => node._id));
    const filteredEdges = causalEdges.filter((edge) => {
      const confidence = Math.max(0, Math.min(1, Number(edge.confidence_score) || 0));
      if (confidence < Number(minConfidence || 0)) return false;
      return allowedIds.has(edge.from_id) && allowedIds.has(edge.to_id);
    });

    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      summary: {
        nodeCount: filteredNodes.length,
        edgeCount: filteredEdges.length,
        minConfidence: Number(minConfidence || 0),
        nodeTypes,
        search: q || null,
        dateRange: {
          from: from || null,
          to: to || null,
        },
      },
    };
  }, [causalChain, decisions, from, minConfidence, nodeTypes, overviewDecisionLimit, overviewFromApi, q, selectedNode, to]);

  const error =
    overviewQuery.error ||
    selectedNodeQuery.error ||
    causalChainQuery.error ||
    decisionsQuery.error;

  return {
    overview,
    selectedNode,
    causalChain,
    decisions,
    isLoading:
      overviewQuery.isLoading ||
      selectedNodeQuery.isLoading ||
      causalChainQuery.isLoading ||
      decisionsQuery.isLoading,
    isFetching:
      overviewQuery.isFetching ||
      selectedNodeQuery.isFetching ||
      causalChainQuery.isFetching ||
      decisionsQuery.isFetching,
    error,
    errorMessage: normalizeError(error),
    refetchOverview: overviewQuery.refetch,
    refetchSelectedNode: selectedNodeQuery.refetch,
    refetchCausalChain: causalChainQuery.refetch,
    refetchDecisions: decisionsQuery.refetch,
    refetchAll: async () => {
      await Promise.all([
        overviewQuery.refetch(),
        selectedNodeQuery.refetch(),
        causalChainQuery.refetch(),
        decisionsQuery.refetch(),
      ]);
    },
  };
};

export default useGraph;
