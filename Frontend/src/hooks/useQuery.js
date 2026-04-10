import { useMutation } from '@tanstack/react-query';
import queryService from '../services/queryService';

const useQueryData = () => {
  const queryMutation = useMutation({
    mutationFn: queryService.run,
  });

  return {
    runQuery: queryMutation.mutateAsync,
    queryResult: queryMutation.data,
    isRunning: queryMutation.isPending,
    error: queryMutation.error,
  };
};

export default useQueryData;

