import { create } from 'zustand';

const defaultTypePreferences = {
  info: true,
  success: true,
  warning: true,
  error: true,
};

const defaultPagination = {
  page: 1,
  limit: 8,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

const createToast = (toast) => ({
  id: toast?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  severity: toast?.severity || 'info',
  message: toast?.message || 'New notification',
  route: toast?.route || '/notifications',
  createdAt: toast?.createdAt || new Date().toISOString(),
  durationMs: Number(toast?.durationMs) > 0 ? Number(toast.durationMs) : 5000,
});

const useNotifStore = create((set) => ({
  notifications: [],
  pagination: defaultPagination,
  unreadCount: 0,
  drawerOpen: false,
  bellShakeNonce: 0,
  toasts: [],
  preferences: {
    typePreferences: defaultTypePreferences,
    emailDigestFrequency: 'instant',
  },
  notificationError: null,

  setNotificationFeed: ({ notifications, pagination, unreadCount }) =>
    set(() => ({
      notifications: Array.isArray(notifications) ? notifications : [],
      pagination: {
        ...defaultPagination,
        ...(pagination || {}),
      },
      unreadCount: Number.isFinite(unreadCount) ? unreadCount : 0,
      notificationError: null,
    })),

  appendNotification: (notification) =>
    set((state) => {
      const incomingId = notification?.id;
      const hasExisting = state.notifications.some((item) => item.id === incomingId);

      const merged = hasExisting
        ? [notification, ...state.notifications.filter((item) => item.id !== incomingId)]
        : [notification, ...state.notifications];

      const nextUnreadCount = hasExisting
        ? state.unreadCount
        : state.unreadCount + (notification?.read ? 0 : 1);

      const nextTotal = hasExisting ? state.pagination.total : state.pagination.total + 1;
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / state.pagination.limit));

      return {
        notifications: merged,
        unreadCount: nextUnreadCount,
        bellShakeNonce: state.bellShakeNonce + 1,
        pagination: {
          ...state.pagination,
          total: nextTotal,
          totalPages: nextTotalPages,
          hasNext: state.pagination.page < nextTotalPages,
        },
      };
    }),

  markNotificationReadLocal: (notificationId) =>
    set((state) => {
      let consumedUnread = false;

      const notifications = state.notifications.map((item) => {
        if (item.id !== notificationId || item.read) {
          return item;
        }

        consumedUnread = true;
        return {
          ...item,
          read: true,
        };
      });

      return {
        notifications,
        unreadCount: consumedUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    }),

  markAllNotificationsReadLocal: () =>
    set((state) => ({
      notifications: state.notifications.map((item) => ({
        ...item,
        read: true,
      })),
      unreadCount: 0,
    })),

  setDrawerOpen: (drawerOpen) => set({ drawerOpen: Boolean(drawerOpen) }),
  toggleDrawer: () => set((state) => ({ drawerOpen: !state.drawerOpen })),

  setPage: (page) =>
    set((state) => ({
      pagination: {
        ...state.pagination,
        page: Math.max(1, Number(page) || 1),
      },
    })),

  setPreferences: (preferences) =>
    set(() => ({
      preferences: {
        typePreferences: {
          ...defaultTypePreferences,
          ...(preferences?.typePreferences || {}),
        },
        emailDigestFrequency: preferences?.emailDigestFrequency || 'instant',
      },
      notificationError: null,
    })),

  pushToast: (toast) =>
    set((state) => ({
      toasts: [createToast(toast), ...state.toasts].slice(0, 5),
    })),

  removeToast: (toastId) =>
    set((state) => ({
      toasts: state.toasts.filter((item) => item.id !== toastId),
    })),

  setNotificationError: (message) =>
    set({ notificationError: typeof message === 'string' ? message : 'Notification error' }),

  clearNotificationError: () => set({ notificationError: null }),
}));

export default useNotifStore;

