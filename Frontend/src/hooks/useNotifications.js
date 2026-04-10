import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSocketClient } from '../lib/socket-client';
import notifService from '../services/notifService';
import useNotifStore from '../store/notifStore';

const useNotifications = () => {
  const setNotifications = useNotifStore((state) => state.setNotifications);
  const appendNotification = useNotifStore((state) => state.appendNotification);
  const notifications = useNotifStore((state) => state.notifications);

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: notifService.list,
  });

  useEffect(() => {
    const initial = notificationsQuery.data?.data || notificationsQuery.data || [];
    setNotifications(initial);
  }, [notificationsQuery.data, setNotifications]);

  useEffect(() => {
    const socket = getSocketClient();
    socket.connect();

    const handleMessage = (notification) => {
      appendNotification(notification);
    };

    socket.on('notification:new', handleMessage);

    return () => {
      socket.off('notification:new', handleMessage);
      socket.disconnect();
    };
  }, [appendNotification]);

  return {
    notifications,
    isLoading: notificationsQuery.isLoading,
    error: notificationsQuery.error,
  };
};

export default useNotifications;


