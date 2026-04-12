import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  acquireSocketClient,
  releaseSocketClient,
} from '../lib/socket-client';
import { normalizeNotificationError } from '../lib/notificationErrors';
import notifService from '../services/notifService';
import useNotifStore from '../store/notifStore';
import { NotificationSchema } from '../types/Notification';

const normalizeNotification = (raw) => {
  const candidate = {
    id:
      raw?.id ||
      raw?._id ||
      raw?.notification_id ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    user_id: raw?.user_id,
    org_id: raw?.org_id,
    type: raw?.type,
    severity: raw?.severity || 'info',
    message: raw?.message || raw?.title || 'Notification',
    route: raw?.route || '/notifications',
    read: Boolean(raw?.read),
    createdAt: raw?.createdAt || raw?.created_at || new Date().toISOString(),
    metadata: raw?.metadata || {},
  };

  const parsed = NotificationSchema.safeParse(candidate);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
};

const useNotifications = ({ bootstrap = false } = {}) => {
  const notifications = useNotifStore((state) => state.notifications);
  const pagination = useNotifStore((state) => state.pagination);
  const unreadCount = useNotifStore((state) => state.unreadCount);
  const drawerOpen = useNotifStore((state) => state.drawerOpen);
  const toasts = useNotifStore((state) => state.toasts);
  const preferences = useNotifStore((state) => state.preferences);
  const notificationError = useNotifStore((state) => state.notificationError);

  const setNotificationFeed = useNotifStore((state) => state.setNotificationFeed);
  const appendNotification = useNotifStore((state) => state.appendNotification);
  const markNotificationReadLocal = useNotifStore((state) => state.markNotificationReadLocal);
  const markAllNotificationsReadLocal = useNotifStore((state) => state.markAllNotificationsReadLocal);
  const setPreferences = useNotifStore((state) => state.setPreferences);
  const setNotificationError = useNotifStore((state) => state.setNotificationError);
  const clearNotificationError = useNotifStore((state) => state.clearNotificationError);
  const pushToast = useNotifStore((state) => state.pushToast);
  const setDrawerOpen = useNotifStore((state) => state.setDrawerOpen);
  const setPage = useNotifStore((state) => state.setPage);

  const notificationsQuery = useQuery({
    queryKey: ['notifications', pagination.page, pagination.limit],
    queryFn: () => notifService.list({ page: pagination.page, limit: pagination.limit }),
    enabled: bootstrap,
    refetchOnWindowFocus: false,
    staleTime: 10_000,
  });

  const preferencesQuery = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: notifService.getPreferences,
    enabled: bootstrap,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!bootstrap || !notificationsQuery.data) {
      return;
    }

    const items = Array.isArray(notificationsQuery.data?.data)
      ? notificationsQuery.data.data
      : [];

    const normalizedItems = items.map(normalizeNotification).filter(Boolean);

    setNotificationFeed({
      notifications: normalizedItems,
      pagination: notificationsQuery.data?.pagination,
      unreadCount: notificationsQuery.data?.unreadCount,
    });
    clearNotificationError();
  }, [bootstrap, clearNotificationError, notificationsQuery.data, setNotificationFeed]);

  useEffect(() => {
    if (!bootstrap || !notificationsQuery.error) {
      return;
    }

    setNotificationError(
      normalizeNotificationError(
        notificationsQuery.error,
        'Unable to load notifications right now.'
      )
    );
  }, [bootstrap, notificationsQuery.error, setNotificationError]);

  useEffect(() => {
    if (!bootstrap || !preferencesQuery.data) {
      return;
    }

    const payload = preferencesQuery.data?.data || preferencesQuery.data || null;
    if (!payload) {
      return;
    }

    setPreferences(payload);
  }, [bootstrap, preferencesQuery.data, setPreferences]);

  useEffect(() => {
    if (!bootstrap || !preferencesQuery.error) {
      return;
    }

    setNotificationError(
      normalizeNotificationError(
        preferencesQuery.error,
        'Unable to load notification preferences.'
      )
    );
  }, [bootstrap, preferencesQuery.error, setNotificationError]);

  const markAsReadMutation = useMutation({
    mutationFn: notifService.markAsRead,
    onSuccess: (response, notificationId) => {
      const updatedNotificationId = response?.data?.id || notificationId;
      if (updatedNotificationId) {
        markNotificationReadLocal(updatedNotificationId);
      }
      clearNotificationError();
    },
    onError: (error) => {
      setNotificationError(
        normalizeNotificationError(error, 'Unable to mark this notification as read.')
      );
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: notifService.markAllRead,
    onSuccess: () => {
      markAllNotificationsReadLocal();
      clearNotificationError();
    },
    onError: (error) => {
      setNotificationError(
        normalizeNotificationError(error, 'Unable to mark all notifications as read.')
      );
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: notifService.updatePreferences,
    onSuccess: (response) => {
      const payload = response?.data || response;
      if (payload) {
        setPreferences(payload);
      }
      clearNotificationError();
    },
    onError: (error) => {
      setNotificationError(
        normalizeNotificationError(error, 'Unable to update notification preferences.')
      );
    },
  });

  useEffect(() => {
    if (!bootstrap) {
      return undefined;
    }

    const socket = acquireSocketClient();
    socket.auth = (callback) => {
      callback({
        token: localStorage.getItem('accessToken') || '',
      });
    };
    if (!socket.connected) {
      socket.connect();
    }

    const handleMessage = (incoming) => {
      const notification = normalizeNotification(incoming);
      if (!notification) {
        return;
      }

      const shouldDisplay =
        useNotifStore.getState().preferences?.typePreferences?.[notification.severity] !==
        false;

      if (!shouldDisplay) {
        return;
      }

      appendNotification(notification);
      pushToast(notification);
      clearNotificationError();
    };

    const handleConnectError = (error) => {
      setNotificationError(
        normalizeNotificationError(
          error,
          'Realtime notification channel is disconnected.'
        )
      );
    };

    socket.on('notification:new', handleMessage);
    socket.on('connect_error', handleConnectError);

    return () => {
      socket.off('notification:new', handleMessage);
      socket.off('connect_error', handleConnectError);
      releaseSocketClient();
    };
  }, [appendNotification, bootstrap, clearNotificationError, pushToast, setNotificationError]);

  const markAsRead = async (notificationId) => {
    await markAsReadMutation.mutateAsync(notificationId);
  };

  const markAllRead = async () => {
    await markAllReadMutation.mutateAsync();
  };

  const savePreferences = async (payload) => {
    await updatePreferencesMutation.mutateAsync(payload);
  };

  return {
    notifications,
    pagination,
    unreadCount,
    drawerOpen,
    toasts,
    preferences,
    notificationError,
    isLoading:
      bootstrap && (notificationsQuery.isLoading || preferencesQuery.isLoading),
    isFetching:
      bootstrap && (notificationsQuery.isFetching || preferencesQuery.isFetching),
    markAsRead,
    markAllRead,
    savePreferences,
    setDrawerOpen,
    setPage,
    refreshNotifications: notificationsQuery.refetch,
    clearNotificationError,
    isMarkingRead: markAsReadMutation.isPending,
    isMarkingAllRead: markAllReadMutation.isPending,
    isSavingPreferences: updatePreferencesMutation.isPending,
  };
};

export default useNotifications;


