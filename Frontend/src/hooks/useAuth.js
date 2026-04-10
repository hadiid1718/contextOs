import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import authService from '../services/authService';
import useAuthStore from '../store/authStore';
import useOrgStore from '../store/orgStore';

const useAuth = () => {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setAuthLoading = useAuthStore((state) => state.setAuthLoading);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authLoading = useAuthStore((state) => state.authLoading);

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (response) => {
      const payload = response?.data || response;
      setSession({ user: payload.user || null, token: payload.accessToken || null });
    },
  });

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: (response) => {
      const payload = response?.data || response;
      setSession({ user: payload.user || null, token: payload.accessToken || null });
    },
  });

  const bootstrapSession = useCallback(async () => {
    setAuthLoading(true);
    try {
      const token = localStorage.getItem('accessToken');

      if (token) {
        try {
          const meResponse = await authService.me();
          const mePayload = meResponse?.data || meResponse;
          setSession({ user: mePayload.user || mePayload || null, token });
          return;
        } catch {
          localStorage.removeItem('accessToken');
        }
      }

      const refreshResponse = await authService.refresh();
      const payload = refreshResponse?.data || refreshResponse;
      setSession({ user: payload.user || null, token: payload.accessToken || null });
    } catch {
      clearSession();
    }
  }, [clearSession, setAuthLoading, setSession]);

  const silentRefresh = useCallback(async () => {
    setAuthLoading(true);
    try {
      const refreshResponse = await authService.refresh();
      const payload = refreshResponse?.data || refreshResponse;
      setSession({ user: payload.user || null, token: payload.accessToken || null });
      return true;
    } catch {
      clearSession();
      return false;
    }
  }, [clearSession, setAuthLoading, setSession]);

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
      useOrgStore.getState().reset();
    }
  };

  return {
    user,
    isAuthenticated,
    authLoading,
    login: loginMutation.mutateAsync,
    loginPending: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    registerPending: registerMutation.isPending,
    bootstrapSession,
    silentRefresh,
    logout,
  };
};

export default useAuth;

