import { create } from 'zustand';

export const useThreadStore = create((set, get, store) => ({
  threadId: null,
  setThreadId: (value) => set({ threadId: value }),

  runId: null,
  setRunId: (value) => set({ runId: value }),

  currentThreadTitle: null,
  setCurrentThreadTitle: (title) => set({ currentThreadTitle: title }),

  currentThreadMetadata: {},
  setCurrentThreadMetadata: (data) => set({ currentThreadMetadata: data }),

  isExistingChat: false,
  setIsExistingChat: (value) => set({ isExistingChat: value }),

  isArtifactOpen: false,
  setIsArtifactOpen: (value) => set({ isArtifactOpen: value }),

  chatMinimized: false,
  setChatMinimized: (value) => set({ chatMinimized: value }),

  showMessageInput: true,
  setShowMessageInput: (value) => set({ showMessageInput: value }),

  queryInput: '',
  setQueryInput: (value) => set({ queryInput: value }),

  messages: [],
  setMessages: (updater) =>
    set((state) => ({
      messages:
        typeof updater === 'function' ? updater(state.messages) : updater,
    })),

  isRoadmapCreated: false,
  setIsRoadmapCreated: (value) => set({ isRoadmapCreated: value }),

  isUserApproved: false,
  setIsUserApproved: (value) => set({ isUserApproved: value }),

  selectedTimeCommitment: null,
  setSelectedTimeCommitment: (value) => set({ selectedTimeCommitment: value }),

  availableArtifacts: [],
  setAvailableArtifacts: (updater) =>
    set((state) => ({
      availableArtifacts:
        typeof updater === 'function'
          ? updater(state.availableArtifacts)
          : updater,
    })),

  isThreadRunning: false,
  setIsThreadRunning: (value) => set({ isThreadRunning: value }),

  mobileTab: 'chat',

  setMobileTab: (value) => set({ mobileTab: value }),

  reset: () => {
    set(store.getInitialState(), true);
  },
}));
