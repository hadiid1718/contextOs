import { create } from 'zustand';

const useBillingStore = create((set) => ({
  subscription: null,
  setSubscription: (subscription) => set({ subscription }),
}));

export default useBillingStore;

