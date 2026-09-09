import { create } from 'zustand';

export const useAuthStore = create((set, get) => ({
  isLoggedIn: false,
  isLoading: true,
  userDetails: {},

  setIsLoggedIn: (value) => set({ isLoggedIn: value }),
  setUserDetails: (value) => set({ userDetails: value }),
  setIsLoading: (value) => set({ isLoading: value }),
  setUser: (user) =>
    set({ userDetails: user, isLoggedIn: true, isLoading: false }),
  clear: () => set({ userDetails: {}, isLoggedIn: false, isLoading: false }),
}));
