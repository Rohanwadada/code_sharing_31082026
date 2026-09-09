import { create } from 'zustand';

export const useOrganizationStore = create((set, get, store) => ({
  organizationId: null,
  setOrganizationId: (value) => set({ organizationId: value }),

  organizationName: null,
  setOrganizationName: (value) => set({ organizationName: value }),

  organizationDetails: { allowed_email_domains: ['setuschool.com'] },
  setOrganizationDetails: (value) => set({ organizationDetails: value }),
}));
