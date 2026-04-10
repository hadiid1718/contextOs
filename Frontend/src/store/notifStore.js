import { create } from 'zustand';

const useNotifStore = create((set) => ({
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  appendNotification: (notification) =>
    set((state) => ({ notifications: [notification, ...state.notifications] })),
}));

export default useNotifStore;

