import { create } from 'zustand';

export const useTeamStore = create((set, get, store) => ({
  teamId: null,
  setTeamId: (value) => set({ teamId: value }),
}));
