import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const useSidebarStore = create(
  persist(
    (set, get, store) => ({
      isSidebarOpen: true,
      setIsSidebarOpen: (value) => set({ isSidebarOpen: value }),

      activeTab: null,
      setActiveTab: (value) => set({ activeTab: value }),

      threads: [],
      setThreads: (updater) =>
        set((state) => ({
          threads:
            typeof updater === 'function' ? updater(state.threads) : updater,
        })),

      savedRoadmaps: [],
      setSavedRoadmaps: (updater) =>
        set((state) => ({
          savedRoadmaps:
            typeof updater === 'function'
              ? updater(state.savedRoadmaps)
              : updater,
        })),

      isThreadsOpen: false,
      setIsThreadsOpen: (value) => set({ isThreadsOpen: value }),

      isSavedOpen: false,
      setIsSavedOpen: (value) => set({ isSavedOpen: value }),

      reset: () => {
        set(store.getInitialState(), true);
      },
    }),
    {
      name: 'sidebar::open',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ isSidebarOpen: state.isSidebarOpen }),
    },
  ),
);
