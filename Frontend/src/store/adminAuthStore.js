import { create } from 'zustand';

const useAdminAuthStore = create((set) => ({
  adminUser: null,
  role: null,
  isAuthenticated: false,
  authLoading: false,
  bootstrapped: false,

  setAuthLoading: (authLoading) => set({ authLoading }),
  setBootstrapped: (bootstrapped) => set({ bootstrapped }),

  setSession: (adminUser) =>
    set({
      adminUser,
      role: adminUser?.role || null,
      isAuthenticated: adminUser?.role === 'superadmin',
      authLoading: false,
      bootstrapped: true,
    }),

  clearSession: () =>
    set({
      adminUser: null,
      role: null,
      isAuthenticated: false,
      authLoading: false,
      bootstrapped: true,
    }),
}));

export default useAdminAuthStore;
