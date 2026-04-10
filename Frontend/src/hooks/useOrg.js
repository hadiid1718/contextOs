import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import orgService from '../services/orgService';
import useAuthStore from '../store/authStore';
import useOrgStore from '../store/orgStore';

const parseTokenPayload = () => {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = window.atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '='));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const useOrg = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentOrg = useOrgStore((state) => state.currentOrg);
  const setCurrentOrg = useOrgStore((state) => state.setCurrentOrg);

  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentOrg(null);
    }
  }, [isAuthenticated, setCurrentOrg]);

  const orgsQuery = useQuery({
    queryKey: ['organisations'],
    queryFn: orgService.list,
    enabled: isAuthenticated,
  });

  const selectOrgMutation = useMutation({
    mutationFn: orgService.selectContext,
  });

  const organisations = useMemo(() => {
    return orgsQuery.data?.organisations || orgsQuery.data?.data || orgsQuery.data || [];
  }, [orgsQuery.data]);

  useEffect(() => {
    if (!organisations.length || currentOrg) return;

    const tokenPayload = parseTokenPayload();
    const tokenOrgId = tokenPayload?.org_id;
    if (tokenOrgId) {
      const matched = organisations.find((org) => org.org_id === tokenOrgId);
      if (matched) {
        setCurrentOrg(matched);
        return;
      }
    }

    setCurrentOrg(organisations[0]);
  }, [currentOrg, organisations, setCurrentOrg]);

  const setActiveOrg = useCallback(async (organisation) => {
    if (!organisation?.org_id) return;
    setCurrentOrg(organisation);

    try {
      const payload = await selectOrgMutation.mutateAsync(organisation.org_id);
      const token = payload?.accessToken || payload?.data?.accessToken;
      if (token) {
        localStorage.setItem('accessToken', token);
      }
    } catch {
      // Keep local active state so users can continue working in UI-only flows.
    }
  }, [selectOrgMutation, setCurrentOrg]);

  return {
    organisations,
    currentOrg,
    setActiveOrg,
    selectOrgPending: selectOrgMutation.isPending,
    refetchOrganisations: orgsQuery.refetch,
    isLoading: orgsQuery.isLoading,
    error: orgsQuery.error,
  };
};

export default useOrg;

