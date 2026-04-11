import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import adminService from '../services/adminService';
import useAdminAuthStore from '../store/adminAuthStore';

const useAdminAuth = () => {
  const adminUser = useAdminAuthStore((state) => state.adminUser);
  const role = useAdminAuthStore((state) => state.role);
  const isAuthenticated = useAdminAuthStore((state) => state.isAuthenticated);
  const authLoading = useAdminAuthStore((state) => state.authLoading);
  const bootstrapped = useAdminAuthStore((state) => state.bootstrapped);

  const setAuthLoading = useAdminAuthStore((state) => state.setAuthLoading);
  const setBootstrapped = useAdminAuthStore((state) => state.setBootstrapped);
  const setSession = useAdminAuthStore((state) => state.setSession);
  const clearSession = useAdminAuthStore((state) => state.clearSession);

  const loginMutation = useMutation({
    mutationFn: adminService.login,
  });

  const logoutMutation = useMutation({
    mutationFn: adminService.logout,
  });

  const bootstrap = useCallback(async () => {
    setAuthLoading(true);

    try {
      const profile = await adminService.me();
      setSession(profile);
      return profile;
    } catch {
      clearSession();
      setBootstrapped(true);
      return null;
    }
  }, [clearSession, setAuthLoading, setBootstrapped, setSession]);

  const login = async ({ email, password }) => {
    const response = await loginMutation.mutateAsync({ email, password });

    if (response?.admin?.role === 'superadmin') {
      setSession(response.admin);
      return response.admin;
    }

    const profile = await bootstrap();
    if (!profile) {
      throw new Error('Unable to verify superadmin session after login.');
    }

    return profile;
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      clearSession();
    }
  };

  return {
    adminUser,
    role,
    isAuthenticated,
    authLoading,
    bootstrapped,
    login,
    loginPending: loginMutation.isPending,
    loginError: loginMutation.error,
    logout,
    logoutPending: logoutMutation.isPending,
    bootstrap,
  };
};

export default useAdminAuth;
