import { useQuery } from '@tanstack/react-query';
import graphService from '../services/graphService';

const useGraph = (params = {}) => {
  const graphQuery = useQuery({
    queryKey: ['graph', params],
    queryFn: () => graphService.getGraph(params),
  });

  return {
    graph: graphQuery.data?.data || graphQuery.data,
    isLoading: graphQuery.isLoading,
    error: graphQuery.error,
  };
};

export default useGraph;

