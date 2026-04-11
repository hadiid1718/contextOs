import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import graphService from '../services/graphService';

const normalizeError = (error) => {
  if (!error) return 'Unable to load the knowledge graph.';
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
  const overviewQuery = useQuery({
    queryKey: ['graph', 'overview', orgId || 'unknown', nodeTypes.join(','), q, from || '', to || '', minConfidence, limit],
    queryFn: () =>
      graphService.getOverview({
        org_id: orgId,
        node_types: nodeTypes.join(','),
        q,
        from,
        to,
        min_confidence: minConfidence,
        limit,
      }),
    enabled: Boolean(enabled && orgId),
    refetchInterval: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const selectedNodeQuery = useQuery({
    queryKey: ['graph', 'node', selectedNodeId || 'none'],
    queryFn: () => graphService.getNode(selectedNodeId),
    enabled: Boolean(enabled && selectedNodeId),
    refetchOnWindowFocus: false,
  });

  const causalChainQuery = useQuery({
    queryKey: ['graph', 'causal-chain', selectedNodeId || 'none', maxHops],
    queryFn: () => graphService.getCausalChain({ nodeId: selectedNodeId, maxHops }),
    enabled: Boolean(enabled && selectedNodeId),
    refetchOnWindowFocus: false,
  });

  const decisionsQuery = useQuery({
    queryKey: ['graph', 'decisions', orgId || 'unknown'],
    queryFn: () => graphService.getDecisions({ orgId }),
    enabled: Boolean(enabled && orgId),
    refetchInterval: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const overview = useMemo(() => {
    return overviewQuery.data?.data || overviewQuery.data || { nodes: [], edges: [], summary: {} };
  }, [overviewQuery.data]);

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

  const error = overviewQuery.error || selectedNodeQuery.error || causalChainQuery.error || decisionsQuery.error;

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

