import { create } from 'zustand';

const hasVerifiedSession = (user) => {
  if (!user) return false;
  if (user.emailVerified === false) return false;
  return Boolean(user.id || user._id || user.email);
};

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('accessToken'),
  isAuthenticated: false,
  authLoading: true,
  setSession: ({ user, token }) => {
    if (token) localStorage.setItem('accessToken', token);
    const resolvedToken = token || localStorage.getItem('accessToken') || null;
    set({
      user,
      token: resolvedToken,
      isAuthenticated: hasVerifiedSession(user),
      authLoading: false,
    });
  },
  setAuthLoading: (authLoading) => {
    set({ authLoading });
  },
  clearSession: () => {
    localStorage.removeItem('accessToken');
    set({ user: null, token: null, isAuthenticated: false, authLoading: false });
  },
}));

export default useAuthStore;

