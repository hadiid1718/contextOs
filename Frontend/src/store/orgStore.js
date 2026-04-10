import { create } from 'zustand';

const useOrgStore = create((set) => ({
  currentOrg: null,
  setCurrentOrg: (currentOrg) => set({ currentOrg }),
  reset: () => set({ currentOrg: null }),
}));

export default useOrgStore;

