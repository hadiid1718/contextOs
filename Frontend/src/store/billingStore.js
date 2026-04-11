import { create } from 'zustand';

const useBillingStore = create((set) => ({
  subscription: null,
  usage: null,
  invoices: [],
  upgradeModalOpen: false,
  upgradeModalMessage: 'Upgrade to continue.',
  upgradeModalDetails: null,
  setSubscription: (subscription) => set({ subscription }),
  setUsage: (usage) => set({ usage }),
  setInvoices: (invoices) => set({ invoices: Array.isArray(invoices) ? invoices : [] }),
  openUpgradeModal: ({ message, details } = {}) =>
    set({
      upgradeModalOpen: true,
      upgradeModalMessage: message || 'Upgrade to continue.',
      upgradeModalDetails: details || null,
    }),
  closeUpgradeModal: () =>
    set({
      upgradeModalOpen: false,
      upgradeModalMessage: 'Upgrade to continue.',
      upgradeModalDetails: null,
    }),
}));

export default useBillingStore;

