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
  const selectOrg = selectOrgMutation.mutateAsync;

  const organisations = useMemo(() => {
    const raw = orgsQuery.data?.organisations || orgsQuery.data?.data || orgsQuery.data || [];
    if (!Array.isArray(raw)) {
      return [];
    }

    const sorted = [...raw].sort((left, right) => {
      const leftTs = new Date(left?.createdAt || 0).getTime();
      const rightTs = new Date(right?.createdAt || 0).getTime();
      return rightTs - leftTs;
    });

    const seen = new Set();
    const deduped = [];

    for (const org of sorted) {
      if (!org?.org_id) continue;

      const nameKey = String(org.name || '').trim().toLowerCase();
      const dedupeKey = nameKey || `org:${org.org_id}`;
      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      deduped.push(org);
    }

    return deduped;
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

    const defaultOrg = organisations[0];
    setCurrentOrg(defaultOrg);
  }, [currentOrg, organisations, setCurrentOrg]);

  const setActiveOrg = useCallback(async (organisation) => {
    if (!organisation?.org_id) return false;
    setCurrentOrg(organisation);

    try {
      const payload = await selectOrg(organisation.org_id);
      const token = payload?.accessToken || payload?.data?.accessToken;
      if (token) {
        localStorage.setItem('accessToken', token);
      }
      return true;
    } catch {
      // Keep local active state so users can continue working in UI-only flows.
      return false;
    }
  }, [selectOrg, setCurrentOrg]);

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

